// Service Worker for Stage Music - Aggressive Caching
const CACHE_NAME = 'stage-music-v1.3';
const RUNTIME_CACHE = 'stage-music-runtime-v1.3';

// Critical assets to cache immediately
const CRITICAL_ASSETS = [
    '/mobile/',
    '/mobile/index.html',
    '/mobile/mobile.css',
    '/mobile/mobile.js',
    '/assets/stage-music-logo.png'
];

// Install - cache critical assets and update immediately
self.addEventListener('install', (event) => {
    console.log('🔄 SW installing, version:', CACHE_NAME);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(CRITICAL_ASSETS))
            .then(() => {
                console.log('✅ SW installed, taking control immediately');
                return self.skipWaiting(); // Force immediate activation
            })
    );
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME && name !== RUNTIME_CACHE)
                    .map(name => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch - Network First for API, Cache First for assets
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // NEVER cache JavaScript files - always fetch fresh
    if (url.pathname.endsWith('.js')) {
        event.respondWith(fetch(request));
        return;
    }

    // API requests - Stale While Revalidate (show cached, update in background)
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            caches.open(RUNTIME_CACHE).then(async (cache) => {
                const cachedResponse = await cache.match(request);

                const fetchPromise = fetch(request).then(response => {
                    // Cache successful responses
                    if (response && response.status === 200) {
                        cache.put(request, response.clone());
                    }
                    return response;
                }).catch(() => cachedResponse); // Fallback to cache on network error

                // Return cached immediately if available, otherwise wait for network
                return cachedResponse || fetchPromise;
            })
        );
        return;
    }

    // S3 Images - Cache First (images don't change)
    if (url.hostname.includes('s3.ap-south-1.amazonaws.com')) {
        event.respondWith(
            caches.open(RUNTIME_CACHE).then(async (cache) => {
                const cachedResponse = await cache.match(request);
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(request).then(response => {
                    if (response && response.status === 200) {
                        cache.put(request, response.clone());
                    }
                    return response;
                });
            })
        );
        return;
    }

    // Other requests - Network First, fallback to Cache
    event.respondWith(
        fetch(request)
            .then(response => {
                // Cache successful responses
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(RUNTIME_CACHE).then(cache => {
                        cache.put(request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => caches.match(request)) // Fallback to cache
    );
});
