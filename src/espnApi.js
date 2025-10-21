// ESPN NFL API Integration
// Provides live game data including scores, down, distance, quarter, and game clock

const ESPN_BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl'

/**
 * Get current NFL scoreboard with live game data
 * @param {string} date - Optional date in YYYYMMDD format (defaults to today)
 * @returns {Promise<Object>} Scoreboard data with all active games
 */
export async function getScoreboard(date = null) {
  try {
    let url = `${ESPN_BASE_URL}/scoreboard`
    if (date) {
      url += `?dates=${date}`
    }

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching ESPN scoreboard:', error)
    throw error
  }
}

/**
 * Get detailed game information for a specific game
 * @param {string} gameId - ESPN event ID
 * @returns {Promise<Object>} Detailed game data
 */
export async function getGameDetail(gameId) {
  try {
    const url = `${ESPN_BASE_URL}/summary?event=${gameId}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching game detail:', error)
    throw error
  }
}

/**
 * Parse scoreboard data into a simplified format for box scores
 * @param {Object} scoreboard - Raw scoreboard data from ESPN
 * @returns {Array} Array of simplified game objects
 */
export function parseGames(scoreboard) {
  if (!scoreboard?.events) {
    return []
  }

  return scoreboard.events.map(event => {
    const competition = event.competitions?.[0]
    const status = competition?.status
    const situation = competition?.situation
    const competitors = competition?.competitors || []

    // Find home and away teams
    const homeTeam = competitors.find(c => c.homeAway === 'home')
    const awayTeam = competitors.find(c => c.homeAway === 'away')

    // Determine possession
    let possession = null
    if (situation?.possession) {
      possession = competitors.find(c => c.id === situation.possession)?.team?.abbreviation
    }

    return {
      id: event.id,
      name: event.name,
      shortName: event.shortName,

      // Status
      period: status?.period || 0,
      clock: status?.displayClock || '0:00',
      isActive: status?.type?.state === 'in',
      isCompleted: status?.type?.completed || false,
      statusDetail: status?.type?.detail || '',

      // Teams
      homeTeam: {
        id: homeTeam?.id,
        name: homeTeam?.team?.displayName,
        abbreviation: homeTeam?.team?.abbreviation,
        logo: homeTeam?.team?.logo,
        score: homeTeam?.score || '0',
        record: homeTeam?.records?.[0]?.summary || '0-0',
        timeoutsRemaining: situation?.homeTimeouts ?? 3
      },
      awayTeam: {
        id: awayTeam?.id,
        name: awayTeam?.team?.displayName,
        abbreviation: awayTeam?.team?.abbreviation,
        logo: awayTeam?.team?.logo,
        score: awayTeam?.score || '0',
        record: awayTeam?.records?.[0]?.summary || '0-0',
        timeoutsRemaining: situation?.awayTimeouts ?? 3
      },

      // Game situation (only available during live games)
      situation: situation ? {
        down: situation.down || null,
        distance: situation.distance || null,
        yardLine: situation.yardLine || null,
        possession: possession,
        isRedZone: situation.isRedZone || false,
        downDistanceText: situation.downDistanceText || '',
        possessionText: situation.possessionText || '',
        lastPlay: situation.lastPlay?.text || ''
      } : null,

      // Broadcast info
      broadcast: competition?.broadcasts?.[0]?.names?.[0] || null
    }
  })
}

/**
 * Get active (live) games from scoreboard
 * @param {Object} scoreboard - Raw scoreboard data
 * @returns {Array} Array of active games
 */
export function getActiveGames(scoreboard) {
  const games = parseGames(scoreboard)
  return games.filter(game => game.isActive)
}

/**
 * Get live games with auto-refresh capability
 * @returns {Promise<Array>} Array of parsed game objects
 */
export async function getLiveGames() {
  const scoreboard = await getScoreboard()
  return parseGames(scoreboard)
}

/**
 * Get week number for a specific date
 * @param {string} season - Season year (e.g., '2025')
 * @param {number} week - Week number
 * @returns {Promise<Array>} Games for that week
 */
export async function getWeekGames(season, week) {
  try {
    const url = `${ESPN_BASE_URL}/scoreboard?dates=${season}&seasontype=2&week=${week}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`)
    }

    const scoreboard = await response.json()
    return parseGames(scoreboard)
  } catch (error) {
    console.error('Error fetching week games:', error)
    throw error
  }
}
