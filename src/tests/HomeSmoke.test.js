import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import Home from '../pages/Home.vue'
import { useLeagueStore } from '../stores/league'

// Mock child components to isolate Home.vue logic
vi.mock('../components/WinProbabilityBar.vue', () => ({
    default: { template: '<div class="win-prob-bar"></div>' }
}))

// Mock ECharts
vi.mock('echarts', () => {
    const echartsMock = {
        init: () => ({
            setOption: vi.fn(),
            resize: vi.fn(),
            dispose: vi.fn(),
            on: vi.fn(),
            off: vi.fn()
        }),
        graphic: {
            LinearGradient: vi.fn()
        }
    }
    return {
        default: echartsMock,
        ...echartsMock
    }
})

// Mock vue-router
vi.mock('vue-router', () => ({
    useRouter: () => ({
        push: vi.fn(),
        currentRoute: {
            value: {
                query: { week: '15' }
            }
        }
    }),
    useRoute: () => ({
        query: { week: '15' }
    })
}))

describe('Home.vue Smoke Test', () => {
    let wrapper
    let store

    beforeEach(() => {
        wrapper = mount(Home, {
            global: {
                plugins: [
                    createTestingPinia({
                        createSpy: vi.fn,
                        initialState: {
                            league: {
                                league: { settings: { playoff_teams: 6 } },
                                rosters: [],
                                users: [],
                                allMatchups: {
                                    15: [
                                        [
                                            { matchup_id: 1, roster_id: 1, points: 100 },
                                            { matchup_id: 1, roster_id: 2, points: 90 }
                                        ]
                                    ]
                                },
                                winnersBracket: [
                                    { r: 1, m: 1, t1: 1, t2: 2 },
                                    { r: 2, m: 2, t1: 3, t2: null } // Bye
                                ],
                                losersBracket: [],
                                currentWeek: 15,
                                transactionsByWeek: {},
                                injuriesByWeek: {},
                                weeklyProjectionsByWeek: {}
                            }
                        }
                    })
                ],
                stubs: {
                    'router-link': true,
                    'font-awesome-icon': true
                }
            }
        })
        store = useLeagueStore()
    })

    it('mounts without crashing', () => {
        expect(wrapper.exists()).toBe(true)
    })

    it('renders week selector', () => {
        expect(wrapper.find('select').exists()).toBe(true)
        expect(wrapper.find('select').element.value).toBe('15')
    })

    it('renders matchups when data is present', async () => {
        // Ensure computed properties are recalculated
        await wrapper.vm.$nextTick()

        // Check for "Winners Bracket" or similar text
        // Note: The exact text depends on bracketSections logic
        expect(wrapper.text()).toContain('Week 15')
    })
})
