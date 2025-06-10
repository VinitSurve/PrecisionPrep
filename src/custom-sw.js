// Custom Service Worker for PrecisionPrep

// Skip waiting and claim clients immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  console.log('Service Worker installed');
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
  console.log('Service Worker activated');
});

// Critical fix: Never cache authentication requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Handle auth endpoints with direct network requests (never cached)
  if (url.pathname.includes('/auth/v1') || 
      url.pathname.includes('/auth/session') || 
      url.pathname.includes('/token')) {
    event.respondWith(
      fetch(event.request, { 
        credentials: 'same-origin',
        cache: 'no-store'
      })
    );
    return;
  }
  
  // For other requests, use default handler
  // Don't override the default handler so workbox can manage caching
});

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});