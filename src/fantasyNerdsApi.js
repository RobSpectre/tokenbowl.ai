// Use proxy in development, direct API in production
const BASE_URL = import.meta.env.DEV
  ? '/api/fantasynerds/v1/nfl'
  : 'https://api.fantasynerds.com/v1/nfl'

/**
 * Fetch NFL injury data for a specific week from Fantasy Nerds API
 * @param {number} week - NFL week number (1-18)
 * @returns {Promise<Object>} Injury data keyed by player name
 */
export async function getInjuries(week) {
  const apiKey = import.meta.env.VITE_FANTASY_FOOTBALL_NERD_API_KEY

  if (!apiKey) {
    console.error('Fantasy Nerds API key not found in environment variables')
    return {}
  }

  try {
    // Add cache-busting timestamp to ensure fresh data
    const response = await fetch(
      `${BASE_URL}/injuries?apikey=${apiKey}&week=${week}&_t=${Date.now()}`
    )

    if (!response.ok) {
      throw new Error(`Fantasy Nerds API error: ${response.status}`)
    }

    const data = await response.json()

    // Transform array into a map keyed by player name for easy lookup
    // Fantasy Nerds returns array of injury objects
    const injuryMap = {}

    if (Array.isArray(data)) {
      data.forEach(injury => {
        // Key by player name (lowercase for case-insensitive matching)
        const playerKey = `${injury.player}`.toLowerCase()
        injuryMap[playerKey] = {
          player: injury.player,
          team: injury.team,
          position: injury.position,
          injury: injury.injury,
          practice_status: injury.practice_status,
          game_status: injury.game_status,
          last_update: injury.last_update,
          notes: injury.notes
        }
      })
    }

    return injuryMap
  } catch (error) {
    console.error(`Error fetching injuries for week ${week}:`, error)
    return {}
  }
}

/**
 * Get injury status for a specific player
 * @param {Object} injuryMap - Injury data map from getInjuries()
 * @param {string} playerName - Full player name (e.g., "Patrick Mahomes")
 * @returns {Object|null} Injury data or null if player is not injured
 */
export function getPlayerInjuryStatus(injuryMap, playerName) {
  if (!injuryMap || !playerName) return null

  const playerKey = playerName.toLowerCase()
  return injuryMap[playerKey] || null
}

/**
 * Get a short injury indicator (e.g., "Q", "D", "O", "IR")
 * @param {Object} injury - Injury object from getPlayerInjuryStatus()
 * @returns {string|null} Short status indicator or null
 */
export function getInjuryIndicator(injury) {
  if (!injury) return null

  // Map game_status to standard NFL injury indicators
  const status = injury.game_status?.toUpperCase()

  if (status === 'QUESTIONABLE' || status === 'Q') return 'Q'
  if (status === 'DOUBTFUL' || status === 'D') return 'D'
  if (status === 'OUT' || status === 'O') return 'O'
  if (status === 'IR' || status === 'INJURED RESERVE') return 'IR'
  if (status === 'PUP' || status === 'PHYSICALLY UNABLE TO PERFORM') return 'PUP'

  // If there's an injury but no clear status, return 'Q' by default
  if (injury.injury) return 'Q'

  return null
}
