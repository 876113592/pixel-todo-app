const CACHE_NAME = 'pixel-todo-v1.0';
const API_CACHE_NAME = 'pixel-todo-api-v1.0';
const STATIC_CACHE_NAME = 'pixel-todo-static-v1.0';

// Static resources to cache
const STATIC_RESOURCES = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/pixel.css',
  '/css/mobile.css',
  '/js/app.js',
  '/js/api.js',
  '/js/storage.js',
  '/js/gestures.js',
  '/manifest.json',
  '/assets/icons/icon.svg'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/todos',
  '/api/health'
];

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');

  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('[SW] Caching static resources');
        return cache.addAll(STATIC_RESOURCES);
      }),
      caches.open(API_CACHE_NAME).then((cache) => {
        console.log('[SW] API cache initialized');
        return cache;
      })
    ])
  );

  // Force activation of new service worker
  self.skipWaiting();
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (![CACHE_NAME, API_CACHE_NAME, STATIC_CACHE_NAME].includes(cacheName)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim all clients
      self.clients.claim()
    ])
  );
});

// Fetch event - intelligent caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
    return;
  }

  // Handle static resources
  event.respondWith(handleStaticRequest(request));
});

// Handle API requests with network-first strategy
async function handleAPIRequest(request) {
  const cache = await caches.open(API_CACHE_NAME);

  try {
    // Try network first
    const response = await fetch(request);

    if (response.ok) {
      // Cache successful responses
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[SW] Network failed for API request, serving from cache:', request.url);

    // Fallback to cache
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline response for todos endpoint
    if (request.url.includes('/api/todos')) {
      return new Response(JSON.stringify([]), {
        headers: {
          'Content-Type': 'application/json',
          'SW-Source': 'offline-fallback'
        }
      });
    }

    // Return generic offline response
    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'No cached data available'
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'SW-Source': 'offline-fallback'
      }
    });
  }
}

// Handle static resources with cache-first strategy
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);

  // Try cache first
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // Serve from cache and update in background
    updateCacheInBackground(request, cache);
    return cachedResponse;
  }

  try {
    // Fetch from network
    const response = await fetch(request);

    if (response.ok) {
      // Cache the response
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[SW] Network failed for static request:', request.url);

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlineResponse = await cache.match('/');
      return offlineResponse || new Response('Offline');
    }

    throw error;
  }
}

// Update cache in background (stale-while-revalidate)
async function updateCacheInBackground(request, cache) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      cache.put(request, response.clone());
    }
  } catch (error) {
    // Silent fail for background updates
    console.log('[SW] Background cache update failed:', request.url);
  }
}

// Message handling for cache management
self.addEventListener('message', (event) => {
  const { action, data } = event.data;

  switch (action) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'GET_CACHE_STATUS':
      getCacheStatus().then((status) => {
        event.ports[0].postMessage({ status });
      });
      break;

    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;

    case 'CACHE_TODOS':
      if (data && data.todos) {
        cacheTodosData(data.todos);
      }
      break;

    default:
      console.log('[SW] Unknown message action:', action);
  }
});

// Get cache status information
async function getCacheStatus() {
  const staticCache = await caches.open(STATIC_CACHE_NAME);
  const apiCache = await caches.open(API_CACHE_NAME);

  const staticKeys = await staticCache.keys();
  const apiKeys = await apiCache.keys();

  return {
    staticCacheSize: staticKeys.length,
    apiCacheSize: apiKeys.length,
    totalSize: staticKeys.length + apiKeys.length,
    lastUpdated: new Date().toISOString()
  };
}

// Clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();

  await Promise.all(
    cacheNames.map((cacheName) => caches.delete(cacheName))
  );

  console.log('[SW] All caches cleared');
}

// Cache todos data for offline access
async function cacheTodosData(todos) {
  const cache = await caches.open(API_CACHE_NAME);

  const todosResponse = new Response(JSON.stringify(todos), {
    headers: {
      'Content-Type': 'application/json',
      'SW-Source': 'manual-cache'
    }
  });

  await cache.put('/api/todos', todosResponse);
  console.log('[SW] Todos data cached manually');
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-todos') {
    console.log('[SW] Background sync: sync-todos');
    event.waitUntil(syncOfflineTodos());
  }
});

// Sync offline todos when connection is restored
async function syncOfflineTodos() {
  try {
    // This would communicate with the main app to sync offline changes
    const clients = await self.clients.matchAll();

    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_OFFLINE_TODOS',
        timestamp: Date.now()
      });
    });

    console.log('[SW] Offline todos sync initiated');
  } catch (error) {
    console.error('[SW] Failed to sync offline todos:', error);
  }
}

// Notification handling for PWA
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Handle notification clicks
  if (event.action === 'view-todos') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New todo reminder',
    icon: '/assets/icons/icon.svg',
    badge: '/assets/icons/icon.svg',
    actions: [
      { action: 'view-todos', title: '查看任务' }
    ],
    data: {
      timestamp: Date.now()
    }
  };

  event.waitUntil(
    self.registration.showNotification('Pixel Todo', options)
  );
});

console.log('[SW] Service worker script loaded');