import { describe, it, expect, beforeEach, vi } from 'vitest'
import { trackPageView, trackButtonClick, trackEvent } from '../analytics.js'

describe('Analytics', () => {
  beforeEach(() => {
    // Mock window.posthog and window.gtag
    global.window = global.window || {}
    global.window.posthog = {
      capture: vi.fn()
    }
    global.window.gtag = vi.fn()
  })

  describe('trackPageView', () => {
    it('should track page view with posthog and gtag', () => {
      const pageName = '/teams/mistral'

      trackPageView(pageName)

      expect(window.posthog.capture).toHaveBeenCalledWith('page_view', {
        page_name: pageName
      })
      expect(window.gtag).toHaveBeenCalledWith('event', 'page_view', {
        page_name: pageName
      })
    })

    it('should track page view with additional properties', () => {
      const pageName = '/teams/mistral'
      const properties = { team_id: 2 }

      trackPageView(pageName, properties)

      expect(window.posthog.capture).toHaveBeenCalledWith('page_view', {
        page_name: pageName,
        team_id: 2
      })
      expect(window.gtag).toHaveBeenCalledWith('event', 'page_view', {
        page_name: pageName,
        team_id: 2
      })
    })

    it('should handle missing posthog gracefully', () => {
      delete window.posthog

      expect(() => trackPageView('/test')).not.toThrow()
      expect(window.gtag).toHaveBeenCalledWith('event', 'page_view', {
        page_name: '/test'
      })
    })

    it('should handle missing gtag gracefully', () => {
      delete window.gtag

      expect(() => trackPageView('/test')).not.toThrow()
      expect(window.posthog.capture).toHaveBeenCalledWith('page_view', {
        page_name: '/test'
      })
    })

    it('should handle missing both trackers gracefully', () => {
      delete window.posthog
      delete window.gtag

      expect(() => trackPageView('/test')).not.toThrow()
    })
  })

  describe('trackButtonClick', () => {
    it('should track button click with posthog and gtag', () => {
      const buttonName = 'team_select'
      const metadata = { team_name: 'Mistral', roster_id: 2 }

      trackButtonClick(buttonName, metadata)

      expect(window.posthog.capture).toHaveBeenCalledWith('button_click', {
        button_name: buttonName,
        ...metadata
      })
      expect(window.gtag).toHaveBeenCalledWith('event', 'button_click', {
        button_name: buttonName,
        ...metadata
      })
    })

    it('should track button click without metadata', () => {
      const buttonName = 'download_matchup'

      trackButtonClick(buttonName)

      expect(window.posthog.capture).toHaveBeenCalledWith('button_click', {
        button_name: buttonName
      })
      expect(window.gtag).toHaveBeenCalledWith('event', 'button_click', {
        button_name: buttonName
      })
    })

    it('should handle missing analytics gracefully', () => {
      delete window.posthog
      delete window.gtag

      expect(() => trackButtonClick('test')).not.toThrow()
    })
  })

  describe('trackEvent', () => {
    it('should track custom event with posthog and gtag', () => {
      const eventName = 'roster_change'
      const metadata = { week: 5, player: 'Saquon Barkley' }

      trackEvent(eventName, metadata)

      expect(window.posthog.capture).toHaveBeenCalledWith(eventName, metadata)
      expect(window.gtag).toHaveBeenCalledWith('event', eventName, metadata)
    })

    it('should track event without metadata', () => {
      const eventName = 'page_loaded'

      trackEvent(eventName)

      expect(window.posthog.capture).toHaveBeenCalledWith(eventName, {})
      expect(window.gtag).toHaveBeenCalledWith('event', eventName, {})
    })

    it('should handle missing analytics gracefully', () => {
      delete window.posthog
      delete window.gtag

      expect(() => trackEvent('test')).not.toThrow()
    })
  })
})
