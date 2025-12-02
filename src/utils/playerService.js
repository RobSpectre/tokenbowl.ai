/**
 * Centralized player data service with dynamic fetching
 * Handles missing players by fetching them on-demand from Sleeper API
 */

import { fetchWithRetry } from '../sleeperApi.js'

// Cache for all fetched players
let playerCache = {}

// Cache for the full Sleeper API response (to avoid repeated full fetches)
let allPlayersCache = null
let allPlayersCacheTime = 0
const FULL_CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Get a single player by ID, fetching from API if not cached
 * @param {string} playerId - The Sleeper player ID
 * @param {Object} existingPlayers - Existing players from store (optional)
 * @returns {Object|null} Player data or null if not found
 */
export async function getPlayer(playerId, existingPlayers = {}) {
  // Check if it's an empty roster spot (player ID "0")
  if (playerId === '0' || playerId === 0) {
    return {
      player_id: '0',
      full_name: 'Empty',
      first_name: 'Empty',
      last_name: '',
      position: '?',
      team: 'FA',
      fantasy_positions: []
    }
  }

  // Check if it's a defense team (2-3 uppercase letters)
  if (isDefenseTeam(playerId)) {
    return {
      player_id: playerId,
      full_name: getTeamNameFromAbbr(playerId),
      first_name: getTeamNameFromAbbr(playerId),
      last_name: '',
      position: 'DEF',
      team: playerId,
      fantasy_positions: ['DEF']
    }
  }

  // Check existing players first
  if (existingPlayers[playerId]) {
    return existingPlayers[playerId]
  }

  // Check our local cache
  if (playerCache[playerId]) {
    return playerCache[playerId]
  }

  // Try to fetch from Sleeper API
  try {
    const player = await fetchPlayerFromAPI(playerId)
    if (player) {
      playerCache[playerId] = player
      return player
    }
  } catch (error) {
    console.error(`Error fetching player ${playerId}:`, error)
  }

  return null
}

/**
 * Get multiple players by IDs, fetching missing ones from API
 * @param {Array<string>} playerIds - Array of player IDs
 * @param {Object} existingPlayers - Existing players from store (optional)
 * @returns {Object} Map of playerId to player data
 */
export async function getPlayers(playerIds, existingPlayers = {}) {
  const result = {}
  const missingIds = []

  // First pass: collect what we have and what's missing
  for (const playerId of playerIds) {
    if (playerId === '0' || playerId === 0) {
      result[playerId] = {
        player_id: '0',
        full_name: 'Empty',
        first_name: 'Empty',
        last_name: '',
        position: '?',
        team: 'FA',
        fantasy_positions: []
      }
    } else if (isDefenseTeam(playerId)) {
      result[playerId] = {
        player_id: playerId,
        full_name: getTeamNameFromAbbr(playerId),
        first_name: getTeamNameFromAbbr(playerId),
        last_name: '',
        position: 'DEF',
        team: playerId,
        fantasy_positions: ['DEF']
      }
    } else if (existingPlayers[playerId]) {
      result[playerId] = existingPlayers[playerId]
    } else if (playerCache[playerId]) {
      result[playerId] = playerCache[playerId]
    } else {
      missingIds.push(playerId)
    }
  }

  // Fetch missing players
  if (missingIds.length > 0) {
    console.log(`Fetching ${missingIds.length} missing players:`, missingIds)
    const fetchedPlayers = await fetchPlayersFromAPI(missingIds)

    for (const playerId of missingIds) {
      if (fetchedPlayers[playerId]) {
        result[playerId] = fetchedPlayers[playerId]
        playerCache[playerId] = fetchedPlayers[playerId]
      }
    }
  }

  return result
}

/**
 * Fetch a single player from Sleeper API
 * @private
 */
async function fetchPlayerFromAPI(playerId) {
  try {
    // First try to get from our cached all players response
    const allPlayers = await getAllPlayersFromAPI()
    return allPlayers[playerId] || null
  } catch (error) {
    console.error(`Error fetching player ${playerId}:`, error)
    return null
  }
}

/**
 * Fetch multiple players from Sleeper API
 * @private
 */
async function fetchPlayersFromAPI(playerIds) {
  try {
    const allPlayers = await getAllPlayersFromAPI()
    const result = {}

    for (const playerId of playerIds) {
      if (allPlayers[playerId]) {
        result[playerId] = allPlayers[playerId]
      }
    }

    return result
  } catch (error) {
    console.error('Error fetching players:', error)
    return {}
  }
}

/**
 * Get all players from Sleeper API (cached)
 * @private
 */
async function getAllPlayersFromAPI() {
  // Check if we have a recent cache
  if (allPlayersCache && (Date.now() - allPlayersCacheTime < FULL_CACHE_DURATION)) {
    return allPlayersCache
  }

  try {
    console.log('Fetching all players from Sleeper API...')
    const response = await fetchWithRetry('https://api.sleeper.app/v1/players/nfl')

    if (!response.ok) {
      throw new Error(`Failed to fetch players: ${response.status}`)
    }

    allPlayersCache = await response.json()
    allPlayersCacheTime = Date.now()
    console.log('Fetched all players from Sleeper API')

    return allPlayersCache
  } catch (error) {
    console.error('Error fetching all players:', error)
    // Return existing cache if available, even if stale
    return allPlayersCache || {}
  }
}

/**
 * Helper function to check if playerId is a defense team abbreviation
 */
function isDefenseTeam(playerId) {
  return typeof playerId === 'string' && /^[A-Z]{2,3}$/.test(playerId)
}

/**
 * Helper function to get team name from abbreviation
 */
function getTeamNameFromAbbr(abbr) {
  const teamNames = {
    'ARI': 'Arizona Cardinals',
    'ATL': 'Atlanta Falcons',
    'BAL': 'Baltimore Ravens',
    'BUF': 'Buffalo Bills',
    'CAR': 'Carolina Panthers',
    'CHI': 'Chicago Bears',
    'CIN': 'Cincinnati Bengals',
    'CLE': 'Cleveland Browns',
    'DAL': 'Dallas Cowboys',
    'DEN': 'Denver Broncos',
    'DET': 'Detroit Lions',
    'GB': 'Green Bay Packers',
    'HOU': 'Houston Texans',
    'IND': 'Indianapolis Colts',
    'JAC': 'Jacksonville Jaguars',
    'KC': 'Kansas City Chiefs',
    'LAC': 'Los Angeles Chargers',
    'LAR': 'Los Angeles Rams',
    'LV': 'Las Vegas Raiders',
    'MIA': 'Miami Dolphins',
    'MIN': 'Minnesota Vikings',
    'NE': 'New England Patriots',
    'NO': 'New Orleans Saints',
    'NYG': 'New York Giants',
    'NYJ': 'New York Jets',
    'PHI': 'Philadelphia Eagles',
    'PIT': 'Pittsburgh Steelers',
    'SEA': 'Seattle Seahawks',
    'SF': 'San Francisco 49ers',
    'TB': 'Tampa Bay Buccaneers',
    'TEN': 'Tennessee Titans',
    'WAS': 'Washington Commanders'
  }
  return teamNames[abbr] || `${abbr} Defense`
}

/**
 * Clear the player cache (useful for testing or forced refresh)
 */
export function clearPlayerCache() {
  playerCache = {}
  allPlayersCache = null
  allPlayersCacheTime = 0
}

/**
 * Enrich player IDs with full player data
 * Useful for matchup data that only has player IDs and points
 * @param {Object} playerPoints - Map of playerId to points
 * @param {Object} existingPlayers - Existing players from store
 * @returns {Object} Map of playerId to enriched player data with points
 */
export async function enrichPlayerData(playerPoints, existingPlayers = {}) {
  if (!playerPoints) return {}

  const playerIds = Object.keys(playerPoints)
  const players = await getPlayers(playerIds, existingPlayers)

  const enriched = {}
  for (const playerId of playerIds) {
    enriched[playerId] = {
      ...(players[playerId] || { player_id: playerId }),
      points: playerPoints[playerId]
    }
  }

  return enriched
}