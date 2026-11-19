"use strict";

const CACHE_NAME = "christmas-radio-v2";
const AUDIO_CACHE = "christmas-radio-audio-v2";

const SPEECH_PATH = "./songs/speech.mp3";
const SONGS_MANIFEST_PATH = "./songs.json";
const DURATIONS_PATH = "./songs/durations.json";

const CORE_FILES = [
    "./",
    "./index.html",
    "./favicon.ico",
    "./christmas-background.jpg",
    SONGS_MANIFEST_PATH,
    DURATIONS_PATH,
    SPEECH_PATH
];

function scopedURL(path) {
    return new URL(path, self.registration.scope).href;
}

function isManifest(url) {
    return (
        url.pathname.endsWith("/durations.json") ||
        url.pathname.endsWith("/songs.json")
    );
}

async function notifyClients(message) {
    const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true
    });

    for (const client of clients) {
        client.postMessage(message);
    }
}

self.addEventListener("install", event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);

        for (const file of CORE_FILES) {
            try {
                const request = new Request(
                    scopedURL(file),
                    { cache: "reload" }
                );

                const response = await fetch(request);

                if (response.ok && response.type === "basic") {
                    await cache.put(request, response);
                }
            } catch (error) {
                console.error("Could not cache website file:", file, error);
            }
        }

        await self.skipWaiting();
    })());
});

self.addEventListener("activate", event => {
    event.waitUntil((async () => {
        const keys = await caches.keys();

        await Promise.all(
            keys
                .filter(key =>
                    key.startsWith("christmas-radio-") &&
                    key !== CACHE_NAME &&
                    key !== AUDIO_CACHE
                )
                .map(key => caches.delete(key))
        );

        await self.clients.claim();
    })());
});


/* =========================================
   AUDIO CACHING

   CACHE_RADIO_AUDIO
     Downloads only the files not cached yet.

   REFRESH_RADIO_AUDIO
     Used when songs or durations changed.
     Deletes the whole audio cache (including
     removed songs) and downloads everything
     again, bypassing the browser HTTP cache.

   Jobs run one at a time so a normal caching
   run can never race a refresh.
========================================= */

let cacheJob = Promise.resolve();

async function runCacheJob(files, refresh, signature) {
    if (refresh) {
        await caches.delete(AUDIO_CACHE);

        // Drop stale copies kept in the core cache too
        const coreCache = await caches.open(CACHE_NAME);

        await coreCache.delete(scopedURL(SPEECH_PATH));

        // Re-fetch the manifests so the cached copies are current
        for (const path of [SONGS_MANIFEST_PATH, DURATIONS_PATH]) {
            try {
                const response = await fetch(
                    scopedURL(path),
                    { cache: "reload" }
                );

                if (response.ok && response.type === "basic") {
                    await coreCache.put(scopedURL(path), response);
                }
            } catch (error) {
                console.warn("Could not refresh manifest:", path, error);
            }
        }
    }

    const cache = await caches.open(AUDIO_CACHE);

    let completed = 0;
    let failed = 0;

    for (const file of files) {
        try {
            const url = new URL(file, self.registration.scope);

            if (url.origin !== self.location.origin) {
                failed++;
                continue;
            }

            if (!refresh) {
                const cached = await cache.match(url.href);

                if (cached) {
                    completed++;
                    continue;
                }
            }

            const response = await fetch(
                url.href,
                refresh ? { cache: "reload" } : undefined
            );

            if (response.status !== 200 || response.type !== "basic") {
                throw new Error(`HTTP ${response.status}`);
            }

            await cache.put(url.href, response);
            completed++;

            await notifyClients({
                type: "RADIO_AUDIO_CACHE_PROGRESS",
                completed,
                total: files.length,
                failed,
                refreshed: refresh
            });
        } catch (error) {
            failed++;
            console.error("Could not cache audio:", file, error);
        }
    }

    await notifyClients({
        type: "RADIO_AUDIO_CACHE_FINISHED",
        completed,
        total: files.length,
        failed,
        refreshed: refresh,
        signature: signature || ""
    });
}

self.addEventListener("message", event => {
    const data = event.data || {};

    const isRefresh = data.type === "REFRESH_RADIO_AUDIO";
    const isNormal = data.type === "CACHE_RADIO_AUDIO";

    if (!isRefresh && !isNormal) {
        return;
    }

    if (!Array.isArray(data.files)) {
        return;
    }

    cacheJob = cacheJob
        .then(() => runCacheJob(
            data.files,
            isRefresh,
            typeof data.signature === "string" ? data.signature : ""
        ))
        .catch(error => {
            console.error("Audio cache job failed:", error);
        });

    event.waitUntil(cacheJob);
});


/* =========================================
   FETCH
========================================= */

self.addEventListener("fetch", event => {
    const request = event.request;

    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);

    if (url.origin !== self.location.origin) {
        return;
    }

    /*
     * Manifests (songs.json, durations.json):
     * network first, so changes are always seen.
     * Cached copy is used only when offline.
     *
     * This must be checked BEFORE the song check,
     * because durations.json lives inside /songs/.
     */

    if (isManifest(url)) {
        event.respondWith((async () => {
            const cache = await caches.open(CACHE_NAME);

            try {
                const response = await fetch(request);

                if (response.ok && response.type === "basic") {
                    await cache.put(url.href, response.clone());
                }

                return response;
            } catch {
                const cached = await cache.match(url.href);

                if (cached) {
                    return cached;
                }

                return new Response('{"songs":[]}', {
                    status: 503,
                    headers: {
                        "Content-Type": "application/json"
                    }
                });
            }
        })());

        return;
    }

    const isSong = url.pathname.includes("/songs/");
    const isBackground =
        url.pathname.endsWith("/christmas-background.jpg");
    const isFavicon = url.pathname.endsWith("/favicon.ico");

    if (isSong || isBackground || isFavicon) {
        event.respondWith((async () => {
            const audioCache = await caches.open(AUDIO_CACHE);
            const coreCache = await caches.open(CACHE_NAME);

            const cached =
                await audioCache.match(url.href) ||
                await coreCache.match(url.href);

            if (cached) {
                const range = request.headers.get("Range");

                if (range && isSong) {
                    const match = range.match(/bytes=(\d*)-(\d*)/);

                    if (match) {
                        // Blob slices are lazy; reading the whole file into an
                        // ArrayBuffer on every range request made playback stall
                        const blob = await cached.blob();
                        const size = blob.size;

                        let start = match[1] ? Number(match[1]) : 0;
                        let end = match[2] ? Number(match[2]) : size - 1;

                        if (!match[1] && match[2]) {
                            const suffixLength = Number(match[2]);
                            start = Math.max(0, size - suffixLength);
                            end = size - 1;
                        }

                        if (start >= size || start > end) {
                            return new Response(null, {
                                status: 416,
                                headers: {
                                    "Content-Range": `bytes */${size}`
                                }
                            });
                        }

                        end = Math.min(end, size - 1);

                        return new Response(
                            blob.slice(start, end + 1),
                            {
                                status: 206,
                                headers: {
                                    "Content-Type":
                                        cached.headers.get("Content-Type") ||
                                        "audio/mpeg",
                                    "Accept-Ranges": "bytes",
                                    "Content-Range":
                                        `bytes ${start}-${end}/${size}`,
                                    "Content-Length": String(end - start + 1)
                                }
                            }
                        );
                    }
                }

                return cached;
            }

            try {
                const response = await fetch(request);

                // Only complete (200) responses can be cached.
                // Range requests return 206, which cache.put rejects.
                if (response.status === 200 && response.type === "basic") {
                    const destinationCache =
                        isSong ? audioCache : coreCache;

                    try {
                        await destinationCache.put(
                            url.href,
                            response.clone()
                        );
                    } catch (error) {
                        console.warn("Could not store file:", url.href, error);
                    }
                }

                return response;
            } catch {
                return new Response("This file is not available offline.", {
                    status: 503
                });
            }
        })());

        return;
    }

    event.respondWith((async () => {
        try {
            const response = await fetch(request);

            if (response.ok && response.type === "basic") {
                const cache = await caches.open(CACHE_NAME);
                await cache.put(url.href, response.clone());
            }

            return response;
        } catch {
            const cache = await caches.open(CACHE_NAME);
            const cached = await cache.match(url.href);

            if (cached) {
                return cached;
            }

            if (request.mode === "navigate") {
                const index = await cache.match(
                    new URL("./index.html", self.registration.scope).href
                );

                if (index) {
                    return index;
                }
            }

            return new Response("This page is not available offline.", {
                status: 503
            });
        }
    })());
});