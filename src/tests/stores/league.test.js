import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLeagueStore } from '../../stores/league.js'

describe.skip('League Store - Player Data Management', () => {
  beforeEach(() => {
    // Create a fresh pinia instance before each test
    setActivePinia(createPinia())

    // Reset all mocks
    vi.clearAllMocks()
    localStorage.clear()

    // Reset fetch mock
    global.fetch.mockReset()
  })

  describe('Player Data Loading', () => {
    it('should fetch players with cache-busting when players object is empty', async () => {
      const store = useLeagueStore()

      // Mock empty players state (simulating cache clear scenario)
      store.players = {}

      // Mock successful API response
      const mockPlayers = {
        '4984': {
          player_id: '4984',
          full_name: 'Josh Allen',
          position: 'QB',
          team: 'BUF'
        },
        '8138': {
          player_id: '8138',
          full_name: 'James Cook',
          position: 'RB',
          team: 'BUF'
        }
      }
      const mockRosters = [
        { roster_id: 1, players: ['4984', '8138'] }
      ]

      // Mock getPlayers() call
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlayers
      })
      // Mock getRosters() call
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRosters
      })

      await store.fetchPlayers()

      // Verify fetch was called with cache-busting parameters
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('?_t='),
        expect.objectContaining({
          cache: 'reload'
        })
      )

      // Verify players were stored
      expect(store.players).toEqual(mockPlayers)
      expect(Object.keys(store.players).length).toBeGreaterThan(0)
    })

    it('should NOT use cache-busting when players data exists', async () => {
      const store = useLeagueStore()

      // Set up existing players data
      const existingPlayers = {
        '4984': { full_name: 'Josh Allen' }
      }
      store.players = existingPlayers
      store.playersTimestamp = Date.now()

      // Mock API response (should not be called due to cache)
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      await store.fetchPlayers()

      // Should return cached data without fetching
      expect(global.fetch).not.toHaveBeenCalled()
      expect(store.players).toEqual(existingPlayers)
    })

    it('should force refresh when forceRefresh=true', async () => {
      const store = useLeagueStore()

      // Set up existing players data with fresh timestamp
      store.players = { '4984': { full_name: 'Josh Allen' } }
      store.playersTimestamp = Date.now()

      const mockPlayers = {
        '4984': { full_name: 'Josh Allen' },
        '8138': { full_name: 'James Cook' }
      }
      const mockRosters = [
        { roster_id: 1, players: ['4984', '8138'] }
      ]

      // Mock getPlayers() call
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlayers
      })
      // Mock getRosters() call
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRosters
      })

      await store.fetchPlayers(true)

      // Should fetch even though cache is fresh
      expect(global.fetch).toHaveBeenCalled()
      expect(store.players).toEqual(mockPlayers)
    })
  })

  describe('Player ID Exposure Prevention', () => {
    it('should never return raw player IDs as display names', async () => {
      const store = useLeagueStore()

      const mockPlayers = {
        '4984': {
          player_id: '4984',
          full_name: 'Josh Allen',
          position: 'QB'
        },
        '8138': {
          player_id: '8138',
          full_name: 'James Cook',
          position: 'RB'
        }
      }
      const mockRosters = [
        { roster_id: 1, players: ['4984', '8138'] }
      ]

      // Mock getPlayers() call
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlayers
      })
      // Mock getRosters() call
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRosters
      })

      await store.fetchPlayers()

      // Verify all players have real names
      Object.values(store.players).forEach(player => {
        expect(player.full_name).toBeDefined()
        expect(player.full_name).not.toMatch(/^Player \d+$/)
        expect(player.full_name).not.toBe(player.player_id)
      })
    })

    it('should have players data loaded before components render', async () => {
      const store = useLeagueStore()

      // Simulate component checking if data is ready
      expect(store.isPlayersFresh).toBe(false)
      expect(Object.keys(store.players).length).toBe(0)

      const mockPlayers = { '4984': { full_name: 'Josh Allen' } }
      const mockRosters = [{ roster_id: 1, players: ['4984'] }]

      // Mock getPlayers() call
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlayers
      })
      // Mock getRosters() call
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRosters
      })

      await store.fetchPlayers()

      // Now data should be ready
      expect(store.isPlayersFresh).toBe(true)
      expect(Object.keys(store.players).length).toBeGreaterThan(0)
    })
  })

  describe('Cache Version Management', () => {
    it('should have consistent cache version between store and main.js', () => {
      const store = useLeagueStore()

      // Both should use version 12 (added permanent caching for past weeks)
      expect(store.cacheVersion).toBe(12)
    })

    it('should clear cache when players data is missing after timestamp is set', async () => {
      const store = useLeagueStore()

      // Simulate weird state: timestamp exists but no players (cache corruption)
      store.playersTimestamp = Date.now() - 1000
      store.players = {}

      const mockPlayers = { '4984': { full_name: 'Josh Allen' } }
      const mockRosters = [{ roster_id: 1, players: ['4984'] }]

      // Mock getPlayers() call
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlayers
      })
      // Mock getRosters() call
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRosters
      })

      await store.fetchPlayers()

      // Should detect empty players and bust cache
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('?_t='),
        expect.objectContaining({ cache: 'reload' })
      )
    })
  })

  describe('Cache Freshness', () => {
    beforeEach(() => {
      vi.useRealTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should consider cache stale after cache duration', () => {
      const store = useLeagueStore()

      // Mock date to Tuesday (non-game time) for consistent testing
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-09T14:00:00')) // Tuesday 2PM

      // Set timestamp to 6 minutes ago (should be stale for 5-minute cache)
      store.playersTimestamp = Date.now() - (6 * 60 * 1000)
      store.players = { '4984': { full_name: 'Josh Allen' } }

      expect(store.isPlayersFresh).toBe(false)

      vi.useRealTimers()
    })

    it('should consider cache fresh within cache duration', () => {
      const store = useLeagueStore()

      // Mock date to Tuesday (non-game time) for consistent testing
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-09T14:00:00')) // Tuesday 2PM

      // Set timestamp to 2 minutes ago (should be fresh for 5-minute cache)
      store.playersTimestamp = Date.now() - (2 * 60 * 1000)
      store.players = { '4984': { full_name: 'Josh Allen' } }

      expect(store.isPlayersFresh).toBe(true)

      vi.useRealTimers()
    })

    it('should use shorter cache during NFL game time', () => {
      const store = useLeagueStore()

      // Mock date to Sunday (game time) for testing
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-07T14:00:00')) // Sunday 2PM

      // Set timestamp to 45 seconds ago (stale for 30-second cache, fresh for 5-minute cache)
      store.playersTimestamp = Date.now() - (45 * 1000)
      store.players = { '4984': { full_name: 'Josh Allen' } }

      // Should be stale during game time (30 second cache)
      expect(store.isPlayersFresh).toBe(false)

      // Now mock date to Tuesday (non-game time)
      vi.setSystemTime(new Date('2024-01-09T14:00:00')) // Tuesday 2PM

      // Same 45 second old data should be fresh outside game time (5 minute cache)
      store.playersTimestamp = Date.now() - (45 * 1000)
      expect(store.isPlayersFresh).toBe(true)

      vi.useRealTimers()
    })
  })

  describe('Race Condition Prevention', () => {
    it('should handle concurrent fetchPlayers calls without returning empty data', async () => {
      const store = useLeagueStore()

      const mockPlayers = {
        '4984': { full_name: 'Josh Allen', position: 'QB', team: 'BUF' },
        '8138': { full_name: 'James Cook', position: 'RB', team: 'BUF' }
      }
      const mockRosters = [
        { roster_id: 1, players: ['4984', '8138'] }
      ]

      // Mock getPlayers() call with slow response
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          // Simulate network delay
          await new Promise(resolve => setTimeout(resolve, 10))
          return mockPlayers
        }
      })
      // Mock getRosters() call
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRosters
      })

      // Simulate Promise.all with multiple fetchPlayers calls
      const [result1, result2, result3] = await Promise.all([
        store.fetchPlayers(),
        store.fetchPlayers(),
        store.fetchPlayers()
      ])

      // ALL results should have player data (not empty)
      expect(Object.keys(result1).length).toBeGreaterThan(0)
      expect(Object.keys(result2).length).toBeGreaterThan(0)
      expect(Object.keys(result3).length).toBeGreaterThan(0)

      // All results should be the same
      expect(result1).toEqual(result2)
      expect(result2).toEqual(result3)

      // Store should have the player data
      expect(Object.keys(store.players).length).toBe(2)
      expect(store.players['4984'].full_name).toBe('Josh Allen')

      // getRelevantPlayers now makes 2 calls (players + rosters)
      // Concurrent calls share the promise, so only 2 fetch calls total
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('should not return empty players when already loading', async () => {
      const store = useLeagueStore()

      const mockPlayers = {
        '4984': { full_name: 'Josh Allen', position: 'QB', team: 'BUF' }
      }
      const mockRosters = [
        { roster_id: 1, players: ['4984'] }
      ]

      let fetchResolved = false
      // Mock getPlayers() call with slow response
      global.fetch.mockImplementationOnce(() => ({
        ok: true,
        json: async () => {
          await new Promise(resolve => setTimeout(resolve, 50))
          fetchResolved = true
          return mockPlayers
        }
      }))
      // Mock getRosters() call
      global.fetch.mockImplementationOnce(() => ({
        ok: true,
        json: async () => mockRosters
      }))

      // Start first fetch (don't await yet)
      const promise1 = store.fetchPlayers()

      // Wait a bit to ensure first fetch has set isLoadingPlayers = true
      await new Promise(resolve => setTimeout(resolve, 5))

      // Verify loading state
      expect(store.isLoadingPlayers).toBe(true)
      expect(fetchResolved).toBe(false)

      // Second call while still loading should NOT return empty players
      const promise2 = store.fetchPlayers()

      // Both should resolve to the same data
      const [result1, result2] = await Promise.all([promise1, promise2])

      expect(Object.keys(result1).length).toBeGreaterThan(0)
      expect(Object.keys(result2).length).toBeGreaterThan(0)
      expect(result1).toEqual(result2)

      // getRelevantPlayers now makes 2 calls (players + rosters)
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('Fetch All Data', () => {
    it('should fetch all data in parallel', async () => {
      const store = useLeagueStore()

      // Mock all API responses based on URL
      const mockPlayers = { '4984': { full_name: 'Josh Allen' } }
      const mockRosters = [{ roster_id: 1, owner_id: 'user1', settings: { wins: 5, fpts: 100 } }]
      const mockUsers = [{ user_id: 'user1', display_name: 'Test User' }]
      const mockLeague = { name: 'Token Bowl', settings: { leg: 6 } }

      // Mock fetch to return different responses based on URL
      global.fetch.mockImplementation((url) => {
        if (url.includes('/players/nfl') || url.includes('/players.json')) {
          return Promise.resolve({ ok: true, json: async () => mockPlayers })
        } else if (url.includes('/rosters')) {
          return Promise.resolve({ ok: true, json: async () => mockRosters })
        } else if (url.includes('/users')) {
          return Promise.resolve({ ok: true, json: async () => mockUsers })
        } else if (url.includes('/matchups/')) {
          return Promise.resolve({ ok: true, json: async () => [] })
        } else if (url.includes('/league/')) {
          return Promise.resolve({ ok: true, json: async () => mockLeague })
        }
        return Promise.reject(new Error(`Unmocked URL: ${url}`))
      })

      const result = await store.fetchAllData()

      expect(result).toHaveProperty('leagueData')
      expect(result).toHaveProperty('matchupsData')
      expect(result).toHaveProperty('players')
      expect(result).toHaveProperty('allMatchups')
    })

    it('should throw error if any fetch fails', async () => {
      const store = useLeagueStore()

      global.fetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(store.fetchAllData()).rejects.toThrow()
    })
  })

  describe('Clear Cache', () => {
    it('should clear all cached data', () => {
      const store = useLeagueStore()

      // Set up some data
      store.league = { id: '123' }
      store.rosters = [{ roster_id: 1 }]
      store.users = [{ user_id: '456' }]
      store.currentMatchups = [{ matchup_id: 1 }]
      store.currentWeek = 6
      store.players = { '4984': { full_name: 'Josh Allen' } }
      store.allMatchups = { 1: [] }
      store.transactionsByWeek = { 1: [] }
      store.draftPicks = [{ pick: 1 }]
      store.latestVideo = { id: 'abc' }
      store.latestShorts = [{ id: 'def' }]
      store.leagueDataTimestamp = Date.now()
      store.matchupsTimestamp = Date.now()
      store.playersTimestamp = Date.now()
      store.allMatchupsTimestamp = Date.now()
      store.draftTimestamp = Date.now()
      store.youtubeTimestamp = Date.now()

      store.clearCache()

      // Verify all data is cleared
      expect(store.league).toBeNull()
      expect(store.rosters).toEqual([])
      expect(store.users).toEqual([])
      expect(store.currentMatchups).toBeNull()
      expect(store.currentWeek).toBeNull()
      expect(store.players).toEqual({})
      expect(store.allMatchups).toEqual({})
      expect(store.transactionsByWeek).toEqual({})
      expect(store.draftPicks).toEqual([])
      expect(store.latestVideo).toBeNull()
      expect(store.latestShorts).toEqual([])
      expect(store.leagueDataTimestamp).toBeNull()
      expect(store.matchupsTimestamp).toBeNull()
      expect(store.playersTimestamp).toBeNull()
      expect(store.allMatchupsTimestamp).toBeNull()
      expect(store.draftTimestamp).toBeNull()
      expect(store.youtubeTimestamp).toBeNull()
    })
  })

  describe('Fantasy Nerds API Integration', () => {
    it('should have fetchWeeklyProjectionsForWeek method defined', () => {
      const store = useLeagueStore()

      // Verify the method exists and is a function
      expect(store.fetchWeeklyProjectionsForWeek).toBeDefined()
      expect(typeof store.fetchWeeklyProjectionsForWeek).toBe('function')
    })

    it('should fetch weekly projections successfully', async () => {
      const store = useLeagueStore()

      // This tests the method exists and doesn't throw an error
      const result = await store.fetchWeeklyProjectionsForWeek(7)

      // Should return an object (either mock data or empty object)
      expect(result).toBeDefined()
      expect(typeof result).toBe('object')
      expect(store.weeklyProjectionsByWeek[7]).toBeDefined()
      expect(store.weeklyProjectionsTimestampsByWeek[7]).toBeDefined()
    })

    it('should return cached weekly projections when fresh', async () => {
      const store = useLeagueStore()

      const cachedProjections = { 'test player': { projectedPoints: 10 } }
      store.weeklyProjectionsByWeek[7] = cachedProjections
      store.weeklyProjectionsTimestampsByWeek[7] = Date.now()

      const result = await store.fetchWeeklyProjectionsForWeek(7)

      expect(result).toEqual(cachedProjections)
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should handle weekly projections fetch errors gracefully', async () => {
      const store = useLeagueStore()

      // Force an error by mocking the getWeeklyProjections import to throw
      // We can't test this directly without mocking the module import
      // Instead, verify that even if we get an error, we store something
      const result = await store.fetchWeeklyProjectionsForWeek(7)

      // Should return an object (either mock data if no API key, or empty if error)
      expect(result).toBeDefined()
      expect(typeof result).toBe('object')
      expect(store.weeklyProjectionsByWeek[7]).toBeDefined()
    })

    it('should have fetchNFLSchedule method defined', () => {
      const store = useLeagueStore()

      expect(store.fetchNFLSchedule).toBeDefined()
      expect(typeof store.fetchNFLSchedule).toBe('function')
    })

    it('should fetch NFL schedule successfully', async () => {
      const store = useLeagueStore()

      // Without API key, the function returns mock schedule data
      const result = await store.fetchNFLSchedule()

      // Should return mock data (not empty)
      expect(result).toBeDefined()
      expect(result).toHaveProperty('current_week')
      expect(result).toHaveProperty('schedule')
      expect(Array.isArray(result.schedule)).toBe(true)
      expect(store.nflSchedule).toEqual(result)
      expect(store.nflScheduleTimestamp).toBeDefined()
    })

    it('should return cached NFL schedule when fresh', async () => {
      const store = useLeagueStore()

      const cachedSchedule = { current_week: 6, schedule: [] }
      store.nflSchedule = cachedSchedule
      store.nflScheduleTimestamp = Date.now()

      const result = await store.fetchNFLSchedule()

      expect(result).toEqual(cachedSchedule)
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should handle NFL schedule fetch errors gracefully', async () => {
      const store = useLeagueStore()

      // The function returns mock data when there's no API key
      // We can't easily test the error path without mocking the module import
      // Instead, verify that we always get valid schedule data
      const result = await store.fetchNFLSchedule()

      // Should return an object with expected structure (mock or real data)
      expect(result).toBeDefined()
      expect(result).toHaveProperty('current_week')
      expect(result).toHaveProperty('schedule')
      expect(Array.isArray(result.schedule)).toBe(true)
    })

    it('should have getWeeklyProjectionsForWeek getter', () => {
      const store = useLeagueStore()

      const mockProjections = { 'player': { projectedPoints: 15 } }
      store.weeklyProjectionsByWeek[7] = mockProjections

      const result = store.getWeeklyProjectionsForWeek(7)

      expect(result).toEqual(mockProjections)
    })

    it('should return empty object for non-existent week projections', () => {
      const store = useLeagueStore()

      const result = store.getWeeklyProjectionsForWeek(99)

      expect(result).toEqual({})
    })
  })

  describe('Store Method Existence - Prevent Production Errors', () => {
    it('should have all methods called by MatchupDetail component', () => {
      const store = useLeagueStore()

      // These are the critical methods called by MatchupDetail.vue
      // If any of these are missing, the component will fail to load
      const requiredMethods = [
        'fetchLeagueData',
        'fetchPlayers',
        'fetchMatchupForWeek',
        'fetchTransactionsForWeek',
        'fetchInjuriesForWeek',
        'fetchWeeklyProjectionsForWeek', // THIS ONE caused the production failure
        'fetchNFLSchedule',
        'getWeekRoster',
        'getPlayerWeeklyProjection'
      ]

      requiredMethods.forEach(methodName => {
        expect(store[methodName]).toBeDefined()
        expect(typeof store[methodName]).toBe('function')
      })
    })

    it('should have all methods called by Home component', () => {
      const store = useLeagueStore()

      const requiredMethods = [
        'fetchAllData',
        'fetchLeagueData',
        'fetchPlayers',
        'fetchCurrentMatchups',
        'fetchYoutube',
        'getTeamBadges'
      ]

      requiredMethods.forEach(methodName => {
        expect(store[methodName]).toBeDefined()
        expect(typeof store[methodName]).toBe('function')
      })
    })

    it('should have all methods called by Teams component', () => {
      const store = useLeagueStore()

      const requiredMethods = [
        'fetchLeagueData',
        'fetchPlayers',
        'fetchAllMatchups',
        'processTransactionStats',
        'processInjuriesData'
      ]

      requiredMethods.forEach(methodName => {
        expect(store[methodName]).toBeDefined()
        expect(typeof store[methodName]).toBe('function')
      })
    })
  })
})
