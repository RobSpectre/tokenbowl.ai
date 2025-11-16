/**
 * Example usage of the win probability calculator with Sleeper API data
 *
 * This file demonstrates how to use the win probability utilities
 * with real matchup data from the Sleeper API.
 */

import { calculateWinProbability, getPlayerProjectionAndVariance, estimateGameProgress } from './winProbability.js'

/**
 * Calculate win probability for a Sleeper matchup
 * @param {Object} matchup - Matchup data from Sleeper API (array with 2 teams)
 * @param {Object} playersData - Player data from Sleeper API
 * @param {Object} nflSchedule - NFL schedule data (optional, for game status)
 * @returns {Object} Win probability results
 */
export function calculateMatchupWinProbability(matchup, playersData, nflSchedule = null) {
  if (!matchup || matchup.length !== 2) {
    throw new Error('Matchup must contain exactly 2 teams')
  }

  const [team1Data, team2Data] = matchup

  // Convert team data to player arrays for simulation
  const team1Players = convertTeamToPlayerData(team1Data, playersData, nflSchedule)
  const team2Players = convertTeamToPlayerData(team2Data, playersData, nflSchedule)

  // Run Monte Carlo simulation
  const result = calculateWinProbability(team1Players, team2Players, 5000)

  return {
    ...result,
    team1: {
      rosterId: team1Data.roster_id,
      currentPoints: team1Data.points || 0,
      playerCount: team1Players.length
    },
    team2: {
      rosterId: team2Data.roster_id,
      currentPoints: team2Data.points || 0,
      playerCount: team2Players.length
    }
  }
}

/**
 * Convert Sleeper team data to player data array for simulation
 * @param {Object} teamData - Single team from matchup
 * @param {Object} playersData - All players data
 * @param {Object} nflSchedule - NFL schedule (optional)
 * @returns {Array} Array of player data for simulation
 */
function convertTeamToPlayerData(teamData, playersData, nflSchedule) {
  const starters = teamData.starters || []
  const playerPoints = teamData.players_points || {}

  return starters.map(playerId => {
    const player = playersData[playerId]
    const currentPoints = playerPoints[playerId] || 0

    // Get projection and variance from historical data or position defaults
    const { projection, variance } = getPlayerProjectionAndVariance(
      playerId,
      player?.seasonStats,
      player?.position || 'FLEX'
    )

    // Determine game status
    const gameInfo = getPlayerGameStatus(player, nflSchedule)

    return {
      playerId,
      currentPoints,
      projection,
      variance,
      gameStatus: gameInfo.status,
      percentComplete: gameInfo.percentComplete
    }
  })
}

/**
 * Get game status for a player
 * @param {Object} player - Player object
 * @param {Object} nflSchedule - NFL schedule
 * @returns {Object} Game status info
 */
function getPlayerGameStatus(player, nflSchedule) {
  if (!player || !nflSchedule) {
    // Default: assume game is scheduled (conservative estimate)
    return {
      status: 'scheduled',
      percentComplete: 0
    }
  }

  const team = player.team
  const gameData = nflSchedule.find(game =>
    game.home === team || game.away === team
  )

  if (!gameData) {
    return {
      status: 'scheduled',
      percentComplete: 0
    }
  }

  // Check if game is final
  if (gameData.status === 'final' || gameData.status === 'Final') {
    return {
      status: 'final',
      percentComplete: 1.0
    }
  }

  // Check if game is in progress
  if (gameData.status === 'in_progress' || gameData.status === 'InProgress') {
    const percentComplete = gameData.percentComplete || estimateGameProgress(
      new Date(gameData.startTime),
      new Date()
    )

    return {
      status: 'in_progress',
      percentComplete
    }
  }

  // Game hasn't started
  return {
    status: 'scheduled',
    percentComplete: 0
  }
}

/**
 * Example usage with mock data
 */
export function exampleUsage() {
  // Mock matchup data from Sleeper API
  const matchup = [
    {
      roster_id: 1,
      matchup_id: 1,
      points: 65.8,
      starters: ['4881', '2133', '4866'],
      players_points: {
        '4881': 22.4,  // Patrick Mahomes - playing
        '2133': 18.6,  // Christian McCaffrey - finished
        '4866': 24.8   // Tyreek Hill - finished
      }
    },
    {
      roster_id: 2,
      matchup_id: 1,
      points: 58.2,
      starters: ['7564', '4017', '5870'],
      players_points: {
        '7564': 15.8,  // Josh Allen - playing
        '4017': 21.2,  // Justin Jefferson - finished
        '5870': 21.2   // Travis Kelce - finished
      }
    }
  ]

  const playersData = {
    '4881': { position: 'QB', team: 'KC', seasonStats: { weeks: [{ points: 24 }, { points: 22 }, { points: 26 }, { points: 20 }] } },
    '2133': { position: 'RB', team: 'SF', seasonStats: { weeks: [{ points: 18 }, { points: 20 }, { points: 22 }, { points: 16 }] } },
    '4866': { position: 'WR', team: 'MIA', seasonStats: { weeks: [{ points: 25 }, { points: 22 }, { points: 28 }, { points: 24 }] } },
    '7564': { position: 'QB', team: 'BUF', seasonStats: { weeks: [{ points: 26 }, { points: 24 }, { points: 22 }, { points: 28 }] } },
    '4017': { position: 'WR', team: 'MIN', seasonStats: { weeks: [{ points: 20 }, { points: 18 }, { points: 24 }, { points: 22 }] } },
    '5870': { position: 'TE', team: 'KC', seasonStats: { weeks: [{ points: 12 }, { points: 14 }, { points: 10 }, { points: 16 }] } }
  }

  const nflSchedule = [
    { home: 'KC', away: 'DEN', status: 'in_progress', startTime: '2024-11-17T13:00:00', percentComplete: 0.75 },
    { home: 'SF', away: 'SEA', status: 'final', startTime: '2024-11-17T13:00:00', percentComplete: 1.0 },
    { home: 'MIA', away: 'NE', status: 'final', startTime: '2024-11-17T13:00:00', percentComplete: 1.0 },
    { home: 'BUF', away: 'NYJ', status: 'in_progress', startTime: '2024-11-17T13:00:00', percentComplete: 0.75 }
  ]

  const result = calculateMatchupWinProbability(matchup, playersData, nflSchedule)

  console.log('Win Probability Results:')
  console.log('========================')
  console.log(`Team 1 (${result.team1.currentPoints} pts): ${(result.team1WinProbability * 100).toFixed(1)}%`)
  console.log(`Team 2 (${result.team2.currentPoints} pts): ${(result.team2WinProbability * 100).toFixed(1)}%`)
  console.log(`\nConfidence Interval (95%): ${(result.confidenceInterval.lower * 100).toFixed(1)}% - ${(result.confidenceInterval.upper * 100).toFixed(1)}%`)
  console.log(`Simulations: ${result.simulations.toLocaleString()}`)

  return result
}

// Uncomment to run example
// exampleUsage()
