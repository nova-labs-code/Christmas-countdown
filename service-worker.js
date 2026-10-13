
"use strict";

const CACHE_NAME = "christmas-radio-v1";

const CORE_FILES = [
    "./",
    "./index.html",
    "./favicon.ico",
    "./christmas-background.jpg",
    "./songs/durations.json",
    "./songs/speech.mp3"
];

const AUDIO_CACHE = "christmas-radio-audio-v1";

self.addEventListener("install", event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);

        for (const url of CORE_FILES) {
            try {
                const response = await fetch(url, {
                    cache: "reload"
                });

                if (response.ok && response.type !== "opaque") {
                    await cache.put(url, response);
                }
            } catch (error) {
                console.warn("Could not cache:", url, error);
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

// Cache the playlist audio after the page has loaded its manifest.
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

        for (const file of files) {
            try {
                const url = new URL(file, self.location.href);

                if (url.origin !== self.location.origin) {
                    continue;
                }

                const existing = await cache.match(url.href);

                if (existing) {
                    continue;
                }

                const response = await fetch(url.href);

                if (response.ok && response.type !== "opaque") {
                    await cache.put(url.href, response);
                }
            } catch (error) {
                console.warn("Audio caching failed:", file, error);
            }
        }

        const clients = await self.clients.matchAll({
            type: "window"
        });

        for (const client of clients) {
            client.postMessage({
                type: "RADIO_AUDIO_CACHE_FINISHED"
            });
        }
    })());
});

// Serve cached files offline, while allowing uncached requests online.
self.addEventListener("fetch", event => {
    const request = event.request;

    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);

    if (url.origin !== self.location.origin) {
        return;
    }

    // The manifest must remain available offline.
    if (url.pathname.endsWith("/durations.json")) {
        event.respondWith((async () => {
            const cache = await caches.open(CACHE_NAME);
            const cached = await cache.match(request);

            if (cached) {
                return cached;
            }

            try {
                const response = await fetch(request);

                if (response.ok) {
                    await cache.put(request, response.clone());
                }

                return response;
            } catch {
                return new Response(
                    '{"songs":[]}',
                    {
                        status: 503,
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }
                );
            }
        })());

        return;
    }

    // Use cached audio first, including when offline.
    if (
        url.pathname.includes("/songs/") ||
        url.pathname.endsWith("/christmas-background.jpg") ||
        url.pathname.endsWith("/favicon.ico")
    ) {
        event.respondWith((async () => {
            const audioCache = await caches.open(AUDIO_CACHE);
            const coreCache = await caches.open(CACHE_NAME);

            const cached =
                await audioCache.match(request) ||
                await coreCache.match(request);

            if (cached) {
                return cached;
            }

            try {
                const response = await fetch(request);

                if (response.ok && response.type !== "opaque") {
                    const destinationCache =
                        url.pathname.includes("/songs/")
                            ? audioCache
                            : coreCache;

                    await destinationCache.put(
                        request,
                        response.clone()
                    );
                }

                return response;
            } catch {
                return new Response(
                    "This file is not available offline.",
                    { status: 503 }
                );
            }
        })());

        return;
    }

    // Cache the HTML and other same-origin page resources.
    event.respondWith((async () => {
        try {
            const response = await fetch(request);

            if (response.ok && response.type !== "opaque") {
                const cache = await caches.open(CACHE_NAME);
                await cache.put(request, response.clone());
            }

            return response;
        } catch {
            const cache = await caches.open(CACHE_NAME);
            const cached = await cache.match(request);

            if (cached) {
                return cached;
            }

            if (request.mode === "navigate") {
                return (
                    await cache.match("./index.html") ||
                    new Response("Offline. Page not cached.", {
                        status: 503
                    })
                );
            }

            return new Response("Offline.", { status: 503 });
        }
    })());
});
