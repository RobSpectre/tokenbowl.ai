import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'

// Import all page components
import Home from '../pages/Home.vue'
import Teams from '../pages/Teams.vue'
import Videos from '../pages/Videos.vue'
import Draft from '../pages/Draft.vue'
import Scoring from '../pages/Scoring.vue'
import Slopup from '../pages/Slopup.vue'
import SlopupDetail from '../pages/SlopupDetail.vue'
import MatchupDetail from '../pages/MatchupDetail.vue'

// Import App component
import App from '../App.vue'

describe('Template Compilation', () => {
  let router
  let pinia

  beforeEach(() => {
    // Create a mock router
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: Home },
        { path: '/teams', component: Teams },
        { path: '/videos', component: Videos },
        { path: '/draft', component: Draft },
        { path: '/scoring', component: Scoring },
        { path: '/slopup', component: Slopup },
        { path: '/slopup/:episode', component: SlopupDetail },
        { path: '/matchup/:week/:matchupId', component: MatchupDetail }
      ]
    })

    // Create pinia instance
    pinia = createPinia()
    setActivePinia(pinia)

    // Mock fetch to prevent actual API calls
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      })
    )
  })

  describe('App Component', () => {
    it('should compile App.vue template without errors', () => {
      expect(() => {
        mount(App, {
          global: {
            plugins: [router, pinia],
            stubs: {
              RouterLink: true,
              RouterView: true
            }
          }
        })
      }).not.toThrow()
    })
  })

  describe('Page Components', () => {
    it('should compile Home.vue template without errors', () => {
      expect(() => {
        mount(Home, {
          global: {
            plugins: [router, pinia],
            stubs: {
              RouterLink: true
            }
          }
        })
      }).not.toThrow()
    })

    it('should compile Teams.vue template without errors', () => {
      expect(() => {
        mount(Teams, {
          global: {
            plugins: [router, pinia],
            stubs: {
              RouterLink: true
            }
          }
        })
      }).not.toThrow()
    })

    it('should compile Videos.vue template without errors', () => {
      expect(() => {
        mount(Videos, {
          global: {
            plugins: [router, pinia],
            stubs: {
              RouterLink: true
            }
          }
        })
      }).not.toThrow()
    })

    it('should compile Draft.vue template without errors', () => {
      expect(() => {
        mount(Draft, {
          global: {
            plugins: [router, pinia],
            stubs: {
              RouterLink: true
            }
          }
        })
      }).not.toThrow()
    })

    it('should compile Scoring.vue template without errors', () => {
      expect(() => {
        mount(Scoring, {
          global: {
            plugins: [router, pinia],
            stubs: {
              RouterLink: true
            }
          }
        })
      }).not.toThrow()
    })

    it('should compile Slopup.vue template without errors', () => {
      expect(() => {
        mount(Slopup, {
          global: {
            plugins: [router, pinia],
            stubs: {
              RouterLink: true
            }
          }
        })
      }).not.toThrow()
    })

    it('should compile SlopupDetail.vue template without errors', async () => {
      // Set route params for SlopupDetail
      await router.push('/slopup/1')
      await router.isReady()

      expect(() => {
        mount(SlopupDetail, {
          global: {
            plugins: [router, pinia],
            stubs: {
              RouterLink: true
            }
          }
        })
      }).not.toThrow()
    })

    it('should compile MatchupDetail.vue template without errors', async () => {
      // Set route params for MatchupDetail
      await router.push('/matchup/1/1')
      await router.isReady()

      expect(() => {
        mount(MatchupDetail, {
          global: {
            plugins: [router, pinia],
            stubs: {
              RouterLink: true
            }
          }
        })
      }).not.toThrow()
    })
  })

  describe('Template Syntax Validation', () => {
    it('should not have Pug syntax errors with decimal class names', () => {
      // This test specifically checks that components don't use
      // decimal numbers in Pug dot notation (e.g., .py-0.5)
      // which causes compilation errors
      expect(() => {
        mount(MatchupDetail, {
          global: {
            plugins: [router, pinia],
            stubs: {
              RouterLink: true
            }
          }
        })
      }).not.toThrow()
    })

    it('should handle all Tailwind utility classes correctly', () => {
      // Test that components with complex Tailwind classes compile
      const components = [Home, Teams, Videos, Draft, Scoring, Slopup]

      components.forEach((component) => {
        expect(() => {
          mount(component, {
            global: {
              plugins: [router, pinia],
              stubs: {
                RouterLink: true
              }
            }
          })
        }).not.toThrow()
      })
    })
  })

  describe('Template Rendering', () => {
    it('should render App component without crashing', () => {
      const wrapper = mount(App, {
        global: {
          plugins: [router, pinia],
          stubs: {
            RouterLink: true,
            RouterView: true
          }
        }
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('header').exists()).toBe(true)
    })

    it('should render page components without crashing', () => {
      const components = [
        { component: Home, name: 'Home' },
        { component: Teams, name: 'Teams' },
        { component: Videos, name: 'Videos' },
        { component: Draft, name: 'Draft' },
        { component: Scoring, name: 'Scoring' },
        { component: Slopup, name: 'Slopup' }
      ]

      components.forEach(({ component, name }) => {
        const wrapper = mount(component, {
          global: {
            plugins: [router, pinia],
            stubs: {
              RouterLink: true
            }
          }
        })

        expect(wrapper.exists()).toBe(true)
      })
    })
  })
})
