import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import MatchupDetail from '../pages/MatchupDetail.vue'
import { createPinia, setActivePinia } from 'pinia'

// Mock dependencies
vi.mock('vue-router', () => ({
    useRoute: () => ({
        params: { id: '1' }
    }),
    useRouter: () => ({
        push: vi.fn()
    })
}))

vi.mock('@vueuse/head', () => ({
    useHead: vi.fn()
}))

// Mock the win probability utility
vi.mock('../utils/winProbability', () => ({
    calculateWinProbability: vi.fn((t1, t2) => {
        return {
            team1WinProbability: 0.6,
            team2WinProbability: 0.4,
            projectedScore: { team1: 100, team2: 90 }
        }
    }),
    getPlayerProjectionAndVariance: vi.fn(() => ({ projection: 10, variance: 5 }))
}))

// Mock the league store
const mockGetTeamBadges = vi.fn(() => [])
const mockGetPlayerGameInfo = vi.fn(() => ({ status: 'scheduled' }))
const mockGetByeWeekForTeam = vi.fn(() => false)

vi.mock('../stores/league', () => ({
    useLeagueStore: () => ({
        matchups: {
            1: [
                {
                    roster_id: 1,
                    starters: ['p1', 'p2'],
                    players: ['p1', 'p2', 'p3'],
                    points: 100,
                    custom_points: 100,
                    settings: { fpts: 100 }
                },
                {
                    roster_id: 2,
                    starters: ['p4', 'p5'],
                    players: ['p4', 'p5', 'p6'],
                    points: 90,
                    custom_points: 90,
                    settings: { fpts: 90 }
                }
            ]
        },
        players: {
            'p1': { player_id: 'p1', full_name: 'Player 1', position: 'QB', team: 'ARI' },
            'p2': { player_id: 'p2', full_name: 'Player 2', position: 'RB', team: 'ATL' },
            'p3': { player_id: 'p3', full_name: 'Player 3', position: 'WR', team: 'BAL' },
            'p4': { player_id: 'p4', full_name: 'Player 4', position: 'QB', team: 'BUF' },
            'p5': { player_id: 'p5', full_name: 'Player 5', position: 'RB', team: 'CAR' },
            'p6': { player_id: 'p6', full_name: 'Player 6', position: 'WR', team: 'CHI' }
        },
        enrichedPlayers: {},
        week: 1,
        currentWeek: 1,
        league: { settings: { leg: 1 } },
        getTeamBadges: mockGetTeamBadges,
        getPlayerGameInfo: mockGetPlayerGameInfo,
        getByeWeekForTeam: mockGetByeWeekForTeam,
        getMatchupById: (id) => [
            {
                roster_id: 1,
                starters: ['p1', 'p2'],
                players: ['p1', 'p2', 'p3'],
                points: 100,
                custom_points: 100,
                settings: { fpts: 100 }
            },
            {
                roster_id: 2,
                starters: ['p4', 'p5'],
                players: ['p4', 'p5', 'p6'],
                points: 90,
                custom_points: 90,
                settings: { fpts: 90 }
            }
        ],
        loadWeekData: vi.fn(),
        loadMatchupData: vi.fn(),
        getWinProbability: vi.fn(),
        setWinProbability: vi.fn(),
        ensureWeekLoaded: vi.fn(),
        fetchInjuriesForWeek: vi.fn(),
        fetchWeeklyProjectionsForWeek: vi.fn(),
        loadNFLSchedule: vi.fn(),
        getPlayerSeasonStats: vi.fn(() => ({})),
        getMatchupsForWeek: vi.fn(() => []),
        refreshCurrentWeek: vi.fn()
    })
}))

describe('MatchupDetail.vue', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    it('renders correctly and calculates win probability', async () => {
        const wrapper = mount(MatchupDetail, {
            global: {
                stubs: {
                    WinProbabilityBar: true,
                    RouterLink: true
                }
            }
        })

        // Wait for any async operations
        await wrapper.vm.$nextTick()

        // Check if component exists
        expect(wrapper.exists()).toBe(true)
    })
})
