const CHANNEL_ID = 'UCFf-Wwy675zDhKDcKxGl_kw'
const SHORTS_PLAYLIST_ID = 'UUSH' + CHANNEL_ID.substring(2) // Replace UC with UUSH for shorts playlist
const LONG_FORM_PLAYLIST_ID = 'PLPseZqsYjyD5ZNg9Bjo_bn8JdJmcl-KGS' // Token Bowl long form videos playlist
const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY // Read from environment variable
const CACHE_DURATION = 3600000 // 1 hour in milliseconds
const CACHE_VERSION = 7 // v7: Force cache refresh for all users

// Helper function to get cached data
function getCachedData(key) {
  try {
    const cached = localStorage.getItem(key)
    if (cached) {
      const { data, timestamp, version } = JSON.parse(cached)
      // Check version and timestamp
      if (version === CACHE_VERSION && Date.now() - timestamp < CACHE_DURATION) {
        console.log(`Using cached YouTube data for: ${key}`)
        return data
      } else if (version !== CACHE_VERSION) {
        console.log(`Cache version mismatch for ${key} (stored: ${version}, current: ${CACHE_VERSION}). Clearing cache...`)
        localStorage.removeItem(key)
      }
    }
  } catch (error) {
    console.error('Error reading cache:', error)
  }
  return null
}

// Helper function to set cached data
function setCachedData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION
    }))
  } catch (error) {
    console.error('Error setting cache:', error)
  }
}

/**
 * Get all Shorts video IDs from the channel's Shorts playlist
 * @returns {Promise<Set<string>>} - Set of video IDs that are shorts
 */
async function getShortsVideoIds() {
  try {
    if (!API_KEY) {
      return new Set()
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?key=${API_KEY}&playlistId=${SHORTS_PLAYLIST_ID}&part=contentDetails&maxResults=50`
    )

    if (!response.ok) {
      console.warn('Could not fetch shorts playlist')
      return new Set()
    }

    const data = await response.json()
    const shortIds = data.items.map(item => item.contentDetails.videoId)
    return new Set(shortIds)
  } catch (error) {
    console.error('Error fetching shorts playlist:', error)
    return new Set()
  }
}

export async function getLatestVideos(maxResults = 10) {
  const cacheKey = `youtube_latest_videos_${maxResults}`

  // Check cache first
  const cachedData = getCachedData(cacheKey)
  if (cachedData) {
    return cachedData
  }

  try {
    if (!API_KEY) {
      console.warn('YouTube API key not set. Set VITE_YOUTUBE_API_KEY environment variable.')
      return []
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${CHANNEL_ID}&part=snippet,id&order=date&maxResults=${maxResults}&type=video`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch YouTube videos')
    }

    const data = await response.json()

    // Get video details to check duration (to identify shorts)
    const videoIds = data.items.map(item => item.id.videoId).join(',')
    const detailsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?key=${API_KEY}&id=${videoIds}&part=contentDetails,snippet`
    )

    if (!detailsResponse.ok) {
      throw new Error('Failed to fetch video details')
    }

    const detailsData = await detailsResponse.json()

    // Parse ISO 8601 duration to seconds
    const parseDuration = (duration) => {
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
      if (!match) return 0
      const hours = parseInt(match[1]) || 0
      const minutes = parseInt(match[2]) || 0
      const seconds = parseInt(match[3]) || 0
      return hours * 3600 + minutes * 60 + seconds
    }

    // Get list of Shorts video IDs from the UUSH playlist
    const shortsIds = await getShortsVideoIds()

    const videos = detailsData.items.map((item) => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.high.url,
      publishedAt: item.snippet.publishedAt,
      duration: parseDuration(item.contentDetails.duration),
      isShort: shortsIds.has(item.id), // Check if video ID is in shorts playlist
      url: `https://www.youtube.com/watch?v=${item.id}`
    }))

    // Cache the results
    setCachedData(cacheKey, videos)

    return videos
  } catch (error) {
    console.error('Error fetching YouTube videos:', error)
    return []
  }
}

export async function getLatestVideoAndShorts() {
  // Fetch long form videos from dedicated playlist
  const longFormVideos = await getPlaylistVideos(LONG_FORM_PLAYLIST_ID, 10)

  // Fetch shorts from the shorts playlist
  const shortsVideos = await getPlaylistVideos(SHORTS_PLAYLIST_ID, 10)

  // Sort long form videos by publishedAt (most recent first)
  const sortedLongForm = longFormVideos.sort((a, b) =>
    new Date(b.publishedAt) - new Date(a.publishedAt)
  )

  return {
    latestVideo: sortedLongForm[0] || null,
    latestShorts: shortsVideos.slice(0, 3)
  }
}

export async function getPlaylistVideos(playlistId, maxResults = 50) {
  const cacheKey = `youtube_playlist_${playlistId}_${maxResults}`

  // Check cache first
  const cachedData = getCachedData(cacheKey)
  if (cachedData) {
    return cachedData
  }

  try {
    if (!API_KEY) {
      console.warn('YouTube API key not set. Set VITE_YOUTUBE_API_KEY environment variable.')
      return []
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?key=${API_KEY}&playlistId=${playlistId}&part=snippet&maxResults=${maxResults}`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch playlist videos')
    }

    const data = await response.json()

    // Filter out private/unlisted videos (they have "Private video" or "Deleted video" as title)
    const videos = data.items
      .filter(item => {
        const title = item.snippet.title
        return title !== 'Private video' && title !== 'Deleted video' && !title.startsWith('Private')
      })
      .map(item => ({
        id: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
        publishedAt: item.snippet.publishedAt,
        url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`
      }))

    // Cache the results
    setCachedData(cacheKey, videos)

    return videos
  } catch (error) {
    console.error('Error fetching playlist videos:', error)
    return []
  }
}
