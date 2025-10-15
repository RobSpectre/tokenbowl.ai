// Use Cloudflare Worker proxy to avoid CORS issues
// Fantasy Nerds API does not support CORS, so we need a server-side proxy
const BASE_URL = import.meta.env.VITE_FANTASY_NERDS_PROXY_URL || 'https://tokenbowl-api-proxy.tokenbowl.workers.dev'

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
    // API key is added by the Cloudflare Worker proxy
    const response = await fetch(
      `${BASE_URL}/nfl/injuries?week=${week}&_t=${Date.now()}`
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
 * Fetch NFL weekly projections for a specific week from Fantasy Nerds API
 * @param {number} week - NFL week number (1-18)
 * @returns {Promise<Object>} Weekly projections data keyed by player name
 */
export async function getWeeklyProjections(week) {
  const apiKey = import.meta.env.VITE_FANTASY_FOOTBALL_NERD_API_KEY

  if (!apiKey) {
    console.warn('⚠️ Fantasy Nerds API key not configured for weekly projections')
    return getMockProjectionsData(week)
  }

  try {
    // Fetch weekly projections with cache busting
    // API key is added by the Cloudflare Worker proxy
    const response = await fetch(
      `${BASE_URL}/nfl/weekly-projections?week=${week}&_t=${Date.now()}`
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

    // Transform projections into a map keyed by player name for easy lookup
    const projectionsMap = {}

    // Handle the response format: { season, week, players: { QB: [...], RB: [...], etc } }
    if (data.players && typeof data.players === 'object') {
      Object.values(data.players).forEach(positionPlayers => {
        if (Array.isArray(positionPlayers)) {
          positionPlayers.forEach(player => {
            // Key by player name (lowercase for case-insensitive matching)
            const playerKey = player.name.toLowerCase()
            projectionsMap[playerKey] = {
              playerId: player.playerId,
              name: player.name,
              team: player.team,
              position: player.position,
              // Calculate projected fantasy points based on standard PPR scoring
              projectedPoints: calculateFantasyPoints(player),
              // Store all raw stats for detailed breakdown
              stats: player
            }
          })
        }
      })
    }

    return projectionsMap
  } catch (error) {
    console.error(`Error fetching weekly projections for week ${week}:`, error)
    return {}
  }
}

/**
 * Calculate fantasy points from stat projections (PPR scoring)
 * @param {Object} stats - Player projection stats
 * @returns {number} Projected fantasy points
 */
function calculateFantasyPoints(stats) {
  let points = 0

  // Passing stats
  if (stats.passing_yards) points += parseFloat(stats.passing_yards) * 0.04
  if (stats.passing_touchdowns) points += parseFloat(stats.passing_touchdowns) * 4
  if (stats.passing_interceptions) points -= parseFloat(stats.passing_interceptions) * 2

  // Rushing stats
  if (stats.rushing_yards) points += parseFloat(stats.rushing_yards) * 0.1
  if (stats.rushing_touchdowns) points += parseFloat(stats.rushing_touchdowns) * 6

  // Receiving stats
  if (stats.receptions) points += parseFloat(stats.receptions) * 1 // PPR
  if (stats.receiving_yards) points += parseFloat(stats.receiving_yards) * 0.1
  if (stats.receiving_touchdowns) points += parseFloat(stats.receiving_touchdowns) * 6

  // Fumbles
  if (stats.fumbles_lost) points -= parseFloat(stats.fumbles_lost) * 2

  // Kicker stats
  if (stats.field_goals_made) points += parseFloat(stats.field_goals_made) * 3
  if (stats.extra_points_made) points += parseFloat(stats.extra_points_made) * 1

  // Defense stats (simplified)
  if (stats.defensive_touchdowns) points += parseFloat(stats.defensive_touchdowns) * 6
  if (stats.sacks) points += parseFloat(stats.sacks) * 1
  if (stats.interceptions) points += parseFloat(stats.interceptions) * 2
  if (stats.fumble_recoveries) points += parseFloat(stats.fumble_recoveries) * 2

  return Math.round(points * 10) / 10 // Round to 1 decimal
}

/**
 * Fetch NFL schedule data from Fantasy Nerds API
 * @returns {Promise<Object>} Schedule data with current week and all games
 */
export async function getNFLSchedule() {
  const apiKey = import.meta.env.VITE_FANTASY_FOOTBALL_NERD_API_KEY

  if (!apiKey) {
    console.warn('⚠️ Fantasy Nerds API key not configured for NFL schedule')
    return getMockScheduleData()
  }

  try {
    // Fetch NFL schedule with cache busting
    // API key is added by the Cloudflare Worker proxy
    const response = await fetch(
      `${BASE_URL}/nfl/schedule?_t=${Date.now()}`
    )

    if (!response.ok) {
      throw new Error(`Fantasy Nerds API error: ${response.status}`)
    }

    const data = await response.json()

    // Check if the API returned an error
    if (data.error) {
      console.error(`Fantasy Nerds API error: ${data.error}`)
      return { current_week: 1, schedule: [] }
    }

    return data
  } catch (error) {
    console.error('Error fetching NFL schedule:', error)
    return { current_week: 1, schedule: [] }
  }
}

/**
 * Get mock schedule data for development when API key is not configured
 * @returns {Object} Mock schedule data
 */
function getMockScheduleData() {
  const now = new Date()
  const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, etc.
  const currentHour = now.getHours()

  return {
    current_week: 6,
    schedule: [
      {
        gameId: '1',
        season: '2025',
        week: '6',
        game_date: '2025-10-10 20:15:00',
        away_team: 'KC',
        home_team: 'BUF',
        tv_station: 'NBC',
        winner: 'KC',
        away_score: '24',
        home_score: '21'
      },
      {
        gameId: '2',
        season: '2025',
        week: '6',
        game_date: '2025-10-13 13:00:00',
        away_team: 'SF',
        home_team: 'DAL',
        tv_station: 'FOX',
        winner: null,
        away_score: null,
        home_score: null
      }
    ]
  }
}

/**
 * Get mock projection data for development when API key is not configured
 * @param {number} week - NFL week number
 * @returns {Object} Mock projection data
 */
function getMockProjectionsData(week) {
  // Generate varied projections based on week for more realistic mock data
  const weekVariation = (week % 3) * 0.1 + 0.9 // 0.9 to 1.1 multiplier

  const mockProjections = {
    'patrick mahomes': {
      playerId: '945',
      name: 'Patrick Mahomes',
      team: 'KC',
      position: 'QB',
      projectedPoints: Math.round(24.5 * weekVariation * 10) / 10,
      stats: {
        passing_yards: '310',
        passing_touchdowns: '2.5',
        passing_interceptions: '0.5',
        rushing_yards: '15'
      }
    },
    'christian mccaffrey': {
      playerId: '954',
      name: 'Christian McCaffrey',
      team: 'SF',
      position: 'RB',
      projectedPoints: Math.round(22.3 * weekVariation * 10) / 10,
      stats: {
        rushing_yards: '85',
        rushing_touchdowns: '0.8',
        receptions: '6',
        receiving_yards: '45',
        receiving_touchdowns: '0.2'
      }
    },
    'tyreek hill': {
      playerId: '4028',
      name: 'Tyreek Hill',
      team: 'MIA',
      position: 'WR',
      projectedPoints: Math.round(18.5 * weekVariation * 10) / 10,
      stats: {
        receptions: '7',
        receiving_yards: '95',
        receiving_touchdowns: '0.6'
      }
    },
    'travis kelce': {
      playerId: '4217',
      name: 'Travis Kelce',
      team: 'KC',
      position: 'TE',
      projectedPoints: Math.round(14.2 * weekVariation * 10) / 10,
      stats: {
        receptions: '6',
        receiving_yards: '70',
        receiving_touchdowns: '0.5'
      }
    },
    'justin tucker': {
      playerId: '4531',
      name: 'Justin Tucker',
      team: 'BAL',
      position: 'K',
      projectedPoints: Math.round(9.5 * weekVariation * 10) / 10,
      stats: {
        field_goals_made: '2',
        extra_points_made: '3.5'
      }
    },
    'sf': {
      playerId: 'SF',
      name: 'San Francisco 49ers',
      team: 'SF',
      position: 'DEF',
      projectedPoints: Math.round(8.5 * weekVariation * 10) / 10,
      stats: {
        sacks: '2.5',
        interceptions: '0.8',
        fumble_recoveries: '0.5',
        defensive_touchdowns: '0.1'
      }
    },
    'kc': {
      playerId: 'KC',
      name: 'Kansas City Chiefs',
      team: 'KC',
      position: 'DEF',
      projectedPoints: Math.round(8.0 * weekVariation * 10) / 10,
      stats: {
        sacks: '2.3',
        interceptions: '0.7',
        fumble_recoveries: '0.4',
        defensive_touchdowns: '0.1'
      }
    }
  }

  return mockProjections
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
