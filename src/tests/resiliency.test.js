import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import { defineComponent, h } from 'vue'
import App from '../App.vue'
import LoadingScreen from '../components/LoadingScreen.vue'
import ErrorState from '../components/ErrorState.vue'
import { useLeagueStore } from '../stores/league.js'

// Mock components to avoid rendering full app complexity
vi.mock('../components/LoadingScreen.vue', () => ({
    default: {
        name: 'LoadingScreen',
        template: '<div data-test="loading-screen">Loading...</div>',
        props: ['message']
    }
}))

vi.mock('../components/ErrorState.vue', () => ({
    default: {
        name: 'ErrorState',
        template: '<div data-test="error-state">Error</div>',
        props: ['error'],
        emits: ['retry']
    }
}))

// Mock router
const mockRoute = { path: '/' }
const mockRouter = {
    push: vi.fn(),
    replace: vi.fn()
}

vi.mock('vue-router', () => ({
    useRoute: () => mockRoute,
    useRouter: () => mockRouter,
    RouterLink: { template: '<a><slot /></a>' }
}))

// Mock global fetch
global.fetch = vi.fn()

// Mock analytics
vi.mock('../analytics.js', () => ({
    trackButtonClick: vi.fn()
}))

describe('App Resiliency', () => {
    let wrapper
    let leagueStore

    beforeEach(() => {
        vi.clearAllMocks()
        // Default successful fetch mock with minimal valid data structure
        global.fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                // League data
                settings: { leg: 1 },
                // Users data (array)
                0: { user_id: '1' },
                length: 1,
                // Rosters data (array)
                1: { roster_id: 1 },
                // Brackets
                bracket_id: 1,
                // Matchups
                matchup_id: 1
            })
        })

        // Handle array responses correctly (users, rosters)
        global.fetch.mockImplementation((url) => {
            const urlStr = String(url)
            // console.log('Mock Fetch:', urlStr)

            if (urlStr.includes('/users') || urlStr.includes('/rosters') || urlStr.includes('/matchups') || urlStr.includes('/winners_bracket') || urlStr.includes('/losers_bracket') || urlStr.includes('/transactions')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve([])
                })
            }

            if (urlStr.includes('/players')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({})
                })
            }

            // Default to league object for other calls (like /league/<id>)
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ settings: { leg: 1 } })
            })
        })
    })

    const createWrapper = (initialState = {}) => {
        return mount(App, {
            global: {
                plugins: [
                    createTestingPinia({
                        createSpy: vi.fn,
                        initialState: {
                            league: {
                                league: null,
                                rosters: [],
                                currentWeek: null,
                                winnersBracket: null,
                                losersBracket: null,
                                errors: {},
                                ...initialState
                            }
                        },
                        stubActions: false // We want to test action behavior
                    })
                ],
                mocks: {
                    $route: mockRoute
                },
                stubs: {
                    Transition: {
                        template: '<div><slot /></div>'
                    },
                    RouterView: {
                        template: '<slot :Component="Component" />',
                        data() {
                            return {
                                Component: { template: '<div data-test="router-view">App Content</div>' }
                            }
                        }
                    },
                    RouterLink: true
                }
            }
        })
    }

    it('shows loading screen initially when data is not ready', async () => {
        // Mock fetch to never resolve to simulate loading
        global.fetch.mockImplementation(() => new Promise(() => { }))

        wrapper = createWrapper()
        leagueStore = useLeagueStore()

        // Force computed to re-evaluate if needed, but initial state should be not ready
        expect(leagueStore.isDataReady).toBe(false)

        await wrapper.vm.$nextTick()

        expect(wrapper.findComponent(LoadingScreen).exists()).toBe(true)
        expect(wrapper.findComponent(ErrorState).exists()).toBe(false)
        // Main content should be hidden (or at least router-view)
        // Note: In our implementation, we hide the main div wrapper
        expect(wrapper.find('[data-test="router-view"]').exists()).toBe(false)
    })

    it('shows main content when data is ready', async () => {
        wrapper = createWrapper({
            league: { settings: { leg: 1 } },
            rosters: [{}],
            currentWeek: 1,
            winnersBracket: {},
            losersBracket: {}
        })
        leagueStore = useLeagueStore()

        // isDataReady checks for presence of core data
        expect(leagueStore.isDataReady).toBe(true)

        await wrapper.vm.$nextTick()

        expect(wrapper.findComponent(LoadingScreen).exists()).toBe(false)
        expect(wrapper.findComponent(ErrorState).exists()).toBe(false)
        expect(wrapper.find('[data-test="router-view"]').exists()).toBe(true)
    })

    it('shows error state when initialization fails', async () => {
        // Mock fetch to fail
        global.fetch.mockRejectedValue(new Error('Network Error'))

        wrapper = createWrapper()
        leagueStore = useLeagueStore()

        // Wait for initialize to fail
        await flushPromises()

        expect(leagueStore.initError).toContain('Network Error')
        expect(wrapper.findComponent(ErrorState).exists()).toBe(true)
        expect(wrapper.findComponent(LoadingScreen).exists()).toBe(false)
        expect(wrapper.find('[data-test="router-view"]').exists()).toBe(false)
    })

    it('retries initialization when retry event is emitted', async () => {
        // First fail
        global.fetch.mockRejectedValueOnce(new Error('Network Error'))

        wrapper = createWrapper()
        leagueStore = useLeagueStore()

        await flushPromises()
        expect(wrapper.findComponent(ErrorState).exists()).toBe(true)

        // Reset mocks to ensure success on retry
        global.fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ settings: { leg: 1 } })
        })

        const initialCallCount = global.fetch.mock.calls.length

        // Emit retry
        await wrapper.findComponent(ErrorState).vm.$emit('retry')

        // It should call initialize again, which triggers more fetches
        expect(global.fetch.mock.calls.length).toBeGreaterThan(initialCallCount)
    })
})
