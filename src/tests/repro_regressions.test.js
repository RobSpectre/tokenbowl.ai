
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLeagueStore } from '../stores/league.js'
import { calculateWinProbability } from '../utils/winProbability.js'
import * as fantasyNerdsApi from '../fantasyNerdsApi.js'

// Mock dependencies
vi.mock('../sleeperApi.js', () => ({
    getLeagueData: vi.fn(),
    getRelevantPlayers: vi.fn(),
    getMatchups: vi.fn(),
    getTransactions: vi.fn(),
    getLeague: vi.fn()
}))

vi.mock('../fantasyNerdsApi.js', () => ({
    getInjuries: vi.fn(),
    getPlayerInjuryStatus: vi.fn((injuryMap, playerName) => {
        if (!injuryMap || !playerName) return null
        return injuryMap[playerName.toLowerCase()] || null
    }),
    getInjuryIndicator: vi.fn(),
    getWeeklyProjections: vi.fn(),
    getNFLSchedule: vi.fn()
}))

describe('Regression Tests', () => {
    let store

    beforeEach(() => {
        setActivePinia(createPinia())
        store = useLeagueStore()
    })

    describe('Badges Logic', () => {
        it('should return injury badge when player is in week injury data', () => {
            const playerId = '1'
            const player = {
                player_id: playerId,
                full_name: 'Test Player',
                team: 'BUF'
            }

            store.players = { [playerId]: player }
            store.enrichedPlayers = { [playerId]: player }
            store.league = { settings: { leg: 10 } }

            // Mock injury data for week 10
            store.injuriesByWeek = {
                10: {
                    'test player': {
                        game_status: 'Questionable',
                        injury: 'Knee'
                    }
                }
            }

            const badges = store.getTeamBadges([playerId], 10)
            expect(badges).toContainEqual(expect.objectContaining({ label: 'Q' }))
        })

        it('should handle name mismatch (suffix) when looking up injury', () => {
            const playerId = '2'
            const player = {
                player_id: playerId,
                full_name: 'Patrick Mahomes II',
                team: 'KC'
            }

            store.players = { [playerId]: player }
            store.enrichedPlayers = { [playerId]: player }
            store.league = { settings: { leg: 10 } }

            // Mock injury data for week 10 with name WITHOUT suffix
            store.injuriesByWeek = {
                10: {
                    'patrick mahomes': {
                        game_status: 'Questionable',
                        injury: 'Ankle'
                    }
                }
            }

            const badges = store.getTeamBadges([playerId], 10)
            // This SHOULD pass if we implement fuzzy matching, but currently should fail
            expect(badges).toContainEqual(expect.objectContaining({ label: 'Q' }))
        })

        it('should NOT return injury badge when player is NOT in week injury data (assumed healthy)', () => {
            const playerId = '1'
            const player = {
                player_id: playerId,
                full_name: 'Healthy Player',
                team: 'BUF'
            }

            store.players = { [playerId]: player }
            store.enrichedPlayers = {
                [playerId]: { ...player, injury_status_combined: 'Questionable' } // Stale data says Q
            }
            store.league = { settings: { leg: 10 } }

            // Mock injury data for week 10 - Player is missing (implied healthy)
            store.injuriesByWeek = {
                10: {
                    'other player': { game_status: 'Out' }
                }
            }

            const badges = store.getTeamBadges([playerId], 10)
            // Should NOT have Q badge because they are missing from current week injury report
            expect(badges).not.toContainEqual(expect.objectContaining({ label: 'Q' }))
        })

        describe('Store Getters', () => {
            it('should return win probability for a matchup', () => {
                const matchupId = 'matchup1'
                const probability = { team1WinProb: 0.6, team2WinProb: 0.4 }
                store.winProbabilities = { [matchupId]: probability }

                const result = store.getWinProbability(matchupId)
                expect(result).toEqual(probability)
            })

            it('should return null if win probability is missing', () => {
                const result = store.getWinProbability('missing_matchup')
                expect(result).toBeNull()
            })
        })
    })

    it('should fallback to enriched data if week injury data is missing entirely', () => {
        const playerId = '1'
        const player = {
            player_id: playerId,
            full_name: 'Test Player',
            team: 'BUF'
        }

        store.players = { [playerId]: player }
        store.enrichedPlayers = {
            [playerId]: { ...player, injury_status_combined: 'Questionable' }
        }
        store.league = { settings: { leg: 10 } }

        // No injury data for week 10
        store.injuriesByWeek = {}

        // Wait, if it's empty object, it's "present" but empty. 
        // If it's undefined/null, it's missing.
        // The code checks: if (weekInjuryData && player.full_name)
        // If store.injuriesByWeek[10] is undefined, it falls back.

        // Case 1: Data is undefined (not loaded yet)
        delete store.injuriesByWeek[10]
        const badges1 = store.getTeamBadges([playerId], 10)
        expect(badges1).toContainEqual(expect.objectContaining({ label: 'Q' }))
    })
    it('should correctly enrich players with name mismatches', async () => {
        const store = useLeagueStore()

        // Mock players
        store.players = {
            'p1': { full_name: 'Patrick Mahomes II', first_name: 'Patrick', last_name: 'Mahomes II' }
        }

        // Mock injury data
        // We need to mock getInjuries to return data with "Patrick Mahomes"
        vi.mocked(fantasyNerdsApi.getInjuries).mockResolvedValue({
            'Patrick Mahomes': { game_status: 'Questionable' }
        })

        await store.loadEnrichedPlayers(true)

        const enriched = store.enrichedPlayers['p1']
        expect(enriched).toBeDefined()
        expect(enriched.injury_status_combined).toBe('Questionable')
    })
})

describe('Win Probability Logic', () => {
    it('should calculate win probability correctly', () => {
        const team1Players = [{
            currentPoints: 10,
            projection: 20,
            variance: 25,
            gameStatus: 'scheduled',
            remainingProjection: 20,
            remainingStdDev: 5
        }]
        const team2Players = [{
            currentPoints: 10,
            projection: 20,
            variance: 25,
            gameStatus: 'scheduled',
            remainingProjection: 20,
            remainingStdDev: 5
        }]

        const result = calculateWinProbability(team1Players, team2Players)

        expect(result).toBeDefined()
        expect(result.team1WinProbability).toBeCloseTo(0.5, 1)
        expect(result.method).toBe('analytical_gaussian')
    })
})
