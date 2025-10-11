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
    console.warn('⚠️ Fantasy Nerds API key not configured. Please add VITE_FANTASY_FOOTBALL_NERD_API_KEY to your environment variables')
    console.warn('Get your API key from: https://www.fantasynerds.com/')

    // Return mock data for development
    return getMockInjuryData(week)
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

    // Check if the API returned an error
    if (data.error) {
      console.error(`Fantasy Nerds API error: ${data.error}`)
      return {}
    }

    // Transform into a map keyed by player name for easy lookup
    const injuryMap = {}

    // Handle new API format: { season, week, teams: { TEAM: [...injuries] } }
    if (data.teams && typeof data.teams === 'object') {
      Object.values(data.teams).forEach(teamInjuries => {
        if (Array.isArray(teamInjuries)) {
          teamInjuries.forEach(injury => {
            // Key by player name (lowercase for case-insensitive matching)
            const playerKey = `${injury.name || injury.player}`.toLowerCase()
            injuryMap[playerKey] = {
              player: injury.name || injury.player,
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
      })
    }
    // Handle old API format: array of injuries
    else if (Array.isArray(data)) {
      data.forEach(injury => {
        // Key by player name (lowercase for case-insensitive matching)
        const playerKey = `${injury.name || injury.player}`.toLowerCase()
        injuryMap[playerKey] = {
          player: injury.name || injury.player,
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

/**
 * Get mock injury data for development when API key is not configured
 * @param {number} week - NFL week number
 * @returns {Object} Mock injury data
 */
function getMockInjuryData(week) {
  // Sample injury data for development/testing
  const mockInjuries = {
    'cooper kupp': {
      player: 'Cooper Kupp',
      team: 'LAR',
      position: 'WR',
      injury: 'Ankle',
      practice_status: 'Limited',
      game_status: 'Questionable',
      last_update: new Date().toISOString(),
      notes: 'Mock data - configure API key for real data'
    },
    'justin jefferson': {
      player: 'Justin Jefferson',
      team: 'MIN',
      position: 'WR',
      injury: 'Hamstring',
      practice_status: 'DNP',
      game_status: 'Doubtful',
      last_update: new Date().toISOString(),
      notes: 'Mock data - configure API key for real data'
    },
    'christian mccaffrey': {
      player: 'Christian McCaffrey',
      team: 'SF',
      position: 'RB',
      injury: 'Achilles',
      practice_status: 'DNP',
      game_status: 'IR',
      last_update: new Date().toISOString(),
      notes: 'Mock data - configure API key for real data'
    },
    'travis kelce': {
      player: 'Travis Kelce',
      team: 'KC',
      position: 'TE',
      injury: 'Knee',
      practice_status: 'Limited',
      game_status: 'Questionable',
      last_update: new Date().toISOString(),
      notes: 'Mock data - configure API key for real data'
    },
    'tua tagovailoa': {
      player: 'Tua Tagovailoa',
      team: 'MIA',
      position: 'QB',
      injury: 'Concussion',
      practice_status: 'DNP',
      game_status: 'Out',
      last_update: new Date().toISOString(),
      notes: 'Mock data - configure API key for real data'
    },
    'nick chubb': {
      player: 'Nick Chubb',
      team: 'CLE',
      position: 'RB',
      injury: 'Knee',
      practice_status: 'Limited',
      game_status: 'Questionable',
      last_update: new Date().toISOString(),
      notes: 'Mock data - configure API key for real data'
    }
  }

  // Return varying injuries based on week for realism
  const players = Object.keys(mockInjuries)
  const selectedInjuries = {}

  // Select 3-5 injured players for this week
  const numInjuries = 3 + (week % 3)
  for (let i = 0; i < numInjuries && i < players.length; i++) {
    const playerIndex = (week + i) % players.length
    const playerKey = players[playerIndex]
    selectedInjuries[playerKey] = mockInjuries[playerKey]
  }

  return selectedInjuries
}
