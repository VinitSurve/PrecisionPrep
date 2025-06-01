const CACHE_NAME = 'precision-prep-cache-v2';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/PrecisionPrep.png',
  '/manifest.webmanifest',
];

// Install service worker with better error handling
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(URLS_TO_CACHE)
          .catch(error => {
            console.error('Failed to cache some assets:', error);
            // Continue with what we could cache
            return Promise.resolve();
          });
      })
  );
  
  // Force activation to take over immediately
  self.skipWaiting();
});

// Activate and clean up old caches
self.addEventListener('activate', (event) => {
  const cacheAllowlist = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheAllowlist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated; now ready to handle fetches!');
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - network first for API calls, cache first for assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests and Supabase auth requests
  if (event.request.method !== 'GET' || 
      url.pathname.startsWith('/auth/') || 
      url.pathname.includes('refresh') ||
      url.pathname.includes('token')) {
    return;
  }
  
  // For API requests - use network first, fall back to cache
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache successful responses
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // For page navigations - use cache first, fall back to network
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html')
        .then(cachedResponse => {
          return cachedResponse || fetch(event.request)
            .then(response => {
              // Cache the fetched response
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put('/index.html', responseToCache);
              });
              return response;
            });
        })
    );
    return;
  }
  
  // For all other assets - use cache first, fall back to network
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200) {
              return response;
            }
            
            // Cache successful responses
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
            
            return response;
          });
      })
  );
});

// Handle errors in the service worker
self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event.message);
});

// Add offline messaging
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
