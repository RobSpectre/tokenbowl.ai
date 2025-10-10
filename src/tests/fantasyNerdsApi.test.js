import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getInjuries, getPlayerInjuryStatus, getInjuryIndicator } from '../fantasyNerdsApi.js'

describe('Fantasy Nerds API', () => {
  beforeEach(() => {
    // Reset environment and fetch mocks
    vi.restoreAllMocks()
    delete import.meta.env.VITE_FANTASY_FOOTBALL_NERD_API_KEY
  })

  describe('getInjuries', () => {
    it('should return empty object when API key is missing', async () => {
      const result = await getInjuries(1)
      expect(result).toEqual({})
    })

    it('should fetch injury data successfully', async () => {
      import.meta.env.VITE_FANTASY_FOOTBALL_NERD_API_KEY = 'test-api-key'

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                player: 'Patrick Mahomes',
                team: 'KC',
                position: 'QB',
                injury: 'Ankle',
                practice_status: 'Full',
                game_status: 'Questionable',
                last_update: '2025-10-10',
                notes: 'Expected to play'
              },
              {
                player: 'Travis Kelce',
                team: 'KC',
                position: 'TE',
                injury: 'Knee',
                practice_status: 'Limited',
                game_status: 'Out',
                last_update: '2025-10-10',
                notes: 'Will miss game'
              }
            ])
        })
      )

      const result = await getInjuries(1)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/injuries?apikey=test-api-key&week=1&_t=')
      )

      expect(result).toHaveProperty('patrick mahomes')
      expect(result['patrick mahomes']).toEqual({
        player: 'Patrick Mahomes',
        team: 'KC',
        position: 'QB',
        injury: 'Ankle',
        practice_status: 'Full',
        game_status: 'Questionable',
        last_update: '2025-10-10',
        notes: 'Expected to play'
      })

      expect(result).toHaveProperty('travis kelce')
      expect(result['travis kelce']).toEqual({
        player: 'Travis Kelce',
        team: 'KC',
        position: 'TE',
        injury: 'Knee',
        practice_status: 'Limited',
        game_status: 'Out',
        last_update: '2025-10-10',
        notes: 'Will miss game'
      })
    })

    it('should handle API errors gracefully', async () => {
      import.meta.env.VITE_FANTASY_FOOTBALL_NERD_API_KEY = 'test-api-key'

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500
        })
      )

      const result = await getInjuries(1)
      expect(result).toEqual({})
    })

    it('should handle non-array responses', async () => {
      import.meta.env.VITE_FANTASY_FOOTBALL_NERD_API_KEY = 'test-api-key'

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ error: 'Invalid response' })
        })
      )

      const result = await getInjuries(1)
      expect(result).toEqual({})
    })

    it('should handle network errors', async () => {
      import.meta.env.VITE_FANTASY_FOOTBALL_NERD_API_KEY = 'test-api-key'

      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))

      const result = await getInjuries(1)
      expect(result).toEqual({})
    })

    it('should normalize player names to lowercase', async () => {
      import.meta.env.VITE_FANTASY_FOOTBALL_NERD_API_KEY = 'test-api-key'

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                player: 'JOSH ALLEN',
                team: 'BUF',
                position: 'QB',
                injury: 'Shoulder',
                practice_status: 'Full',
                game_status: 'Q',
                last_update: '2025-10-10',
                notes: 'Practicing fully'
              }
            ])
        })
      )

      const result = await getInjuries(1)
      expect(result).toHaveProperty('josh allen')
      expect(result['josh allen'].player).toBe('JOSH ALLEN')
    })
  })

  describe('getPlayerInjuryStatus', () => {
    const injuryMap = {
      'patrick mahomes': {
        player: 'Patrick Mahomes',
        team: 'KC',
        position: 'QB',
        injury: 'Ankle',
        practice_status: 'Full',
        game_status: 'Questionable',
        last_update: '2025-10-10',
        notes: 'Expected to play'
      },
      'travis kelce': {
        player: 'Travis Kelce',
        team: 'KC',
        position: 'TE',
        injury: 'Knee',
        practice_status: 'Limited',
        game_status: 'Out',
        last_update: '2025-10-10',
        notes: 'Will miss game'
      }
    }

    it('should return injury status for a player (case-insensitive)', () => {
      const result = getPlayerInjuryStatus(injuryMap, 'Patrick Mahomes')
      expect(result).toEqual(injuryMap['patrick mahomes'])
    })

    it('should return injury status for lowercase player name', () => {
      const result = getPlayerInjuryStatus(injuryMap, 'travis kelce')
      expect(result).toEqual(injuryMap['travis kelce'])
    })

    it('should return injury status for uppercase player name', () => {
      const result = getPlayerInjuryStatus(injuryMap, 'PATRICK MAHOMES')
      expect(result).toEqual(injuryMap['patrick mahomes'])
    })

    it('should return null for non-injured player', () => {
      const result = getPlayerInjuryStatus(injuryMap, 'Tyreek Hill')
      expect(result).toBeNull()
    })

    it('should return null when injuryMap is null', () => {
      const result = getPlayerInjuryStatus(null, 'Patrick Mahomes')
      expect(result).toBeNull()
    })

    it('should return null when playerName is null', () => {
      const result = getPlayerInjuryStatus(injuryMap, null)
      expect(result).toBeNull()
    })

    it('should return null when injuryMap is undefined', () => {
      const result = getPlayerInjuryStatus(undefined, 'Patrick Mahomes')
      expect(result).toBeNull()
    })

    it('should return null when playerName is empty', () => {
      const result = getPlayerInjuryStatus(injuryMap, '')
      expect(result).toBeNull()
    })
  })

  describe('getInjuryIndicator', () => {
    it('should return "Q" for Questionable status', () => {
      const injury = { game_status: 'Questionable', injury: 'Ankle' }
      expect(getInjuryIndicator(injury)).toBe('Q')
    })

    it('should return "Q" for Q status', () => {
      const injury = { game_status: 'Q', injury: 'Ankle' }
      expect(getInjuryIndicator(injury)).toBe('Q')
    })

    it('should return "D" for Doubtful status', () => {
      const injury = { game_status: 'Doubtful', injury: 'Knee' }
      expect(getInjuryIndicator(injury)).toBe('D')
    })

    it('should return "D" for D status', () => {
      const injury = { game_status: 'D', injury: 'Knee' }
      expect(getInjuryIndicator(injury)).toBe('D')
    })

    it('should return "O" for Out status', () => {
      const injury = { game_status: 'Out', injury: 'Concussion' }
      expect(getInjuryIndicator(injury)).toBe('O')
    })

    it('should return "O" for O status', () => {
      const injury = { game_status: 'O', injury: 'Concussion' }
      expect(getInjuryIndicator(injury)).toBe('O')
    })

    it('should return "IR" for Injured Reserve status', () => {
      const injury = { game_status: 'Injured Reserve', injury: 'ACL' }
      expect(getInjuryIndicator(injury)).toBe('IR')
    })

    it('should return "IR" for IR status', () => {
      const injury = { game_status: 'IR', injury: 'ACL' }
      expect(getInjuryIndicator(injury)).toBe('IR')
    })

    it('should return "PUP" for Physically Unable to Perform status', () => {
      const injury = { game_status: 'Physically Unable to Perform', injury: 'Hamstring' }
      expect(getInjuryIndicator(injury)).toBe('PUP')
    })

    it('should return "PUP" for PUP status', () => {
      const injury = { game_status: 'PUP', injury: 'Hamstring' }
      expect(getInjuryIndicator(injury)).toBe('PUP')
    })

    it('should be case-insensitive for game_status', () => {
      const injury = { game_status: 'questionable', injury: 'Ankle' }
      expect(getInjuryIndicator(injury)).toBe('Q')
    })

    it('should return "Q" when injury exists but game_status is unclear', () => {
      const injury = { injury: 'Ankle', game_status: 'Unknown' }
      expect(getInjuryIndicator(injury)).toBe('Q')
    })

    it('should return "Q" when injury exists but game_status is missing', () => {
      const injury = { injury: 'Ankle' }
      expect(getInjuryIndicator(injury)).toBe('Q')
    })

    it('should return null when injury is null', () => {
      expect(getInjuryIndicator(null)).toBeNull()
    })

    it('should return null when injury is undefined', () => {
      expect(getInjuryIndicator(undefined)).toBeNull()
    })

    it('should return null when injury object is empty', () => {
      expect(getInjuryIndicator({})).toBeNull()
    })
  })
})
