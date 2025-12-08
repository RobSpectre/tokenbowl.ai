import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import Home from '../pages/Home.vue'
import { useLeagueStore } from '../stores/league'

// Mock dependencies
const mocks = vi.hoisted(() => ({
    route: { query: {}, path: '/' },
    push: vi.fn(),
    replace: vi.fn()
}))

vi.mock('vue-router', () => ({
    useRoute: () => mocks.route,
    useRouter: () => ({
        push: mocks.push,
        replace: mocks.replace,
        currentRoute: {
            value: mocks.route
        }
    })
}))

vi.mock('@vueuse/head', () => ({
    useHead: vi.fn()
}))

vi.mock('../utils/winProbability.js', () => ({
    calculateWinProbability: vi.fn(() => ({})),
    getPlayerProjectionAndVariance: vi.fn(() => ({}))
}))

vi.mock('../analytics.js', () => ({
    trackButtonClick: vi.fn()
}))

// Helper to flush promises for async components
async function flushPromises() {
    return new Promise(resolve => setTimeout(resolve, 0));
}

describe('Home Page Redirection V2', () => {
    let wrapper

    beforeEach(() => {
        mocks.push.mockClear()
        mocks.replace.mockClear()
        mocks.route.query = {}
        mocks.route.path = '/'
    })

    const mountHome = (initialState = {}) => {
        const pinia = createPinia()
        setActivePinia(pinia)
        const store = useLeagueStore()

        // Set initial state
        store.$patch({
            league: { settings: { leg: 14 } },
            currentWeek: 14,
            players: {},
            enrichedPlayers: {},
            rosters: [{ roster_id: 1 }, { roster_id: 2 }],
            allMatchups: {
                13: [[{ roster_id: 1, points: 100 }, { roster_id: 2, points: 90 }]],
                14: [[{ roster_id: 1, points: 0 }, { roster_id: 2, points: 0 }]]
            },
            injuriesByWeek: {},
            winProbabilities: {},
            nflSchedule: { schedule: [] },
            processedTransactionStats: { byWeek: {} },
            processedInjuriesByTeam: {},
            ...initialState
        })

        // Mock actions
        store.ensureWeekLoaded = vi.fn().mockResolvedValue(true)
        store.fetchInjuriesForWeek = vi.fn().mockResolvedValue(true)
        store.getTransactionsForWeek = vi.fn().mockResolvedValue([])

        return mount(Home, {
            global: {
                plugins: [pinia],
                stubs: {
                    WinProbabilityBar: true,
                    WeekSelector: true,
                    MatchupGrid: true,
                    StandingsChart: true,
                    PointsChart: true,
                    TransactionsChart: true,
                    ModelTransactionsChart: true,
                    InjuriesChart: true,
                    ModelInjuriesChart: true,
                    LoadingScreen: true
                }
            }
        })
    }

    it('should NOT redirect when visiting root / (Smart Default)', async () => {
        // Setup: Current week is 14
        mocks.route.query = {}

        // Default mountHome sets currentWeek to 14
        wrapper = mountHome({ currentWeek: 14 })
        const store = useLeagueStore()

        // Wait for initial load
        await flushPromises()

        // Verify ensureWeekLoaded called for current week (14)
        expect(store.ensureWeekLoaded).toHaveBeenCalledWith(14)

        // Verify URL was NOT replaced/pushed
        // This is the key assertion - we want the URL to stay clean at '/'
        expect(mocks.replace).not.toHaveBeenCalled()
        expect(mocks.push).not.toHaveBeenCalled()
    })
    it('should not redirect when currentWeek updates', async () => {
        // 1. Setup: Week 13 is current
        const allMatchups = {
            13: [[{ roster_id: 1, points: 0 }, { roster_id: 2, points: 0 }]],
            12: [[{ roster_id: 1, points: 100 }, { roster_id: 2, points: 90 }]]
        }

        wrapper = mountHome({
            currentWeek: 13,
            league: { settings: { leg: 13 } },
            allMatchups
        })
        const store = useLeagueStore()

        // 2. Wait for initial load
        await flushPromises()

        // Should not redirect
        expect(mocks.push).not.toHaveBeenCalled()
        expect(mocks.replace).not.toHaveBeenCalled()

        // 3. Simulate currentWeek update (triggering the watcher)
        store.currentWeek = 12
        await wrapper.vm.$nextTick()
        store.currentWeek = 13
        await wrapper.vm.$nextTick()

        // Should still not redirect
        expect(mocks.push).not.toHaveBeenCalled()
    })
})
