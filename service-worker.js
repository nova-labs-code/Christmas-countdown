
"use strict";

const CACHE_NAME = "christmas-radio-v2";
const AUDIO_CACHE = "christmas-radio-audio-v2";

const BASE_URL = self.registration.scope;
const CORE_FILES = [
    "./",
    "./index.html",
    "./favicon.ico",
    "./christmas-background.jpg",
    "./songs/durations.json",
    "./songs/speech.mp3"
];

function absoluteURL(path) {
    return new URL(path, BASE_URL).href;
}

async function cacheFile(cache, path) {
    const url = absoluteURL(path);

    try {
        const response = await fetch(url, {
            cache: "reload"
        });

        if (!response.ok || response.type === "opaque") {
            return false;
        }

        await cache.put(url, response);
        return true;
    } catch (error) {
        console.warn("Could not cache:", url, error);
        return false;
    }
}

self.addEventListener("install", event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);

        // Cache the essential page and resources.
        for (const file of CORE_FILES) {
            const success = await cacheFile(cache, file);

            if (!success && file === "./index.html") {
                throw new Error(
                    "Could not cache index.html. Check the GitHub Pages path."
                );
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

// Download all requested audio without playing it.
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
        const failed = [];

        // Limit concurrency to avoid overwhelming the server.
        for (let i = 0; i < files.length; i += 4) {
            const batch = files.slice(i, i + 4);

            const results = await Promise.all(
                batch.map(async file => {
                    const url = new URL(file, BASE_URL);

                    if (url.origin !== self.location.origin) {
                        return { file, success: false };
                    }

                    try {
                        // Reuse files already cached.
                        const existing = await cache.match(url.href);

                        if (existing) {
                            return { file, success: true };
                        }

                        const response = await fetch(url.href);

                        if (!response.ok || response.type === "opaque") {
                            return { file, success: false };
                        }

                        // Store the complete response, not a range response.
                        await cache.put(url.href, response.clone());

                        return { file, success: true };
                    } catch (error) {
                        console.warn("Audio caching failed:", file, error);
                        return { file, success: false };
                    }
                })
            );

            for (const result of results) {
                if (result.success) {
                    completed++;
                } else {
                    failed.push(result.file);
                }
            }
        }

        // Report the actual result to the open page.
        const clients = await self.clients.matchAll({
            type: "window",
            includeUncontrolled: true
        });

        for (const client of clients) {
            client.postMessage({
                type: "RADIO_AUDIO_CACHE_FINISHED",
                completed,
                failed,
                total: files.length
            });
        }
    })());
});

// Convert a cached full response into a valid partial audio response.
async function serveRange(response, rangeHeader) {
    const buffer = await response.arrayBuffer();
    const size = buffer.byteLength;

    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);

    if (!match || (!match[1] && !match[2]) || size === 0) {
        return new Response(null, {
            status: 416,
            headers: {
                "Content-Range": `bytes */${size}`
            }
        });
    }

    let start;
    let end;

    if (!match[1]) {
        const suffixLength = Number(match[2]);

        if (suffixLength <= 0) {
            return new Response(null, {
                status: 416,
                headers: { "Content-Range": `bytes */${size}` }
            });
        }

        start = Math.max(0, size - suffixLength);
        end = size - 1;
    } else {
        start = Number(match[1]);
        end = match[2] ? Number(match[2]) : size - 1;
        end = Math.min(end, size - 1);
    }

    if (start >= size || start > end) {
        return new Response(null, {
            status: 416,
            headers: {
                "Content-Range": `bytes */${size}`
            }
        });
    }

    const headers = new Headers(response.headers);

    headers.set("Accept-Ranges", "bytes");
    headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
    headers.set("Content-Length", String(end - start + 1));

    return new Response(
        buffer.slice(start, end + 1),
        {
            status: 206,
            statusText: "Partial Content",
            headers
        }
    );
}

self.addEventListener("fetch", event => {
    const request = event.request;

    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);

    if (url.origin !== self.location.origin) {
        return;
    }

    const isNavigation = request.mode === "navigate";
    const isAudio = url.pathname.includes("/songs/");
    const isAsset =
        url.pathname.endsWith("/christmas-background.jpg") ||
        url.pathname.endsWith("/favicon.ico");

    // Serve cached audio, including byte-range requests from iPhones.
    if (isAudio) {
        event.respondWith((async () => {
            const cache = await caches.open(AUDIO_CACHE);
            const cached = await cache.match(url.href);

            if (cached) {
                const range = request.headers.get("Range");

                if (range) {
                    return serveRange(cached, range);
                }

                return cached;
            }

            // Not cached yet: try the network.
            try {
                const response = await fetch(request);

                if (response.ok && !request.headers.has("Range")) {
                    await cache.put(url.href, response.clone());
                }

                return response;
            } catch {
                return new Response(
                    "This audio file has not been cached for offline use.",
                    { status: 503 }
                );
            }
        })());

        return;
    }

    // Cache-first for the manifest and static images.
    if (
        url.pathname.endsWith("/durations.json") ||
        isAsset
    ) {
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
                return new Response("File unavailable offline.", {
                    status: 503
                });
            }
        })());

        return;
    }

    // Load the latest page online, with a cached fallback offline.
    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);

        try {
            const response = await fetch(request);

            if (response.ok) {
                await cache.put(url.href, response.clone());
            }

            return response;
        } catch {
            const cached = await cache.match(url.href);

            if (cached) {
                return cached;
            }

            if (isNavigation) {
                const index = await cache.match(
                    absoluteURL("./index.html")
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
