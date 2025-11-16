/**
 * Composable for calculating and displaying win probability in matchups
 */

import { computed, ref } from 'vue'
import { calculateWinProbability, getPlayerProjectionAndVariance, getActualGameStatus } from '../utils/winProbability.js'

export function useWinProbability(matchup, players, enrichedPlayers, weeklyProjections = null, nflSchedule = null, currentWeek = null) {
  const winProbability = ref(null)
  const isCalculating = ref(false)

  /**
   * Calculate win probability for a matchup
   */
  const calculateMatchupWinProbability = () => {
    if (!matchup.value || matchup.value.length !== 2) {
      return null
    }

    isCalculating.value = true

    try {
      const [team1Data, team2Data] = matchup.value

      // Convert team data to player arrays
      const team1Players = convertTeamToPlayerData(
        team1Data,
        players.value,
        enrichedPlayers.value,
        weeklyProjections,
        nflSchedule,
        currentWeek
      )
      const team2Players = convertTeamToPlayerData(
        team2Data,
        players.value,
        enrichedPlayers.value,
        weeklyProjections,
        nflSchedule,
        currentWeek
      )

      // Run Monte Carlo simulation (3000 for performance)
      const result = calculateWinProbability(team1Players, team2Players, 3000)

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
    } finally {
      isCalculating.value = false
    }
  }

  /**
   * Convert team data from Sleeper to player data for simulation
   */
  function convertTeamToPlayerData(teamData, playersData, enrichedPlayersData, weeklyProjections = null, nflSchedule = null, currentWeek = null) {
    const starters = teamData.starters || []
    const playerPoints = teamData.players_points || {}

    return starters
      .filter(playerId => playerId) // Filter out null/undefined
      .map(playerId => {
        const player = playersData?.[playerId] || enrichedPlayersData?.[playerId]
        const currentPoints = playerPoints[playerId] || 0

        // Get player name for projection lookup
        const playerName = player ? `${player.first_name || ''} ${player.last_name || ''}`.trim() : null

        // Get projection and variance using weekly projections if available
        const { projection, variance } = getPlayerProjectionAndVariance(
          playerId,
          player?.seasonStats,
          player?.position || 'FLEX',
          weeklyProjections,
          playerName
        )

        // Determine game status using NFL schedule data
        const gameStatus = getActualGameStatus(player, currentPoints, nflSchedule, currentWeek)

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

  return {
    winProbability,
    isCalculating,
    calculateMatchupWinProbability
  }
}
