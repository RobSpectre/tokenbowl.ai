/**
 * Win Probability Calculator for Fantasy Football
 *
 * Calculates the probability of winning a fantasy matchup using Monte Carlo simulation
 * with proper handling of players in different game states (not started, in progress, finished)
 */

/**
 * Box-Muller transform to generate normally distributed random numbers
 * @param {number} mean - Mean of the distribution
 * @param {number} stdDev - Standard deviation of the distribution
 * @returns {number} Random value from normal distribution
 */
export function randomNormal(mean, stdDev) {
  const u1 = Math.random()
  const u2 = Math.random()
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
  return mean + z0 * stdDev
}

/**
 * Player game status
 * @typedef {'scheduled' | 'in_progress' | 'final'} GameStatus
 */

/**
 * Player data for simulation
 * @typedef {Object} PlayerData
 * @property {string} playerId - Sleeper player ID
 * @property {number} currentPoints - Points scored so far
 * @property {number} projection - Full game projection
 * @property {number} variance - Variance (stdDev^2) for full game
 * @property {GameStatus} gameStatus - Current game status
 * @property {number} percentComplete - Percentage of game completed (0-1)
 */

/**
 * Prepare a player for Monte Carlo simulation based on game progress
 * @param {PlayerData} player - Player data
 * @returns {Object} Prepared player with remaining projection and variance
 */
export function preparePlayerForSimulation(player) {
  const {
    currentPoints = 0,
    projection = 0,
    variance = 0,
    gameStatus = 'scheduled',
    percentComplete = 0,
    injuryStatus = null
  } = player

  // Game is finished - no more points possible
  if (gameStatus === 'final' || percentComplete >= 1.0) {
    return {
      currentPoints,
      remainingProjection: 0,
      remainingStdDev: 0
    }
  }

  // Handle injuries for players who haven't played yet or are in progress
  // If a player is OUT or IR, they won't score any more points
  if (['OUT', 'O', 'IR', 'INJURED RESERVE', 'DOUBTFUL', 'D', 'SUS', 'SUSPENDED', 'PUP'].includes((injuryStatus || '').toUpperCase())) {
    console.log(`Zeroing out player due to injury: ${injuryStatus}`)
    return {
      currentPoints,
      remainingProjection: 0,
      remainingStdDev: 0
    }
  }

  let adjustedVariance = variance

  // If a player is QUESTIONABLE, increase variance to account for uncertainty
  // They might play a little, a lot, or not at all
  if (['QUESTIONABLE', 'Q'].includes((injuryStatus || '').toUpperCase())) {
    adjustedVariance = variance * 1.5
  }

  // Game hasn't started - use full projection
  if (gameStatus === 'scheduled' || percentComplete <= 0) {
    return {
      currentPoints,
      remainingProjection: projection,
      remainingStdDev: Math.sqrt(adjustedVariance)
    }
  }

  // Game is in progress - scale by time remaining
  const percentRemaining = 1 - percentComplete

  return {
    currentPoints,
    remainingProjection: projection * percentRemaining,
    remainingStdDev: Math.sqrt(adjustedVariance * percentRemaining)
  }
}

/**
 * Calculate estimated game progress based on time
 * Uses a continuous scale for smoother probability updates
 * @param {Date} gameStartTime - When the game started
 * @param {Date} currentTime - Current time
 * @returns {number} Estimated percentage complete (0-1)
 */
export function estimateGameProgress(gameStartTime, currentTime = new Date()) {
  const minutesSinceStart = (currentTime - gameStartTime) / 1000 / 60

  // NFL games typically last ~3 hours (180 mins)
  // We map this to 0-100% progress

  if (minutesSinceStart <= 0) return 0

  // Game over after 3.5 hours (210 mins) to be safe
  if (minutesSinceStart >= 210) return 1.0

  // Linear interpolation for the duration of the game
  // This avoids the "steps" of the previous implementation
  return minutesSinceStart / 210
}

/**
 * Calculate win probability using Analytical Gaussian Approximation
 * 
 * This method assumes that the difference between two independent normal variables
 * (Team A Score - Team B Score) is also normally distributed.
 * 
 * Mean(Diff) = Mean(A) - Mean(B)
 * Variance(Diff) = Variance(A) + Variance(B)
 * 
 * We then calculate the Z-score for Diff > 0 and use the CDF.
 * 
 * @param {Array<PlayerData>} team1Players - Team 1 players
 * @param {Array<PlayerData>} team2Players - Team 2 players
 * @returns {Object} Win probability and confidence interval
 */
export function calculateWinProbability(team1Players, team2Players) {
  const team1Prepared = team1Players.map(preparePlayerForSimulation)
  const team2Prepared = team2Players.map(preparePlayerForSimulation)

  // Sum up current points and remaining projections
  const team1Current = team1Prepared.reduce((sum, p) => sum + p.currentPoints, 0)
  const team1Remaining = team1Prepared.reduce((sum, p) => sum + p.remainingProjection, 0)
  const team1Variance = team1Prepared.reduce((sum, p) => sum + Math.pow(p.remainingStdDev, 2), 0)

  const team2Current = team2Prepared.reduce((sum, p) => sum + p.currentPoints, 0)
  const team2Remaining = team2Prepared.reduce((sum, p) => sum + p.remainingProjection, 0)
  const team2Variance = team2Prepared.reduce((sum, p) => sum + Math.pow(p.remainingStdDev, 2), 0)

  // Calculate expected differential and combined standard deviation
  const expectedDifferential = (team1Current + team1Remaining) - (team2Current + team2Remaining)
  const combinedStdDev = Math.sqrt(team1Variance + team2Variance)

  let winProbability;

  // Handle edge cases
  if (combinedStdDev === 0) {
    winProbability = expectedDifferential > 0 ? 1 : (expectedDifferential < 0 ? 0 : 0.5)
  } else {
    // Calculate Z-score and probability using CDF
    const z = expectedDifferential / combinedStdDev
    winProbability = normalCDF(z)
  }

  return {
    team1WinProbability: winProbability,
    team2WinProbability: 1 - winProbability,
    // Confidence interval is not really applicable to the probability itself in the same way 
    // as Monte Carlo sampling error, but we can return the projected score range
    projectedScore: {
      team1: team1Current + team1Remaining,
      team2: team2Current + team2Remaining
    },
    method: 'analytical_gaussian'
  }
}

/**
 * Cumulative distribution function for standard normal distribution
 * @param {number} z - Z-score
 * @returns {number} Probability (0-1)
 */
function normalCDF(z) {
  // Approximation using error function
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989423 * Math.exp(-z * z / 2)
  const probability = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))

  return z > 0 ? 1 - probability : probability
}

/**
 * Get player projection and variance from historical data
 * @param {string} playerId - Sleeper player ID
 * @param {Object} playerStats - Historical stats for the player
 * @param {string} position - Player position
 * @returns {Object} Projection and variance
 */
export function getPlayerProjectionAndVariance(playerId, playerStats, position = 'FLEX') {
  if (!playerStats || !playerStats.weeks || playerStats.weeks.length === 0) {
    // Use position-based defaults if no historical data
    return getDefaultProjectionByPosition(position)
  }

  // Calculate mean and variance from recent weeks (last 4 weeks)
  const recentWeeks = playerStats.weeks.slice(-4)
  const points = recentWeeks.map(w => w.points || 0)

  const mean = points.reduce((sum, p) => sum + p, 0) / points.length

  // Calculate variance
  const squaredDiffs = points.map(p => Math.pow(p - mean, 2))
  const variance = squaredDiffs.reduce((sum, sq) => sum + sq, 0) / points.length

  return {
    projection: mean,
    variance: Math.max(variance, 1) // Minimum variance of 1
  }
}

/**
 * Get default projection by position when no historical data is available
 * @param {string} position - Player position
 * @returns {Object} Default projection and variance
 */
function getDefaultProjectionByPosition(position) {
  const defaults = {
    'QB': { projection: 18, variance: 36 },   // stdDev = 6
    'RB': { projection: 12, variance: 25 },   // stdDev = 5
    'WR': { projection: 11, variance: 25 },   // stdDev = 5
    'TE': { projection: 8, variance: 16 },    // stdDev = 4
    'K': { projection: 8, variance: 9 },      // stdDev = 3
    'DEF': { projection: 7, variance: 16 },   // stdDev = 4
    'FLEX': { projection: 10, variance: 25 }  // stdDev = 5
  }

  return defaults[position] || defaults['FLEX']
}
