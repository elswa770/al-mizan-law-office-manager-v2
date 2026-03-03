// Enhanced Service Worker for Al-Mizan Law Office Manager
// Advanced offline support with data caching and sync

const CACHE_VERSION = '2.0.0';
const STATIC_CACHE = `al-mizan-static-v${CACHE_VERSION}`;
const DATA_CACHE = `al-mizan-data-v${CACHE_VERSION}`;
const RUNTIME_CACHE = `al-mizan-runtime-v${CACHE_VERSION}`;

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/index.css',
  '/favicon.ico',
  // Add other static assets as needed
];

// API endpoints to cache
const DATA_ENDPOINTS = [
  '/api/cases',
  '/api/clients',
  '/api/hearings',
  '/api/tasks',
  '/api/users',
  '/api/locations',
  '/api/references'
];

// Install event - cache static assets and initialize data caches
self.addEventListener('install', event => {
  console.log('SW: Installing enhanced service worker v' + CACHE_VERSION);
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then(cache => {
        console.log('SW: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Initialize data cache
      caches.open(DATA_CACHE).then(cache => {
        console.log('SW: Initializing data cache');
        return cache.addAll(DATA_ENDPOINTS.map(endpoint => new Request(endpoint)));
      })
    ]).then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', event => {
  console.log('SW: Activating enhanced service worker');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE && 
              cacheName !== DATA_CACHE && 
              cacheName !== RUNTIME_CACHE) {
            console.log('SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Enhanced fetch event with intelligent caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests and external URLs (except Firebase)
  if (request.method !== 'GET' || 
      (url.origin !== self.location.origin && !url.hostname.includes('firebase'))) {
    return;
  }

  // Handle different types of requests
  if (STATIC_ASSETS.includes(url.pathname)) {
    // Cache-first for static assets
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (isDataEndpoint(url.pathname)) {
    // Network-first for data with offline fallback
    event.respondWith(networkFirst(request, DATA_CACHE));
  } else if (url.hostname.includes('firebase')) {
    // Special handling for Firebase requests
    event.respondWith(handleFirebaseRequest(request));
  } else {
    // Stale-while-revalidate for other requests
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
  }
});

// Cache-first strategy
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('SW: Cache-first fetch failed:', error);
    throw error;
  }
}

// Network-first strategy with offline fallback
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('SW: Network failed, trying cache:', request.url);
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    // Return offline fallback for data requests
    if (request.url.includes('/api/')) {
      return new Response(JSON.stringify({
        error: 'Offline',
        message: 'No internet connection',
        cached: false
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    throw error;
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });
  
  return cached || fetchPromise;
}

// Handle Firebase requests with special caching
async function handleFirebaseRequest(request) {
  const cache = await caches.open(DATA_CACHE);
  
  try {
    const response = await fetch(request);
    
    // Cache successful Firebase responses
    if (response.ok && request.method === 'GET') {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('SW: Firebase request failed, trying cache:', request.url);
    const cached = await cache.match(request);
    
    if (cached) {
      // Add offline indicator to cached response
      const modifiedResponse = new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText + ' (Offline)',
        headers: {
          ...cached.headers,
          'X-Offline': 'true'
        }
      });
      return modifiedResponse;
    }
    
    throw error;
  }
}

// Check if request is for data endpoint
function isDataEndpoint(pathname) {
  return DATA_ENDPOINTS.some(endpoint => pathname.startsWith(endpoint));
}

// Handle background sync
self.addEventListener('sync', event => {
  console.log('SW: Background sync triggered:', event.tag);
  
  switch (event.tag) {
    case 'sync-data':
      event.waitUntil(syncData());
      break;
    case 'update-check':
      event.waitUntil(checkForUpdates());
      break;
    default:
      console.log('SW: Unknown sync tag:', event.tag);
  }
});

// Sync data when back online
async function syncData() {
  try {
    console.log('SW: Starting data sync');
    
    // Get all pending actions from IndexedDB
    const pendingActions = await getPendingActions();
    
    for (const action of pendingActions) {
      try {
        await retryAction(action);
        await removePendingAction(action.id);
      } catch (error) {
        console.error('SW: Failed to sync action:', action, error);
      }
    }
    
    console.log('SW: Data sync completed');
  } catch (error) {
    console.error('SW: Data sync failed:', error);
  }
}

// Check for app updates
async function checkForUpdates() {
  try {
    const response = await fetch('/package.json');
    const latestPackage = await response.json();
    
    // Notify clients about update
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'UPDATE_AVAILABLE',
        version: latestPackage.version,
        currentVersion: CACHE_VERSION
      });
    });
  } catch (error) {
    console.error('SW: Update check failed:', error);
  }
}

// Handle messages from main thread
self.addEventListener('message', event => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'CACHE_DATA':
      cacheData(data);
      break;
    case 'GET_OFFLINE_STATUS':
      event.ports[0].postMessage({ online: navigator.onLine });
      break;
    default:
      console.log('SW: Unknown message type:', type);
  }
});

// Cache data from main thread
async function cacheData(data) {
  try {
    const cache = await caches.open(DATA_CACHE);
    
    for (const [key, value] of Object.entries(data)) {
      const request = new Request(`/api/${key}`);
      const response = new Response(JSON.stringify(value), {
        headers: { 'Content-Type': 'application/json' }
      });
      await cache.put(request, response);
    }
    
    console.log('SW: Data cached successfully');
  } catch (error) {
    console.error('SW: Failed to cache data:', error);
  }
}

// IndexedDB helpers for pending actions
async function getPendingActions() {
  // This would integrate with IndexedDB to store pending actions
  // For now, return empty array
  return [];
}

async function removePendingAction(id) {
  // Remove action from IndexedDB
  console.log('SW: Removing pending action:', id);
}

async function retryAction(action) {
  // Retry the failed action
  console.log('SW: Retrying action:', action);
  return fetch(action.url, action.options);
}

// Handle push notifications (future enhancement)
self.addEventListener('push', event => {
  console.log('SW: Push notification received');
  
  const options = {
    body: event.data.text(),
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('Al-Mizan', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('SW: Notification clicked');
  
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});

console.log('SW: Enhanced service worker loaded v' + CACHE_VERSION);
