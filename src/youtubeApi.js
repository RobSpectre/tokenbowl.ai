const CHANNEL_ID = 'UCFf-Wwy675zDhKDcKxGl_kw'
const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY // Read from environment variable

export async function getLatestVideos(maxResults = 10) {
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

    return detailsData.items.map(item => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.high.url,
      publishedAt: item.snippet.publishedAt,
      duration: parseDuration(item.contentDetails.duration),
      isShort: parseDuration(item.contentDetails.duration) <= 60,
      url: `https://www.youtube.com/watch?v=${item.id}`
    }))
  } catch (error) {
    console.error('Error fetching YouTube videos:', error)
    return []
  }
}

export async function getLatestVideoAndShorts() {
  const videos = await getLatestVideos(20)

  const regularVideos = videos.filter(v => !v.isShort)
  const shorts = videos.filter(v => v.isShort)

  return {
    latestVideo: regularVideos[0] || null,
    latestShorts: shorts.slice(0, 3)
  }
}

export async function getPlaylistVideos(playlistId, maxResults = 50) {
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
    return data.items
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
  } catch (error) {
    console.error('Error fetching playlist videos:', error)
    return []
  }
}
