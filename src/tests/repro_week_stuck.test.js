
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLeagueStore } from '../stores/league'
import * as sleeperApi from '../sleeperApi'

// Mock sleeperApi
vi.mock('../sleeperApi', () => ({
    getLeague: vi.fn(),
    getLeagueData: vi.fn(),
    getRelevantPlayers: vi.fn(),
    getMatchups: vi.fn(),
    getTransactions: vi.fn(),
    getLeagueUsers: vi.fn(),
    getRosters: vi.fn()
}))

describe('League Store Week Advancement', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    it('should update currentWeek from 12 to 13 when background check detects change', async () => {
        const store = useLeagueStore()

        // 1. Setup initial state (simulate cached data for Week 12)
        store.league = { settings: { leg: 12 } }
        store.currentWeek = 12
        store.rosters = [{ id: 1 }] // Dummy rosters to satisfy "cached data" check
        store.cacheVersion = 19 // Match current version

        // 2. Mock API to return Week 13
        sleeperApi.getLeague.mockResolvedValue({
            settings: { leg: 13 }
        })

        // Mock getLeagueData for the full refresh
        sleeperApi.getLeagueData.mockResolvedValue({
            league: { settings: { leg: 13 } },
            rosters: [{ id: 1 }],
            users: []
        })

        sleeperApi.getRelevantPlayers.mockResolvedValue({})
        sleeperApi.getMatchups.mockResolvedValue([])

        // 3. Call initialize()
        // This should return immediately because of cache, but trigger background check
        await store.initialize()

        // Expect currentWeek to still be 12 initially (immediate return)
        expect(store.currentWeek).toBe(12)

        // 4. Wait for background check to complete
        // We need to wait for promises to resolve. 
        // Since the background check is a promise chain not returned by initialize,
        // we use a small delay or wait for the mock to be called.

        await new Promise(resolve => setTimeout(resolve, 100))

        // 5. Verify that initialize(true) was called and updated the week
        // We can check if getLeagueData was called (which happens in full refresh)
        expect(sleeperApi.getLeagueData).toHaveBeenCalled()

        // And check if store state updated
        expect(store.currentWeek).toBe(13)
    })
})
