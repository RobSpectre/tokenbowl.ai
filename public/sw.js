/**
 * Kill-switch service worker
 *
 * This service worker's only job is to:
 * 1. Take control immediately
 * 2. Clear all caches
 * 3. Unregister itself
 *
 * This breaks the cycle of cached content from other service workers.
 */

// Take control immediately on install
self.addEventListener('install', (event) => {
  console.log('[SW] Kill-switch service worker installing...')
  self.skipWaiting()
})

// Claim all clients and clear caches on activate
self.addEventListener('activate', (event) => {
  console.log('[SW] Kill-switch service worker activating...')

  event.waitUntil(
    (async () => {
      // Claim all clients immediately
      await self.clients.claim()

      // Clear ALL caches
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames.map(cacheName => {
          console.log('[SW] Deleting cache:', cacheName)
          return caches.delete(cacheName)
        })
      )

      console.log('[SW] All caches cleared, unregistering self...')

      // Unregister this service worker
      const registration = await self.registration.unregister()
      console.log('[SW] Unregistered:', registration)

      // Tell all clients to reload
      const clients = await self.clients.matchAll({ type: 'window' })
      clients.forEach(client => {
        client.postMessage({ type: 'RELOAD' })
      })
    })()
  )
})

// Don't cache anything - pass through all requests
self.addEventListener('fetch', (event) => {
  // Just pass through to network, don't cache
  event.respondWith(fetch(event.request))
})
