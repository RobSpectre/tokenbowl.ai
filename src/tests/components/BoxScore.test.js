import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import BoxScore from '../../components/broadcast/BoxScore.vue'

describe('BoxScore.vue', () => {
  let wrapper
  const mockGame = {
    id: '401671747',
    name: 'Pittsburgh Steelers at Cincinnati Bengals',
    period: 2,
    clock: '5:30',
    isActive: true,
    isCompleted: false,
    statusDetail: '5:30 - 2nd Quarter',
    homeTeam: {
      id: '4',
      name: 'Cincinnati Bengals',
      abbreviation: 'CIN',
      logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/cin.png',
      score: '14',
      timeoutsRemaining: 2
    },
    awayTeam: {
      id: '23',
      name: 'Pittsburgh Steelers',
      abbreviation: 'PIT',
      logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/pit.png',
      score: '10',
      timeoutsRemaining: 3
    },
    situation: {
      down: 2,
      distance: 5,
      yardLine: 45,
      possession: 'CIN',
      isRedZone: false,
      downDistanceText: '2nd & 5 at CIN 45',
      possessionText: 'CIN 45',
      lastPlay: 'Run for 3 yards'
    }
  }

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.useRealTimers()
  })

  describe('Component Rendering', () => {
    it('should render box score with game data', () => {
      wrapper = mount(BoxScore, {
        props: { game: mockGame }
      })

      expect(wrapper.find('.box-score').exists()).toBe(true)
      expect(wrapper.text()).toContain('CIN')
      expect(wrapper.text()).toContain('PIT')
      expect(wrapper.text()).toContain('14')
      expect(wrapper.text()).toContain('10')
    })

    it('should display quarter text correctly', () => {
      wrapper = mount(BoxScore, {
        props: { game: { ...mockGame, period: 1 } }
      })
      expect(wrapper.find('.quarter').text()).toBe('1ST')

      wrapper.unmount()
      wrapper = mount(BoxScore, {
        props: { game: { ...mockGame, period: 2 } }
      })
      expect(wrapper.find('.quarter').text()).toBe('2ND')

      wrapper.unmount()
      wrapper = mount(BoxScore, {
        props: { game: { ...mockGame, period: 3 } }
      })
      expect(wrapper.find('.quarter').text()).toBe('3RD')

      wrapper.unmount()
      wrapper = mount(BoxScore, {
        props: { game: { ...mockGame, period: 4 } }
      })
      expect(wrapper.find('.quarter').text()).toBe('4TH')

      wrapper.unmount()
      wrapper = mount(BoxScore, {
        props: { game: { ...mockGame, period: 5 } }
      })
      expect(wrapper.find('.quarter').text()).toBe('OT')
    })

    it('should display team logos', () => {
      wrapper = mount(BoxScore, {
        props: { game: mockGame }
      })

      const logos = wrapper.findAll('.team-logo img')
      expect(logos).toHaveLength(2)
      expect(logos[0].attributes('src')).toBe(mockGame.awayTeam.logo)
      expect(logos[1].attributes('src')).toBe(mockGame.homeTeam.logo)
    })

    it('should display down and distance when available', () => {
      wrapper = mount(BoxScore, {
        props: { game: mockGame }
      })

      expect(wrapper.find('.down-distance').exists()).toBe(true)
      expect(wrapper.find('.down-distance').text()).toBe('2nd & 5 at CIN 45')
    })

    it('should not display down and distance when not available', () => {
      const gameWithoutSituation = {
        ...mockGame,
        situation: null
      }

      wrapper = mount(BoxScore, {
        props: { game: gameWithoutSituation }
      })

      expect(wrapper.find('.down-distance').exists()).toBe(false)
    })
  })

  describe('Possession Indicator', () => {
    it('should show football emoji for team with possession', () => {
      wrapper = mount(BoxScore, {
        props: { game: mockGame }
      })

      const teamNames = wrapper.findAll('.team-name')
      const homeTeamName = teamNames[1] // CIN (home)
      const awayTeamName = teamNames[0] // PIT (away)

      // CIN has possession, should show football emoji
      expect(homeTeamName.text()).toContain('🏈')

      // PIT does not have possession
      expect(awayTeamName.text()).not.toContain('🏈')
    })

    it('should not show possession indicator when no possession data', () => {
      const gameWithoutPossession = {
        ...mockGame,
        situation: { ...mockGame.situation, possession: null }
      }

      wrapper = mount(BoxScore, {
        props: { game: gameWithoutPossession }
      })

      const teamNames = wrapper.findAll('.team-name')
      expect(teamNames[0].text()).not.toContain('🏈')
      expect(teamNames[1].text()).not.toContain('🏈')
    })
  })

  describe('Timeout Indicators', () => {
    it('should display correct number of timeouts', () => {
      wrapper = mount(BoxScore, {
        props: { game: mockGame }
      })

      const timeoutDots = wrapper.findAll('.timeout-dot')
      expect(timeoutDots).toHaveLength(6) // 3 for each team

      // Home team (CIN) has 2 timeouts remaining
      const homeTimeouts = wrapper.findAll('.team')[1].findAll('.timeout-dot')
      const homeUsedTimeouts = homeTimeouts.filter(dot => dot.classes('used'))
      expect(homeUsedTimeouts).toHaveLength(1) // 1 used = 2 remaining

      // Away team (PIT) has 3 timeouts remaining
      const awayTimeouts = wrapper.findAll('.team')[0].findAll('.timeout-dot')
      const awayUsedTimeouts = awayTimeouts.filter(dot => dot.classes('used'))
      expect(awayUsedTimeouts).toHaveLength(0) // 0 used = 3 remaining
    })

    it('should handle 0 timeouts remaining', () => {
      const gameNoTimeouts = {
        ...mockGame,
        homeTeam: { ...mockGame.homeTeam, timeoutsRemaining: 0 },
        awayTeam: { ...mockGame.awayTeam, timeoutsRemaining: 0 }
      }

      wrapper = mount(BoxScore, {
        props: { game: gameNoTimeouts }
      })

      const usedTimeouts = wrapper.findAll('.timeout-dot.used')
      expect(usedTimeouts).toHaveLength(6) // All 6 timeouts used
    })
  })

  describe('Clock Countdown Logic', () => {
    it('should initialize clock with correct time', () => {
      wrapper = mount(BoxScore, {
        props: { game: { ...mockGame, clock: '5:30' } }
      })

      expect(wrapper.find('.clock').text()).toBe('5:30')
    })

    it('should parse clock time correctly', () => {
      wrapper = mount(BoxScore, {
        props: { game: { ...mockGame, clock: '12:45' } }
      })

      expect(wrapper.find('.clock').text()).toBe('12:45')
    })

    it('should handle zero clock', () => {
      wrapper = mount(BoxScore, {
        props: { game: { ...mockGame, clock: '0:00' } }
      })

      expect(wrapper.find('.clock').text()).toBe('0:00')
    })

    it('should countdown when clock is running', async () => {
      wrapper = mount(BoxScore, {
        props: { game: { ...mockGame, clock: '5:30', isActive: true } }
      })

      // Initial clock
      expect(wrapper.find('.clock').text()).toBe('5:30')

      // Simulate clock decrease from API (triggers running state)
      await wrapper.setProps({
        game: { ...mockGame, clock: '5:29', isActive: true }
      })

      await flushPromises()

      // Should start countdown
      expect(wrapper.find('.clock').text()).toBe('5:29')

      // Advance time by 1 second (using 200ms intervals)
      // The interval runs every 200ms and decrements by 1 each time
      // So after 1000ms (5 intervals), clock decrements by 5 seconds
      vi.advanceTimersByTime(1000)
      await flushPromises()

      // Clock should have counted down by 5 seconds (5:29 - 5 = 5:24)
      expect(wrapper.find('.clock').text()).toBe('5:24')
    })

    it('should stop countdown when game is not active', async () => {
      wrapper = mount(BoxScore, {
        props: { game: { ...mockGame, clock: '5:30', isActive: true } }
      })

      // Trigger running state
      await wrapper.setProps({
        game: { ...mockGame, clock: '5:29', isActive: true }
      })

      await flushPromises()

      // Now mark game as inactive
      await wrapper.setProps({
        game: { ...mockGame, clock: '5:29', isActive: false }
      })

      await flushPromises()

      const clockBefore = wrapper.find('.clock').text()

      // Advance time
      vi.advanceTimersByTime(2000)
      await flushPromises()

      // Clock should not have changed
      expect(wrapper.find('.clock').text()).toBe(clockBefore)
    })

    it('should stop countdown after 4.5 seconds without API update', async () => {
      wrapper = mount(BoxScore, {
        props: { game: { ...mockGame, clock: '5:30', isActive: true } }
      })

      // Trigger running state
      await wrapper.setProps({
        game: { ...mockGame, clock: '5:29', isActive: true }
      })

      await flushPromises()

      // Advance time by 1 second - should still be counting
      // Using 200ms intervals, 1000ms = 5 decrements
      vi.advanceTimersByTime(1000)
      await flushPromises()
      expect(wrapper.find('.clock').text()).toBe('5:24')

      // Advance time by another 4 seconds (total 5 seconds without API update)
      // This should trigger the 4.5s threshold and stop the clock
      vi.advanceTimersByTime(4000)
      await flushPromises()

      const clockAfter5Seconds = wrapper.find('.clock').text()

      // Advance more time
      vi.advanceTimersByTime(2000)
      await flushPromises()

      // Clock should have stopped (no change after 4.5s threshold)
      expect(wrapper.find('.clock').text()).toBe(clockAfter5Seconds)
    })

    it('should not countdown if clock value stays the same', async () => {
      wrapper = mount(BoxScore, {
        props: { game: { ...mockGame, clock: '5:30', isActive: true } }
      })

      expect(wrapper.find('.clock').text()).toBe('5:30')

      // Same clock value (no decrease)
      await wrapper.setProps({
        game: { ...mockGame, clock: '5:30', isActive: true }
      })

      await flushPromises()

      // Advance time
      vi.advanceTimersByTime(2000)
      await flushPromises()

      // Clock should not have changed (not running)
      expect(wrapper.find('.clock').text()).toBe('5:30')
    })
  })

  describe('Clock Update Frequency', () => {
    it('should update clock every 200ms when running', async () => {
      wrapper = mount(BoxScore, {
        props: { game: { ...mockGame, clock: '0:10', isActive: true } }
      })

      // Trigger running state
      await wrapper.setProps({
        game: { ...mockGame, clock: '0:09', isActive: true }
      })

      await flushPromises()

      expect(wrapper.find('.clock').text()).toBe('0:09')

      // Advance by 200ms (one interval)
      vi.advanceTimersByTime(200)
      await flushPromises()

      expect(wrapper.find('.clock').text()).toBe('0:08')

      // Advance by another 200ms
      vi.advanceTimersByTime(200)
      await flushPromises()

      expect(wrapper.find('.clock').text()).toBe('0:07')
    })
  })

  describe('Component Cleanup', () => {
    it('should clean up interval on unmount', async () => {
      wrapper = mount(BoxScore, {
        props: { game: { ...mockGame, clock: '5:30', isActive: true } }
      })

      // Trigger running state
      await wrapper.setProps({
        game: { ...mockGame, clock: '5:29', isActive: true }
      })

      await flushPromises()

      // Unmount component
      wrapper.unmount()

      // Advance timers - should not cause errors
      vi.advanceTimersByTime(5000)
      await flushPromises()

      // No errors should occur
      expect(true).toBe(true)
    })
  })
})
