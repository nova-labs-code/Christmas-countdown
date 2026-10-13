
"use strict";

const CACHE_NAME = "christmas-radio-v2";
const AUDIO_CACHE = "christmas-radio-audio-v2";

const CORE_FILES = [
    "./",
    "./index.html",
    "./favicon.ico",
    "./christmas-background.jpg",
    "./songs/durations.json",
    "./songs/speech.mp3"
];

self.addEventListener("install", event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);

        for (const file of CORE_FILES) {
            try {
                const request = new Request(
                    new URL(file, self.registration.scope).href,
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

self.addEventListener("message", event => {
    if (event.data?.type !== "CACHE_RADIO_AUDIO") {
        return;
    }

    const files = event.data.files;

    if (!Array.isArray(files)) {
        return;
    }

    event.waitUntil((async () => {
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

                const cached = await cache.match(url.href);

                if (cached) {
                    completed++;
                    continue;
                }

                const response = await fetch(url.href);

                if (!response.ok || response.type !== "basic") {
                    throw new Error(`HTTP ${response.status}`);
                }

                await cache.put(url.href, response);
                completed++;

                const clients = await self.clients.matchAll({
                    type: "window",
                    includeUncontrolled: true
                });

                for (const client of clients) {
                    client.postMessage({
                        type: "RADIO_AUDIO_CACHE_PROGRESS",
                        completed,
                        total: files.length,
                        failed
                    });
                }
            } catch (error) {
                failed++;
                console.error("Could not cache audio:", file, error);
            }
        }

        const clients = await self.clients.matchAll({
            type: "window",
            includeUncontrolled: true
        });

        for (const client of clients) {
            client.postMessage({
                type: "RADIO_AUDIO_CACHE_FINISHED",
                completed,
                total: files.length,
                failed
            });
        }
    })());
});

self.addEventListener("fetch", event => {
    const request = event.request;

    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);

    if (url.origin !== self.location.origin) {
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
                        const buffer = await cached.arrayBuffer();
                        const size = buffer.byteLength;

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
                            buffer.slice(start, end + 1),
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

                if (response.ok && response.type === "basic") {
                    const destinationCache =
                        isSong ? audioCache : coreCache;

                    await destinationCache.put(url.href, response.clone());
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

    if (url.pathname.endsWith("/durations.json")) {
        event.respondWith((async () => {
            const cache = await caches.open(CACHE_NAME);
            const cached = await cache.match(url.href);

            if (cached) {
                return cached;
            }

            try {
                const response = await fetch(request);

                if (response.ok) {
                    await cache.put(url.href, response.clone());
                }

                return response;
            } catch {
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
