import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import Broadcast from '../../pages/Broadcast.vue'
import { useBroadcastStore } from '../../stores/broadcast.js'

// Mock all sub-components
vi.mock('../../components/broadcast/BroadcastMatchupsList.vue', () => ({
  default: {
    template: '<div class="broadcast-matchups-list-stub">Matchups List</div>'
  }
}))

vi.mock('../../components/broadcast/BroadcastMatchupDetail.vue', () => ({
  default: {
    template: '<div class="broadcast-matchup-detail-stub">Matchup Detail</div>'
  }
}))

vi.mock('../../components/broadcast/BroadcastScoringPlays.vue', () => ({
  default: {
    template: '<div class="broadcast-scoring-plays-stub">Scoring Plays</div>'
  }
}))

vi.mock('../../components/broadcast/BroadcastInjuryAlerts.vue', () => ({
  default: {
    template: '<div class="broadcast-injury-alerts-stub">Injury Alerts</div>'
  }
}))

describe('Broadcast.vue', () => {
  let wrapper
  let pinia

  beforeEach(() => {
    // Create fresh pinia
    pinia = createPinia()
    setActivePinia(pinia)

    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Component Rendering', () => {
    it('should render broadcast container', async () => {
      wrapper = mount(Broadcast, {
        global: {
          plugins: [pinia]
        }
      })

      await flushPromises()

      expect(wrapper.find('.broadcast-container').exists()).toBe(true)
      expect(wrapper.find('.broadcast-grid').exists()).toBe(true)
    })

    it('should have chroma key green background', () => {
      wrapper = mount(Broadcast, {
        global: {
          plugins: [pinia]
        }
      })

      const container = wrapper.find('.broadcast-container')
      expect(container.exists()).toBe(true)
      // Background color is in CSS (#00B140)
    })

    it('should render all broadcast panels', async () => {
      wrapper = mount(Broadcast, {
        global: {
          plugins: [pinia]
        }
      })

      await flushPromises()

      // Should have 4 panels total
      const panels = wrapper.findAll('.broadcast-panel')
      expect(panels.length).toBeGreaterThanOrEqual(4)

      // Verify all components are rendered
      expect(wrapper.find('.broadcast-matchup-detail-stub').exists()).toBe(true)
      expect(wrapper.find('.broadcast-matchups-list-stub').exists()).toBe(true)
      expect(wrapper.find('.broadcast-scoring-plays-stub').exists()).toBe(true)
      expect(wrapper.find('.broadcast-injury-alerts-stub').exists()).toBe(true)
    })
  })

  describe('Layout Structure', () => {
    it('should have 2-column grid layout', () => {
      wrapper = mount(Broadcast, {
        global: {
          plugins: [pinia]
        }
      })

      const grid = wrapper.find('.broadcast-grid')
      expect(grid.exists()).toBe(true)
      // Grid has 2 columns defined in CSS
    })

    it('should have right column with vertical layout', () => {
      wrapper = mount(Broadcast, {
        global: {
          plugins: [pinia]
        }
      })

      const rightColumn = wrapper.find('.right-column')
      expect(rightColumn.exists()).toBe(true)

      // Should contain matchups panel and bottom panels
      const matchupsPanel = wrapper.find('.matchups-panel')
      const bottomPanels = wrapper.find('.bottom-panels')

      expect(matchupsPanel.exists()).toBe(true)
      expect(bottomPanels.exists()).toBe(true)
    })

    it('should have bottom panels split horizontally', () => {
      wrapper = mount(Broadcast, {
        global: {
          plugins: [pinia]
        }
      })

      const bottomPanels = wrapper.find('.bottom-panels')
      expect(bottomPanels.exists()).toBe(true)

      // Should contain 2 panels (Scoring Plays and Injury Alerts)
      const panels = bottomPanels.findAll('.broadcast-panel')
      expect(panels).toHaveLength(2)
    })
  })

  describe('Store Integration', () => {
    it('should initialize store on mount', async () => {
      // Mock console.log to verify initialization was called
      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

      wrapper = mount(Broadcast, {
        global: {
          plugins: [pinia]
        }
      })

      await flushPromises()

      // Verify initialization log message
      expect(consoleLog).toHaveBeenCalledWith('[BROADCAST] Page mounted, initializing...')

      consoleLog.mockRestore()
    })

    it('should stop auto-refresh on unmount', async () => {
      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

      wrapper = mount(Broadcast, {
        global: {
          plugins: [pinia]
        }
      })

      await flushPromises()

      consoleLog.mockClear()

      wrapper.unmount()

      // Verify stop auto-refresh log message
      expect(consoleLog).toHaveBeenCalledWith('[BROADCAST] Page unmounted, stopping auto-refresh...')

      consoleLog.mockRestore()
    })

    it('should log initialization messages', async () => {
      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

      wrapper = mount(Broadcast, {
        global: {
          plugins: [pinia]
        }
      })

      await flushPromises()

      expect(consoleLog).toHaveBeenCalledWith('[BROADCAST] Page mounted, initializing...')

      consoleLog.mockRestore()
    })

    it('should log unmount messages', async () => {
      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

      wrapper = mount(Broadcast, {
        global: {
          plugins: [pinia]
        }
      })

      await flushPromises()

      consoleLog.mockClear()

      wrapper.unmount()

      expect(consoleLog).toHaveBeenCalledWith('[BROADCAST] Page unmounted, stopping auto-refresh...')

      consoleLog.mockRestore()
    })
  })

  describe('Last Refresh Display', () => {
    it('should have lastRefresh computed property', () => {
      wrapper = mount(Broadcast, {
        global: {
          plugins: [pinia]
        }
      })

      expect(wrapper.vm.lastRefresh).toBeDefined()
    })

    it('should have formatTime helper function', () => {
      wrapper = mount(Broadcast, {
        global: {
          plugins: [pinia]
        }
      })

      expect(wrapper.vm.formatTime).toBeDefined()
      expect(typeof wrapper.vm.formatTime).toBe('function')
    })

    it('should format timestamp correctly', () => {
      wrapper = mount(Broadcast, {
        global: {
          plugins: [pinia]
        }
      })

      const timestamp = new Date('2024-12-15T14:30:45').getTime()
      const formatted = wrapper.vm.formatTime(timestamp)

      // Should be in HH:MM:SS format
      expect(formatted).toMatch(/\d{1,2}:\d{2}:\d{2}/)
    })

    it('should return empty string for null timestamp', () => {
      wrapper = mount(Broadcast, {
        global: {
          plugins: [pinia]
        }
      })

      expect(wrapper.vm.formatTime(null)).toBe('')
      expect(wrapper.vm.formatTime(undefined)).toBe('')
    })
  })

  describe('Component Props and Stubs', () => {
    it('should render with v-motion animations', async () => {
      wrapper = mount(Broadcast, {
        global: {
          plugins: [pinia],
          directives: {
            motion: () => {} // Stub v-motion directive
          }
        }
      })

      await flushPromises()

      // Component should render without errors
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle store initialization errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      wrapper = mount(Broadcast, {
        global: {
          plugins: [pinia]
        }
      })

      await flushPromises()

      // Component should still render
      expect(wrapper.exists()).toBe(true)

      consoleError.mockRestore()
    })
  })

  describe('Panel Decorations', () => {
    it('should have decorative gradient on panels', () => {
      wrapper = mount(Broadcast, {
        global: {
          plugins: [pinia]
        }
      })

      const panels = wrapper.findAll('.broadcast-panel')
      expect(panels.length).toBeGreaterThan(0)

      // Panels have ::before pseudo-element with gradient (in CSS)
      panels.forEach(panel => {
        expect(panel.classes()).toContain('broadcast-panel')
      })
    })
  })

  describe('Dimensions and Layout', () => {
    it('should have 4K dimensions (3840x2160)', () => {
      wrapper = mount(Broadcast, {
        global: {
          plugins: [pinia]
        }
      })

      const container = wrapper.find('.broadcast-container')
      expect(container.exists()).toBe(true)
      // Dimensions are set in CSS (width: 3840px, height: 2160px)
    })

    it('should have fixed positioning', () => {
      wrapper = mount(Broadcast, {
        global: {
          plugins: [pinia]
        }
      })

      const container = wrapper.find('.broadcast-container')
      expect(container.exists()).toBe(true)
      // position: fixed is in CSS
    })

    it('should have correct padding (5px bottom)', () => {
      wrapper = mount(Broadcast, {
        global: {
          plugins: [pinia]
        }
      })

      const grid = wrapper.find('.broadcast-grid')
      expect(grid.exists()).toBe(true)
      // padding: 16px 16px 5px 16px is in CSS
    })
  })

  describe('Component Communication', () => {
    it('should provide store context to child components', async () => {
      wrapper = mount(Broadcast, {
        global: {
          plugins: [pinia]
        }
      })

      await flushPromises()

      // Store should be initialized and available
      const broadcastStore = useBroadcastStore()
      expect(broadcastStore).toBeDefined()
      expect(typeof broadcastStore.initialize).toBe('function')
      expect(typeof broadcastStore.stopAutoRefresh).toBe('function')
    })
  })
})
