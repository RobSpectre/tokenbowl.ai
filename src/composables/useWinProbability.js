/**
 * Composable for calculating and displaying win probability in matchups
 */

import { computed, ref } from 'vue'
import { calculateWinProbability, getPlayerProjectionAndVariance, estimateGameProgress } from '../utils/winProbability.js'

export function useWinProbability(matchup, players, enrichedPlayers) {
  const winProbability = ref(null)
  const isCalculating = ref(false)

  /**
   * Calculate win probability for a matchup
   */
  const calculateMatchupWinProbability = () => {
    if (!matchup.value || matchup.value.length !== 2) {
      return null
    }

    // No loading state needed for analytical method (it's instant)
    isCalculating.value = false

    try {
      const [team1Data, team2Data] = matchup.value

      // Convert team data to player arrays
      const team1Players = convertTeamToPlayerData(team1Data, players.value, enrichedPlayers.value)
      const team2Players = convertTeamToPlayerData(team2Data, players.value, enrichedPlayers.value)

      // Run Analytical Gaussian Approximation (instant)
      const result = calculateWinProbability(team1Players, team2Players)

      winProbability.value = {
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

      return winProbability.value
    } catch (error) {
      console.error('Error calculating win probability:', error)
      return null
    }
  }

  /**
   * Convert team data from Sleeper to player data for simulation
   */
  function convertTeamToPlayerData(teamData, playersData, enrichedPlayersData) {
    const starters = teamData.starters || []
    const playerPoints = teamData.players_points || {}

    return starters
      .filter(playerId => playerId) // Filter out null/undefined
      .map(playerId => {
        const player = playersData?.[playerId] || enrichedPlayersData?.[playerId]
        const currentPoints = playerPoints[playerId] || 0

        // Get projection and variance
        const { projection, variance } = getPlayerProjectionAndVariance(
          playerId,
          player?.seasonStats,
          player?.position || 'FLEX'
        )

        // Determine game status (simplified - assume in progress if has points, scheduled if not)
        const gameStatus = getSimplifiedGameStatus(currentPoints, projection)

        return {
          playerId,
          currentPoints,
          projection,
          variance,
          gameStatus: gameStatus.status,
          percentComplete: gameStatus.percentComplete
        }
      })
  }

  /**
   * Get simplified game status based on current points
   * This is a simplified version - can be enhanced with real NFL schedule data
   */
  function getSimplifiedGameStatus(currentPoints, projection) {
    // If player has scored significant points, assume game is in progress or finished
    if (currentPoints === 0) {
      return { status: 'scheduled', percentComplete: 0 }
    }

    // Estimate if game is finished based on projection
    // If current points >= 90% of projection, likely finished
    if (projection > 0 && currentPoints >= projection * 0.9) {
      return { status: 'final', percentComplete: 1.0 }
    }

    // Otherwise, estimate progress based on current points vs projection
    if (projection > 0) {
      const percentComplete = Math.min(0.9, currentPoints / projection)
      return { status: 'in_progress', percentComplete }
    }

    // Default to in progress at 50%
    return { status: 'in_progress', percentComplete: 0.5 }
  }

  return {
    winProbability,
    isCalculating,
    calculateMatchupWinProbability
  }
}
