import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getLatestVideos, getLatestVideoAndShorts, getPlaylistVideos } from '../youtubeApi.js'

describe('YouTube API', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
    // Mock environment variables
    vi.stubEnv('VITE_YOUTUBE_API_KEY', 'test-api-key')
    // Mock fetch globally
    global.fetch = vi.fn()
    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    }
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('getLatestVideos', () => {
    it('should fetch videos from YouTube API', async () => {
      const mockSearchResponse = {
        items: [
          {
            id: { videoId: 'test123' },
            snippet: {
              title: 'Test Video',
              description: 'Test Description',
              publishedAt: '2025-01-01T00:00:00Z',
              thumbnails: {
                high: { url: 'https://example.com/thumb.jpg' }
              }
            }
          }
        ]
      }

      const mockDetailsResponse = {
        items: [
          {
            id: 'test123',
            snippet: {
              title: 'Test Video',
              description: 'Test Description',
              publishedAt: '2025-01-01T00:00:00Z',
              thumbnails: {
                high: { url: 'https://example.com/thumb.jpg' }
              }
            },
            contentDetails: {
              duration: 'PT5M30S'
            }
          }
        ]
      }

      const mockShortsPlaylist = {
        items: [] // No shorts in this test
      }

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSearchResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDetailsResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockShortsPlaylist
        })

      const videos = await getLatestVideos(10)

      expect(global.fetch).toHaveBeenCalled()
      expect(videos).toHaveLength(1)
      expect(videos[0].title).toBe('Test Video')
    })

    it('should return empty array when fetch fails', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'))

      const videos = await getLatestVideos()

      expect(videos).toEqual([])
    })

    it('should return empty array when response is not ok', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      const videos = await getLatestVideos()

      expect(videos).toEqual([])
    })
  })

  describe('getLatestVideoAndShorts', () => {
    it('should fetch long form videos and shorts from separate playlists', async () => {
      const mockLongFormPlaylistResponse = {
        items: [
          {
            snippet: {
              title: 'Regular Video',
              description: 'Long form content',
              thumbnails: { high: { url: 'test.jpg' } },
              publishedAt: '2025-01-01T00:00:00Z',
              resourceId: { videoId: 'video1' }
            }
          }
        ]
      }

      const mockShortsPlaylistResponse = {
        items: [
          {
            snippet: {
              title: 'Short Video 1',
              description: 'Short content',
              thumbnails: { high: { url: 'test2.jpg' } },
              publishedAt: '2025-01-01T00:00:00Z',
              resourceId: { videoId: 'short1' }
            }
          },
          {
            snippet: {
              title: 'Short Video 2',
              description: 'Short content',
              thumbnails: { high: { url: 'test3.jpg' } },
              publishedAt: '2025-01-01T00:00:00Z',
              resourceId: { videoId: 'short2' }
            }
          }
        ]
      }

      global.fetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockLongFormPlaylistResponse })
        .mockResolvedValueOnce({ ok: true, json: async () => mockShortsPlaylistResponse })

      const result = await getLatestVideoAndShorts()

      expect(result.latestVideo).toBeDefined()
      expect(result.latestVideo.title).toBe('Regular Video')
      expect(result.latestShorts).toHaveLength(2)
      expect(result.latestShorts[0].title).toBe('Short Video 1')
    })
  })

  describe('getPlaylistVideos', () => {
    it('should fetch playlist videos', async () => {
      const mockResponse = {
        items: [
          {
            snippet: {
              title: 'Playlist Video',
              description: 'Test',
              publishedAt: '2025-01-01T00:00:00Z',
              thumbnails: { high: { url: 'test.jpg' } },
              resourceId: { videoId: 'vid123' }
            }
          }
        ]
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const videos = await getPlaylistVideos('PLtest123')

      expect(videos).toHaveLength(1)
      expect(videos[0].title).toBe('Playlist Video')
    })

    it('should filter out private and deleted videos', async () => {
      const mockResponse = {
        items: [
          {
            snippet: {
              title: 'Public Video',
              resourceId: { videoId: 'vid1' },
              thumbnails: { high: { url: 'test.jpg' } }
            }
          },
          {
            snippet: {
              title: 'Private video',
              resourceId: { videoId: 'vid2' },
              thumbnails: { high: { url: 'test.jpg' } }
            }
          },
          {
            snippet: {
              title: 'Deleted video',
              resourceId: { videoId: 'vid3' },
              thumbnails: { high: { url: 'test.jpg' } }
            }
          }
        ]
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const videos = await getPlaylistVideos('PLtest123')

      expect(videos).toHaveLength(1)
      expect(videos[0].title).toBe('Public Video')
    })

    it('should return empty array when fetch fails', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'))

      const videos = await getPlaylistVideos('PLtest123')

      expect(videos).toEqual([])
    })

    it('should return empty array when response is not ok', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      const videos = await getPlaylistVideos('PLtest123')

      expect(videos).toEqual([])
    })
  })
})
