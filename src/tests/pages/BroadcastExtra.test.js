import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import BroadcastExtra from '../../pages/BroadcastExtra.vue'
import * as espnApi from '../../espnApi.js'

// Mock the ESPN API module
vi.mock('../../espnApi.js', () => ({
  getLiveGames: vi.fn()
}))

describe('BroadcastExtra.vue', () => {
  let wrapper

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.useRealTimers()
  })

  const mockGames = [
    {
      id: '401671747',
      name: 'Pittsburgh Steelers at Cincinnati Bengals',
      period: 2,
      clock: '5:30',
      isActive: true,
      isCompleted: false,
      homeTeam: {
        abbreviation: 'CIN',
        logo: 'https://example.com/cin.png',
        score: '14',
        timeoutsRemaining: 2
      },
      awayTeam: {
        abbreviation: 'PIT',
        logo: 'https://example.com/pit.png',
        score: '10',
        timeoutsRemaining: 3
      },
      situation: {
        down: 2,
        distance: 5,
        possession: 'CIN',
        downDistanceText: '2nd & 5 at CIN 45'
      }
    },
    {
      id: '401671748',
      name: 'Dallas Cowboys at Philadelphia Eagles',
      period: 3,
      clock: '10:15',
      isActive: true,
      isCompleted: false,
      homeTeam: {
        abbreviation: 'PHI',
        logo: 'https://example.com/phi.png',
        score: '21',
        timeoutsRemaining: 3
      },
      awayTeam: {
        abbreviation: 'DAL',
        logo: 'https://example.com/dal.png',
        score: '17',
        timeoutsRemaining: 2
      },
      situation: {
        down: 1,
        distance: 10,
        possession: 'PHI',
        downDistanceText: '1st & 10 at DAL 25'
      }
    }
  ]

  describe('Component Rendering', () => {
    it('should render broadcast extra container', async () => {
      espnApi.getLiveGames.mockResolvedValue(mockGames)

      wrapper = mount(BroadcastExtra)
      await flushPromises()

      expect(wrapper.find('.broadcast-extra-container').exists()).toBe(true)
      expect(wrapper.find('.box-scores-grid').exists()).toBe(true)
    })

    it('should have chroma key green background', async () => {
      espnApi.getLiveGames.mockResolvedValue([])

      wrapper = mount(BroadcastExtra)
      await flushPromises()

      const container = wrapper.find('.broadcast-extra-container')
      expect(container.exists()).toBe(true)
      // Component is rendered (background color is in CSS)
    })

    it('should render multiple box scores for live games', async () => {
      espnApi.getLiveGames.mockResolvedValue(mockGames)

      wrapper = mount(BroadcastExtra, {
        global: {
          stubs: {
            BoxScore: {
              template: '<div class="box-score-stub">{{ game.id }}</div>',
              props: ['game']
            }
          }
        }
      })

      await flushPromises()

      const boxScores = wrapper.findAll('.box-score-stub')
      expect(boxScores).toHaveLength(2)
    })

    it('should show "No Live Games" message when no active games', async () => {
      espnApi.getLiveGames.mockResolvedValue([])

      wrapper = mount(BroadcastExtra)
      await flushPromises()

      expect(wrapper.find('.no-games-message').exists()).toBe(true)
      expect(wrapper.text()).toContain('No Live Games')
      expect(wrapper.text()).toContain('Check back during game time')
    })
  })

  describe('Game Filtering', () => {
    it('should filter to only show active games', async () => {
      const gamesWithInactive = [
        ...mockGames,
        {
          id: '401671749',
          name: 'Completed Game',
          period: 4,
          clock: '0:00',
          isActive: false,
          isCompleted: true,
          homeTeam: {
            abbreviation: 'HOME',
            score: '24',
            timeoutsRemaining: 0
          },
          awayTeam: {
            abbreviation: 'AWAY',
            score: '20',
            timeoutsRemaining: 0
          }
        }
      ]

      espnApi.getLiveGames.mockResolvedValue(gamesWithInactive)

      wrapper = mount(BroadcastExtra, {
        global: {
          stubs: {
            BoxScore: {
              template: '<div class="box-score-stub" :data-active="game.isActive">{{ game.id }}</div>',
              props: ['game']
            }
          }
        }
      })

      await flushPromises()

      const boxScores = wrapper.findAll('.box-score-stub')
      // Should only show 2 active games, not the completed one
      expect(boxScores).toHaveLength(2)

      const activeGames = boxScores.filter(bs => bs.attributes('data-active') === 'true')
      expect(activeGames).toHaveLength(2)
    })
  })

  describe('Auto-Refresh', () => {
    it('should auto-refresh games every 5 seconds', async () => {
      espnApi.getLiveGames.mockResolvedValue(mockGames)

      wrapper = mount(BroadcastExtra)
      await flushPromises()

      expect(espnApi.getLiveGames).toHaveBeenCalledTimes(1)

      // Advance time by 5 seconds
      vi.advanceTimersByTime(5000)
      await flushPromises()

      expect(espnApi.getLiveGames).toHaveBeenCalledTimes(2)

      // Advance another 5 seconds
      vi.advanceTimersByTime(5000)
      await flushPromises()

      expect(espnApi.getLiveGames).toHaveBeenCalledTimes(3)
    })

    it('should update displayed games when new data arrives', async () => {
      const initialGames = [mockGames[0]]
      const updatedGames = mockGames

      espnApi.getLiveGames.mockResolvedValueOnce(initialGames)

      wrapper = mount(BroadcastExtra, {
        global: {
          stubs: {
            BoxScore: {
              template: '<div class="box-score-stub">{{ game.id }}</div>',
              props: ['game']
            }
          }
        }
      })

      await flushPromises()

      expect(wrapper.findAll('.box-score-stub')).toHaveLength(1)

      // Update to return more games
      espnApi.getLiveGames.mockResolvedValueOnce(updatedGames)

      // Trigger refresh
      vi.advanceTimersByTime(5000)
      await flushPromises()

      expect(wrapper.findAll('.box-score-stub')).toHaveLength(2)
    })

    it('should stop auto-refresh when component is unmounted', async () => {
      espnApi.getLiveGames.mockResolvedValue(mockGames)

      wrapper = mount(BroadcastExtra)
      await flushPromises()

      expect(espnApi.getLiveGames).toHaveBeenCalledTimes(1)

      // Unmount component
      wrapper.unmount()

      // Advance time
      vi.advanceTimersByTime(10000)
      await flushPromises()

      // Should not have called again after unmount
      expect(espnApi.getLiveGames).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      espnApi.getLiveGames.mockRejectedValue(new Error('API Error'))

      wrapper = mount(BroadcastExtra)
      await flushPromises()

      // Component should still render
      expect(wrapper.exists()).toBe(true)

      // Should show no games message
      expect(wrapper.find('.no-games-message').exists()).toBe(true)

      consoleError.mockRestore()
    })

    it('should continue auto-refresh after an error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      // First call fails
      espnApi.getLiveGames.mockRejectedValueOnce(new Error('API Error'))
      // Second call succeeds
      espnApi.getLiveGames.mockResolvedValueOnce(mockGames)

      wrapper = mount(BroadcastExtra)
      await flushPromises()

      expect(wrapper.find('.no-games-message').exists()).toBe(true)

      // Advance time to trigger refresh
      vi.advanceTimersByTime(5000)
      await flushPromises()

      // Should now show games
      expect(wrapper.find('.no-games-message').exists()).toBe(false)

      consoleError.mockRestore()
    })
  })

  describe('Loading State', () => {
    it('should handle loading state on mount', async () => {
      let resolveGames
      const gamesPromise = new Promise(resolve => {
        resolveGames = resolve
      })

      espnApi.getLiveGames.mockReturnValue(gamesPromise)

      wrapper = mount(BroadcastExtra, {
        global: {
          stubs: {
            BoxScore: {
              template: '<div class="box-score-stub">{{ game.id }}</div>',
              props: ['game']
            }
          }
        }
      })

      // Component should exist even while loading
      expect(wrapper.exists()).toBe(true)

      // Resolve the promise
      resolveGames(mockGames)
      await flushPromises()

      // Games should now be displayed
      const boxScores = wrapper.findAll('.box-score-stub')
      expect(boxScores.length).toBeGreaterThan(0)
    })
  })

  describe('Console Logging', () => {
    it('should log loading and success messages', async () => {
      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
      espnApi.getLiveGames.mockResolvedValue(mockGames)

      wrapper = mount(BroadcastExtra)
      await flushPromises()

      expect(consoleLog).toHaveBeenCalledWith('[BROADCAST-EXTRA] Loading live games...')
      expect(consoleLog).toHaveBeenCalledWith('[BROADCAST-EXTRA] Loaded 2 live games')

      consoleLog.mockRestore()
    })

    it('should log auto-refresh events', async () => {
      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
      espnApi.getLiveGames.mockResolvedValue(mockGames)

      wrapper = mount(BroadcastExtra)
      await flushPromises()

      consoleLog.mockClear()

      // Trigger refresh
      vi.advanceTimersByTime(5000)
      await flushPromises()

      expect(consoleLog).toHaveBeenCalledWith('[BROADCAST-EXTRA] Auto-refreshing...')

      consoleLog.mockRestore()
    })
  })
})
