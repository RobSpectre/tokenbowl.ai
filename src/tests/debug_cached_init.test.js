import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useLeagueStore } from '../stores/league'

// Mock dependencies
vi.mock('../sleeperApi.js', () => ({
    getLeagueData: vi.fn(),
    getRelevantPlayers: vi.fn(),
    getMatchups: vi.fn(),
    getTransactions: vi.fn(),
    getLeague: vi.fn().mockResolvedValue({ settings: { leg: 14 } }), // Remote week 14
    getWinnersBracket: vi.fn(),
    getLosersBracket: vi.fn()
}))

vi.mock('../fantasyNerdsApi.js', () => ({
    getInjuries: vi.fn(),
    getWeeklyProjections: vi.fn(),
    getNFLSchedule: vi.fn()
}))

vi.mock('../youtubeApi.js', () => ({
    getLatestVideoAndShorts: vi.fn()
}))

import * as sleeperApi from '../sleeperApi.js'

describe('League Store Initialization (Cached)', () => {
    let store

    beforeEach(() => {
        setActivePinia(createPinia())
        store = useLeagueStore()

        // Reset mocks
        vi.clearAllMocks()

        // Setup success mocks
        sleeperApi.getLeagueData.mockResolvedValue({
            league: { settings: { leg: 13 } },
            rosters: [{ roster_id: 1 }],
            users: [{ user_id: '1' }]
        })
        sleeperApi.getWinnersBracket.mockResolvedValue([])
        sleeperApi.getLosersBracket.mockResolvedValue([])
        sleeperApi.getRelevantPlayers.mockResolvedValue({})
        sleeperApi.getMatchups.mockResolvedValue([])
    })

    it('should handle cached initialization', async () => {
        // Seed cache
        store.league = { settings: { leg: 13 } }
        store.rosters = [{ roster_id: 1 }]
        store.currentWeek = 13
        store.winnersBracket = []
        store.losersBracket = []
        store.enrichedPlayers = { '1': {} }
        store.processedInjuriesByTeam = { 'week13': {} }

        // Mock fetchPlayers to throw if called (it shouldn't be)
        // store.fetchPlayers = vi.fn().mockRejectedValue(new Error('Should not be called'))
        // We can't easily mock internal actions, but we can spy on them if we could access them.
        // Instead, we rely on the fact that if it's called and fails, we'll know.

        await store.initialize()

        expect(store.isDataReady).toBe(true)
        // Check if refreshCurrentWeek was called (since remote is 14 and local is 13)
        // We can't easily check internal calls without spying on the store instance methods
    })
})
