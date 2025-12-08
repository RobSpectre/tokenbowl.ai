import { setActivePinia, createPinia } from 'pinia'
import { useLeagueStore } from '../stores/league'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock the API
vi.mock('../sleeperApi.js', () => ({
    getLeagueData: vi.fn(),
    getRelevantPlayers: vi.fn(),
    getMatchups: vi.fn(),
    getTransactions: vi.fn(),
    getLeague: vi.fn(),
    getWinnersBracket: vi.fn(),
    getLosersBracket: vi.fn()
}))

import * as sleeperApi from '../sleeperApi.js'

describe('League Store - Playoff Logic', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    it('fetches and stores bracket data', async () => {
        const store = useLeagueStore()

        // Mock bracket data
        const mockWinners = [{ r: 1, m: 1, t1: 1, t2: 8 }]
        const mockLosers = [{ r: 1, m: 1, t1: 9, t2: 10 }]

        sleeperApi.getWinnersBracket.mockResolvedValue(mockWinners)
        sleeperApi.getLosersBracket.mockResolvedValue(mockLosers)

        await store.fetchBrackets()

        expect(sleeperApi.getWinnersBracket).toHaveBeenCalled()
        expect(sleeperApi.getLosersBracket).toHaveBeenCalled()
        expect(store.winnersBracket).toEqual(mockWinners)
        expect(store.losersBracket).toEqual(mockLosers)
    })

    it('identifies bracket matchups correctly', async () => {
        const store = useLeagueStore()

        // Setup store state directly - must be in playoff week (>= playoff_week_start)
        store.league = { settings: { playoff_week_start: 15 } }
        store.currentWeek = 15
        store.winnersBracket = [{ r: 1, m: 100, t1: 1, t2: 8 }]
        store.losersBracket = [{ r: 1, m: 200, t1: 9, t2: 10 }]

        // Test winners bracket match (Roster 1 vs 8)
        const winnerMatch = store.getBracketMatchup(1, 8)
        expect(winnerMatch).toBeTruthy()
        expect(winnerMatch.type).toBe('winners')
        expect(winnerMatch.r).toBe(1)

        // Test losers bracket match (Roster 9 vs 10)
        const loserMatch = store.getBracketMatchup(9, 10)
        expect(loserMatch).toBeTruthy()
        expect(loserMatch.type).toBe('losers')
        expect(loserMatch.r).toBe(1)

        // Test reversed order (Roster 10 vs 9)
        const reversedMatch = store.getBracketMatchup(10, 9)
        expect(reversedMatch).toBeTruthy()
        expect(reversedMatch.type).toBe('losers')

        // Test non-existent match
        const noMatch = store.getBracketMatchup(1, 99)
        expect(noMatch).toBeNull()
    })
})
