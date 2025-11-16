/**
 * Test win probability algorithm against historical data
 *
 * This script fetches actual matchup results from previous weeks
 * and compares them to what the win probability would have predicted
 * at various points during the games.
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const LEAGUE_ID = '1266471057523490816'
const BASE_URL = 'https://api.sleeper.app/v1'

async function getMatchups(week) {
  const response = await fetch(`${BASE_URL}/league/${LEAGUE_ID}/matchups/${week}`)
  return response.json()
}

async function getNFLState(season = '2024') {
  const response = await fetch(`${BASE_URL}/state/nfl`)
  return response.json()
}

async function getRosters() {
  const response = await fetch(`${BASE_URL}/league/${LEAGUE_ID}/rosters`)
  return response.json()
}

async function getLeagueUsers() {
  const response = await fetch(`${BASE_URL}/league/${LEAGUE_ID}/users`)
  return response.json()
}

async function getPlayers() {
  const filePath = path.join(__dirname, 'public', 'data', 'players.json')
  const data = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(data)
}

/**
 * Calculate historical average for a player based on weeks before the current week
 */
function calculatePlayerHistoricalAverage(playerStats, upToWeek) {
  const weeks = playerStats.weeks || []
  const relevantWeeks = weeks.filter((_, idx) => idx < upToWeek - 1).slice(-4)

  if (relevantWeeks.length === 0) return { projection: 0, variance: 1 }

  const points = relevantWeeks.map(w => w.points || 0)
  const mean = points.reduce((sum, p) => sum + p, 0) / points.length
  const squaredDiffs = points.map(p => Math.pow(p - mean, 2))
  const variance = squaredDiffs.reduce((sum, sq) => sum + sq, 0) / points.length

  return {
    projection: mean,
    variance: Math.max(variance, 1)
  }
}

/**
 * Simulate the current flawed algorithm's game status detection
 */
function getSimplifiedGameStatus(currentPoints, projection) {
  if (currentPoints === 0) {
    return { status: 'scheduled', percentComplete: 0 }
  }

  // If current points >= 90% of projection, likely finished
  if (projection > 0 && currentPoints >= projection * 0.9) {
    return { status: 'final', percentComplete: 1.0 }
  }

  // Estimate progress based on current points vs projection
  if (projection > 0) {
    const percentComplete = Math.min(0.9, currentPoints / projection)
    return { status: 'in_progress', percentComplete }
  }

  // Default to in progress at 50%
  return { status: 'in_progress', percentComplete: 0.5 }
}

/**
 * Analyze a single week
 */
async function analyzeWeek(week, players, rosters, users) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`ANALYZING WEEK ${week}`)
  console.log('='.repeat(60))

  const matchups = await getMatchups(week)

  // Group by matchup_id
  const matchupGroups = {}
  matchups.forEach(m => {
    if (!matchupGroups[m.matchup_id]) {
      matchupGroups[m.matchup_id] = []
    }
    matchupGroups[m.matchup_id].push(m)
  })

  const rosterMap = {}
  rosters.forEach(r => {
    rosterMap[r.roster_id] = r
  })

  const userMap = {}
  users.forEach(u => {
    userMap[u.user_id] = u
  })

  let totalErrors = 0
  let totalMatchups = 0

  Object.entries(matchupGroups).forEach(([matchupId, teams]) => {
    if (teams.length !== 2) return

    const [team1, team2] = teams
    const team1Name = userMap[rosterMap[team1.roster_id]?.owner_id]?.display_name || `Roster ${team1.roster_id}`
    const team2Name = userMap[rosterMap[team2.roster_id]?.owner_id]?.display_name || `Roster ${team2.roster_id}`

    const team1Score = team1.points || 0
    const team2Score = team2.points || 0
    const actualWinner = team1Score > team2Score ? 1 : 2

    console.log(`\nMatchup ${matchupId}: ${team1Name} vs ${team2Name}`)
    console.log(`Final Score: ${team1Score.toFixed(2)} - ${team2Score.toFixed(2)}`)
    console.log(`Actual Winner: ${actualWinner === 1 ? team1Name : team2Name}`)

    // Analyze each team's starters
    const team1Starters = team1.starters || []
    const team2Starters = team2.starters || []
    const team1PlayerPoints = team1.players_points || {}
    const team2PlayerPoints = team2.players_points || {}

    console.log(`\nTeam 1 (${team1Name}) Player Analysis:`)
    team1Starters.forEach(playerId => {
      if (!playerId) return
      const player = players[playerId]
      if (!player) return

      const currentPoints = team1PlayerPoints[playerId] || 0
      const playerName = `${player.first_name || ''} ${player.last_name || ''}`.trim() || 'Unknown'

      // Get historical average (this is what the current algorithm uses)
      const { projection, variance } = calculatePlayerHistoricalAverage(
        player.seasonStats || {},
        week
      )

      const gameStatus = getSimplifiedGameStatus(currentPoints, projection)

      console.log(`  ${playerName} (${player.position}): ${currentPoints.toFixed(1)} pts | Avg: ${projection.toFixed(1)} | Status: ${gameStatus.status} (${(gameStatus.percentComplete * 100).toFixed(0)}%)`)

      // Flag obvious issues
      if (currentPoints > 0 && gameStatus.status === 'final' && projection > 0) {
        if (currentPoints < projection * 0.5) {
          console.log(`    ⚠️  WARNING: Marked as FINAL but only scored ${((currentPoints/projection)*100).toFixed(0)}% of average!`)
        }
      }
    })

    console.log(`\nTeam 2 (${team2Name}) Player Analysis:`)
    team2Starters.forEach(playerId => {
      if (!playerId) return
      const player = players[playerId]
      if (!player) return

      const currentPoints = team2PlayerPoints[playerId] || 0
      const playerName = `${player.first_name || ''} ${player.last_name || ''}`.trim() || 'Unknown'

      const { projection, variance } = calculatePlayerHistoricalAverage(
        player.seasonStats || {},
        week
      )

      const gameStatus = getSimplifiedGameStatus(currentPoints, projection)

      console.log(`  ${playerName} (${player.position}): ${currentPoints.toFixed(1)} pts | Avg: ${projection.toFixed(1)} | Status: ${gameStatus.status} (${(gameStatus.percentComplete * 100).toFixed(0)}%)`)

      if (currentPoints > 0 && gameStatus.status === 'final' && projection > 0) {
        if (currentPoints < projection * 0.5) {
          console.log(`    ⚠️  WARNING: Marked as FINAL but only scored ${((currentPoints/projection)*100).toFixed(0)}% of average!`)
        }
      }
    })

    totalMatchups++
  })

  console.log(`\nWeek ${week} Summary: Analyzed ${totalMatchups} matchups`)
}

/**
 * Main function
 */
async function main() {
  console.log('Testing Win Probability Algorithm Against Historical Data')
  console.log('='.repeat(60))

  // Fetch base data
  console.log('Fetching base data...')
  const [players, rosters, users, nflState] = await Promise.all([
    getPlayers(),
    getRosters(),
    getLeagueUsers(),
    getNFLState()
  ])

  console.log(`Loaded ${Object.keys(players).length} players`)
  console.log(`NFL State: Season ${nflState.season}, Week ${nflState.display_week}`)

  // Analyze weeks 1-10
  const weeksToAnalyze = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  for (const week of weeksToAnalyze) {
    await analyzeWeek(week, players, rosters, users)
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log('Analysis Complete')
  console.log('='.repeat(60))
  console.log('\nKey Issues Identified:')
  console.log('1. Game status is based on currentPoints vs historical average')
  console.log('2. Players with low historical averages get marked as "final" too early')
  console.log('3. No actual game time or NFL schedule data is used')
  console.log('4. Historical average is not the same as weekly projection')
  console.log('\nRecommended Fixes:')
  console.log('1. Use Sleeper projections API instead of historical averages')
  console.log('2. Use NFL state API to get actual game start times and status')
  console.log('3. Don\'t mark games as "final" based on points alone')
  console.log('4. Consider using Sleeper\'s sport_state data for real-time game status')
}

main().catch(console.error)
