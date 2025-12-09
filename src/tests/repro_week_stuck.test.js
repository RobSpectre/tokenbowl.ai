
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

    it('should update currentWeek when background check detects change', async () => {
        const store = useLeagueStore()

        // 1. Setup initial state (simulate cached data for Week 12)
        store.league = { settings: { leg: 12 } }
        store.currentWeek = 12
        store.rosters = [{ id: 1 }] // Dummy rosters to satisfy "cached data" check
        store.cacheVersion = 20 // Match current version

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
        await store.initialize()

        // 4. Wait for background check to complete (needs > 200ms due to setTimeout delay)
        await new Promise(resolve => setTimeout(resolve, 300))

        // 5. Verify that getLeague was called (background check)
        expect(sleeperApi.getLeague).toHaveBeenCalled()

        // 6. And check if store state updated to week 13
        expect(store.currentWeek).toBe(13)
    })
})
