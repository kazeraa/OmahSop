/* ============================================
   Omah Sop - Service Worker for Offline Support & Notifications
   ============================================ */

const CACHE_NAME = 'omahsop-v2';
const ASSETS_TO_CACHE = [
    '/',
    'index.html',
    'css/style.css',
    'js/database.js',
    'js/effects.js',
    'js/app.js',
    'favicon.svg',
    'manifest.json',
    'icons/icon-72.png',
    'icons/icon-192.png',
    'icons/icon-512.png'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => {
            return self.skipWaiting();
        })
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request).then((response) => {
                // Don't cache non-GET requests or non-ok responses
                if (event.request.method !== 'GET' || !response.ok) {
                    return response;
                }

                // Cache the fetched response
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });

                return response;
            }).catch(() => {
                // If offline and not cached, return offline fallback
                if (event.request.mode === 'navigate') {
                    return caches.match('index.html');
                }
            });
        })
    );
});

// ============ Push Notification Handling ============
self.addEventListener('push', (event) => {
    let data = {
        title: 'Omah Sop',
        body: 'Pemberitahuan dari Omah Sop',
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-72.png',
        tag: 'omahsop-push',
        vibrate: [200, 100, 200]
    };

    if (event.data) {
        try {
            const payload = event.data.json();
            data = { ...data, ...payload };
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.icon,
        badge: data.badge,
        tag: data.tag,
        vibrate: data.vibrate || [200, 100, 200],
        renotify: true,
        silent: false,
        requireInteraction: true,
        data: {
            url: data.url || '/'
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click event - open the app and navigate
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then((windowClients) => {
            // Check if there is already a window/tab open with the target URL
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not, open a new window
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// Handle periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'omahsop-reminder') {
        event.waitUntil(
            self.registration.showNotification('Omah Sop', {
                body: 'Cek piutang dan keuanganmu hari ini!',
                icon: 'icons/icon-192.png',
                badge: 'icons/icon-72.png',
                tag: 'omahsop-periodic'
            })
        );
    }
});
