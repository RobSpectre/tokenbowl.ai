import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useLeagueStore } from '../stores/league'

// Mock dependencies
vi.mock('../sleeperApi.js', () => ({
    getLeagueData: vi.fn(),
    getRelevantPlayers: vi.fn(),
    getMatchups: vi.fn(),
    getTransactions: vi.fn(),
    getLeague: vi.fn(),
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

describe('League Store Initialization', () => {
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

    it('should initialize successfully', async () => {
        await store.initialize()

        expect(store.isDataReady).toBe(true)
        expect(store.initError).toBeNull()
        expect(store.currentWeek).toBe(13)
    })

    it('should handle getLeagueData failure', async () => {
        sleeperApi.getLeagueData.mockRejectedValue(new Error('API Error'))

        try {
            await store.initialize()
        } catch (e) {
            // Expected
        }

        expect(store.isDataReady).toBe(false)
        expect(store.initError).toBe('League Data Load Failed: API Error')
    })
})
