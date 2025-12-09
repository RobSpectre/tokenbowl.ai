import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLeagueStore } from '../../stores/league.js'

/**
 * Tests for chart data processing - ensures injury and transaction charts render correctly
 *
 * These tests verify:
 * 1. Injury data is correctly transformed for charts
 * 2. Empty data doesn't cause chart crashes
 * 3. Data structure matches what charts expect
 * 4. Transaction stats are correctly aggregated
 */

// Mock all external APIs
vi.mock('../../sleeperApi.js', () => ({
  getLeagueData: vi.fn(),
  getRelevantPlayers: vi.fn(),
  getMatchups: vi.fn(),
  getTransactions: vi.fn(),
  getLeague: vi.fn(),
  getWinnersBracket: vi.fn(),
  getLosersBracket: vi.fn()
}))

vi.mock('../../fantasyNerdsApi.js', () => ({
  getInjuries: vi.fn(),
  getPlayerInjuryStatus: vi.fn((injuries, playerName) => {
    // Mock: return injury if player name contains 'injured'
    if (playerName && playerName.toLowerCase().includes('injured')) {
      return {
        injury: 'Knee',
        game_status: 'Questionable',
        practice_status: 'Limited'
      }
    }
    return null
  }),
  getInjuryIndicator: vi.fn(),
  getWeeklyProjections: vi.fn(),
  getNFLSchedule: vi.fn()
}))

vi.mock('../../youtubeApi.js', () => ({
  getLatestVideoAndShorts: vi.fn()
}))

vi.mock('../../utils/playerService.js', () => ({
  getPlayers: vi.fn(),
  enrichPlayerData: vi.fn()
}))

vi.mock('../../teamMappings.js', () => ({
  getTeamInfo: (username) => {
    // Map bot names to AI model names
    const mapping = {
      'DeepSeekBot': { aiModel: 'DeepSeek', owner: 'DeepSeek', colors: {} },
      'GeminiBot': { aiModel: 'Gemini', owner: 'Google', colors: {} },
      'MistralBot': { aiModel: 'Mistral', owner: 'Mistral AI', colors: {} },
      'ClaudeBot': { aiModel: 'Claude', owner: 'Anthropic', colors: {} }
    }
    return mapping[username] || { aiModel: 'Unknown', owner: 'Unknown', colors: {} }
  }
}))

import * as fantasyNerdsApi from '../../fantasyNerdsApi.js'
import * as sleeperApi from '../../sleeperApi.js'

describe('League Store - Chart Data Processing', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useLeagueStore()
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Injury Data Processing', () => {
    beforeEach(() => {
      // Setup basic store state with mock rosters and players
      store.league = { settings: { leg: 3 } }
      store.rosters = [
        {
          roster_id: 1,
          players: ['4984', '8138'],
          user: { display_name: 'DeepSeekBot' }
        },
        {
          roster_id: 2,
          players: ['6786'],
          user: { display_name: 'GeminiBot' }
        }
      ]
      store.players = {
        '4984': { player_id: '4984', full_name: 'Josh Allen', position: 'QB', team: 'BUF' },
        '8138': { player_id: '8138', full_name: 'Injured Cook', position: 'RB', team: 'BUF' },
        '6786': { player_id: '6786', full_name: 'Saquon Barkley', position: 'RB', team: 'PHI' }
      }
    })

    it('should create processedInjuriesByTeam with correct structure', async () => {
      fantasyNerdsApi.getInjuries.mockResolvedValue({
        injuries: [{ player: 'Injured Cook', status: 'Questionable' }]
      })

      await store.processInjuriesData(3)

      // Should have week keys
      expect(store.processedInjuriesByTeam).toHaveProperty('week1')
      expect(store.processedInjuriesByTeam).toHaveProperty('week2')
      expect(store.processedInjuriesByTeam).toHaveProperty('week3')

      // Each week should have correct structure
      expect(store.processedInjuriesByTeam.week1).toHaveProperty('week', 1)
      expect(store.processedInjuriesByTeam.week1).toHaveProperty('injuries')
    })

    it('should correctly associate injuries with teams', async () => {
      fantasyNerdsApi.getInjuries.mockResolvedValue({
        injuries: [{ player: 'Injured Cook', injury: 'Knee', game_status: 'Questionable' }]
      })

      await store.processInjuriesData(1)

      // DeepSeek team has Injured Cook
      const week1Data = store.processedInjuriesByTeam.week1
      expect(week1Data.injuries).toHaveProperty('DeepSeek')
      expect(week1Data.injuries.DeepSeek).toHaveLength(1)
      expect(week1Data.injuries.DeepSeek[0].player).toBe('Injured Cook')
    })

    it('should handle weeks with no injuries gracefully', async () => {
      // Use players without "Injured" in name so mock returns no injuries
      store.players = {
        '4984': { player_id: '4984', full_name: 'Josh Allen', position: 'QB', team: 'BUF' },
        '8138': { player_id: '8138', full_name: 'James Cook', position: 'RB', team: 'BUF' },
        '6786': { player_id: '6786', full_name: 'Saquon Barkley', position: 'RB', team: 'PHI' }
      }
      fantasyNerdsApi.getInjuries.mockResolvedValue({})

      await store.processInjuriesData(2)

      // Should still have week data, just empty injuries
      expect(store.processedInjuriesByTeam.week1.injuries).toEqual({})
      expect(store.processedInjuriesByTeam.week2.injuries).toEqual({})
    })

    it('should handle API errors without crashing', async () => {
      fantasyNerdsApi.getInjuries.mockRejectedValue(new Error('API Error'))

      // Should not throw
      const result = await store.processInjuriesData(2)

      // Should return existing data (empty in this case)
      expect(result).toBeDefined()
    })

    it('should handle empty rosters gracefully', async () => {
      store.rosters = []
      fantasyNerdsApi.getInjuries.mockResolvedValue({})

      await store.processInjuriesData(2)

      // Should create week data but with empty injuries
      expect(store.processedInjuriesByTeam.week1).toBeDefined()
      expect(store.processedInjuriesByTeam.week1.injuries).toEqual({})
    })

    it('should handle empty players gracefully', async () => {
      store.players = {}
      fantasyNerdsApi.getInjuries.mockResolvedValue({})

      await store.processInjuriesData(2)

      // Should create week data but with empty injuries
      expect(store.processedInjuriesByTeam.week1).toBeDefined()
      expect(store.processedInjuriesByTeam.week1.injuries).toEqual({})
    })

    it('should not reprocess if data already exists for week', async () => {
      // Pre-populate data
      store.processedInjuriesByTeam = {
        week2: { week: 2, injuries: { DeepSeek: [{ player: 'Test' }] } }
      }

      fantasyNerdsApi.getInjuries.mockResolvedValue({})

      const result = await store.processInjuriesData(2)

      // Should return existing data without fetching
      expect(fantasyNerdsApi.getInjuries).not.toHaveBeenCalled()
      expect(result.week2.injuries.DeepSeek).toHaveLength(1)
    })
  })

  describe('Transaction Stats Processing', () => {
    beforeEach(() => {
      store.league = { settings: { leg: 3 } }
      store.rosters = [
        { roster_id: 1, user: { display_name: 'DeepSeekBot' } },
        { roster_id: 2, user: { display_name: 'GeminiBot' } }
      ]
    })

    it('should create correct transaction stats structure', async () => {
      sleeperApi.getTransactions.mockResolvedValue([
        { type: 'waiver', roster_ids: [1], status: 'complete' },
        { type: 'free_agent', roster_ids: [2], status: 'complete' }
      ])

      await store.processTransactionStats(3)

      expect(store.processedTransactionStats).toHaveProperty('byWeek')
      expect(store.processedTransactionStats).toHaveProperty('byTeam')
      expect(store.processedTransactionStats).toHaveProperty('byTeamForWeek')
    })

    it('should correctly count transactions per week', async () => {
      sleeperApi.getTransactions
        .mockResolvedValueOnce([{ type: 'waiver', roster_ids: [1] }]) // Week 1
        .mockResolvedValueOnce([{ type: 'free_agent', roster_ids: [1] }, { type: 'waiver', roster_ids: [2] }]) // Week 2

      await store.processTransactionStats(2)

      expect(store.processedTransactionStats.byWeek[1]).toBe(1)
      expect(store.processedTransactionStats.byWeek[2]).toBe(2)
    })

    it('should correctly count transactions per team', async () => {
      sleeperApi.getTransactions.mockResolvedValue([
        { type: 'waiver', roster_ids: [1] },
        { type: 'waiver', roster_ids: [1] },
        { type: 'free_agent', roster_ids: [2] }
      ])

      await store.processTransactionStats(1)

      expect(store.processedTransactionStats.byTeam.DeepSeek.total).toBe(2)
      expect(store.processedTransactionStats.byTeam.Gemini.total).toBe(1)
    })

    it('should handle empty transactions gracefully', async () => {
      sleeperApi.getTransactions.mockResolvedValue([])

      await store.processTransactionStats(2)

      expect(store.processedTransactionStats.byWeek[1]).toBe(0)
      expect(store.processedTransactionStats.byWeek[2]).toBe(0)
    })

    it('should handle API errors without crashing', async () => {
      sleeperApi.getTransactions.mockRejectedValue(new Error('API Error'))

      // Should not throw
      await store.processTransactionStats(2)

      // Should still have structure (with 0s due to error handling)
      expect(store.processedTransactionStats.byWeek).toBeDefined()
    })
  })

  describe('Chart Data Consistency', () => {
    it('should return data in format charts can consume', async () => {
      store.league = { settings: { leg: 2 } }
      store.rosters = [
        { roster_id: 1, players: ['4984'], user: { display_name: 'DeepSeekBot' } }
      ]
      store.players = {
        '4984': { player_id: '4984', full_name: 'Injured Player', position: 'QB', team: 'BUF' }
      }

      fantasyNerdsApi.getInjuries.mockResolvedValue({})

      await store.processInjuriesData(2)

      // Charts expect week keys like 'week1', 'week2'
      const weekKeys = Object.keys(store.processedInjuriesByTeam)
      expect(weekKeys).toContain('week1')
      expect(weekKeys).toContain('week2')

      // Each week should have numeric week property
      expect(typeof store.processedInjuriesByTeam.week1.week).toBe('number')

      // Injuries should be an object (possibly empty)
      expect(typeof store.processedInjuriesByTeam.week1.injuries).toBe('object')
    })

    it('should handle the exact bug scenario: stuck promise leads to empty chart', async () => {
      // This simulates the scenario where processedInjuriesByTeam was empty
      // because the processing promise was stuck from a previous session

      store.league = { settings: { leg: 14 } }
      store.rosters = [
        { roster_id: 1, players: ['4984'], user: { display_name: 'DeepSeekBot' } }
      ]
      store.players = {
        '4984': { player_id: '4984', full_name: 'Test Player', position: 'QB', team: 'BUF' }
      }

      // Simulate stuck promise being null (as fixed by afterRestore)
      store._injuriesProcessingPromise = null

      fantasyNerdsApi.getInjuries.mockResolvedValue({})

      // Should be able to process successfully
      await store.processInjuriesData(14)

      // Should have processed all 14 weeks
      expect(Object.keys(store.processedInjuriesByTeam).length).toBe(14)
      expect(store.processedInjuriesByTeam.week14).toBeDefined()
    })
  })
})

describe('Chart Data - Edge Cases', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useLeagueStore()
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('should handle roster with missing user display_name', async () => {
    store.league = { settings: { leg: 2 } }
    store.rosters = [
      { roster_id: 1, players: ['4984'], user: null }, // No user
      { roster_id: 2, players: ['8138'], user: { display_name: 'DeepSeekBot' } }
    ]
    store.players = {
      '4984': { player_id: '4984', full_name: 'Injured Player', position: 'QB', team: 'BUF' }
    }

    fantasyNerdsApi.getInjuries.mockResolvedValue({})

    // Should not throw
    await store.processInjuriesData(2)

    expect(store.processedInjuriesByTeam.week1).toBeDefined()
  })

  it('should handle player with partial name data', async () => {
    store.league = { settings: { leg: 2 } }
    store.rosters = [
      { roster_id: 1, players: ['4984'], user: { display_name: 'DeepSeekBot' } }
    ]
    store.players = {
      '4984': { player_id: '4984', first_name: 'Josh', last_name: null } // Partial name
    }

    fantasyNerdsApi.getInjuries.mockResolvedValue({})

    // Should not throw
    await store.processInjuriesData(2)

    expect(store.processedInjuriesByTeam.week1).toBeDefined()
  })

  it('should handle very large week numbers gracefully', async () => {
    store.league = { settings: { leg: 17 } }
    store.rosters = []
    store.players = {}

    fantasyNerdsApi.getInjuries.mockResolvedValue({})

    // Week > 17 should be capped at 17
    await store.processInjuriesData(20)

    // Should have exactly 17 weeks (capped)
    expect(Object.keys(store.processedInjuriesByTeam).length).toBe(17)
  })
})
