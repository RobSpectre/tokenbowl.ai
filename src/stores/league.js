import { defineStore } from 'pinia'
import { getLeagueData, getRelevantPlayers, getMatchups, getTransactions } from '../sleeperApi.js'
import { getTeamInfo } from '../teamMappings.js'
import { getLatestVideoAndShorts } from '../youtubeApi.js'
import { getInjuries, getPlayerInjuryStatus, getInjuryIndicator, getWeeklyProjections, getNFLSchedule } from '../fantasyNerdsApi.js'
import { getPlayers as getPlayersFromService, enrichPlayerData } from '../utils/playerService.js'

// Cache duration: 5 minutes (normal) or 30 seconds (during NFL games)
const CACHE_DURATION = 5 * 60 * 1000
const GAME_TIME_CACHE_DURATION = 30 * 1000 // 30 seconds during game time
// YouTube cache duration: 24 hours
const YOUTUBE_CACHE_DURATION = 24 * 60 * 60 * 1000
// Cache version - increment this when making breaking changes to data structure
const CACHE_VERSION = 10 // v10: Enriched weekRosters with full user, team, and standings metadata

export const useLeagueStore = defineStore('league', {
  state: () => ({
    // Cache version for invalidation
    cacheVersion: CACHE_VERSION,

    league: null,
    rosters: [],
    users: [],
    currentMatchups: null,
    currentWeek: null,

    // Players data
    players: {},

    // Enriched player data with all sources consolidated
    enrichedPlayers: {},

    // Week-based player stats (player performance by week)
    playerStatsByWeek: {}, // { week: { playerId: { points, started, projected, rosterId } } }
    playerStatsTimestamp: null,

    // All matchups (weeks 1-18)
    allMatchups: {},

    // Week-based roster data (including bench players)
    weekRosters: {},
    weekRostersTimestamp: null,

    // Transactions by week
    transactionsByWeek: {},
    transactionsTimestampsByWeek: {},

    // Injuries by week (from Fantasy Nerds API)
    injuriesByWeek: {},
    injuriesTimestampsByWeek: {},

    // Weekly projections by week (from Fantasy Nerds API)
    weeklyProjectionsByWeek: {},
    weeklyProjectionsTimestampsByWeek: {},

    // NFL Schedule (from Fantasy Nerds API)
    nflSchedule: null,
    nflScheduleTimestamp: null,

    // Processed injury data - injuries grouped by team for all weeks (for charts)
    processedInjuriesByTeam: {},
    processedInjuriesTimestamp: null,

    // Processed transaction stats - transaction counts and team data (for charts)
    processedTransactionStats: {
      byWeek: {},           // { week: count }
      byTeam: {},           // { teamName: { total: count, byWeek: { week: count } } }
      byTeamForWeek: {}     // { week: { teamName: count } }
    },
    processedTransactionsTimestamp: null,

    // Draft data (never expires - loaded once)
    draftPicks: [],

    // YouTube data (cached for 24 hours)
    latestVideo: null,
    latestShorts: [],

    // Cache timestamps
    leagueDataTimestamp: null,
    matchupsTimestamp: null,
    playersTimestamp: null,
    enrichedPlayersTimestamp: null,
    allMatchupsTimestamp: null,
    draftTimestamp: null,
    youtubeTimestamp: null,
    processedInjuriesStatsTimestamp: null,
    processedTransactionStatsTimestamp: null,

    // Loading states
    isLoadingLeagueData: false,
    isLoadingMatchups: false,
    isLoadingPlayers: false,
    isLoadingEnrichedPlayers: false,
    isLoadingAllMatchups: false,
    isLoadingDraft: false,
    isLoadingYoutube: false,

    // Promise tracking for concurrent requests
    playersPromise: null,
    enrichedPlayersPromise: null,
    leagueDataPromise: null,
    currentMatchupsPromise: null,

    // Error states
    leagueDataError: null,
    matchupsError: null,
    playersError: null,
    enrichedPlayersError: null,
    allMatchupsError: null,
    draftError: null,
    youtubeError: null
  }),

  getters: {
    // Check if league data cache is valid (use shorter cache during game time)
    isLeagueDataFresh() {
      if (!this.leagueDataTimestamp) return false
      const duration = this.getCacheDuration()
      return Date.now() - this.leagueDataTimestamp < duration
    },

    // Check if matchups cache is valid (use shorter cache during game time)
    isMatchupsFresh() {
      if (!this.matchupsTimestamp) return false
      const duration = this.getCacheDuration()
      return Date.now() - this.matchupsTimestamp < duration
    },

    // Check if players cache is valid (use shorter cache during game time)
    isPlayersFresh() {
      if (!this.playersTimestamp) return false
      const duration = this.getCacheDuration()
      return Date.now() - this.playersTimestamp < duration
    },

    // Check if enriched players cache is valid (use shorter cache during game time)
    isEnrichedPlayersFresh() {
      if (!this.enrichedPlayersTimestamp) return false
      const duration = this.getCacheDuration()
      return Date.now() - this.enrichedPlayersTimestamp < duration
    },

    // Check if all matchups cache is valid (use shorter cache during game time)
    isAllMatchupsFresh() {
      if (!this.allMatchupsTimestamp) return false
      const duration = this.getCacheDuration()
      return Date.now() - this.allMatchupsTimestamp < duration
    },

    // Check if draft data is loaded (draft data never expires)
    isDraftLoaded: (state) => {
      return state.draftPicks.length > 0 && state.draftTimestamp !== null
    },

    // Check if YouTube cache is valid (24 hour cache)
    isYoutubeFresh: (state) => {
      if (!state.youtubeTimestamp) return false
      return Date.now() - state.youtubeTimestamp < YOUTUBE_CACHE_DURATION
    },

    // Get standings (alias for rosters)
    standings: (state) => state.rosters,

    // Get transactions for a specific week
    getTransactionsForWeek: (state) => {
      return (week) => state.transactionsByWeek[week] || []
    },

    // Get injuries for a specific week
    getInjuriesForWeek: (state) => {
      return (week) => state.injuriesByWeek[week] || {}
    },

    // Get weekly projections for a specific week
    getWeeklyProjectionsForWeek: (state) => {
      return (week) => state.weeklyProjectionsByWeek[week] || {}
    },

    // Get weekly projection for a specific player in a specific week
    getPlayerWeeklyProjection: (state) => {
      return (playerId, week) => {
        const weekProjections = state.weeklyProjectionsByWeek[week]

        // Get player name from players store
        const player = state.players[playerId]
        if (!player) return null

        const playerName = player.full_name || `${player.first_name || ''} ${player.last_name || ''}`.trim()
        const playerKey = playerName.toLowerCase()

        // Try to get API projection first
        if (weekProjections && weekProjections[playerKey]) {
          return weekProjections[playerKey]
        }

        // Fallback: Calculate projection based on season average
        const seasonStats = state.getPlayerSeasonStats(playerId)
        if (seasonStats && seasonStats.totalGames > 0) {
          return {
            playerId: playerId,
            name: playerName,
            team: player.team,
            position: player.position,
            projectedPoints: Math.round(seasonStats.averagePoints * 10) / 10,
            stats: null,
            source: 'season_average' // Mark as fallback
          }
        }

        // If no season data available, try to generate a basic position-based projection
        const positionDefaults = {
          'QB': 18.5,
          'RB': 12.0,
          'WR': 11.5,
          'TE': 9.0,
          'K': 8.0,
          'DEF': 7.5
        }

        const defaultPoints = positionDefaults[player.position] || 5.0

        return {
          playerId: playerId,
          name: playerName,
          team: player.team,
          position: player.position,
          projectedPoints: defaultPoints,
          stats: null,
          source: 'position_default' // Mark as fallback
        }
      }
    },

    // Check if NFL schedule is fresh
    isNFLScheduleFresh: (state) => {
      if (!state.nflScheduleTimestamp) return false
      // Schedule cache is valid for 1 hour
      return Date.now() - state.nflScheduleTimestamp < (60 * 60 * 1000)
    },

    // Get game info for a player's team in a specific week
    getPlayerGameInfo: (state) => {
      return (playerId, week) => {
        if (!state.nflSchedule || !state.nflSchedule.schedule) return null

        const player = state.players[playerId]
        if (!player || !player.team) return null

        // Find the game for this team in this week
        const game = state.nflSchedule.schedule.find(g =>
          String(g.week) === String(week) &&
          (g.home_team === player.team || g.away_team === player.team)
        )

        if (!game) return null

        // Calculate game status
        const gameDate = new Date(game.game_date)
        const now = new Date()
        const isHome = game.home_team === player.team
        const opponent = isHome ? game.away_team : game.home_team

        let status = 'scheduled'
        if (game.winner) {
          status = 'final'
        } else if (now > gameDate) {
          // Game time has passed but no winner yet - might be in progress
          const hoursSinceStart = (now - gameDate) / (1000 * 60 * 60)
          if (hoursSinceStart < 4) { // NFL games typically last 3-3.5 hours
            status = 'in_progress'
          } else {
            status = 'final'
          }
        }

        return {
          gameId: game.gameId,
          gameDate: gameDate,
          opponent: opponent,
          isHome: isHome,
          tvStation: game.tv_station,
          status: status,
          winner: game.winner,
          score: game.winner ? `${game.away_score}-${game.home_score}` : null
        }
      }
    },

    // Get matchups for a specific week
    getMatchupsForWeek: (state) => {
      return (week) => state.allMatchups[week] || null
    },

    // Get roster data for a specific week (fully enriched with user, team, and standings data)
    getWeekRoster: (state) => {
      return (week, rosterId) => {
        if (!state.weekRosters[week]) return null
        return state.weekRosters[week][rosterId] || null
      }
    },

    // Get all rosters for a specific week (returns object keyed by roster_id)
    getWeekRosters: (state) => {
      return (week) => state.weekRosters[week] || {}
    },

    // Get all rosters for a specific week as an array (sorted by points descending)
    getWeekRostersArray: (state) => {
      return (week) => {
        const rosters = state.weekRosters[week] || {}
        return Object.values(rosters).sort((a, b) => (b.points || 0) - (a.points || 0))
      }
    },

    // Get enriched roster with player objects (not just IDs)
    getEnrichedWeekRoster: (state) => {
      return (week, rosterId) => {
        const roster = state.weekRosters[week]?.[rosterId]
        if (!roster) return null

        // Enrich with full player objects
        return {
          ...roster,
          playersData: (roster.players || []).map(id => state.players[id] || { player_id: id }),
          startersData: (roster.starters || []).map(id => state.players[id] || { player_id: id }),
          benchData: (roster.bench || []).map(id => state.players[id] || { player_id: id }),
          taxiData: (roster.taxi || []).map(id => state.players[id] || { player_id: id }),
          reserveData: (roster.reserve || []).map(id => state.players[id] || { player_id: id })
        }
      }
    },

    // Check if week rosters are loaded for a specific week
    isWeekRostersLoaded: (state) => {
      return (week) => state.weekRosters[week] !== undefined
    },

    // Get enriched player by ID
    getEnrichedPlayer: (state) => {
      return (playerId) => state.enrichedPlayers[playerId] || null
    },

    // Get multiple enriched players
    getEnrichedPlayers: (state) => {
      return (playerIds) => {
        const result = {}
        playerIds.forEach(id => {
          if (state.enrichedPlayers[id]) {
            result[id] = state.enrichedPlayers[id]
          }
        })
        return result
      }
    },

    // Check if processed injuries cache is valid (use shorter cache during game time)
    isProcessedInjuriesFresh() {
      if (!this.processedInjuriesTimestamp) return false
      const duration = this.getCacheDuration()
      return Date.now() - this.processedInjuriesTimestamp < duration
    },

    // Check if processed transactions cache is valid (use shorter cache during game time)
    isProcessedTransactionsFresh() {
      if (!this.processedTransactionsTimestamp) return false
      const duration = this.getCacheDuration()
      return Date.now() - this.processedTransactionsTimestamp < duration
    },

    // Get processed injuries grouped by team for all weeks (for charts)
    getProcessedInjuriesByTeam: (state) => state.processedInjuriesByTeam,

    // Get processed transaction stats (for charts)
    getProcessedTransactionStats: (state) => state.processedTransactionStats,

    // Get transaction counts for each week
    getTransactionCountsByWeek: (state) => state.processedTransactionStats.byWeek,

    // Get transactions grouped by team
    getTransactionsByTeam: (state) => state.processedTransactionStats.byTeam,

    // Get transactions by team for a specific week
    getTransactionsByTeamForWeek: (state) => {
      return (week) => state.processedTransactionStats.byTeamForWeek[week] || {}
    },

    // Get player stats for a specific week (returns object keyed by playerId)
    getPlayerStatsByWeek: (state) => {
      return (week) => state.playerStatsByWeek[week] || {}
    },

    // Get player stats for a specific player in a specific week
    getPlayerStatsForWeek: (state) => {
      return (playerId, week) => {
        const weekStats = state.playerStatsByWeek[week]
        return weekStats ? weekStats[playerId] : null
      }
    },

    // Get all weeks a player has stats for
    getPlayerWeeks: (state) => {
      return (playerId) => {
        const weeks = []
        Object.entries(state.playerStatsByWeek).forEach(([week, stats]) => {
          if (stats[playerId]) {
            weeks.push(parseInt(week))
          }
        })
        return weeks.sort((a, b) => a - b)
      }
    },

    // Get player season stats (aggregated across all weeks)
    getPlayerSeasonStats: (state) => {
      return (playerId) => {
        let totalPoints = 0
        let gamesStarted = 0
        let gamesBenched = 0
        let weeks = []

        Object.entries(state.playerStatsByWeek).forEach(([week, stats]) => {
          if (stats[playerId]) {
            const weekStats = stats[playerId]
            totalPoints += weekStats.points || 0
            if (weekStats.started) gamesStarted++
            if (weekStats.benched) gamesBenched++
            weeks.push(parseInt(week))
          }
        })

        return {
          totalPoints,
          gamesStarted,
          gamesBenched,
          totalGames: gamesStarted + gamesBenched,
          averagePoints: weeks.length > 0 ? totalPoints / weeks.length : 0,
          weeks: weeks.sort((a, b) => a - b)
        }
      }
    },

    // Calculate record (wins/losses/ties) through a specific week
    getRecordThroughWeek: (state) => {
      return (rosterId, throughWeek) => {
        let wins = 0
        let losses = 0
        let ties = 0

        for (let week = 1; week <= throughWeek; week++) {
          const weekMatchups = state.allMatchups[week]
          if (!weekMatchups) continue

          for (const matchup of weekMatchups) {
            if (matchup.length !== 2) continue

            const team1 = matchup[0]
            const team2 = matchup[1]

            if (team1.roster_id === rosterId) {
              if (team1.points > team2.points) wins++
              else if (team1.points < team2.points) losses++
              else ties++
              break
            } else if (team2.roster_id === rosterId) {
              if (team2.points > team1.points) wins++
              else if (team2.points < team1.points) losses++
              else ties++
              break
            }
          }
        }

        return { wins, losses, ties }
      }
    },

    // Calculate total points through a specific week
    getPointsThroughWeek: (state) => {
      return (rosterId, throughWeek) => {
        let totalPoints = 0

        for (let week = 1; week <= throughWeek; week++) {
          const weekMatchups = state.allMatchups[week]
          if (!weekMatchups) continue

          for (const matchup of weekMatchups) {
            const team = matchup.find(t => t.roster_id === rosterId)
            if (team) {
              totalPoints += team.points || 0
              break
            }
          }
        }

        return totalPoints
      }
    },

    // Get current standings (always shows current league state, not dependent on selected week)
    currentStandings() {
      if (!this.league || !this.rosters || this.rosters.length === 0) return []

      const currentWeek = this.league.settings?.leg || 1

      // Check if current week's games are complete
      let standingsWeek = currentWeek - 1 // Default to previous week

      const currentWeekMatchups = this.allMatchups[currentWeek]
      if (currentWeekMatchups) {
        // Check if all teams have points > 0 (indicating games are complete)
        let allGamesComplete = true
        for (const matchup of currentWeekMatchups) {
          for (const team of matchup) {
            // If any team has 0 or null points, games are not complete
            if (!team.points || team.points === 0) {
              allGamesComplete = false
              break
            }
          }
          if (!allGamesComplete) break
        }

        // If all games are complete, include current week in standings
        if (allGamesComplete) {
          standingsWeek = currentWeek
        }
      }

      // Ensure we don't go below 0
      standingsWeek = Math.max(0, standingsWeek)

      const standings = this.rosters.map(roster => {
        const record = this.getRecordThroughWeek(roster.roster_id, standingsWeek)
        const points = this.getPointsThroughWeek(roster.roster_id, standingsWeek)

        return {
          ...roster,
          currentRecord: record,
          currentPoints: points
        }
      })

      // Sort by wins (descending), then by points (descending)
      standings.sort((a, b) => {
        if (b.currentRecord.wins !== a.currentRecord.wins) {
          return b.currentRecord.wins - a.currentRecord.wins
        }
        return b.currentPoints - a.currentPoints
      })

      return standings
    }
  },

  actions: {
    // Check if current time is during NFL game hours (Thursday 8PM - Monday 11:59PM EST)
    isNFLGameTime() {
      const now = new Date()
      const day = now.getDay() // 0 = Sunday, 1 = Monday, etc.
      const hour = now.getHours()

      // Thursday after 8PM EST through Monday
      if (day === 4 && hour >= 20) return true // Thursday 8PM+
      if (day === 5) return true // Friday all day
      if (day === 6) return true // Saturday all day
      if (day === 0) return true // Sunday all day
      if (day === 1) return true // Monday all day

      return false
    },

    // Get appropriate cache duration based on current time
    getCacheDuration() {
      return this.isNFLGameTime() ? GAME_TIME_CACHE_DURATION : CACHE_DURATION
    },

    // Helper method to check if we're in game time mode
    getCacheInfo() {
      const isGameTime = this.isNFLGameTime()
      const duration = this.getCacheDuration()
      console.log(`🏈 Cache Mode: ${isGameTime ? 'NFL Game Time' : 'Normal'} - Duration: ${duration / 1000}s`)
      return {
        isGameTime,
        duration,
        durationSeconds: duration / 1000,
        mode: isGameTime ? 'game-time' : 'normal'
      }
    },

    async fetchLeagueData(forceRefresh = false) {
      // Return cached data if fresh and not forcing refresh
      if (!forceRefresh && this.isLeagueDataFresh && this.rosters.length > 0) {
        return {
          league: this.league,
          rosters: this.rosters,
          users: this.users
        }
      }

      // If already loading, wait for the existing promise instead of returning undefined
      if (this.isLoadingLeagueData && this.leagueDataPromise) {
        return await this.leagueDataPromise
      }

      this.isLoadingLeagueData = true
      this.leagueDataError = null

      // Create and store the promise so concurrent calls can await it
      this.leagueDataPromise = (async () => {
        try {
          const data = await getLeagueData()

          this.league = data.league
          this.rosters = data.rosters
          this.users = data.users
          this.leagueDataTimestamp = Date.now()

          return data
        } catch (error) {
          console.error('Error fetching league data:', error)
          this.leagueDataError = error.message
          throw error
        } finally {
          this.isLoadingLeagueData = false
          this.leagueDataPromise = null
        }
      })()

      return await this.leagueDataPromise
    },

    async fetchCurrentMatchups(forceRefresh = false, ensureLeagueDataLoaded = true) {
      // Return cached data if fresh and not forcing refresh
      if (!forceRefresh && this.isMatchupsFresh && this.currentMatchups) {
        return {
          week: this.currentWeek,
          matchups: this.currentMatchups
        }
      }

      // If already loading, wait for the existing promise
      if (this.isLoadingMatchups && this.currentMatchupsPromise) {
        return await this.currentMatchupsPromise
      }

      this.isLoadingMatchups = true
      this.matchupsError = null

      // Create and store the promise so concurrent calls can await it
      this.currentMatchupsPromise = (async () => {
        try {
          // Only fetch league data if not already loaded AND caller requests it
          // This prevents duplicate API calls when called from fetchAllData()
          if (ensureLeagueDataLoaded && (!this.league || this.rosters.length === 0)) {
            await this.fetchLeagueData()
          }

          // Get the current week from cached league data
          const currentWeek = this.league?.settings?.leg || 1

          // Fetch just the matchups for current week
          const matchups = await getMatchups(currentWeek)

          // Create maps from cached data
          const userMap = {}
          this.users.forEach(user => {
            userMap[user.user_id] = user
          })

          const rosterMap = {}
          this.rosters.forEach(roster => {
            rosterMap[roster.roster_id] = {
              ...roster,
              user: userMap[roster.owner_id]
            }
          })

          // Group matchups by matchup_id
          const matchupGroups = {}
          matchups.forEach(matchup => {
            if (!matchupGroups[matchup.matchup_id]) {
              matchupGroups[matchup.matchup_id] = []
            }
            matchupGroups[matchup.matchup_id].push({
              ...matchup,
              roster: rosterMap[matchup.roster_id]
            })
          })

          const data = {
            week: currentWeek,
            matchups: Object.values(matchupGroups)
          }

          this.currentWeek = data.week
          this.currentMatchups = data.matchups
          this.matchupsTimestamp = Date.now()

          return data
        } catch (error) {
          console.error('Error fetching matchups:', error)
          this.matchupsError = error.message
          throw error
        } finally {
          this.isLoadingMatchups = false
          this.currentMatchupsPromise = null
        }
      })()

      return await this.currentMatchupsPromise
    },

    async fetchPlayers(forceRefresh = false) {
      // Return cached data if fresh and not forcing refresh
      if (!forceRefresh && this.isPlayersFresh && Object.keys(this.players).length > 0) {
        return this.players
      }

      // If already loading, WAIT for the existing promise instead of returning empty data
      if (this.isLoadingPlayers && this.playersPromise) {
        return await this.playersPromise
      }

      this.isLoadingPlayers = true
      this.playersError = null

      // Create and store the promise so concurrent calls can await it
      this.playersPromise = (async () => {
        try {
          // Bust browser cache if we have no players data (likely after cache clear)
          const shouldBustCache = Object.keys(this.players).length === 0

          const data = await getRelevantPlayers(shouldBustCache)

          this.players = data
          this.playersTimestamp = Date.now()

          return data
        } catch (error) {
          console.error('Error fetching players:', error)
          this.playersError = error.message
          throw error
        } finally {
          this.isLoadingPlayers = false
          this.playersPromise = null
        }
      })()

      return await this.playersPromise
    },

    async fetchEnrichedPlayers(forceRefresh = false) {
      // Return cached data if fresh and not forcing refresh
      if (!forceRefresh && this.isEnrichedPlayersFresh && Object.keys(this.enrichedPlayers).length > 0) {
        return this.enrichedPlayers
      }

      // If already loading, wait for the existing promise
      if (this.isLoadingEnrichedPlayers && this.enrichedPlayersPromise) {
        return await this.enrichedPlayersPromise
      }

      this.isLoadingEnrichedPlayers = true
      this.enrichedPlayersError = null

      // Create and store the promise so concurrent calls can await it
      this.enrichedPlayersPromise = (async () => {
        try {
          // Fetch all data sources in parallel
          const [players, draftData, leagueData] = await Promise.all([
            this.fetchPlayers(),
            this.fetchDraft(),
            this.fetchLeagueData()
          ])

          // Get current week for injury data
          const currentWeek = this.league?.settings?.leg || 1
          const injuryData = await this.fetchInjuriesForWeek(currentWeek)

          // Create map of draft data by sleeper_id
          const draftDataBySleeperId = {}
          draftData.forEach(pick => {
            if (pick.sleeper_id) {
              draftDataBySleeperId[pick.sleeper_id] = pick
            }
          })

          // Consolidate all player data
          const enriched = {}

          // Process all players from Sleeper API
          Object.entries(players).forEach(([playerId, player]) => {
            try {
              const draftInfo = draftDataBySleeperId[playerId]
              const playerName = player.full_name || `${player.first_name || ''} ${player.last_name || ''}`.trim()
              const injuryInfo = playerName ? getPlayerInjuryStatus(injuryData, playerName) : null

              // Build comprehensive player object
              enriched[playerId] = {
                // Base Sleeper data
                ...player,

                // Physical attributes (from Sleeper API or draft data)
                height: player.height || draftInfo?.height || null,
                weight: player.weight || draftInfo?.weight || null,
                age: player.age || draftInfo?.age || null,
                college: player.college || draftInfo?.college || null,
                years_exp: player.years_exp !== undefined ? player.years_exp : draftInfo?.years_exp || null,

                // Portrait URL
                portrait_url: draftInfo?.portrait_url || `https://sleepercdn.com/content/nfl/players/${playerId}.jpg`,

                // Draft data (VORP, ROS, projections)
                vorp: draftInfo?.vorp || 0,
                ros: draftInfo?.ros || 0,
                adp: draftInfo?.adp || 999,
                fantasy_points_2024: draftInfo?.fantasy_points_2024 || 0,
                projected_points_2025: draftInfo?.projected_points_2025 || 0,

                // Injury data from Fantasy Nerds
                injury_from_ffn: injuryInfo,
                injury_indicator: getInjuryIndicator(injuryInfo) || getInjuryIndicator({ game_status: player.injury_status }),

                // Combine injury status from both sources
                injury_status_combined: injuryInfo?.game_status || player.injury_status || null,
                injury_notes: injuryInfo?.notes || player.injury_notes || null,

                // Bye week status - DO NOT SET HERE as it's week-specific
                // This should be calculated dynamically based on the week being viewed
                bye_week: null, // Deprecated - use getByeWeekForTeam(team, week) directly

                // Game status for current week
                game_status: this.getGameStatusForPlayer(playerId, currentWeek),

                // Suspension status
                is_suspended: player.status === 'Sus' || player.injury_status === 'Sus',

                // Overall availability
                is_available: !injuryInfo && player.status === 'Active' && !this.getByeWeekForTeam(player.team, currentWeek)
              }
            } catch (err) {
              console.error(`Error enriching player ${playerId}:`, err)
              // Add basic player data even if enrichment fails
              enriched[playerId] = {
                ...player,
                height: player.height || null,
                weight: player.weight || null,
                age: player.age || null,
                college: player.college || null,
                years_exp: player.years_exp || null,
                portrait_url: `https://sleepercdn.com/content/nfl/players/${playerId}.jpg`,
                vorp: 0,
                ros: 0,
                adp: 999,
                fantasy_points_2024: 0,
                projected_points_2025: 0,
                injury_from_ffn: null,
                injury_indicator: null,
                injury_status_combined: player.injury_status || null,
                injury_notes: null,
                bye_week: false,
                game_status: null,
                is_suspended: false,
                is_available: player.status === 'Active'
              }
            }
          })

          // Process any players from draft data that aren't in the Sleeper data
          draftData.forEach(pick => {
            if (pick.sleeper_id && !enriched[pick.sleeper_id]) {
              const injuryInfo = getPlayerInjuryStatus(injuryData, pick.player_name)

              enriched[pick.sleeper_id] = {
                // Minimal player data from draft
                player_id: pick.sleeper_id,
                full_name: pick.player_name,
                first_name: pick.player_name.split(' ')[0],
                last_name: pick.player_name.split(' ').slice(1).join(' '),
                position: pick.position,
                team: pick.team,

                // Physical attributes
                height: pick.height || null,
                weight: pick.weight || null,
                age: pick.age || null,
                college: pick.college || null,
                years_exp: pick.years_exp || null,
                status: pick.status || 'Active',

                // Portrait URL
                portrait_url: pick.portrait_url || `https://sleepercdn.com/content/nfl/players/${pick.sleeper_id}.jpg`,

                // Draft data
                vorp: pick.vorp || 0,
                ros: pick.ros || 0,
                adp: pick.adp || 999,
                fantasy_points_2024: pick.fantasy_points_2024 || 0,
                projected_points_2025: pick.projected_points_2025 || 0,

                // Injury data
                injury_from_ffn: injuryInfo,
                injury_indicator: getInjuryIndicator(injuryInfo),
                injury_status_combined: injuryInfo?.game_status || null,
                injury_notes: injuryInfo?.notes || null,

                // Status fields
                bye_week: this.getByeWeekForTeam(pick.team, currentWeek),
                game_status: null,
                is_suspended: false,
                is_available: !injuryInfo && pick.status === 'Active'
              }
            }
          })

          this.enrichedPlayers = enriched
          this.enrichedPlayersTimestamp = Date.now()

          return enriched
        } catch (error) {
          console.error('Error fetching enriched players:', error)
          this.enrichedPlayersError = error.message
          throw error
        } finally {
          this.isLoadingEnrichedPlayers = false
          this.enrichedPlayersPromise = null
        }
      })()

      return await this.enrichedPlayersPromise
    },

    // Helper method to determine if a team is on bye for a specific week
    getByeWeekForTeam(team, week) {
      if (!team || !week || !this.nflSchedule || !this.nflSchedule.schedule) {
        return false
      }

      // Normalize team codes to handle API inconsistencies
      // Fantasy Nerds uses different codes than Sleeper for some teams
      const normalizeTeamCode = (code) => {
        const teamMappings = {
          'JAX': 'JAC',  // Jacksonville: Sleeper uses JAX, Fantasy Nerds uses JAC
          'WSH': 'WAS',  // Washington: Alternative codes
          // Add more mappings as needed
        }
        return teamMappings[code] || code
      }

      const normalizedTeam = normalizeTeamCode(team)

      // Check if this team has a game scheduled for this week
      const hasGame = this.nflSchedule.schedule.some(game =>
        String(game.week) === String(week) &&
        (game.home_team === normalizedTeam || game.away_team === normalizedTeam)
      )

      // If no game is scheduled for this week, the team is on bye
      return !hasGame
    },

    // Helper method to get game status for a player for a specific week
    getGameStatusForPlayer(playerId, week) {
      // Check if we have matchup data for this week
      const weekMatchups = this.allMatchups[week]
      if (!weekMatchups) return null

      // Look through matchups to find if this player played
      for (const matchup of weekMatchups) {
        for (const team of matchup) {
          if (team.players_points && team.players_points[playerId] !== undefined) {
            return {
              played: true,
              points: team.players_points[playerId],
              starter: team.starters?.includes(playerId)
            }
          }
        }
      }

      return null
    },

    async fetchMatchupForWeek(week, forceRefresh = false, ensureLeagueDataLoaded = true) {
      // If we have fresh all matchups data, just return the specific week
      if (!forceRefresh && this.isAllMatchupsFresh && this.allMatchups[week]) {
        return this.allMatchups[week]
      }

      // Otherwise fetch just this week's matchup
      try {
        // Only fetch league data if not already loaded AND caller requests it
        if (ensureLeagueDataLoaded && (!this.league || this.rosters.length === 0)) {
          await this.fetchLeagueData()
        }

        const matchups = await getMatchups(week)

        // Create roster map
        const rosterMap = {}
        this.rosters.forEach(roster => {
          rosterMap[roster.roster_id] = roster
        })

        // Group matchups and enrich player data
        const matchupGroups = {}
        const weekRosterData = {}
        const weekPlayerStats = {}

        for (const matchup of matchups) {
          // Enrich player data for matchup.players_points
          let enrichedPlayers = null
          if (matchup.players_points) {
            enrichedPlayers = await enrichPlayerData(matchup.players_points, this.players)
          }

          // Calculate bench players (all players minus starters)
          const benchPlayers = matchup.players ?
            matchup.players.filter(playerId => !matchup.starters?.includes(playerId)) : []

          // Build player stats for this week
          if (matchup.players) {
            matchup.players.forEach(playerId => {
              const points = matchup.players_points?.[playerId] || 0
              const isStarter = matchup.starters?.includes(playerId) || false

              weekPlayerStats[playerId] = {
                playerId,
                rosterId: matchup.roster_id,
                points,
                started: isStarter,
                benched: !isStarter,
                week
              }
            })
          }

          // Store week-specific roster data with full enrichment
          if (matchup.roster_id) {
            const baseRoster = rosterMap[matchup.roster_id]
            const user = baseRoster?.user
            const teamInfo = user?.display_name ? getTeamInfo(user.display_name) : null

            weekRosterData[matchup.roster_id] = {
              // Identity
              roster_id: matchup.roster_id,
              owner_id: baseRoster?.owner_id || null,

              // User information
              user: user || null,

              // Team branding
              teamInfo: teamInfo,

              // League standings data
              settings: baseRoster?.settings || {},

              // Week-specific roster composition (all player IDs reference players store)
              players: matchup.players || [],     // All rostered players this week
              starters: matchup.starters || [],   // Starting lineup
              bench: benchPlayers,                // Bench players
              taxi: baseRoster?.taxi || [],       // Taxi squad
              reserve: baseRoster?.reserve || [], // Reserve/IR

              // Week-specific performance
              players_points: matchup.players_points || {},
              points: matchup.points || 0,

              // Metadata
              week: week,
              matchup_id: matchup.matchup_id || null
            }
          }

          if (!matchupGroups[matchup.matchup_id]) {
            matchupGroups[matchup.matchup_id] = []
          }
          matchupGroups[matchup.matchup_id].push({
            ...matchup,
            roster: rosterMap[matchup.roster_id],
            bench: benchPlayers, // Add bench players to matchup
            enrichedPlayers // Add enriched player data
          })
        }

        // Store week rosters and player stats
        this.weekRosters[week] = weekRosterData
        this.playerStatsByWeek[week] = weekPlayerStats
        this.allMatchups[week] = Object.values(matchupGroups)

        // Update player stats timestamp
        this.playerStatsTimestamp = Date.now()

        // Only update timestamp if all matchups are loaded
        if (Object.keys(this.allMatchups).length >= 18) {
          this.allMatchupsTimestamp = Date.now()
        }

        return Object.values(matchupGroups)
      } catch (error) {
        console.error(`Error fetching matchups for week ${week}:`, error)
        throw error
      }
    },

    async fetchAllMatchups(forceRefresh = false, ensureLeagueDataLoaded = true) {
      // Return cached data if fresh and not forcing refresh
      if (!forceRefresh && this.isAllMatchupsFresh && Object.keys(this.allMatchups).length > 0) {
        return this.allMatchups
      }

      // Skip if already loading
      if (this.isLoadingAllMatchups) return this.allMatchups

      this.isLoadingAllMatchups = true
      this.allMatchupsError = null

      try {
        // Only fetch league data if not already loaded AND caller requests it
        // This prevents duplicate API calls when called from fetchAllData()
        if (ensureLeagueDataLoaded && (!this.league || this.rosters.length === 0)) {
          await this.fetchLeagueData()
        }

        // Create maps from cached data
        const userMap = {}
        this.users.forEach(user => {
          userMap[user.user_id] = user
        })

        const rosterMap = {}
        this.rosters.forEach(roster => {
          rosterMap[roster.roster_id] = {
            ...roster,
            user: userMap[roster.owner_id]
          }
        })

        // Load matchups for all 18 weeks IN PARALLEL
        const weekPromises = []
        for (let week = 1; week <= 18; week++) {
          weekPromises.push(
            getMatchups(week).then(async matchups => {
              // Group matchups and enrich player data
              const matchupGroups = {}
              const weekRosterData = {}
              const weekPlayerStats = {}

              for (const matchup of matchups) {
                // Enrich player data for matchup.players_points
                let enrichedPlayers = null
                if (matchup.players_points) {
                  enrichedPlayers = await enrichPlayerData(matchup.players_points, this.players)
                }

                // Calculate bench players (all players minus starters)
                const benchPlayers = matchup.players ?
                  matchup.players.filter(playerId => !matchup.starters?.includes(playerId)) : []

                // Build player stats for this week
                if (matchup.players) {
                  matchup.players.forEach(playerId => {
                    const points = matchup.players_points?.[playerId] || 0
                    const isStarter = matchup.starters?.includes(playerId) || false

                    weekPlayerStats[playerId] = {
                      playerId,
                      rosterId: matchup.roster_id,
                      points,
                      started: isStarter,
                      benched: !isStarter,
                      week
                    }
                  })
                }

                // Store week-specific roster data with full enrichment
                if (matchup.roster_id) {
                  const baseRoster = rosterMap[matchup.roster_id]
                  const user = baseRoster?.user
                  const teamInfo = user?.display_name ? getTeamInfo(user.display_name) : null

                  weekRosterData[matchup.roster_id] = {
                    // Identity
                    roster_id: matchup.roster_id,
                    owner_id: baseRoster?.owner_id || null,

                    // User information
                    user: user || null,

                    // Team branding
                    teamInfo: teamInfo,

                    // League standings data
                    settings: baseRoster?.settings || {},

                    // Week-specific roster composition (all player IDs reference players store)
                    players: matchup.players || [],     // All rostered players this week
                    starters: matchup.starters || [],   // Starting lineup
                    bench: benchPlayers,                // Bench players
                    taxi: baseRoster?.taxi || [],       // Taxi squad
                    reserve: baseRoster?.reserve || [], // Reserve/IR

                    // Week-specific performance
                    players_points: matchup.players_points || {},
                    points: matchup.points || 0,

                    // Metadata
                    week: week,
                    matchup_id: matchup.matchup_id || null
                  }
                }

                if (!matchupGroups[matchup.matchup_id]) {
                  matchupGroups[matchup.matchup_id] = []
                }
                matchupGroups[matchup.matchup_id].push({
                  ...matchup,
                  roster: rosterMap[matchup.roster_id],
                  bench: benchPlayers, // Add bench players to matchup
                  enrichedPlayers // Add enriched player data
                })
              }

              // Store week rosters and player stats
              this.weekRosters[week] = weekRosterData
              this.playerStatsByWeek[week] = weekPlayerStats
              this.allMatchups[week] = Object.values(matchupGroups)
            }).catch(err => {
              console.error(`Error loading week ${week} matchups:`, err)
            })
          )
        }

        // Wait for all weeks to load
        await Promise.all(weekPromises)
        this.allMatchupsTimestamp = Date.now()
        this.playerStatsTimestamp = Date.now()

        return this.allMatchups
      } catch (error) {
        console.error('Error fetching all matchups:', error)
        this.allMatchupsError = error.message
        throw error
      } finally {
        this.isLoadingAllMatchups = false
      }
    },

    /**
     * Intelligently pair transactions that occur within a short time window
     * Handles cases where AI made separate add/drop calls instead of paired transactions
     */
    pairTransactions(transactions) {
      if (!Array.isArray(transactions) || transactions.length === 0) {
        return transactions
      }

      // Sort by timestamp to process chronologically
      const sorted = [...transactions].sort((a, b) => {
        const timeA = a.status_updated || a.created || 0
        const timeB = b.status_updated || b.created || 0
        return timeA - timeB
      })

      // Group by roster_id
      const byRoster = {}
      sorted.forEach(t => {
        const rosterId = t.roster_ids?.[0]
        if (rosterId) {
          if (!byRoster[rosterId]) {
            byRoster[rosterId] = []
          }
          byRoster[rosterId].push(t)
        }
      })

      // Process each roster's transactions
      const result = []
      const PAIRING_WINDOW_MS = 2 * 60 * 1000 // 2 minutes

      Object.values(byRoster).forEach(rosterTransactions => {
        let i = 0
        while (i < rosterTransactions.length) {
          const current = rosterTransactions[i]
          const currentTime = current.status_updated || current.created || 0

          // If this transaction already has both adds and drops, keep it as-is
          if (current.adds && current.drops) {
            result.push(current)
            i++
            continue
          }

          // Look for complementary transactions within the time window
          let paired = false
          for (let j = i + 1; j < rosterTransactions.length; j++) {
            const candidate = rosterTransactions[j]
            const candidateTime = candidate.status_updated || candidate.created || 0

            // Stop if we're outside the pairing window
            if (candidateTime - currentTime > PAIRING_WINDOW_MS) {
              break
            }

            // Check if this is a complementary transaction
            const currentHasAdds = current.adds && Object.keys(current.adds).length > 0
            const currentHasDrops = current.drops && Object.keys(current.drops).length > 0
            const candidateHasAdds = candidate.adds && Object.keys(candidate.adds).length > 0
            const candidateHasDrops = candidate.drops && Object.keys(candidate.drops).length > 0

            // Pair add-only with drop-only, or drop-only with add-only
            if ((currentHasAdds && !currentHasDrops && candidateHasDrops && !candidateHasAdds) ||
                (currentHasDrops && !currentHasAdds && candidateHasAdds && !candidateHasDrops)) {
              // Merge the transactions
              result.push({
                ...current,
                adds: current.adds || candidate.adds,
                drops: current.drops || candidate.drops
              })
              // Mark candidate as consumed
              rosterTransactions.splice(j, 1)
              paired = true
              break
            }
          }

          // If no pairing found, add transaction as-is
          if (!paired) {
            result.push(current)
          }
          i++
        }
      })

      // Sort result by timestamp descending (newest first)
      return result.sort((a, b) => {
        const timeA = a.status_updated || a.created || 0
        const timeB = b.status_updated || b.created || 0
        return timeB - timeA
      })
    },

    async fetchTransactionsForWeek(week, forceRefresh = false, ensureLeagueDataLoaded = true) {
      // Check if cached data is fresh (within cache duration - shorter during game time)
      const timestamp = this.transactionsTimestampsByWeek[week]
      const isFresh = timestamp && (Date.now() - timestamp < this.getCacheDuration())

      // Return cached data if exists, is fresh, and not forcing refresh
      if (!forceRefresh && isFresh && this.transactionsByWeek[week]) {
        return this.transactionsByWeek[week]
      }

      try {
        // Only fetch league data if not already loaded AND caller requests it
        if (ensureLeagueDataLoaded && (!this.league || this.rosters.length === 0)) {
          await this.fetchLeagueData()
        }

        // Only fetch the transactions for this week
        const trans = await getTransactions(week)

        // Create user map from cached data
        const userMap = {}
        this.users.forEach(user => {
          userMap[user.user_id] = user
        })

        // Create roster map from cached data
        const rosterMap = {}
        this.rosters.forEach(roster => {
          rosterMap[roster.roster_id] = {
            ...roster,
            user: userMap[roster.owner_id]
          }
        })

        // Enhance transactions with roster/user info
        const enhancedTransactions = (trans || []).map(transaction => {
          const rosterId = transaction.roster_ids?.[0]
          const roster = rosterId ? rosterMap[rosterId] : null

          // For trades, get the counterparty (second roster)
          let counterpartyInfo = null
          if (transaction.type === 'trade' && transaction.roster_ids?.length > 1) {
            const counterpartyRosterId = transaction.roster_ids[1]
            const counterpartyRoster = counterpartyRosterId ? rosterMap[counterpartyRosterId] : null
            if (counterpartyRoster?.user?.display_name) {
              counterpartyInfo = getTeamInfo(counterpartyRoster.user.display_name)
            }
          }

          return {
            ...transaction,
            roster,
            teamInfo: roster?.user?.display_name ? getTeamInfo(roster.user.display_name) : null,
            counterpartyInfo
          }
        })

        // Smart transaction pairing: Group transactions that occurred within 2 minutes of each other
        // This handles cases where AI made multiple separate add/drop calls instead of paired transactions
        const pairedTransactions = this.pairTransactions(enhancedTransactions)

        // Collect all player IDs from transactions (both adds and drops)
        const transactionPlayerIds = new Set()
        pairedTransactions.forEach(transaction => {
          if (transaction.adds) {
            Object.keys(transaction.adds).forEach(playerId => transactionPlayerIds.add(playerId))
          }
          if (transaction.drops) {
            Object.keys(transaction.drops).forEach(playerId => transactionPlayerIds.add(playerId))
          }
        })

        // Fetch missing players that appear in transactions but not in our players cache
        const missingPlayerIds = Array.from(transactionPlayerIds).filter(
          playerId => !this.players[playerId]
        )

        if (missingPlayerIds.length > 0) {
          console.log(`Fetching ${missingPlayerIds.length} players from transactions:`, missingPlayerIds)
          try {
            // Fetch all players from Sleeper API
            const allPlayersResponse = await fetch('https://api.sleeper.app/v1/players/nfl')
            if (allPlayersResponse.ok) {
              const allPlayers = await allPlayersResponse.json()

              // Add missing players to cache
              missingPlayerIds.forEach(playerId => {
                if (allPlayers[playerId]) {
                  this.players[playerId] = allPlayers[playerId]
                }
              })
            }
          } catch (error) {
            console.error('Error fetching transaction players:', error)
          }
        }

        this.transactionsByWeek[week] = pairedTransactions
        this.transactionsTimestampsByWeek[week] = Date.now()
        return pairedTransactions
      } catch (error) {
        console.error(`Error fetching transactions for week ${week}:`, error)
        this.transactionsByWeek[week] = []
        return []
      }
    },

    async fetchInjuriesForWeek(week, forceRefresh = false) {
      // Check if cached data is fresh (within cache duration - shorter during game time)
      const timestamp = this.injuriesTimestampsByWeek[week]
      const isFresh = timestamp && (Date.now() - timestamp < this.getCacheDuration())

      // Return cached data if exists, is fresh, and not forcing refresh
      if (!forceRefresh && isFresh && this.injuriesByWeek[week]) {
        return this.injuriesByWeek[week]
      }

      try {
        const injuryData = await getInjuries(week)

        this.injuriesByWeek[week] = injuryData
        this.injuriesTimestampsByWeek[week] = Date.now()
        return injuryData
      } catch (error) {
        console.error(`Error fetching injuries for week ${week}:`, error)
        this.injuriesByWeek[week] = {}
        return {}
      }
    },

    async fetchWeeklyProjectionsForWeek(week, forceRefresh = false) {
      // Check if cached data is fresh (within cache duration - shorter during game time)
      const timestamp = this.weeklyProjectionsTimestampsByWeek[week]
      const isFresh = timestamp && (Date.now() - timestamp < this.getCacheDuration())

      // Return cached data if exists, is fresh, and not forcing refresh
      if (!forceRefresh && isFresh && this.weeklyProjectionsByWeek[week]) {
        return this.weeklyProjectionsByWeek[week]
      }

      try {
        const projectionsData = await getWeeklyProjections(week)

        this.weeklyProjectionsByWeek[week] = projectionsData
        this.weeklyProjectionsTimestampsByWeek[week] = Date.now()
        return projectionsData
      } catch (error) {
        console.error(`Error fetching weekly projections for week ${week}:`, error)
        this.weeklyProjectionsByWeek[week] = {}
        return {}
      }
    },

    async fetchNFLSchedule(forceRefresh = false) {
      // Return cached data if fresh and not forcing refresh
      if (!forceRefresh && this.isNFLScheduleFresh && this.nflSchedule) {
        return this.nflSchedule
      }

      try {
        const scheduleData = await getNFLSchedule()

        this.nflSchedule = scheduleData
        this.nflScheduleTimestamp = Date.now()
        return scheduleData
      } catch (error) {
        console.error('Error fetching NFL schedule:', error)
        this.nflSchedule = { current_week: 1, schedule: [] }
        return this.nflSchedule
      }
    },

    /**
     * Process injury data and group by team for all weeks
     * This consolidates the injury processing logic that was duplicated in components
     */
    async processInjuriesData(maxWeek, forceRefresh = false, ensureDataLoaded = true) {
      // Return cached data if fresh and not forcing refresh
      if (!forceRefresh && this.isProcessedInjuriesFresh && Object.keys(this.processedInjuriesByTeam).length > 0) {
        return this.processedInjuriesByTeam
      }

      try {
        // Only fetch required data if not already loaded AND caller requests it
        if (ensureDataLoaded) {
          if (!this.league || this.rosters.length === 0) {
            await this.fetchLeagueData()
          }
          if (Object.keys(this.players).length === 0) {
            await this.fetchPlayers()
          }
        }

        const transformedInjuries = {}

        // Process injuries for each week
        for (let week = 1; week <= Math.min(maxWeek, 18); week++) {
          const weekInjuries = await this.fetchInjuriesForWeek(week)
          const injuriesByTeam = {}

          // Group injuries by team based on ALL players on rosters (not just starters)
          if (this.rosters && this.rosters.length > 0) {
            this.rosters.forEach(roster => {
              if (roster.user?.display_name) {
                const teamInfo = getTeamInfo(roster.user.display_name)
                const teamName = teamInfo.aiModel
                const teamInjuries = []

                // Collect all players on this roster (players, starters, taxi, reserve)
                const allPlayerIds = new Set([
                  ...(roster.players || []),
                  ...(roster.starters || []),
                  ...(roster.taxi || []),
                  ...(roster.reserve || [])
                ])

                // Check each player on the roster for injuries
                allPlayerIds.forEach(playerId => {
                  const player = this.players[playerId]
                  if (player) {
                    const playerName = player.full_name || `${player.first_name || ''} ${player.last_name || ''}`.trim()
                    const injuryStatus = playerName ? getPlayerInjuryStatus(weekInjuries, playerName) : null
                    if (injuryStatus) {
                      teamInjuries.push({
                        player: playerName,
                        team: player.team,
                        position: player.position,
                        injury: injuryStatus.injury,
                        gameStatus: injuryStatus.game_status,
                        practice_status: injuryStatus.practice_status
                      })
                    }
                  }
                })

                if (teamInjuries.length > 0) {
                  injuriesByTeam[teamName] = teamInjuries
                }
              }
            })
          }

          transformedInjuries[`week${week}`] = {
            week: week,
            injuries: injuriesByTeam
          }
        }

        this.processedInjuriesByTeam = transformedInjuries
        this.processedInjuriesTimestamp = Date.now()

        return transformedInjuries
      } catch (error) {
        console.error('Error processing injuries data:', error)
        return this.processedInjuriesByTeam
      }
    },

    /**
     * Process transaction data and generate stats for charts
     * This consolidates the transaction processing logic that was duplicated in components
     */
    async processTransactionStats(maxWeek, forceRefresh = false, ensureDataLoaded = true) {
      // Return cached data if fresh and not forcing refresh
      if (!forceRefresh && this.isProcessedTransactionsFresh && Object.keys(this.processedTransactionStats.byWeek).length > 0) {
        return this.processedTransactionStats
      }

      try {
        // Only fetch league data if not already loaded AND caller requests it
        if (ensureDataLoaded && (!this.league || this.rosters.length === 0)) {
          await this.fetchLeagueData()
        }

        const byWeek = {}           // { week: count }
        const byTeam = {}           // { teamName: { total: count, byWeek: { week: count } } }
        const byTeamForWeek = {}    // { week: { teamName: count } }

        // Initialize team stats
        if (this.rosters && this.rosters.length > 0) {
          this.rosters.forEach(roster => {
            if (roster.user?.display_name) {
              const teamInfo = getTeamInfo(roster.user.display_name)
              byTeam[teamInfo.aiModel] = {
                total: 0,
                byWeek: {}
              }
            }
          })
        }

        // Process transactions for each week
        for (let week = 1; week <= Math.min(maxWeek, 18); week++) {
          const weekTransactions = await this.fetchTransactionsForWeek(week)

          // Count total transactions for this week
          byWeek[week] = weekTransactions.length

          // Initialize week stats
          byTeamForWeek[week] = {}

          // Initialize all teams to 0 for this week
          Object.keys(byTeam).forEach(teamName => {
            byTeamForWeek[week][teamName] = 0
            byTeam[teamName].byWeek[week] = 0
          })

          // Count transactions by team for this week
          weekTransactions.forEach(transaction => {
            if (transaction.roster_ids && transaction.roster_ids.length > 0) {
              transaction.roster_ids.forEach(rosterId => {
                const roster = this.rosters?.find(r => r.roster_id === rosterId)
                if (roster && roster.user?.display_name) {
                  const teamInfo = getTeamInfo(roster.user.display_name)
                  const teamName = teamInfo.aiModel

                  // Increment counts
                  if (byTeam[teamName]) {
                    byTeam[teamName].total += 1
                    byTeam[teamName].byWeek[week] = (byTeam[teamName].byWeek[week] || 0) + 1
                    byTeamForWeek[week][teamName] = (byTeamForWeek[week][teamName] || 0) + 1
                  }
                }
              })
            }
          })
        }

        const stats = { byWeek, byTeam, byTeamForWeek }
        this.processedTransactionStats = stats
        this.processedTransactionsTimestamp = Date.now()

        return stats
      } catch (error) {
        console.error('Error processing transaction stats:', error)
        return this.processedTransactionStats
      }
    },

    async fetchDraft(forceRefresh = false) {
      // Return cached data if loaded and not forcing refresh
      // Draft data never expires since it never changes
      if (!forceRefresh && this.isDraftLoaded) {
        return this.draftPicks
      }

      // Skip if already loading
      if (this.isLoadingDraft) return this.draftPicks

      this.isLoadingDraft = true
      this.draftError = null

      try {
        const response = await fetch('/data/draft_picks.json')

        if (!response.ok) {
          throw new Error('Failed to load draft picks')
        }

        const data = await response.json()
        this.draftPicks = data
        this.draftTimestamp = Date.now()

        return data
      } catch (error) {
        console.error('Error fetching draft data:', error)
        this.draftError = error.message
        throw error
      } finally {
        this.isLoadingDraft = false
      }
    },

    async fetchYoutube(forceRefresh = false) {
      // Return cached data if fresh and not forcing refresh
      if (!forceRefresh && this.isYoutubeFresh && this.latestVideo) {
        return {
          latestVideo: this.latestVideo,
          latestShorts: this.latestShorts
        }
      }

      // Skip if already loading
      if (this.isLoadingYoutube) return {
        latestVideo: this.latestVideo,
        latestShorts: this.latestShorts
      }

      this.isLoadingYoutube = true
      this.youtubeError = null

      try {
        const data = await getLatestVideoAndShorts()
        this.latestVideo = data.latestVideo
        this.latestShorts = data.latestShorts
        this.youtubeTimestamp = Date.now()

        return data
      } catch (error) {
        console.error('Error fetching YouTube data:', error)
        this.youtubeError = error.message
        throw error
      } finally {
        this.isLoadingYoutube = false
      }
    },

    // Fetch all data needed for the home page with optimized parallel loading
    async fetchAllData(forceRefresh = false) {
      try {
        console.log('🚀 fetchAllData: Starting optimized parallel data loading...')
        const startTime = Date.now()

        // PHASE 1: Fetch base independent data in parallel
        // These have no dependencies on each other
        console.log('📊 Phase 1: Fetching base data (league + players) in parallel...')
        const phase1Start = Date.now()
        const [leagueData, players] = await Promise.all([
          this.fetchLeagueData(forceRefresh),
          this.fetchPlayers(forceRefresh)
        ])
        console.log(`✅ Phase 1 complete in ${Date.now() - phase1Start}ms`)

        // PHASE 2: Fetch all dependent data in parallel
        // Now that league data is cached, all these can run simultaneously
        // Pass ensureLeagueDataLoaded=false to prevent redundant fetchLeagueData() calls
        console.log('📊 Phase 2: Fetching dependent data (matchups) in parallel...')
        const phase2Start = Date.now()
        const [matchupsData, allMatchups] = await Promise.all([
          this.fetchCurrentMatchups(forceRefresh, false), // Don't re-fetch league data
          this.fetchAllMatchups(forceRefresh, false)      // Don't re-fetch league data
        ])
        console.log(`✅ Phase 2 complete in ${Date.now() - phase2Start}ms`)

        // PHASE 3: Fetch enriched players (non-critical, can fail gracefully)
        console.log('📊 Phase 3: Fetching enriched players (non-blocking)...')
        let enrichedPlayers = {}
        try {
          enrichedPlayers = await this.fetchEnrichedPlayers(forceRefresh)
        } catch (err) {
          console.error('Error fetching enriched players (non-critical):', err)
          // Don't throw - allow app to continue with base player data
        }

        const totalTime = Date.now() - startTime
        console.log(`🎉 fetchAllData: Complete in ${totalTime}ms (Phase 1: ${Date.now() - phase1Start}ms, Phase 2: ${Date.now() - phase2Start}ms)`)

        return {
          leagueData,
          matchupsData,
          players,
          enrichedPlayers,
          allMatchups
        }
      } catch (error) {
        console.error('Error fetching all data:', error)
        throw error
      }
    },

    /**
     * Generate badges for a team based on roster status
     * Single source of truth for badge generation
     * @param {Array} starterIds - Array of player IDs in the starting lineup
     * @param {Number} week - Week number to check bye status for (optional, defaults to current week)
     * @returns {Array} Array of badge objects with type, label, and color
     */
    getTeamBadges(starterIds, week = null) {
      if (!starterIds || !Array.isArray(starterIds)) return []

      const badges = []

      // Use provided week or fall back to current week
      const checkWeek = week || this.league?.settings?.leg || null

      // Track different injury severities and statuses
      let hasOut = false
      let hasIR = false
      let hasDoubtful = false
      let hasQuestionable = false
      let hasSuspended = false
      let hasBye = false
      let hasEmpty = false

      // Check each starter
      starterIds.forEach(playerId => {
        // Check for empty slots
        if (playerId === '0' || playerId === 0) {
          hasEmpty = true
          return
        }

        // Use enriched player data if available, fallback to base player data
        const enrichedPlayer = this.enrichedPlayers[playerId]
        const basePlayer = this.players[playerId]

        if (enrichedPlayer || basePlayer) {
          const player = enrichedPlayer || basePlayer

          // Check for BYE week dynamically based on the specific week
          if (checkWeek && player.team) {
            if (this.getByeWeekForTeam(player.team, checkWeek)) {
              hasBye = true
            }
          }

          // Check for suspension
          if (enrichedPlayer?.is_suspended) {
            hasSuspended = true
          }

          // Check injury status using consolidated injury_status_combined field
          const statusToCheck = enrichedPlayer?.injury_status_combined?.toUpperCase() || basePlayer?.injury_status?.toUpperCase()

          if (statusToCheck) {
            // Check for Doubtful BEFORE Out (since "DOUBTFUL" contains "OUT")
            if (statusToCheck.includes('DOUBTFUL') || (statusToCheck.includes('D ') || statusToCheck === 'D') && !statusToCheck.includes('SUSPENDED')) {
              hasDoubtful = true
            }
            // Check for IR first, then Out (to separate them)
            else if (statusToCheck.includes('INJURED RESERVE') || statusToCheck.includes('IR')) {
              hasIR = true
            }
            else if (statusToCheck.includes('OUT')) {
              hasOut = true
            }
            // Check for Questionable/PUP
            else if (statusToCheck.includes('QUESTIONABLE') || statusToCheck.includes('Q ') || statusToCheck === 'Q' || statusToCheck.includes('PUP') || statusToCheck.includes('PHYSICALLY UNABLE')) {
              hasQuestionable = true
            }
          }

          // Also check the injury_indicator field as a fallback
          if (!statusToCheck && enrichedPlayer?.injury_indicator) {
            switch(enrichedPlayer.injury_indicator) {
              case 'O':
                hasOut = true
                break
              case 'IR':
                hasIR = true
                break
              case 'D':
                hasDoubtful = true
                break
              case 'Q':
              case 'PUP':
                hasQuestionable = true
                break
            }
          }
        }
      })

      // Add badges in priority order (most severe first)
      if (hasEmpty) {
        badges.push({ type: 'empty', label: 'EMPTY', color: 'bg-red-600' })
      }
      if (hasBye) {
        badges.push({ type: 'bye', label: 'BYE', color: 'bg-gray-600' })
      }
      if (hasSuspended) {
        badges.push({ type: 'suspended', label: 'SUSP', color: 'bg-purple-600' })
      }
      if (hasOut) {
        badges.push({ type: 'out', label: 'O', color: 'bg-red-600' })
      }
      if (hasIR) {
        badges.push({ type: 'ir', label: 'IR', color: 'bg-red-600' })
      }
      if (hasDoubtful) {
        badges.push({ type: 'doubtful', label: 'D', color: 'bg-orange-500' })
      }
      if (hasQuestionable) {
        badges.push({ type: 'questionable', label: 'Q', color: 'bg-yellow-500' })
      }

      return badges
    },

    // Clear all cached data
    clearCache() {
      this.league = null
      this.rosters = []
      this.users = []
      this.currentMatchups = null
      this.currentWeek = null
      this.players = {}
      this.enrichedPlayers = {}
      this.allMatchups = {}
      this.weekRosters = {}
      this.weekRostersTimestamp = null
      this.playerStatsByWeek = {}
      this.playerStatsTimestamp = null
      this.transactionsByWeek = {}
      this.transactionsTimestampsByWeek = {}
      this.injuriesByWeek = {}
      this.injuriesTimestampsByWeek = {}
      this.weeklyProjectionsByWeek = {}
      this.weeklyProjectionsTimestampsByWeek = {}
      this.nflSchedule = null
      this.nflScheduleTimestamp = null
      this.processedInjuriesByTeam = {}
      this.processedTransactionStats = { byWeek: {}, byTeam: {}, byTeamForWeek: {} }
      this.draftPicks = []
      this.latestVideo = null
      this.latestShorts = []
      this.leagueDataTimestamp = null
      this.matchupsTimestamp = null
      this.playersTimestamp = null
      this.enrichedPlayersTimestamp = null
      this.allMatchupsTimestamp = null
      this.draftTimestamp = null
      this.youtubeTimestamp = null
      this.processedInjuriesTimestamp = null
      this.processedTransactionsTimestamp = null
      this.leagueDataError = null
      this.matchupsError = null
      this.playersError = null
      this.enrichedPlayersError = null
      this.allMatchupsError = null
      this.draftError = null
      this.youtubeError = null
    }
  },

  // Enable persistence with localStorage
  persist: {
    key: 'tokenbowl-league',
    paths: [
      'cacheVersion',
      'league',
      'rosters',
      'users',
      'currentMatchups',
      'currentWeek',
      'players',
      'enrichedPlayers',
      'allMatchups',
      'weekRosters',
      'weekRostersTimestamp',
      'playerStatsByWeek',
      'playerStatsTimestamp',
      'transactionsByWeek',
      'transactionsTimestampsByWeek',
      'injuriesByWeek',
      'injuriesTimestampsByWeek',
      'weeklyProjectionsByWeek',
      'weeklyProjectionsTimestampsByWeek',
      'nflSchedule',
      'nflScheduleTimestamp',
      'processedInjuriesByTeam',
      'processedInjuriesTimestamp',
      'processedTransactionStats',
      'processedTransactionsTimestamp',
      'draftPicks',
      'latestVideo',
      'latestShorts',
      'leagueDataTimestamp',
      'matchupsTimestamp',
      'playersTimestamp',
      'enrichedPlayersTimestamp',
      'allMatchupsTimestamp',
      'draftTimestamp',
      'youtubeTimestamp'
    ]
  }
})
