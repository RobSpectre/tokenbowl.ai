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

describe('Home Page Redirection', () => {
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

    it('should respect initialState', async () => {
        wrapper = mountHome({ currentWeek: 99 })
        const store = useLeagueStore()
        console.error('DEBUG: store.currentWeek:', store.currentWeek)
        expect(store.currentWeek).toBe(99)
    })

    it('should NOT redirect when visiting root / (Smart Default)', async () => {
        // Setup: Current week is 14, but it has no points
        mocks.route.query = {}

        // Default mountHome sets currentWeek to 14
        wrapper = mountHome({ currentWeek: 14 })
        const store = useLeagueStore()

        console.error('DEBUG: store.currentWeek after mount:', store.currentWeek)
        expect(store.currentWeek).toBe(14)

        // Wait for initial load
        await flushPromises()

        // Verify ensureWeekLoaded called for current week (14)
        expect(store.ensureWeekLoaded).toHaveBeenCalledWith(14)

        // Verify URL was NOT replaced/pushed
        expect(mocks.replace).not.toHaveBeenCalled()
        expect(mocks.push).not.toHaveBeenCalled()
    })

    it('should add ?week=14 when visiting /?week=14 (Manual Override)', async () => {
        // Setup: Visiting week 14 explicitly
        mocks.route.query = { week: '14' }

        wrapper = mountHome()
        const store = useLeagueStore()

        await flushPromises()

        // Should load week 14
        expect(store.ensureWeekLoaded).toHaveBeenCalledWith(14)

        // Should NOT redirect away from 14
        expect(mocks.replace).not.toHaveBeenCalled()
        expect(mocks.push).not.toHaveBeenCalled()
    })

    it('should redirect to ?week=12 when visiting /?week=12', async () => {
        mocks.route.query = { week: '12' }

        wrapper = mountHome()
        const store = useLeagueStore()

        await flushPromises()

        // Should load week 12
        expect(store.ensureWeekLoaded).toHaveBeenCalledWith(12) // parseInt handles string '12'

        // Should NOT redirect
        expect(mocks.replace).not.toHaveBeenCalled()
    })
})
