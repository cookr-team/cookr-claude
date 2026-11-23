// Cookr Native Service Worker - Offline & Cache Strategy (Self-contained, no external CDN dependencies)

const CACHE_NAME = 'cookr-cache-v8';
const IMAGES_CACHE_NAME = 'cookr-images-v8';

const PRECACHE_ASSETS = [
  '/manifest.json',
  '/icon-192.png',
  '/logo.png'
];

// Broadcast channel for offline sync triggers
let syncChannel = null;
try {
  if (typeof BroadcastChannel !== 'undefined') {
    syncChannel = new BroadcastChannel('booking-sync-channel');
  }
} catch (e) {
  // BroadcastChannel not available in worker context
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[Service Worker] Precache asset warning:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.map((name) => {
          if (name !== CACHE_NAME && name !== IMAGES_CACHE_NAME) {
            console.log('[Service Worker] Deleting outdated cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (!request || request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return;
  }

  // In development, preview, or Vite HMR environments, always bypass cache completely
  const isDevOrPreview =
    url.hostname === 'localhost' ||
    url.port === '3000' ||
    url.hostname.includes('ais-dev') ||
    url.hostname.includes('ais-pre') ||
    url.pathname.includes('/@vite/') ||
    url.pathname.includes('/@fs/') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.search.includes('v=') ||
    url.pathname.endsWith('.tsx') ||
    url.pathname.endsWith('.ts');

  // Bypass API routes, version check, Supabase endpoints, control plane, and WebSockets
  if (
    isDevOrPreview ||
    url.pathname.includes('/api/') ||
    url.pathname.includes('version.json') ||
    url.hostname.includes('supabase.co') ||
    url.pathname.includes('__aistudio_internal_control_plane') ||
    url.protocol === 'ws:' ||
    url.protocol === 'wss:'
  ) {
    return;
  }

  // 1. Navigation requests (SPA routes)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html') || caches.match('/'))
    );
    return;
  }

  // 2. Images (Unsplash, Supabase storage, avatars, static images)
  if (
    request.destination === 'image' ||
    url.hostname.includes('images.unsplash.com') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('lh3.googleusercontent.com') ||
    /\.(?:png|jpg|jpeg|svg|webp|gif|ico)$/i.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(IMAGES_CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        }).catch(() => {
          // Gracefully fail if offline and not cached
        });
      })
    );
    return;
  }

  // 3. Static scripts, styles, fonts, and assets -> Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// Background Sync Event Handlers
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-bookings' || event.tag === 'sync-data') {
    event.waitUntil(broadcastSyncTrigger());
  }
});

self.addEventListener('message', (event) => {
  if (event.data) {
    if (event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    } else if (event.data.type === 'TRIGGER_BOOKING_SYNC') {
      event.waitUntil(broadcastSyncTrigger());
    }
  }
});

// Broadcast synchronization trigger to active window clients
async function broadcastSyncTrigger() {
  if (syncChannel) {
    try {
      syncChannel.postMessage({ type: 'TRIGGER_OFFLINE_SYNC', timestamp: Date.now() });
    } catch (err) {}
  }

  try {
    const clientsList = await self.clients.matchAll({ type: 'window' });
    for (const client of clientsList) {
      client.postMessage({ type: 'TRIGGER_OFFLINE_SYNC', timestamp: Date.now() });
    }
  } catch (err) {}
}

// Web Push Event Handler (Instant Alert on Mobile/Browser even if app is closed)
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {
      title: 'Cookr - Alerta de Reserva',
      body: event.data ? event.data.text() : 'Tem uma nova notificação do seu evento.'
    };
  }

  const title = data.title || 'Cookr - Gastronomia ao Vivo';
  const options = {
    body: data.body || 'Nova atualização no seu pedido ou reserva.',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/favicon-32.png',
    vibrate: data.vibrate || [200, 100, 200, 100, 300],
    tag: data.tag || 'cookr-push-notification',
    data: data.data || { url: data.url || '/' },
    actions: data.actions || [
      { action: 'open', title: 'Ver na Cookr' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle tap / click on native notification banner
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

