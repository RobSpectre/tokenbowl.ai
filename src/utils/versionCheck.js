/**
 * Version checker utility
 *
 * Compares the version baked into the JS bundle with the latest version.json
 * from the server. If they don't match, forces a reload to get fresh code.
 *
 * This solves the GitHub Pages caching problem where old HTML serves old JS.
 */

// Version baked into this JS bundle at build time
const CURRENT_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'

/**
 * Unregister all service workers and clear caches
 * This prevents third-party scripts (like PostHog) from caching stale content
 */
async function clearServiceWorkersAndCaches() {
  try {
    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      for (const registration of registrations) {
        await registration.unregister()
        console.log('[version] Unregistered service worker:', registration.scope)
      }
    }

    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName)
        console.log('[version] Deleted cache:', cacheName)
      }
    }
  } catch (error) {
    console.warn('[version] Error clearing service workers/caches:', error)
  }
}

/**
 * Check if the app version is stale and needs a reload
 * @returns {Promise<boolean>} true if reload was triggered
 */
export async function checkForUpdates() {
  // Skip in development
  if (import.meta.env.DEV) {
    console.log('[version] Skipping version check in development')
    return false
  }

  try {
    // Fetch version.json with cache-busting query param
    const response = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store'
    })

    if (!response.ok) {
      console.warn('[version] Could not fetch version.json')
      return false
    }

    const data = await response.json()
    const serverVersion = data.version

    console.log('[version] Current:', CURRENT_VERSION, 'Server:', serverVersion)

    if (CURRENT_VERSION !== 'dev' && serverVersion !== CURRENT_VERSION) {
      console.log('[version] Version mismatch detected, clearing caches and reloading...')

      // Clear service workers and caches before reloading
      await clearServiceWorkersAndCaches()

      // Add a small delay so the log message is visible, then reload
      setTimeout(() => {
        window.location.reload()
      }, 100)

      return true
    }

    console.log('[version] App is up to date')
    return false
  } catch (error) {
    console.warn('[version] Error checking version:', error)
    return false
  }
}

/**
 * Get the current app version
 */
export function getCurrentVersion() {
  return CURRENT_VERSION
}
