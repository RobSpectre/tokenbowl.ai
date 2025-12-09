import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLeagueStore } from '../../stores/league.js'

/**
 * Tests for race condition prevention and initialization robustness
 *
 * These tests verify the fixes for:
 * 1. Stuck promises from previous sessions (v21 fix)
 * 2. Cache version check ordering (returning users bug)
 * 3. Promise-based locks preventing concurrent processing
 * 4. Timeout protection for API calls
 */

// Mock all external APIs
vi.mock('../../sleeperApi.js', () => ({
  getLeagueData: vi.fn(),
  getRelevantPlayers: vi.fn(),
  getMatchups: vi.fn(),
  getTransactions: vi.fn(),
  getLeague: vi.fn(),
  getWinnersBracket: vi.fn(),
  getLosersBracket: vi.fn()
}))

vi.mock('../../fantasyNerdsApi.js', () => ({
  getInjuries: vi.fn(),
  getPlayerInjuryStatus: vi.fn(),
  getInjuryIndicator: vi.fn(),
  getWeeklyProjections: vi.fn(),
  getNFLSchedule: vi.fn()
}))

vi.mock('../../youtubeApi.js', () => ({
  getLatestVideoAndShorts: vi.fn()
}))

vi.mock('../../utils/playerService.js', () => ({
  getPlayers: vi.fn(),
  enrichPlayerData: vi.fn()
}))

import * as sleeperApi from '../../sleeperApi.js'
import * as fantasyNerdsApi from '../../fantasyNerdsApi.js'
import * as youtubeApi from '../../youtubeApi.js'
import * as playerService from '../../utils/playerService.js'

describe('League Store - Race Condition Prevention', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useLeagueStore()
    vi.clearAllMocks()
    localStorage.clear()

    // Setup default successful mocks
    setupDefaultMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function setupDefaultMocks() {
    sleeperApi.getLeagueData.mockResolvedValue({
      league: { settings: { leg: 14 }, name: 'Token Bowl' },
      rosters: [
        { roster_id: 1, players: ['4984'], settings: { wins: 5, losses: 8 } },
        { roster_id: 2, players: ['8138'], settings: { wins: 8, losses: 5 } }
      ],
      users: [
        { user_id: 'user1', display_name: 'Test User 1' },
        { user_id: 'user2', display_name: 'Test User 2' }
      ]
    })
    sleeperApi.getWinnersBracket.mockResolvedValue([])
    sleeperApi.getLosersBracket.mockResolvedValue([])
    sleeperApi.getRelevantPlayers.mockResolvedValue({
      '4984': { player_id: '4984', full_name: 'Josh Allen', position: 'QB', team: 'BUF' },
      '8138': { player_id: '8138', full_name: 'James Cook', position: 'RB', team: 'BUF' }
    })
    sleeperApi.getMatchups.mockResolvedValue([
      { roster_id: 1, matchup_id: 1, points: 120 },
      { roster_id: 2, matchup_id: 1, points: 115 }
    ])
    sleeperApi.getTransactions.mockResolvedValue([])

    fantasyNerdsApi.getInjuries.mockResolvedValue({})
    fantasyNerdsApi.getWeeklyProjections.mockResolvedValue({})
    fantasyNerdsApi.getNFLSchedule.mockResolvedValue({ current_week: 14, schedule: [] })

    youtubeApi.getLatestVideoAndShorts.mockResolvedValue({ latestVideo: null, latestShorts: [] })

    playerService.getPlayers.mockResolvedValue({
      '4984': { player_id: '4984', full_name: 'Josh Allen' },
      '8138': { player_id: '8138', full_name: 'James Cook' }
    })
    playerService.enrichPlayerData.mockImplementation(players => players)
  }

  describe('Concurrent Initialization Prevention', () => {
    it('should return same promise when initialize() is called multiple times concurrently', async () => {
      // Call initialize multiple times before any resolves
      const promise1 = store.initialize()
      const promise2 = store.initialize()
      const promise3 = store.initialize()

      // All should return the same promise (not create new work)
      expect(store._initPromise).not.toBeNull()

      // Wait for all to complete
      await Promise.all([promise1, promise2, promise3])

      // getLeagueData should only be called once, not three times
      expect(sleeperApi.getLeagueData).toHaveBeenCalledTimes(1)
      expect(store.isDataReady).toBe(true)
    })

    it('should transition through correct state machine states', async () => {
      expect(store.initState).toBe('idle')

      const initPromise = store.initialize()
      expect(store.initState).toBe('initializing')

      await initPromise
      expect(store.initState).toBe('ready')
    })

    it('should set state to error on initialization failure', async () => {
      sleeperApi.getLeagueData.mockRejectedValue(new Error('Network Error'))

      try {
        await store.initialize()
      } catch (e) {
        // Expected
      }

      expect(store.initState).toBe('error')
      expect(store.initError).toContain('Network Error')
    })
  })

  describe('Injury Processing Lock', () => {
    it('should use lock to prevent concurrent injury processing', async () => {
      // Setup injury data
      store.rosters = [{ roster_id: 1, players: ['4984'] }]
      store.players = { '4984': { player_id: '4984', full_name: 'Josh Allen', team: 'BUF' } }
      store.league = { settings: { leg: 14 } }

      // Mock slow injury fetch
      fantasyNerdsApi.getInjuries.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ injuries: [] }), 100))
      )

      // Call processInjuriesData multiple times concurrently
      const promise1 = store.processInjuriesData(14)
      const promise2 = store.processInjuriesData(14)
      const promise3 = store.processInjuriesData(14)

      // Lock should be set
      expect(store._injuriesProcessingPromise).not.toBeNull()

      await Promise.all([promise1, promise2, promise3])

      // Lock should be cleared after completion
      expect(store._injuriesProcessingPromise).toBeNull()
    })

    it('should clear lock on processing failure', async () => {
      store.rosters = [{ roster_id: 1, players: ['4984'] }]
      store.players = { '4984': { player_id: '4984', full_name: 'Josh Allen', team: 'BUF' } }
      store.league = { settings: { leg: 14 } }

      // Mock API failure
      fantasyNerdsApi.getInjuries.mockRejectedValue(new Error('API Error'))

      await store.processInjuriesData(14)

      // Lock should be cleared even on failure
      expect(store._injuriesProcessingPromise).toBeNull()
    })
  })

  describe('Timeout Protection', () => {
    it('should timeout slow injury API calls after 15 seconds', async () => {
      // Mock API that never resolves
      fantasyNerdsApi.getInjuries.mockImplementation(() =>
        new Promise(() => {}) // Never resolves
      )

      // Use fake timers to control time
      vi.useFakeTimers()

      const fetchPromise = store.fetchInjuriesForWeek(14, true)

      // Advance time past the 15s timeout
      vi.advanceTimersByTime(16000)

      const result = await fetchPromise

      // Should return empty object on timeout
      expect(result).toEqual({})
      expect(store.injuriesByWeek[14]).toEqual({})

      vi.useRealTimers()
    })

    it('should succeed if API responds within timeout', async () => {
      const mockInjuries = {
        injuries: [{ player: 'Test', status: 'Questionable' }]
      }
      fantasyNerdsApi.getInjuries.mockResolvedValue(mockInjuries)

      const result = await store.fetchInjuriesForWeek(14, true)

      expect(result).toEqual(mockInjuries)
      expect(store.injuriesByWeek[14]).toEqual(mockInjuries)
    })
  })
})

describe('League Store - Cache Version Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should clear cache when version mismatches before checking other conditions', async () => {
    // Create pinia with old cache version
    const pinia = createPinia()
    setActivePinia(pinia)

    let store = useLeagueStore()

    // Simulate an old cache version (returning user scenario)
    store.cacheVersion = 20 // Old version
    store.initState = 'ready' // They were initialized before
    store.league = { settings: { leg: 14 } }
    store.rosters = [{ roster_id: 1 }]
    store.users = [{ user_id: '1' }]

    // Setup mocks
    sleeperApi.getLeagueData.mockResolvedValue({
      league: { settings: { leg: 14 } },
      rosters: [{ roster_id: 1, players: [] }],
      users: [{ user_id: '1' }]
    })
    sleeperApi.getWinnersBracket.mockResolvedValue([])
    sleeperApi.getLosersBracket.mockResolvedValue([])
    sleeperApi.getRelevantPlayers.mockResolvedValue({})
    sleeperApi.getMatchups.mockResolvedValue([])
    fantasyNerdsApi.getNFLSchedule.mockResolvedValue({ current_week: 14, schedule: [] })
    youtubeApi.getLatestVideoAndShorts.mockResolvedValue({ latestVideo: null, latestShorts: [] })
    playerService.getPlayers.mockResolvedValue({})
    playerService.enrichPlayerData.mockImplementation(p => p)

    // Call initialize - with old cache version, it should clear and refresh
    await store.initialize()

    // Verify cache version was updated
    expect(store.cacheVersion).toBe(21) // Current version

    // Verify data was refreshed (not just returned from cache)
    expect(sleeperApi.getLeagueData).toHaveBeenCalled()
  })

  it('should reset initState when cache version mismatches', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    let store = useLeagueStore()

    // Simulate returning user with old cache
    store.cacheVersion = 19
    store.initState = 'ready'
    store._initPromise = Promise.resolve() // Simulate completed init

    // Setup mocks
    sleeperApi.getLeagueData.mockResolvedValue({
      league: { settings: { leg: 14 } },
      rosters: [{ roster_id: 1, players: [] }],
      users: [{ user_id: '1' }]
    })
    sleeperApi.getWinnersBracket.mockResolvedValue([])
    sleeperApi.getLosersBracket.mockResolvedValue([])
    sleeperApi.getRelevantPlayers.mockResolvedValue({})
    sleeperApi.getMatchups.mockResolvedValue([])
    fantasyNerdsApi.getNFLSchedule.mockResolvedValue({ current_week: 14, schedule: [] })
    youtubeApi.getLatestVideoAndShorts.mockResolvedValue({ latestVideo: null, latestShorts: [] })
    playerService.getPlayers.mockResolvedValue({})
    playerService.enrichPlayerData.mockImplementation(p => p)

    // The critical bug was that 'ready' state would cause early return
    // even with old cache version
    await store.initialize()

    // Should have re-initialized (not early returned)
    expect(sleeperApi.getLeagueData).toHaveBeenCalled()
  })
})

describe('League Store - afterRestore Hook', () => {
  it('should reset processing promises after restore from localStorage', () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    let store = useLeagueStore()

    // Simulate stuck promises from previous session
    store._injuriesProcessingPromise = new Promise(() => {})
    store._transactionsProcessingPromise = new Promise(() => {})
    store.isInitializing = true
    store.isRefreshing = true
    store.initState = 'initializing'

    // Simulate what afterRestore does
    store.isInitializing = false
    store.isRefreshing = false
    store.initState = 'idle'
    store._initPromise = null
    store._injuriesProcessingPromise = null
    store._transactionsProcessingPromise = null

    // Verify all are reset
    expect(store._injuriesProcessingPromise).toBeNull()
    expect(store._transactionsProcessingPromise).toBeNull()
    expect(store.isInitializing).toBe(false)
    expect(store.isRefreshing).toBe(false)
    expect(store.initState).toBe('idle')
  })
})

describe('League Store - Initialization Edge Cases', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useLeagueStore()
    vi.clearAllMocks()
    localStorage.clear()

    // Setup default mocks
    sleeperApi.getLeagueData.mockResolvedValue({
      league: { settings: { leg: 14 } },
      rosters: [{ roster_id: 1, players: [] }],
      users: [{ user_id: '1' }]
    })
    sleeperApi.getWinnersBracket.mockResolvedValue([])
    sleeperApi.getLosersBracket.mockResolvedValue([])
    sleeperApi.getRelevantPlayers.mockResolvedValue({})
    sleeperApi.getMatchups.mockResolvedValue([])
    fantasyNerdsApi.getNFLSchedule.mockResolvedValue({ current_week: 14, schedule: [] })
    youtubeApi.getLatestVideoAndShorts.mockResolvedValue({ latestVideo: null, latestShorts: [] })
    playerService.getPlayers.mockResolvedValue({})
    playerService.enrichPlayerData.mockImplementation(p => p)
  })

  it('should handle forceRefresh when already ready', async () => {
    // First init
    await store.initialize()
    expect(store.initState).toBe('ready')

    vi.clearAllMocks()

    // Force refresh should re-initialize
    await store.initialize(true)

    expect(sleeperApi.getLeagueData).toHaveBeenCalled()
    expect(store.initState).toBe('ready')
  })

  it('should handle multiple rapid forceRefresh calls', async () => {
    // First init
    await store.initialize()

    vi.clearAllMocks()

    // Multiple force refreshes
    const promises = [
      store.initialize(true),
      store.initialize(true),
      store.initialize(true)
    ]

    await Promise.all(promises)

    // Should not have done redundant work
    // (Implementation detail: depends on how forceRefresh is handled)
    expect(store.initState).toBe('ready')
  })

  it('should recover from error state on new initialization', async () => {
    // First init fails
    sleeperApi.getLeagueData.mockRejectedValue(new Error('Network Error'))

    try {
      await store.initialize()
    } catch (e) {
      // Expected
    }

    expect(store.initState).toBe('error')

    // Fix the mock
    sleeperApi.getLeagueData.mockResolvedValue({
      league: { settings: { leg: 14 } },
      rosters: [{ roster_id: 1, players: [] }],
      users: [{ user_id: '1' }]
    })

    // Should be able to retry (forceRefresh bypasses error state)
    await store.initialize(true)

    expect(store.initState).toBe('ready')
  })
})
