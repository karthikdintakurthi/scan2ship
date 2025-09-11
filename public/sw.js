// Generate cache name with timestamp for better cache busting
const CACHE_VERSION = 'build-mff04g9j-local';
const CACHE_NAME = `scan2ship-dynamic-v${CACHE_VERSION}`;
const urlsToCache = [
  '/',
  '/orders',
  '/view-orders',
  '/credits',
  '/api/pwa/manifest',
  '/manifest.json'
];

// Dynamic assets to cache based on client
const dynamicAssets = [
  '/images/scan2ship.png',
  '/images/vanitha-logistics.png',
  '/images/vjl.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing with cache version:', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache:', CACHE_NAME);
        // Cache static assets
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Cache dynamic assets
        return caches.open(CACHE_NAME).then((cache) => {
          return Promise.all(
            dynamicAssets.map((asset) => {
              return cache.add(asset).catch((error) => {
                console.log('Failed to cache asset:', asset, error);
              });
            })
          );
        });
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip caching for API requests and external resources
  if (url.pathname.startsWith('/api/') || 
      url.origin !== location.origin ||
      request.method !== 'GET') {
    event.respondWith(fetch(request));
    return;
  }

  // Handle manifest requests dynamically
  if (request.url.includes('/api/pwa/manifest')) {
    event.respondWith(
      fetch(request).catch(() => {
        // Fallback to default manifest if network fails
        return caches.match('/manifest.json');
      })
    );
    return;
  }

  // Handle static assets with cache busting
  if (url.pathname.startsWith('/_next/static/') || 
      url.pathname.startsWith('/_next/image/') ||
      request.destination === 'image') {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          return response;
        }
        return fetch(request).then((fetchResponse) => {
          // Cache new assets
          if (fetchResponse.ok) {
            const responseClone = fetchResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return fetchResponse;
        });
      })
    );
    return;
  }

  // For HTML pages, always try network first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        // If successful, cache the response
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(request);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating with cache version:', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// Handle background sync for offline functionality
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Perform background sync tasks
      console.log('Background sync triggered')
    );
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || '/images/scan2ship.png',
      badge: data.badge || '/images/scan2ship.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      },
      actions: [
        {
          action: 'explore',
          title: 'View Details',
          icon: '/images/scan2ship.png'
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/images/scan2ship.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
