import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getLeague,
  getLeagueUsers,
  getRosters,
  getMatchups,
  getLeagueData,
  getCurrentMatchups,
  getDrafts,
  getDraftPicks,
  getPlayers,
  getRelevantPlayers,
  getDraftData,
  getTransactions
} from '../sleeperApi.js'

describe('Sleeper API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  describe('Basic API calls', () => {
    it('should fetch league data', async () => {
      const mockLeague = { league_id: '123', name: 'Test League' }
      global.fetch.mockResolvedValueOnce({
        json: async () => mockLeague
      })

      const result = await getLeague()

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.sleeper.app/v1/league/1266471057523490816?_t=')
      )
      expect(result).toEqual(mockLeague)
    })

    it('should fetch league users', async () => {
      const mockUsers = [
        { user_id: 'u1', username: 'user1' },
        { user_id: 'u2', username: 'user2' }
      ]
      global.fetch.mockResolvedValueOnce({
        json: async () => mockUsers
      })

      const result = await getLeagueUsers()

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.sleeper.app/v1/league/1266471057523490816/users?_t=')
      )
      expect(result).toEqual(mockUsers)
    })

    it('should fetch rosters', async () => {
      const mockRosters = [
        { roster_id: 1, owner_id: 'u1' },
        { roster_id: 2, owner_id: 'u2' }
      ]
      global.fetch.mockResolvedValueOnce({
        json: async () => mockRosters
      })

      const result = await getRosters()

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.sleeper.app/v1/league/1266471057523490816/rosters?_t=')
      )
      expect(result).toEqual(mockRosters)
    })

    it('should fetch matchups for a specific week', async () => {
      const mockMatchups = [
        { matchup_id: 1, roster_id: 1, points: 100 },
        { matchup_id: 1, roster_id: 2, points: 95 }
      ]
      global.fetch.mockResolvedValueOnce({
        json: async () => mockMatchups
      })

      const result = await getMatchups(5)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.sleeper.app/v1/league/1266471057523490816/matchups/5?_t=')
      )
      expect(result).toEqual(mockMatchups)
    })
  })

  describe('getLeagueData', () => {
    it('should combine and sort league data', async () => {
      const mockLeague = { league_id: '123' }
      const mockUsers = [
        { user_id: 'u1', username: 'user1' },
        { user_id: 'u2', username: 'user2' }
      ]
      const mockRosters = [
        {
          roster_id: 1,
          owner_id: 'u1',
          settings: { wins: 3, fpts: 300 }
        },
        {
          roster_id: 2,
          owner_id: 'u2',
          settings: { wins: 5, fpts: 450 }
        }
      ]

      global.fetch
        .mockResolvedValueOnce({ json: async () => mockLeague })
        .mockResolvedValueOnce({ json: async () => mockUsers })
        .mockResolvedValueOnce({ json: async () => mockRosters })

      const result = await getLeagueData()

      expect(result.league).toEqual(mockLeague)
      expect(result.users).toEqual(mockUsers)
      expect(result.rosters).toHaveLength(2)
      // Should be sorted by wins descending
      expect(result.rosters[0].settings.wins).toBe(5)
      expect(result.rosters[1].settings.wins).toBe(3)
      // Should have user data attached
      expect(result.rosters[0].user.username).toBe('user2')
    })

    it('should sort by points when wins are equal', async () => {
      const mockLeague = { league_id: '123' }
      const mockUsers = [{ user_id: 'u1' }, { user_id: 'u2' }]
      const mockRosters = [
        {
          roster_id: 1,
          owner_id: 'u1',
          settings: { wins: 3, fpts: 400 }
        },
        {
          roster_id: 2,
          owner_id: 'u2',
          settings: { wins: 3, fpts: 500 }
        }
      ]

      global.fetch
        .mockResolvedValueOnce({ json: async () => mockLeague })
        .mockResolvedValueOnce({ json: async () => mockUsers })
        .mockResolvedValueOnce({ json: async () => mockRosters })

      const result = await getLeagueData()

      // Should be sorted by points when wins are equal
      expect(result.rosters[0].settings.fpts).toBe(500)
      expect(result.rosters[1].settings.fpts).toBe(400)
    })

    it('should handle missing fpts gracefully', async () => {
      const mockLeague = { league_id: '123' }
      const mockUsers = [{ user_id: 'u1' }]
      const mockRosters = [
        {
          roster_id: 1,
          owner_id: 'u1',
          settings: { wins: 3 } // No fpts
        }
      ]

      global.fetch
        .mockResolvedValueOnce({ json: async () => mockLeague })
        .mockResolvedValueOnce({ json: async () => mockUsers })
        .mockResolvedValueOnce({ json: async () => mockRosters })

      const result = await getLeagueData()

      expect(result.rosters[0].settings.wins).toBe(3)
    })

    it('should throw error on fetch failure', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(getLeagueData()).rejects.toThrow('Network error')
    })
  })

  describe('getCurrentMatchups', () => {
    it('should fetch and group current matchups', async () => {
      const mockLeague = { settings: { leg: 5 } }
      const mockMatchups = [
        { matchup_id: 1, roster_id: 1, points: 100 },
        { matchup_id: 1, roster_id: 2, points: 95 }
      ]
      const mockRosters = [
        { roster_id: 1, owner_id: 'u1' },
        { roster_id: 2, owner_id: 'u2' }
      ]
      const mockUsers = [
        { user_id: 'u1', username: 'user1' },
        { user_id: 'u2', username: 'user2' }
      ]

      global.fetch
        .mockResolvedValueOnce({ json: async () => mockLeague })
        .mockResolvedValueOnce({ json: async () => mockMatchups })
        .mockResolvedValueOnce({ json: async () => mockRosters })
        .mockResolvedValueOnce({ json: async () => mockUsers })

      const result = await getCurrentMatchups()

      expect(result.week).toBe(5)
      expect(result.matchups).toHaveLength(1) // One matchup group
      expect(result.matchups[0]).toHaveLength(2) // Two teams in matchup
      expect(result.matchups[0][0].roster.user.username).toBe('user1')
    })

    it('should default to week 1 if leg not set', async () => {
      const mockLeague = { settings: {} }
      const mockMatchups = []
      const mockRosters = []
      const mockUsers = []

      global.fetch
        .mockResolvedValueOnce({ json: async () => mockLeague })
        .mockResolvedValueOnce({ json: async () => mockMatchups })
        .mockResolvedValueOnce({ json: async () => mockRosters })
        .mockResolvedValueOnce({ json: async () => mockUsers })

      const result = await getCurrentMatchups()

      expect(result.week).toBe(1)
    })

    it('should throw error on fetch failure', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(getCurrentMatchups()).rejects.toThrow('Network error')
    })
  })

  describe('Draft functions', () => {
    it('should fetch drafts', async () => {
      const mockDrafts = [{ draft_id: 'd1', status: 'complete' }]
      global.fetch.mockResolvedValueOnce({
        json: async () => mockDrafts
      })

      const result = await getDrafts()

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.sleeper.app/v1/league/1266471057523490816/drafts'
      )
      expect(result).toEqual(mockDrafts)
    })

    it('should fetch draft picks', async () => {
      const mockPicks = [
        { pick_no: 1, player_id: 'p1' },
        { pick_no: 2, player_id: 'p2' }
      ]
      global.fetch.mockResolvedValueOnce({
        json: async () => mockPicks
      })

      const result = await getDraftPicks('d1')

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.sleeper.app/v1/draft/d1/picks'
      )
      expect(result).toEqual(mockPicks)
    })
  })

  describe('getPlayers', () => {
    it('should fetch players without cache busting by default', async () => {
      const mockPlayers = { p1: { name: 'Player 1' } }
      global.fetch.mockResolvedValueOnce({
        json: async () => mockPlayers
      })

      const result = await getPlayers()

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.sleeper.app/v1/players/nfl',
        { cache: 'default' }
      )
      expect(result).toEqual(mockPlayers)
    })

    it('should fetch players with cache busting when requested', async () => {
      const mockPlayers = { p1: { name: 'Player 1' } }
      global.fetch.mockResolvedValueOnce({
        json: async () => mockPlayers
      })

      const result = await getPlayers(true)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.sleeper.app/v1/players/nfl?_t='),
        { cache: 'reload' }
      )
      expect(result).toEqual(mockPlayers)
    })
  })

  describe('getRelevantPlayers', () => {
    it('should filter players to relevant ones', async () => {
      // Create many players so p3 is truly outside top 400
      const mockPlayers = {
        p1: { name: 'Player 1', search_rank: 10 },
        p2: { name: 'Player 2', search_rank: 20 },
        p3: { name: 'Player 3', search_rank: 500 }
      }
      // Add 400 more players with better ranks than p3
      for (let i = 4; i <= 404; i++) {
        mockPlayers[`p${i}`] = { name: `Player ${i}`, search_rank: i }
      }

      const mockRosters = [
        { roster_id: 1, players: ['p1'] }
      ]
      const mockTransactions = [
        { adds: { p2: 1 }, drops: {} }
      ]

      global.fetch
        .mockResolvedValueOnce({ json: async () => mockPlayers }) // getPlayers
        .mockResolvedValueOnce({ json: async () => mockRosters }) // getRosters
        // Mock all 18 weeks of transactions
        .mockResolvedValueOnce({ json: async () => mockTransactions })
        .mockResolvedValueOnce({ json: async () => [] })
        .mockResolvedValueOnce({ json: async () => [] })
        .mockResolvedValueOnce({ json: async () => [] })
        .mockResolvedValueOnce({ json: async () => [] })
        .mockResolvedValueOnce({ json: async () => [] })
        .mockResolvedValueOnce({ json: async () => [] })
        .mockResolvedValueOnce({ json: async () => [] })
        .mockResolvedValueOnce({ json: async () => [] })
        .mockResolvedValueOnce({ json: async () => [] })
        .mockResolvedValueOnce({ json: async () => [] })
        .mockResolvedValueOnce({ json: async () => [] })
        .mockResolvedValueOnce({ json: async () => [] })
        .mockResolvedValueOnce({ json: async () => [] })
        .mockResolvedValueOnce({ json: async () => [] })
        .mockResolvedValueOnce({ json: async () => [] })
        .mockResolvedValueOnce({ json: async () => [] })
        .mockResolvedValueOnce({ json: async () => [] })

      const result = await getRelevantPlayers()

      // Should include rostered players (p1), transaction players (p2), and top ranked players (p1-p404)
      expect(result.p1).toBeDefined()
      expect(result.p2).toBeDefined()
      // Should not include low-ranked player not in rosters or transactions (rank 500 > top 400)
      expect(result.p3).toBeUndefined()
    })

    it('should return all players if roster fetch fails', async () => {
      const mockPlayers = { p1: { name: 'Player 1' } }

      global.fetch
        .mockResolvedValueOnce({ json: async () => mockPlayers }) // getPlayers
        .mockRejectedValueOnce(new Error('Roster fetch failed')) // getRosters fails

      const result = await getRelevantPlayers()

      expect(result).toEqual(mockPlayers)
    })

    it('should handle transaction fetch failures gracefully', async () => {
      const mockPlayers = {
        p1: { name: 'Player 1', search_rank: 10 }
      }
      const mockRosters = [
        { roster_id: 1, players: ['p1'] }
      ]

      global.fetch
        .mockResolvedValueOnce({ json: async () => mockPlayers }) // getPlayers
        .mockResolvedValueOnce({ json: async () => mockRosters }) // getRosters
        // Mock transactions failing
        .mockRejectedValue(new Error('Transaction fetch failed'))

      const result = await getRelevantPlayers()

      // Should still work with just roster filtering
      expect(result.p1).toBeDefined()
    })
  })

  describe('getDraftData', () => {
    it('should fetch and combine draft data', async () => {
      const mockDrafts = [{ draft_id: 'd1', status: 'complete' }]
      const mockPicks = [
        { pick_no: 1, player_id: 'p1', picked_by: 'u1' }
      ]
      const mockPlayers = {
        p1: { name: 'Player 1' }
      }
      const mockUsers = [
        { user_id: 'u1', username: 'user1' }
      ]

      global.fetch
        .mockResolvedValueOnce({ json: async () => mockDrafts })
        .mockResolvedValueOnce({ json: async () => mockPicks })
        .mockResolvedValueOnce({ json: async () => mockPlayers })
        .mockResolvedValueOnce({ json: async () => mockUsers })

      const result = await getDraftData()

      expect(result.draft).toEqual(mockDrafts[0])
      expect(result.picks[0].player.name).toBe('Player 1')
      expect(result.picks[0].user.username).toBe('user1')
    })

    it('should return null if no drafts exist', async () => {
      global.fetch.mockResolvedValueOnce({ json: async () => [] })

      const result = await getDraftData()

      expect(result).toBeNull()
    })

    it('should throw error on fetch failure', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Draft fetch failed'))

      await expect(getDraftData()).rejects.toThrow('Draft fetch failed')
    })
  })

  describe('getTransactions', () => {
    it('should fetch all rounds and filter by leg (week)', async () => {
      // Mock responses for rounds 1-20
      // Only round 3 has transactions with leg=5, round 5 has leg=5 transactions
      for (let round = 1; round <= 20; round++) {
        if (round === 3) {
          global.fetch.mockResolvedValueOnce({
            json: async () => [
              { type: 'waiver', adds: { p1: 1 }, leg: 5 },
              { type: 'trade', adds: { p2: 1 }, leg: 5 }
            ]
          })
        } else if (round === 5) {
          global.fetch.mockResolvedValueOnce({
            json: async () => [
              { type: 'waiver', adds: { p3: 1 }, leg: 5 }
            ]
          })
        } else {
          global.fetch.mockResolvedValueOnce({
            json: async () => []
          })
        }
      }

      const result = await getTransactions(5)

      // Should have fetched all 20 rounds
      expect(global.fetch).toHaveBeenCalledTimes(20)
      // Should have called round 1, 2, 3, etc
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.sleeper.app/v1/league/1266471057523490816/transactions/1'
      )
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.sleeper.app/v1/league/1266471057523490816/transactions/20'
      )
      // Should return only transactions with leg=5
      expect(result).toHaveLength(3)
      expect(result.every(t => t.leg === 5)).toBe(true)
    })

    it('should return empty array if no transactions match the week', async () => {
      // Mock all rounds to return empty or transactions for different weeks
      for (let round = 1; round <= 20; round++) {
        global.fetch.mockResolvedValueOnce({
          json: async () => [
            { type: 'waiver', adds: { p1: 1 }, leg: 3 }
          ]
        })
      }

      const result = await getTransactions(5)

      expect(result).toEqual([])
    })

    it('should handle fetch errors gracefully', async () => {
      // Mock some rounds to fail, others to succeed
      for (let round = 1; round <= 20; round++) {
        if (round === 5) {
          global.fetch.mockRejectedValueOnce(new Error('Network error'))
        } else if (round === 3) {
          global.fetch.mockResolvedValueOnce({
            json: async () => [{ type: 'waiver', adds: { p1: 1 }, leg: 5 }]
          })
        } else {
          global.fetch.mockResolvedValueOnce({
            json: async () => []
          })
        }
      }

      const result = await getTransactions(5)

      // Should still return transactions from successful rounds
      expect(result).toHaveLength(1)
      expect(result[0].leg).toBe(5)
    })
  })
})
