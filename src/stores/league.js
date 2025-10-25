import { defineStore } from 'pinia'
import { getLeagueData, getRelevantPlayers, getMatchups, getTransactions } from '../sleeperApi.js'
import { getTeamInfo } from '../teamMappings.js'
import { getLatestVideoAndShorts } from '../youtubeApi.js'
import { getInjuries, getPlayerInjuryStatus, getInjuryIndicator, getWeeklyProjections, getNFLSchedule } from '../fantasyNerdsApi.js'
import { getPlayers as getPlayersFromService, enrichPlayerData } from '../utils/playerService.js'

// Cache version - increment when making breaking changes to data structure
const CACHE_VERSION = 16 // v16: Fix deadlock + force refresh for Week 7 data

// Team code normalization mapping
const normalizeTeamCode = (code) => {
  const teamMappings = {
    'JAX': 'JAC',
    'WSH': 'WAS'
  }
  return teamMappings[code] || code
}

export const useLeagueStore = defineStore('league', {
  state: () => ({
    // Cache version for invalidation
    cacheVersion: CACHE_VERSION,

    // Core league data
    league: null,
    rosters: [],
    users: [],
    currentWeek: null,

    // Player data
    players: {},
    enrichedPlayers: {},

    // Week-based data
    allMatchups: {},              // { week: [matchups] }
    playerStatsByWeek: {},        // { week: { playerId: stats } }
    weekRosters: {},              // { week: { rosterId: roster } }
    transactionsByWeek: {},       // { week: [transactions] }
    injuriesByWeek: {},           // { week: injuries }
    weeklyProjectionsByWeek: {},  // { week: projections }

    // NFL Schedule
    nflSchedule: null,

    // Draft data (static - loaded once)
    draftPicks: [],

    // YouTube data
    latestVideo: null,
    latestShorts: [],

    // Processed data for charts
    processedInjuriesByTeam: {},
    processedTransactionStats: {
      byWeek: {},
      byTeam: {},
      byTeamForWeek: {}
    },

    // Simple caching - just track when we last loaded the full season
    lastFullLoad: null,
    completedWeeks: [], // Weeks that are finalized and will never change

    // Loading states
    isInitializing: false,
    isRefreshing: false,

    // Error tracking
    errors: {}
  }),

  getters: {
    // Single source of truth for whether data is ready
    isDataReady() {
      return this.league !== null &&
             this.rosters.length > 0 &&
             this.currentWeek !== null &&
             Object.keys(this.allMatchups).length > 0
    },

    // Get current week from league settings
    currentLeagueWeek() {
      return this.league?.settings?.leg || 1
    },

    // Check if a week is completed (before current week)
    isWeekCompleted: (state) => {
      return (week) => {
        const currentWeek = state.league?.settings?.leg || 18
        return week < currentWeek
      }
    },

    // Get standings
    standings: (state) => state.rosters,

    // Get current standings with calculated records
    currentStandings() {
      if (!this.league || !this.rosters || this.rosters.length === 0) return []

      const currentWeek = this.currentLeagueWeek

      // Determine which week to use for standings
      let standingsWeek = currentWeek - 1
      const currentWeekMatchups = this.allMatchups[currentWeek]
      if (currentWeekMatchups) {
        // Check if current week games are complete
        let allGamesComplete = true
        for (const matchup of currentWeekMatchups) {
          for (const team of matchup) {
            if (!team.points || team.points === 0) {
              allGamesComplete = false
              break
            }
          }
          if (!allGamesComplete) break
        }
        if (allGamesComplete) {
          standingsWeek = currentWeek
        }
      }

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

      standings.sort((a, b) => {
        if (b.currentRecord.wins !== a.currentRecord.wins) {
          return b.currentRecord.wins - a.currentRecord.wins
        }
        return b.currentPoints - a.currentPoints
      })

      return standings
    },

    // Get matchups for a specific week
    getMatchupsForWeek: (state) => {
      return (week) => state.allMatchups[week] || null
    },

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

    // Get roster for a specific week
    getWeekRoster: (state) => {
      return (week, rosterId) => {
        if (!state.weekRosters[week]) return null
        return state.weekRosters[week][rosterId] || null
      }
    },

    // Get all rosters for a week
    getWeekRosters: (state) => {
      return (week) => state.weekRosters[week] || {}
    },

    // Get enriched player
    getEnrichedPlayer: (state) => {
      return (playerId) => state.enrichedPlayers[playerId] || null
    },

    // Get player stats for a week
    getPlayerStatsByWeek: (state) => {
      return (week) => state.playerStatsByWeek[week] || {}
    },

    // Get player stats for specific player in a week
    getPlayerStatsForWeek: (state) => {
      return (playerId, week) => {
        const weekStats = state.playerStatsByWeek[week]
        return weekStats ? weekStats[playerId] : null
      }
    },

    // Get player season stats
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

    // Calculate record through a specific week
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

    // Get processed injuries by team
    getProcessedInjuriesByTeam: (state) => state.processedInjuriesByTeam,

    // Get processed transaction stats
    getProcessedTransactionStats: (state) => state.processedTransactionStats,

    // Check if NFL schedule is loaded
    isNFLScheduleFresh: (state) => {
      return state.nflSchedule !== null
    },

    // Get game info for a player in a specific week
    getPlayerGameInfo: (state) => {
      return (playerId, week) => {
        if (!state.nflSchedule || !state.nflSchedule.schedule) return null

        const player = state.players[playerId]
        if (!player || !player.team) return null

        const normalizedTeam = normalizeTeamCode(player.team)

        const game = state.nflSchedule.schedule.find(g =>
          String(g.week) === String(week) &&
          (g.home_team === normalizedTeam || g.away_team === normalizedTeam)
        )

        if (!game) return null

        const gameDate = new Date(game.game_date)
        const now = new Date()
        const isHome = game.home_team === normalizedTeam
        const opponent = isHome ? game.away_team : game.home_team

        let status = 'scheduled'
        if (game.winner) {
          status = 'final'
        } else if (now > gameDate) {
          const hoursSinceStart = (now - gameDate) / (1000 * 60 * 60)
          if (hoursSinceStart < 4) {
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

    // Get player weekly projection
    getPlayerWeeklyProjection: (state) => {
      return (playerId, week) => {
        const weekProjections = state.weeklyProjectionsByWeek[week]
        const player = state.players[playerId]
        if (!player) return null

        const playerName = player.full_name || `${player.first_name || ''} ${player.last_name || ''}`.trim()
        const playerKey = playerName.toLowerCase()

        if (weekProjections && weekProjections[playerKey]) {
          return weekProjections[playerKey]
        }

        // Fallback to season average
        const seasonStats = state.getPlayerSeasonStats(playerId)
        if (seasonStats && seasonStats.totalGames > 0) {
          return {
            playerId: playerId,
            name: playerName,
            team: player.team,
            position: player.position,
            projectedPoints: Math.round(seasonStats.averagePoints * 10) / 10,
            stats: null,
            source: 'season_average'
          }
        }

        // Position-based defaults
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
          source: 'position_default'
        }
      }
    },

    // Check if draft is loaded
    isDraftLoaded: (state) => {
      return state.draftPicks.length > 0
    },

    // Check if YouTube is loaded
    isYoutubeFresh: (state) => {
      return state.latestVideo !== null
    },

    // Get team badges
    getTeamBadges: (state) => {
      return (starterIds, week = null) => {
        if (!starterIds || !Array.isArray(starterIds)) return []

        const badges = []
        const checkWeek = week || state.league?.settings?.leg || null

        let hasOut = false
        let hasIR = false
        let hasDoubtful = false
        let hasQuestionable = false
        let hasSuspended = false
        let hasBye = false
        let hasEmpty = false

        // Get week-specific injury data if available
        const weekInjuryData = checkWeek ? state.injuriesByWeek[checkWeek] : null

        starterIds.forEach(playerId => {
          if (playerId === '0' || playerId === 0) {
            hasEmpty = true
            return
          }

          const enrichedPlayer = state.enrichedPlayers[playerId]
          const basePlayer = state.players[playerId]

          if (enrichedPlayer || basePlayer) {
            const player = enrichedPlayer || basePlayer

            // Check bye week
            if (checkWeek && player.team) {
              if (state.getByeWeekForTeam(player.team, checkWeek)) {
                hasBye = true
              }
            }

            // Check suspension
            if (enrichedPlayer?.is_suspended) {
              hasSuspended = true
            }

            // Check injury status - use week-specific data if available
            let statusToCheck = null
            if (weekInjuryData && player.full_name) {
              const playerName = player.full_name || `${player.first_name || ''} ${player.last_name || ''}`.trim()
              const weekInjury = getPlayerInjuryStatus(weekInjuryData, playerName)
              statusToCheck = weekInjury?.game_status?.toUpperCase()
            }

            // Fallback to enriched or base player injury status
            if (!statusToCheck) {
              statusToCheck = enrichedPlayer?.injury_status_combined?.toUpperCase() || basePlayer?.injury_status?.toUpperCase()
            }

            if (statusToCheck) {
              if (statusToCheck.includes('DOUBTFUL') || (statusToCheck.includes('D ') || statusToCheck === 'D') && !statusToCheck.includes('SUSPENDED')) {
                hasDoubtful = true
              } else if (statusToCheck.includes('INJURED RESERVE') || statusToCheck.includes('IR')) {
                hasIR = true
              } else if (statusToCheck.includes('OUT')) {
                hasOut = true
              } else if (statusToCheck.includes('QUESTIONABLE') || statusToCheck.includes('Q ') || statusToCheck === 'Q' || statusToCheck.includes('PUP') || statusToCheck.includes('PHYSICALLY UNABLE')) {
                hasQuestionable = true
              }
            }
          }
        })

        if (hasEmpty) badges.push({ type: 'empty', label: 'EMPTY', color: 'bg-red-600' })
        if (hasBye) badges.push({ type: 'bye', label: 'BYE', color: 'bg-gray-600' })
        if (hasSuspended) badges.push({ type: 'suspended', label: 'SUSP', color: 'bg-purple-600' })
        if (hasOut) badges.push({ type: 'out', label: 'O', color: 'bg-red-600' })
        if (hasIR) badges.push({ type: 'ir', label: 'IR', color: 'bg-red-600' })
        if (hasDoubtful) badges.push({ type: 'doubtful', label: 'D', color: 'bg-orange-500' })
        if (hasQuestionable) badges.push({ type: 'questionable', label: 'Q', color: 'bg-yellow-500' })

        return badges
      }
    }
  },

  actions: {
    /**
     * Main initialization method - call this from components
     * Shows cached data immediately, then loads/refreshes in background
     */
    async initialize(forceRefresh = false) {
      console.log('[INIT] initialize() called, forceRefresh:', forceRefresh, 'cacheVersion:', this.cacheVersion, 'CACHE_VERSION:', CACHE_VERSION)

      // CRITICAL: Always reset runtime flags first to prevent deadlocks from persisted state
      // This must be the FIRST thing we do before any other checks
      if (this.isInitializing || this.isRefreshing) {
        console.log('⚠️ Detected persisted runtime flags - resetting to prevent deadlock')
        this.isInitializing = false
        this.isRefreshing = false
      }

      // Check cache version first - if it doesn't match, clear everything
      if (this.cacheVersion !== CACHE_VERSION) {
        console.log(`🗑️ Cache version mismatch (stored: ${this.cacheVersion}, current: ${CACHE_VERSION}). Clearing cache...`)
        this.clearCache()
        this.cacheVersion = CACHE_VERSION
        forceRefresh = true
      }

      // If we have cached data and not forcing refresh, return it immediately
      if (!forceRefresh && this.league && this.rosters.length > 0) {
        console.log('📦 Using cached data - showing immediately')

        // Load NFL schedule if not loaded (needed for bye badges)
        if (!this.nflSchedule) {
          console.log('🌐 NFL schedule missing from cache, loading...')
          this.loadNFLSchedule()
        }

        // Check if we need to refresh (older than 5 minutes)
        const REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes
        const needsRefresh = !this.lastFullLoad || (Date.now() - this.lastFullLoad > REFRESH_INTERVAL)

        if (needsRefresh) {
          console.log('🔄 Background refresh triggered')
          this.refreshCurrentWeek() // Non-blocking background refresh
        }

        return
      }

      // First time load or force refresh
      this.isInitializing = true
      this.errors = {}

      try {
        console.log('🚀 Initializing league data...')

        // PHASE 1: Load core data in parallel
        console.log('📊 Phase 1: Loading core data (league + players)...')
        const [leagueData, players] = await Promise.all([
          getLeagueData(),
          getRelevantPlayers(Object.keys(this.players).length === 0)
        ])

        this.league = leagueData.league
        this.rosters = leagueData.rosters
        this.users = leagueData.users
        this.players = players
        this.currentWeek = this.league?.settings?.leg || 1

        // PHASE 2: Load all weeks in parallel
        console.log('📊 Phase 2: Loading all 18 weeks in parallel...')
        console.log(`Current week: ${this.currentWeek}, Completed weeks: ${this.completedWeeks.join(', ')}`)
        const weekPromises = []
        for (let week = 1; week <= 18; week++) {
          // Skip completed weeks that we already have
          if (this.completedWeeks.includes(week) && this.allMatchups[week] && !forceRefresh) {
            console.log(`📦 Skipping week ${week} - already completed and cached`)
            continue
          }

          console.log(`➕ Queuing week ${week} for loading`)
          weekPromises.push(this.loadWeekData(week))
        }

        console.log(`⏳ Waiting for ${weekPromises.length} weeks to load...`)
        await Promise.all(weekPromises)
        console.log(`✅ All ${weekPromises.length} weeks loaded`)

        // Mark past weeks as completed
        for (let week = 1; week < this.currentWeek; week++) {
          if (!this.completedWeeks.includes(week)) {
            this.completedWeeks.push(week)
          }
        }
        console.log(`✅ Marked weeks 1-${this.currentWeek - 1} as completed`)
        console.log(`📊 Total matchups loaded: ${Object.keys(this.allMatchups).length} weeks`)

        // PHASE 3: Load supplementary data
        // NFL Schedule needs to be loaded before badges can show bye weeks
        console.log('📊 Phase 3: Loading supplementary data...')
        await Promise.all([
          this.loadNFLSchedule(),
          this.loadDraft(),
          this.loadYoutube(),
          this.loadEnrichedPlayers()
        ]).catch(err => {
          console.error('Error loading supplementary data:', err)
        })

        this.lastFullLoad = Date.now()
        console.log('✅ Initialization complete')
      } catch (error) {
        console.error('❌ Error initializing league data:', error)
        this.errors.initialization = error.message
        throw error
      } finally {
        this.isInitializing = false
      }
    },

    /**
     * Load data for a specific week
     */
    async loadWeekData(week) {
      try {
        console.log(`🌐 Loading week ${week}...`)

        // Load matchups for this week
        const matchups = await getMatchups(week)

        // Build roster map
        const rosterMap = {}
        this.rosters.forEach(roster => {
          rosterMap[roster.roster_id] = roster
        })

        // Process matchups
        const matchupGroups = {}
        const weekRosterData = {}
        const weekPlayerStats = {}

        for (const matchup of matchups) {
          // Enrich player data
          let enrichedPlayers = null
          if (matchup.players_points) {
            enrichedPlayers = await enrichPlayerData(matchup.players_points, this.players)
          }

          // Calculate bench players
          const benchPlayers = matchup.players ?
            matchup.players.filter(playerId => !matchup.starters?.includes(playerId)) : []

          // Build player stats
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

          // Store roster data
          if (matchup.roster_id) {
            const baseRoster = rosterMap[matchup.roster_id]
            const user = baseRoster?.user
            const teamInfo = user?.display_name ? getTeamInfo(user.display_name) : null

            weekRosterData[matchup.roster_id] = {
              roster_id: matchup.roster_id,
              owner_id: baseRoster?.owner_id || null,
              user: user || null,
              teamInfo: teamInfo,
              settings: baseRoster?.settings || {},
              players: matchup.players || [],
              starters: matchup.starters || [],
              bench: benchPlayers,
              taxi: baseRoster?.taxi || [],
              reserve: baseRoster?.reserve || [],
              players_points: matchup.players_points || {},
              points: matchup.points || 0,
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
            bench: benchPlayers,
            enrichedPlayers
          })
        }

        this.weekRosters[week] = weekRosterData
        this.playerStatsByWeek[week] = weekPlayerStats
        this.allMatchups[week] = Object.values(matchupGroups)

        console.log(`✅ Week ${week} loaded`)
      } catch (error) {
        console.error(`❌ Error loading week ${week}:`, error)
        this.errors[`week_${week}`] = error.message
      }
    },

    /**
     * Refresh only the current week (background refresh)
     */
    async refreshCurrentWeek() {
      if (this.isRefreshing) return

      this.isRefreshing = true

      try {
        console.log('🔄 Refreshing current week...')

        // Refresh league data to get latest current week
        const leagueData = await getLeagueData()
        this.league = leagueData.league
        this.rosters = leagueData.rosters
        this.users = leagueData.users
        this.currentWeek = this.league?.settings?.leg || 1

        // Refresh current week data
        await this.loadWeekData(this.currentWeek)

        this.lastFullLoad = Date.now()
        console.log('✅ Current week refreshed')
      } catch (error) {
        console.error('❌ Error refreshing current week:', error)
      } finally {
        this.isRefreshing = false
      }
    },

    /**
     * Load NFL schedule
     */
    async loadNFLSchedule() {
      try {
        if (this.nflSchedule) {
          console.log('📦 NFL schedule already loaded, games:', this.nflSchedule.schedule?.length || 0)
          return
        }
        console.log('🌐 Loading NFL schedule...')
        this.nflSchedule = await getNFLSchedule()
        console.log('✅ NFL schedule loaded successfully! Games:', this.nflSchedule?.schedule?.length || 0)
        if (this.nflSchedule?.schedule) {
          console.log('Sample week 7 games:', this.nflSchedule.schedule.filter(g => String(g.week) === '7').map(g => `${g.away_team}@${g.home_team}`))
        }
      } catch (error) {
        console.error('❌ Error loading NFL schedule:', error)
        this.errors.nflSchedule = error.message
      }
    },

    /**
     * Load draft data
     */
    async loadDraft() {
      try {
        if (this.draftPicks.length > 0) {
          console.log('📦 Draft already loaded')
          return
        }
        console.log('🌐 Loading draft...')
        const response = await fetch('/data/draft_picks.json')
        if (!response.ok) throw new Error('Failed to load draft picks')
        this.draftPicks = await response.json()
      } catch (error) {
        console.error('❌ Error loading draft:', error)
        this.errors.draft = error.message
      }
    },

    /**
     * Load YouTube data
     */
    async loadYoutube() {
      try {
        if (this.latestVideo) {
          console.log('📦 YouTube already loaded')
          return
        }
        console.log('🌐 Loading YouTube...')
        const data = await getLatestVideoAndShorts()
        this.latestVideo = data.latestVideo
        this.latestShorts = data.latestShorts
      } catch (error) {
        console.error('❌ Error loading YouTube:', error)
        this.errors.youtube = error.message
      }
    },

    /**
     * Load enriched players
     */
    async loadEnrichedPlayers() {
      try {
        if (Object.keys(this.enrichedPlayers).length > 0) {
          console.log('📦 Enriched players already loaded')
          return
        }
        console.log('🌐 Loading enriched players...')

        const currentWeek = this.currentWeek || 1
        const injuryData = await getInjuries(currentWeek)

        const draftDataBySleeperId = {}
        this.draftPicks.forEach(pick => {
          if (pick.sleeper_id) {
            draftDataBySleeperId[pick.sleeper_id] = pick
          }
        })

        const enriched = {}

        Object.entries(this.players).forEach(([playerId, player]) => {
          try {
            const draftInfo = draftDataBySleeperId[playerId]
            const playerName = player.full_name || `${player.first_name || ''} ${player.last_name || ''}`.trim()
            const injuryInfo = playerName ? getPlayerInjuryStatus(injuryData, playerName) : null

            enriched[playerId] = {
              ...player,
              height: player.height || draftInfo?.height || null,
              weight: player.weight || draftInfo?.weight || null,
              age: player.age || draftInfo?.age || null,
              college: player.college || draftInfo?.college || null,
              years_exp: player.years_exp !== undefined ? player.years_exp : draftInfo?.years_exp || null,
              portrait_url: draftInfo?.portrait_url || `https://sleepercdn.com/content/nfl/players/${playerId}.jpg`,
              vorp: draftInfo?.vorp || 0,
              ros: draftInfo?.ros || 0,
              adp: draftInfo?.adp || 999,
              fantasy_points_2024: draftInfo?.fantasy_points_2024 || 0,
              projected_points_2025: draftInfo?.projected_points_2025 || 0,
              injury_from_ffn: injuryInfo,
              injury_indicator: getInjuryIndicator(injuryInfo) || getInjuryIndicator({ game_status: player.injury_status }),
              injury_status_combined: injuryInfo?.game_status || player.injury_status || null,
              injury_notes: injuryInfo?.notes || player.injury_notes || null,
              is_suspended: player.status === 'Sus' || player.injury_status === 'Sus',
              is_available: !injuryInfo && player.status === 'Active'
            }
          } catch (err) {
            console.error(`Error enriching player ${playerId}:`, err)
            enriched[playerId] = {
              ...player,
              portrait_url: `https://sleepercdn.com/content/nfl/players/${playerId}.jpg`,
              vorp: 0,
              ros: 0,
              adp: 999
            }
          }
        })

        this.enrichedPlayers = enriched
      } catch (error) {
        console.error('❌ Error loading enriched players:', error)
        this.errors.enrichedPlayers = error.message
      }
    },

    /**
     * Helper: Check if team is on bye for a specific week
     */
    getByeWeekForTeam(team, week) {
      if (!team || !week) {
        console.log(`[BYE] Missing team (${team}) or week (${week})`)
        return false
      }

      if (!this.nflSchedule || !this.nflSchedule.schedule) {
        console.warn(`[BYE] NFL schedule not loaded! nflSchedule: ${!!this.nflSchedule}, schedule: ${!!this.nflSchedule?.schedule}`)
        return false
      }

      const normalizedTeam = normalizeTeamCode(team)

      const hasGame = this.nflSchedule.schedule.some(game =>
        String(game.week) === String(week) &&
        (game.home_team === normalizedTeam || game.away_team === normalizedTeam)
      )

      console.log(`[BYE] Team ${team} (normalized: ${normalizedTeam}), Week ${week}: hasGame=${hasGame}, onBye=${!hasGame}`)

      return !hasGame
    },

    /**
     * Fetch transactions for a specific week (on-demand)
     */
    async fetchTransactionsForWeek(week) {
      // Only use cached data for completed weeks
      // For current/recent weeks, always fetch fresh data
      const currentWeek = this.league?.settings?.leg || 18
      const isWeekCompleted = week < currentWeek - 1

      if (this.transactionsByWeek[week] && isWeekCompleted) {
        return this.transactionsByWeek[week]
      }

      try {
        console.log(`🌐 Loading transactions for week ${week}...`)
        const trans = await getTransactions(week)

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

        const enhancedTransactions = (trans || []).map(transaction => {
          const rosterId = transaction.roster_ids?.[0]
          const roster = rosterId ? rosterMap[rosterId] : null

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

        this.transactionsByWeek[week] = enhancedTransactions
        return enhancedTransactions
      } catch (error) {
        console.error(`❌ Error loading transactions for week ${week}:`, error)
        this.transactionsByWeek[week] = []
        return []
      }
    },

    /**
     * Fetch injuries for a specific week (on-demand)
     */
    async fetchInjuriesForWeek(week) {
      // Only use cached data for completed weeks
      // For current/recent weeks, always fetch fresh data
      const currentWeek = this.league?.settings?.leg || 18
      const isWeekCompleted = week < currentWeek - 1

      if (this.injuriesByWeek[week] && isWeekCompleted) {
        return this.injuriesByWeek[week]
      }

      try {
        console.log(`🌐 Loading injuries for week ${week}...`)
        const injuryData = await getInjuries(week)
        this.injuriesByWeek[week] = injuryData
        return injuryData
      } catch (error) {
        console.error(`❌ Error loading injuries for week ${week}:`, error)
        this.injuriesByWeek[week] = {}
        return {}
      }
    },

    /**
     * Fetch projections for a specific week (on-demand)
     */
    async fetchWeeklyProjectionsForWeek(week) {
      if (this.weeklyProjectionsByWeek[week]) {
        return this.weeklyProjectionsByWeek[week]
      }

      try {
        console.log(`🌐 Loading projections for week ${week}...`)
        const projectionsData = await getWeeklyProjections(week)
        this.weeklyProjectionsByWeek[week] = projectionsData
        return projectionsData
      } catch (error) {
        console.error(`❌ Error loading projections for week ${week}:`, error)
        this.weeklyProjectionsByWeek[week] = {}
        return {}
      }
    },

    /**
     * Process injuries data (on-demand)
     */
    async processInjuriesData(maxWeek) {
      if (Object.keys(this.processedInjuriesByTeam).length > 0) {
        return this.processedInjuriesByTeam
      }

      try {
        console.log('🌐 Processing injuries data...')
        const transformedInjuries = {}

        for (let week = 1; week <= Math.min(maxWeek, 18); week++) {
          const weekInjuries = await this.fetchInjuriesForWeek(week)
          const injuriesByTeam = {}

          if (this.rosters && this.rosters.length > 0) {
            this.rosters.forEach(roster => {
              if (roster.user?.display_name) {
                const teamInfo = getTeamInfo(roster.user.display_name)
                const teamName = teamInfo.aiModel
                const teamInjuries = []

                const allPlayerIds = new Set([
                  ...(roster.players || []),
                  ...(roster.starters || []),
                  ...(roster.taxi || []),
                  ...(roster.reserve || [])
                ])

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
        return transformedInjuries
      } catch (error) {
        console.error('❌ Error processing injuries data:', error)
        return this.processedInjuriesByTeam
      }
    },

    /**
     * Process transaction stats (on-demand)
     */
    async processTransactionStats(maxWeek) {
      try {
        console.log('🌐 Processing transaction stats...')
        const byWeek = {}
        const byTeam = {}
        const byTeamForWeek = {}

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

        for (let week = 1; week <= Math.min(maxWeek, 18); week++) {
          const weekTransactions = await this.fetchTransactionsForWeek(week)
          byWeek[week] = weekTransactions.length
          byTeamForWeek[week] = {}

          Object.keys(byTeam).forEach(teamName => {
            byTeamForWeek[week][teamName] = 0
            byTeam[teamName].byWeek[week] = 0
          })

          weekTransactions.forEach(transaction => {
            if (transaction.roster_ids && transaction.roster_ids.length > 0) {
              transaction.roster_ids.forEach(rosterId => {
                const roster = this.rosters?.find(r => r.roster_id === rosterId)
                if (roster && roster.user?.display_name) {
                  const teamInfo = getTeamInfo(roster.user.display_name)
                  const teamName = teamInfo.aiModel

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
        return stats
      } catch (error) {
        console.error('❌ Error processing transaction stats:', error)
        return this.processedTransactionStats
      }
    },

    /**
     * Clear all cached data
     */
    clearCache() {
      this.league = null
      this.rosters = []
      this.users = []
      this.currentWeek = null
      this.players = {}
      this.enrichedPlayers = {}
      this.allMatchups = {}
      this.playerStatsByWeek = {}
      this.weekRosters = {}
      this.transactionsByWeek = {}
      this.injuriesByWeek = {}
      this.weeklyProjectionsByWeek = {}
      this.nflSchedule = null
      this.draftPicks = []
      this.latestVideo = null
      this.latestShorts = []
      this.processedInjuriesByTeam = {}
      this.processedTransactionStats = { byWeek: {}, byTeam: {}, byTeamForWeek: {} }
      this.lastFullLoad = null
      this.completedWeeks = []
      this.errors = {}
    }
  },

  // Enable persistence with localStorage
  // NOTE: Do NOT persist isInitializing or isRefreshing - these are runtime flags only
  persist: {
    key: 'tokenbowl-league-oct2025',
    paths: [
      'cacheVersion',
      'league',
      'rosters',
      'users',
      'currentWeek',
      'players',
      'enrichedPlayers',
      'allMatchups',
      'playerStatsByWeek',
      'weekRosters',
      'transactionsByWeek',
      'injuriesByWeek',
      'weeklyProjectionsByWeek',
      'nflSchedule',
      'draftPicks',
      'latestVideo',
      'latestShorts',
      'processedInjuriesByTeam',
      'processedTransactionStats',
      'lastFullLoad',
      'completedWeeks'
      // isInitializing and isRefreshing are intentionally excluded - runtime state only
    ],
    // CRITICAL: Reset runtime flags after restoring from cache to prevent deadlocks
    afterRestore: (ctx) => {
      ctx.store.isInitializing = false
      ctx.store.isRefreshing = false
    }
  }
})
