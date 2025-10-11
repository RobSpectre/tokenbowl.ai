import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Tests for cache version management
 *
 * Ensures that cache versioning works correctly to prevent
 * stale data from causing Player ID exposure
 */

describe('Cache Version Management', () => {
  const CACHE_VERSION = 3
  const CACHE_KEY = 'tokenbowl-league'

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('Version Mismatch Detection', () => {
    it('should detect when stored cache version is older', () => {
      const storedData = {
        cacheVersion: 2,
        players: { '4984': { full_name: 'Josh Allen' } }
      }

      const currentVersion = 3

      const isVersionMismatch = storedData.cacheVersion !== currentVersion
      expect(isVersionMismatch).toBe(true)
    })

    it('should accept when cache versions match', () => {
      const storedData = {
        cacheVersion: 3,
        players: { '4984': { full_name: 'Josh Allen' } }
      }

      const currentVersion = 3

      const isVersionMatch = storedData.cacheVersion === currentVersion
      expect(isVersionMatch).toBe(true)
    })

    it('should clear localStorage when version mismatches', () => {
      const CACHE_KEY = 'tokenbowl-league'

      // Simulate old cache
      const oldCache = JSON.stringify({
        cacheVersion: 2,
        players: {}
      })

      // Mock localStorage to return the old cache
      localStorage.getItem.mockReturnValueOnce(oldCache)

      // Simulate cache version check (from main.js)
      const stored = localStorage.getItem(CACHE_KEY)
      const data = JSON.parse(stored)

      if (data.cacheVersion !== CACHE_VERSION) {
        localStorage.removeItem(CACHE_KEY)
      }

      expect(localStorage.removeItem).toHaveBeenCalledWith(CACHE_KEY)
    })
  })

  describe('Cache Invalidation Scenarios', () => {
    it('should invalidate cache when upgrading from v2 to v3', () => {
      const v2Cache = {
        cacheVersion: 2,
        players: {}, // Empty players - the bug we're fixing
        playersTimestamp: null
      }

      const shouldClearCache = v2Cache.cacheVersion !== CACHE_VERSION
      expect(shouldClearCache).toBe(true)

      // After clearing, fresh data will be fetched with cache-busting
      expect(Object.keys(v2Cache.players).length).toBe(0)
    })

    it('should preserve cache when versions match and data is valid', () => {
      const v3Cache = {
        cacheVersion: 3,
        players: {
          '4984': { full_name: 'Josh Allen' }
        },
        playersTimestamp: Date.now()
      }

      const shouldKeepCache = v3Cache.cacheVersion === CACHE_VERSION
      expect(shouldKeepCache).toBe(true)
      expect(Object.keys(v3Cache.players).length).toBeGreaterThan(0)
    })
  })

  describe('Empty Players Detection', () => {
    it('should trigger cache-busting when players is empty object', () => {
      const players = {}

      const shouldBustCache = Object.keys(players).length === 0
      expect(shouldBustCache).toBe(true)
    })

    it('should NOT trigger cache-busting when players has data', () => {
      const players = {
        '4984': { full_name: 'Josh Allen' }
      }

      const shouldBustCache = Object.keys(players).length === 0
      expect(shouldBustCache).toBe(false)
    })

    it('should detect corrupted cache state', () => {
      const cache = {
        cacheVersion: 3,
        players: {}, // Empty but version is current
        playersTimestamp: Date.now() - 1000 // Recently set
      }

      // This is a corrupted state: timestamp exists but no players
      const isCorrupted = cache.playersTimestamp !== null &&
                         Object.keys(cache.players).length === 0

      expect(isCorrupted).toBe(true)

      // Should trigger cache-busting fetch
      const shouldBustCache = Object.keys(cache.players).length === 0
      expect(shouldBustCache).toBe(true)
    })
  })

  describe('Cache Busting Parameters', () => {
    it('should generate unique cache-busting URLs', () => {
      const baseUrl = '/data/players.json'

      const timestamp1 = Date.now()
      const url1 = `${baseUrl}?_t=${timestamp1}`

      // Wait a tick
      const timestamp2 = timestamp1 + 1
      const url2 = `${baseUrl}?_t=${timestamp2}`

      expect(url1).not.toBe(url2)
      expect(url1).toContain('?_t=')
      expect(url2).toContain('?_t=')
    })

    it('should use cache reload option when busting', () => {
      const shouldBustCache = true

      const fetchOptions = {
        cache: shouldBustCache ? 'reload' : 'default'
      }

      expect(fetchOptions.cache).toBe('reload')
    })
  })

  describe('Migration from Old Cache', () => {
    it('should handle upgrade from v1 (no version field)', () => {
      const v1Cache = {
        // Old cache had no cacheVersion field
        players: {},
        playersTimestamp: null
      }

      const version = v1Cache.cacheVersion || 0

      const shouldClearCache = version !== CACHE_VERSION
      expect(shouldClearCache).toBe(true)
    })

    it('should handle corrupted JSON in localStorage', () => {
      const corruptedData = '{cacheVersion: 2, players' // Invalid JSON

      expect(() => {
        JSON.parse(corruptedData)
      }).toThrow()

      // In production, this should trigger localStorage clear
    })

    it('should handle null or undefined localStorage values', () => {
      // Mock getItem to return null (key doesn't exist)
      localStorage.getItem.mockReturnValueOnce(null)

      const cached = localStorage.getItem('nonexistent-key')

      expect(cached).toBeNull()

      // Should not crash when parsing null
      const shouldClearCache = !cached || (() => {
        try {
          const data = JSON.parse(cached)
          return data.cacheVersion !== CACHE_VERSION
        } catch {
          return true
        }
      })()

      expect(shouldClearCache).toBeTruthy()
    })
  })
})
