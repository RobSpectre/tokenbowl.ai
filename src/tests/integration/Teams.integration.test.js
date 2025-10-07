import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import Teams from '../../pages/Teams.vue'

/**
 * Integration tests for Teams.vue
 * Tests the full component with Pinia store integration
 */

describe('Teams.vue Integration Tests', () => {
  let routerMock

  beforeEach(() => {
    // Create fresh pinia
    const pinia = createPinia()
    setActivePinia(pinia)

    // Reset mocks
    vi.clearAllMocks()
    localStorage.clear()

    // Mock router and route
    routerMock = {
      push: vi.fn(),
      currentRoute: {
        value: {
          params: {}
        }
      }
    }

    // Mock fetch globally
    global.fetch = vi.fn()
  })

  describe('Player Name Display', () => {
    it('should display player names, not IDs, after data loads', async () => {
      // Mock API responses
      const mockLeague = {
        settings: { leg: 5 }
      }

      const mockUsers = [
        { user_id: '1', display_name: 'Greg Baugues' }
      ]

      const mockRosters = [
        {
          roster_id: 1,
          owner_id: '1',
          settings: { wins: 3, losses: 1, fpts: 562 },
          starters: ['4984', '8138'],
          players: ['4984', '8138', '9221']
        }
      ]

      const mockPlayers = {
        '4984': {
          player_id: '4984',
          first_name: 'Josh',
          last_name: 'Allen',
          full_name: 'Josh Allen',
          position: 'QB',
          team: 'BUF'
        },
        '8138': {
          player_id: '8138',
          first_name: 'James',
          last_name: 'Cook',
          full_name: 'James Cook',
          position: 'RB',
          team: 'BUF'
        },
        '9221': {
          player_id: '9221',
          first_name: 'Jahmyr',
          last_name: 'Gibbs',
          full_name: 'Jahmyr Gibbs',
          position: 'RB',
          team: 'DET'
        }
      }

      const mockDraftPicks = []

      const mockMatchups = [
        {
          roster_id: 1,
          matchup_id: 1,
          points: 120.5,
          starters: ['4984', '8138'],
          players: ['4984', '8138', '9221'],
          players_points: {
            '4984': 25.5,
            '8138': 18.0,
            '9221': 0.0
          }
        },
        {
          roster_id: 2,
          matchup_id: 1,
          points: 110.0,
          starters: ['1234', '5678'],
          players: ['1234', '5678'],
          players_points: {
            '1234': 20.0,
            '5678': 15.0
          }
        }
      ]

      // Set up fetch mock to return different responses based on URL
      global.fetch.mockImplementation((url) => {
        if (url.includes('/league/')) {
          if (url.includes('/users')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve(mockUsers)
            })
          }
          if (url.includes('/rosters')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve(mockRosters)
            })
          }
          if (url.includes('/matchups/')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve(mockMatchups)
            })
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockLeague)
          })
        }
        if (url.includes('/players/nfl')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPlayers)
          })
        }
        if (url.includes('draft_picks.json')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockDraftPicks)
          })
        }
        if (url.includes('openrouter.ai')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: [] })
          })
        }
        return Promise.reject(new Error(`Unmocked URL: ${url}`))
      })

      // Mount component
      const wrapper = mount(Teams, {
        global: {
          provide: {
            router: routerMock,
            route: routerMock.currentRoute.value
          },
          stubs: {
            RouterLink: true
          }
        }
      })

      // Wait for all async operations to complete
      // The component runs multiple rounds of async operations:
      // 1. fetchLeagueData, fetchPlayers, fetchDraft, fetchAllMatchups
      // 2. selectTeam -> loadTeamHistory
      // 3. loadAllTransactions
      await flushPromises()
      await flushPromises()
      await flushPromises()

      // Get the component's HTML
      const html = wrapper.html()

      // CRITICAL: Should NEVER show "Player 4984" pattern
      expect(html).not.toMatch(/Player 4984/)
      expect(html).not.toMatch(/Player 8138/)
      expect(html).not.toMatch(/Player 9221/)
      expect(html).not.toMatch(/Player \d+/)

      // Should show actual player names
      expect(html).toMatch(/Josh Allen/)
      expect(html).toMatch(/James Cook/)

      wrapper.unmount()
    })

    it('should trigger fetchPlayers when component mounts', async () => {
      const mockPlayers = {
        '4984': {
          first_name: 'Josh',
          last_name: 'Allen',
          full_name: 'Josh Allen'
        }
      }

      global.fetch.mockImplementation((url) => {
        if (url.includes('/players/nfl')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPlayers)
          })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        })
      })

      const wrapper = mount(Teams, {
        global: {
          provide: {
            router: routerMock,
            route: routerMock.currentRoute.value
          },
          stubs: { RouterLink: true }
        }
      })

      await flushPromises()

      // Verify players API was called
      const playersCalls = global.fetch.mock.calls.filter(call =>
        call[0].includes('/players/nfl')
      )

      expect(playersCalls.length).toBeGreaterThan(0)

      wrapper.unmount()
    })

    it('should use cache-busting when players data is empty', async () => {
      global.fetch.mockImplementation((url) => {
        if (url.includes('/players/nfl')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({})
          })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        })
      })

      const wrapper = mount(Teams, {
        global: {
          provide: {
            router: routerMock,
            route: routerMock.currentRoute.value
          },
          stubs: { RouterLink: true }
        }
      })

      await flushPromises()

      // Find the players API call
      const playersCalls = global.fetch.mock.calls.filter(call =>
        call[0].includes('/players/nfl')
      )

      if (playersCalls.length > 0) {
        const url = playersCalls[0][0]
        const options = playersCalls[0][1]

        // Should have timestamp query parameter
        expect(url).toMatch(/\?_t=\d+/)

        // Should use cache: 'reload'
        expect(options?.cache).toBe('reload')
      }

      wrapper.unmount()
    })
  })

  describe('Error Handling', () => {
    it('should show error state when API fails', async () => {
      global.fetch.mockRejectedValue(new Error('API Error'))

      const wrapper = mount(Teams, {
        global: {
          provide: {
            router: routerMock,
            route: routerMock.currentRoute.value
          },
          stubs: { RouterLink: true }
        }
      })

      await flushPromises()

      // Should show error message
      expect(wrapper.html()).toMatch(/Failed to load teams data/)

      wrapper.unmount()
    })

    it('should handle empty players gracefully', async () => {
      // Mock empty responses
      global.fetch.mockImplementation((url) => {
        if (url.includes('/players/nfl')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({}) // Empty players
          })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        })
      })

      const wrapper = mount(Teams, {
        global: {
          provide: {
            router: routerMock,
            route: routerMock.currentRoute.value
          },
          stubs: { RouterLink: true }
        }
      })

      await flushPromises()

      // Component should not crash
      expect(wrapper.exists()).toBe(true)

      wrapper.unmount()
    })
  })
})
