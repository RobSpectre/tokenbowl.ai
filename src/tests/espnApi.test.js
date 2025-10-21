import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getScoreboard,
  getGameDetail,
  parseGames,
  getActiveGames,
  getLiveGames,
  getWeekGames
} from '../espnApi.js'

describe('ESPN API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  describe('getScoreboard', () => {
    it('should fetch scoreboard data without date', async () => {
      const mockScoreboard = {
        events: [
          {
            id: '401671747',
            name: 'Pittsburgh Steelers at Cincinnati Bengals'
          }
        ]
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockScoreboard
      })

      const result = await getScoreboard()

      expect(global.fetch).toHaveBeenCalledWith(
        'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard'
      )
      expect(result).toEqual(mockScoreboard)
    })

    it('should fetch scoreboard data with date', async () => {
      const mockScoreboard = { events: [] }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockScoreboard
      })

      await getScoreboard('20241215')

      expect(global.fetch).toHaveBeenCalledWith(
        'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=20241215'
      )
    })

    it('should throw error on failed request', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      })

      await expect(getScoreboard()).rejects.toThrow('ESPN API error: 500')
    })
  })

  describe('getGameDetail', () => {
    it('should fetch game detail data', async () => {
      const mockGameDetail = {
        header: { competition: {} }
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGameDetail
      })

      const result = await getGameDetail('401671747')

      expect(global.fetch).toHaveBeenCalledWith(
        'https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=401671747'
      )
      expect(result).toEqual(mockGameDetail)
    })

    it('should throw error on failed request', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      await expect(getGameDetail('invalid')).rejects.toThrow('ESPN API error: 404')
    })
  })

  describe('parseGames', () => {
    it('should parse games from scoreboard data', () => {
      const mockScoreboard = {
        events: [
          {
            id: '401671747',
            name: 'Pittsburgh Steelers at Cincinnati Bengals',
            shortName: 'PIT @ CIN',
            competitions: [
              {
                status: {
                  period: 2,
                  displayClock: '0:25',
                  type: {
                    state: 'in',
                    completed: false,
                    detail: '0:25 - 2nd Quarter'
                  }
                },
                competitors: [
                  {
                    id: '4',
                    homeAway: 'home',
                    team: {
                      displayName: 'Cincinnati Bengals',
                      abbreviation: 'CIN',
                      logo: 'https://example.com/cin.png'
                    },
                    score: '14',
                    records: [{ summary: '8-6' }]
                  },
                  {
                    id: '23',
                    homeAway: 'away',
                    team: {
                      displayName: 'Pittsburgh Steelers',
                      abbreviation: 'PIT',
                      logo: 'https://example.com/pit.png'
                    },
                    score: '10',
                    records: [{ summary: '10-4' }]
                  }
                ],
                situation: {
                  down: 2,
                  distance: 2,
                  yardLine: 51,
                  possession: '4',
                  isRedZone: false,
                  downDistanceText: '2nd & 2 at PIT 49',
                  possessionText: 'PIT 49',
                  homeTimeouts: 1,
                  awayTimeouts: 1,
                  lastPlay: {
                    text: 'Pass reception for 8 yards'
                  }
                },
                broadcasts: [
                  { names: ['FOX'] }
                ]
              }
            ]
          }
        ]
      }

      const result = parseGames(mockScoreboard)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: '401671747',
        name: 'Pittsburgh Steelers at Cincinnati Bengals',
        period: 2,
        clock: '0:25',
        isActive: true,
        isCompleted: false,
        homeTeam: {
          abbreviation: 'CIN',
          score: '14',
          timeoutsRemaining: 1
        },
        awayTeam: {
          abbreviation: 'PIT',
          score: '10',
          timeoutsRemaining: 1
        },
        situation: {
          down: 2,
          distance: 2,
          possession: 'CIN'
        },
        broadcast: 'FOX'
      })
    })

    it('should handle missing situation data', () => {
      const mockScoreboard = {
        events: [
          {
            id: '401671747',
            name: 'Game',
            shortName: 'GAME',
            competitions: [
              {
                status: {
                  period: 1,
                  displayClock: '15:00',
                  type: { state: 'pre', completed: false, detail: 'Scheduled' }
                },
                competitors: [
                  {
                    homeAway: 'home',
                    team: { abbreviation: 'HOME', logo: '' },
                    score: '0'
                  },
                  {
                    homeAway: 'away',
                    team: { abbreviation: 'AWAY', logo: '' },
                    score: '0'
                  }
                ]
              }
            ]
          }
        ]
      }

      const result = parseGames(mockScoreboard)

      expect(result[0].situation).toBeNull()
      expect(result[0].homeTeam.timeoutsRemaining).toBe(3)
      expect(result[0].awayTeam.timeoutsRemaining).toBe(3)
    })

    it('should return empty array for invalid scoreboard', () => {
      expect(parseGames(null)).toEqual([])
      expect(parseGames({})).toEqual([])
      expect(parseGames({ events: null })).toEqual([])
    })
  })

  describe('getActiveGames', () => {
    it('should filter only active games', () => {
      const mockScoreboard = {
        events: [
          {
            id: '1',
            name: 'Active Game',
            shortName: 'ACTIVE',
            competitions: [
              {
                status: {
                  period: 2,
                  displayClock: '5:00',
                  type: { state: 'in', completed: false }
                },
                competitors: [
                  { homeAway: 'home', team: { abbreviation: 'H' }, score: '10' },
                  { homeAway: 'away', team: { abbreviation: 'A' }, score: '7' }
                ]
              }
            ]
          },
          {
            id: '2',
            name: 'Completed Game',
            shortName: 'COMPLETE',
            competitions: [
              {
                status: {
                  period: 4,
                  displayClock: '0:00',
                  type: { state: 'post', completed: true }
                },
                competitors: [
                  { homeAway: 'home', team: { abbreviation: 'H' }, score: '24' },
                  { homeAway: 'away', team: { abbreviation: 'A' }, score: '21' }
                ]
              }
            ]
          }
        ]
      }

      const result = getActiveGames(mockScoreboard)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
      expect(result[0].isActive).toBe(true)
    })
  })

  describe('getLiveGames', () => {
    it('should fetch and parse live games', async () => {
      const mockScoreboard = {
        events: [
          {
            id: '1',
            name: 'Live Game',
            shortName: 'LIVE',
            competitions: [
              {
                status: {
                  period: 3,
                  displayClock: '10:00',
                  type: { state: 'in', completed: false }
                },
                competitors: [
                  { homeAway: 'home', team: { abbreviation: 'H' }, score: '17' },
                  { homeAway: 'away', team: { abbreviation: 'A' }, score: '14' }
                ]
              }
            ]
          }
        ]
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockScoreboard
      })

      const result = await getLiveGames()

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })
  })

  describe('getWeekGames', () => {
    it('should fetch games for a specific week', async () => {
      const mockScoreboard = { events: [] }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockScoreboard
      })

      await getWeekGames('2025', 7)

      expect(global.fetch).toHaveBeenCalledWith(
        'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=2025&seasontype=2&week=7'
      )
    })

    it('should throw error on failed request', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400
      })

      await expect(getWeekGames('2025', 1)).rejects.toThrow('ESPN API error: 400')
    })
  })
})
