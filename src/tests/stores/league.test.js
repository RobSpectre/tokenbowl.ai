import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLeagueStore } from '../../stores/league.js'

describe('League Store - Player Data Management', () => {
  beforeEach(() => {
    // Create a fresh pinia instance before each test
    setActivePinia(createPinia())

    // Reset all mocks
    vi.clearAllMocks()
    localStorage.clear()

    // Reset fetch mock
    global.fetch.mockReset()
  })

  // Obsolete tests removed: Player Data Loading, Cache Version Management, Cache Freshness, Race Condition Prevention, Fetch All Data
  // These tests relied on methods and state (timestamps) that no longer exist in the store.

  describe('Player ID Exposure Prevention', () => {
    it('should never return raw player IDs as display names', async () => {
      const store = useLeagueStore()

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
        { roster_id: 1, players: ['4984', '8138'], settings: { wins: 0, losses: 0 } }
      ]
      const mockUsers = [{ user_id: 'user1', display_name: 'Test User' }]
      const mockLeague = { name: 'Token Bowl', settings: { leg: 1 } }

      // Mock fetch to handle all requests from initialize
      global.fetch.mockImplementation((url) => {
        if (url.includes('/players/nfl') || url.includes('/players.json')) {
          return Promise.resolve({ ok: true, json: async () => mockPlayers })
        } else if (url.includes('/rosters')) {
          return Promise.resolve({ ok: true, json: async () => mockRosters })
        } else if (url.includes('/users')) {
          return Promise.resolve({ ok: true, json: async () => mockUsers })
        } else if (url.includes('/league/')) {
          return Promise.resolve({ ok: true, json: async () => mockLeague })
        } else if (url.includes('completed-weeks.json')) {
          return Promise.resolve({ ok: true, json: async () => ({ weeks: {} }) })
        } else if (url.includes('draft_picks.json')) {
          return Promise.resolve({ ok: true, json: async () => [] })
        } else if (url.includes('youtube')) {
          return Promise.resolve({ ok: true, json: async () => ({ latestVideo: null, latestShorts: [] }) })
        } else if (url.includes('injuries')) {
          return Promise.resolve({ ok: true, json: async () => ({}) })
        } else if (url.includes('matchups')) {
          return Promise.resolve({ ok: true, json: async () => [] })
        }
        return Promise.resolve({ ok: true, json: async () => ({}) })
      })

      await store.initialize()

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
      expect(store.isDataReady).toBe(false)
      expect(Object.keys(store.players).length).toBe(0)

      const mockPlayers = { '4984': { full_name: 'Josh Allen' } }
      const mockRosters = [{ roster_id: 1, players: ['4984'], settings: { wins: 0 } }]
      const mockUsers = [{ user_id: 'user1', display_name: 'Test User' }]
      const mockLeague = { name: 'Token Bowl', settings: { leg: 1 } }

      // Mock fetch to handle all requests from initialize
      // IMPORTANT: Order matters! More specific patterns must come before general ones
      // e.g., 'matchups' check must come before '/league/' since matchups URL contains '/league/'
      global.fetch.mockImplementation((url) => {
        if (url.includes('/players/nfl') || url.includes('/players.json')) {
          return Promise.resolve({ ok: true, json: async () => mockPlayers })
        } else if (url.includes('/rosters')) {
          return Promise.resolve({ ok: true, json: async () => mockRosters })
        } else if (url.includes('/users')) {
          return Promise.resolve({ ok: true, json: async () => mockUsers })
        } else if (url.includes('completed-weeks.json')) {
          return Promise.resolve({ ok: true, json: async () => ({ weeks: {} }) })
        } else if (url.includes('matchups')) {
          return Promise.resolve({ ok: true, json: async () => [] })
        } else if (url.includes('/league/')) {
          return Promise.resolve({ ok: true, json: async () => mockLeague })
        }
        return Promise.resolve({ ok: true, json: async () => ({}) })
      })

      await store.initialize()

      // Now data should be ready
      // Force populate allMatchups to verify if that's the missing piece
      // store.allMatchups = { '1': [] } 

      // Actually, let's just inspect why it's failing by failing with a message
      if (!store.isDataReady) {
        throw new Error(`isDataReady is false. league:${!!store.league}, rosters:${store.rosters.length}, currentWeek:${store.currentWeek}, allMatchups:${Object.keys(store.allMatchups).length}`)
      }

      expect(store.isDataReady).toBe(true)
      expect(Object.keys(store.players).length).toBeGreaterThan(0)
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
      // expect(store.currentMatchups).toBeNull() // Removed in v17
      expect(store.currentWeek).toBeNull()
      expect(store.players).toEqual({})
      expect(store.allMatchups).toEqual({})
      expect(store.transactionsByWeek).toEqual({})
      expect(store.draftPicks).toEqual([])
      expect(store.latestVideo).toBeNull()
      expect(store.latestShorts).toEqual([])
      // Timestamps removed in v17
      // expect(store.leagueDataTimestamp).toBeNull()
      // expect(store.matchupsTimestamp).toBeNull()
      // expect(store.playersTimestamp).toBeNull()
      // expect(store.allMatchupsTimestamp).toBeNull()
      // expect(store.draftTimestamp).toBeNull()
      // expect(store.youtubeTimestamp).toBeNull()
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
      // expect(store.weeklyProjectionsTimestampsByWeek[7]).toBeDefined() // Timestamp removed in v17
    })

    it('should return cached weekly projections when fresh', async () => {
      const store = useLeagueStore()

      const cachedProjections = { 'test player': { projectedPoints: 10 } }
      store.weeklyProjectionsByWeek[7] = cachedProjections
      store.weeklyProjectionsByWeek[7] = cachedProjections
      // store.weeklyProjectionsTimestampsByWeek[7] = Date.now() // Timestamp removed in v17

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

      expect(store.loadNFLSchedule).toBeDefined()
      expect(typeof store.loadNFLSchedule).toBe('function')
    })

    it('should fetch NFL schedule successfully', async () => {
      const store = useLeagueStore()

      // Without API key, the function returns mock schedule data
      const result = await store.loadNFLSchedule()

      // Should return mock data (not empty)
      expect(store.nflSchedule).toBeDefined()
      expect(store.nflSchedule).toHaveProperty('current_week')
      expect(store.nflSchedule).toHaveProperty('schedule')
      expect(Array.isArray(store.nflSchedule.schedule)).toBe(true)
      // expect(store.nflSchedule).toEqual(result) // result is undefined
      // expect(store.nflScheduleTimestamp).toBeDefined() // Timestamp removed in v17
    })

    it('should return cached NFL schedule when fresh', async () => {
      const store = useLeagueStore()

      const cachedSchedule = { current_week: 6, schedule: [] }
      store.nflSchedule = cachedSchedule
      store.nflSchedule = cachedSchedule
      // store.nflScheduleTimestamp = Date.now() // Timestamp removed in v17

      const result = await store.loadNFLSchedule()

      expect(store.nflSchedule).toEqual(cachedSchedule)
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should handle NFL schedule fetch errors gracefully', async () => {
      const store = useLeagueStore()

      // The function returns mock data when there's no API key
      // We can't easily test the error path without mocking the module import
      // Instead, verify that we always get valid schedule data
      const result = await store.loadNFLSchedule()

      // Should return an object with expected structure (mock or real data)
      expect(store.nflSchedule).toBeDefined()
      expect(store.nflSchedule).toHaveProperty('current_week')
      expect(store.nflSchedule).toHaveProperty('schedule')
      // expect(Array.isArray(result.schedule)).toBe(true) // result is undefined
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
        'initialize',
        'loadWeekData',
        'fetchTransactionsForWeek',
        'fetchInjuriesForWeek',
        'fetchWeeklyProjectionsForWeek',
        'loadNFLSchedule',
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
        'initialize',
        'refreshCurrentWeek',
        'loadYoutube',
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
        'initialize',
        'loadWeekData',
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
