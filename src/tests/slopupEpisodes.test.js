import { describe, it, expect } from 'vitest'
import { episodes, getEpisodeByWeek, getEpisodeBySlug, getAllEpisodes } from '../slopupEpisodes.js'

describe('Episode Metadata Tests', () => {
  describe('Episode Data Structure', () => {
    it('should have all required fields for each episode', () => {
      Object.values(episodes).forEach(episode => {
        expect(episode).toHaveProperty('week')
        expect(episode).toHaveProperty('slug')
        expect(episode).toHaveProperty('title')
        expect(episode).toHaveProperty('emoji')
        expect(typeof episode.week).toBe('number')
        expect(typeof episode.slug).toBe('string')
        expect(typeof episode.title).toBe('string')
        expect(typeof episode.emoji).toBe('string')
      })
    })

    it('should have unique week numbers', () => {
      const weeks = Object.values(episodes).map(ep => ep.week)
      const uniqueWeeks = new Set(weeks)
      expect(uniqueWeeks.size).toBe(weeks.length)
    })

    it('should have unique slugs', () => {
      const slugs = Object.values(episodes).map(ep => ep.slug)
      const uniqueSlugs = new Set(slugs)
      expect(uniqueSlugs.size).toBe(slugs.length)
    })
  })

  describe('getEpisodeByWeek', () => {
    it('should return episode for valid week', () => {
      const episode = getEpisodeByWeek(1)
      expect(episode).toBeDefined()
      expect(episode.week).toBe(1)
      expect(episode.slug).toBe('week-1-josh-allen-vs-the-algorithm')
      expect(episode.title).toBe('Week 1 - Josh Allen vs. The Algorithm')
      expect(episode.emoji).toBe('⚔️')
    })

    it('should return episode for week 5', () => {
      const episode = getEpisodeByWeek(5)
      expect(episode).toBeDefined()
      expect(episode.week).toBe(5)
      expect(episode.slug).toBe('week-5-the-calm-before-the-injury-storm')
      expect(episode.title).toBe('Week 5 - The Calm Before the Injury Storm')
      expect(episode.emoji).toBe('🚑')
    })

    it('should return null for invalid week', () => {
      const episode = getEpisodeByWeek(99)
      expect(episode).toBeNull()
    })
  })

  describe('getEpisodeBySlug', () => {
    it('should return episode for valid slug', () => {
      const episode = getEpisodeBySlug('week-1-josh-allen-vs-the-algorithm')
      expect(episode).toBeDefined()
      expect(episode.week).toBe(1)
      expect(episode.slug).toBe('week-1-josh-allen-vs-the-algorithm')
    })

    it('should return episode for week 5 slug', () => {
      const episode = getEpisodeBySlug('week-5-the-calm-before-the-injury-storm')
      expect(episode).toBeDefined()
      expect(episode.week).toBe(5)
    })

    it('should return null for invalid slug', () => {
      const episode = getEpisodeBySlug('invalid-slug')
      expect(episode).toBeNull()
    })

    it('should handle partial slug matches correctly (should not match)', () => {
      const episode = getEpisodeBySlug('week-1')
      expect(episode).toBeNull()
    })
  })

  describe('getAllEpisodes', () => {
    it('should return all episodes as array', () => {
      const allEpisodes = getAllEpisodes()
      expect(Array.isArray(allEpisodes)).toBe(true)
      expect(allEpisodes.length).toBeGreaterThan(0)
    })

    it('should return episodes with all required fields', () => {
      const allEpisodes = getAllEpisodes()
      allEpisodes.forEach(episode => {
        expect(episode).toHaveProperty('week')
        expect(episode).toHaveProperty('slug')
        expect(episode).toHaveProperty('title')
        expect(episode).toHaveProperty('emoji')
      })
    })

    it('should include week 5 episode', () => {
      const allEpisodes = getAllEpisodes()
      const week5 = allEpisodes.find(ep => ep.week === 5)
      expect(week5).toBeDefined()
      expect(week5.title).toBe('Week 5 - The Calm Before the Injury Storm')
    })
  })
})
