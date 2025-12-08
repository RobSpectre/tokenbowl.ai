import { defineStore } from 'pinia'
import { getLeagueData, getRelevantPlayers, getMatchups, getTransactions, getLeague, getWinnersBracket, getLosersBracket } from '../sleeperApi.js'
import { getTeamInfo } from '../teamMappings.js'
import { getLatestVideoAndShorts } from '../youtubeApi.js'
import { getInjuries, getPlayerInjuryStatus, getInjuryIndicator, getWeeklyProjections, getNFLSchedule } from '../fantasyNerdsApi.js'
import { getPlayers as getPlayersFromService, enrichPlayerData } from '../utils/playerService.js'

// Cache version - increment when making breaking changes to data structure
// Bumped to v17 to remove dynamic data (injuries/projections/transactions) from localStorage
// Bumped to v19 to force refresh for week 13 update
// Bumped to v20 to fix stale Week 13 scores (0 points) for returning users
// Bumped to v21 to fix stuck injury processing promise for returning users
const CACHE_VERSION = 21 // v21: Fix stuck injury charts

// Team code normalization mapping
const normalizeTeamCode = (code) => {
  const teamMappings = {
    'JAX': 'JAC',
    'WSH': 'WAS'
  }
  return teamMappings[code] || code
}

// Helper to normalize player names for matching
export const normalizePlayerName = (name) => {
  if (!name) return ''
  return name.toLowerCase()
    .replace(/ jr\.?$/i, '')
    .replace(/ sr\.?$/i, '')
    .replace(/ ii$/i, '')
    .replace(/ iii$/i, '')
    .replace(/ iv$/i, '')
    .replace(/[^a-z0-9\s]/g, '') // Remove punctuation
    .trim()
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

    // Win Probabilities (centralized for consistency)
    winProbabilities: {},         // { matchupId: probabilityData }

    // Playoff Brackets
    winnersBracket: null,
    losersBracket: null,

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

    // Processing locks to prevent concurrent processing
    _injuriesProcessingPromise: null,
    _transactionsProcessingPromise: null,

    // Simple caching - just track when we last loaded the full season
    lastFullLoad: null,
    completedWeeks: [], // Weeks that are finalized and will never change

    // Initialization State Machine
    // States: 'idle' -> 'initializing' -> 'ready' (or 'error')
    // 'refreshing' is a sub-state of 'ready' for background updates
    initState: 'idle',

    // The current initialization promise - allows components to await completion
    // This is the KEY to preventing race conditions
    _initPromise: null,

    // Legacy flags (kept for backward compatibility during transition)
    isInitializing: false,
    isRefreshing: false,

    // Error tracking
    errors: {}
  }),

  getters: {
    // Single source of truth for whether CORE data is ready for UI rendering
    // This allows fast initial render - charts handle their own data dependencies
    isDataReady() {
      return this.league !== null &&
        this.rosters.length > 0 &&
        this.currentWeek !== null &&
        this.winnersBracket !== null &&
        this.losersBracket !== null
    },

    // Whether ALL initialization is complete (including chart data processing)
    isFullyInitialized() {
      return this.initState === 'ready'
    },

    // Get initialization error
    initError: (state) => state.errors['init'],

    // Get current week from league settings
    currentLeagueWeek() {
      return this.league?.settings?.leg || 1
    },

    // Check if a week is completed (before current week)
    isWeekCompleted: (state) => {
      return (week) => {
        const currentWeek = state.league?.settings?.leg || 17
        return week < currentWeek
      }
    },

    // Get standings
    standings: (state) => state.rosters,

    // Get current standings with calculated records
    currentStandings() {
      if (!this.league || !this.rosters || this.rosters.length === 0) return []

      // Use the actual wins/losses from the Sleeper API roster data
      // The API provides up-to-date records that account for all completed games
      const standings = this.rosters.map(roster => {
        // Use settings.wins/losses from the API, or fallback to 0 if not available
        const wins = roster.settings?.wins || 0
        const losses = roster.settings?.losses || 0
        const ties = roster.settings?.ties || 0
        // Use calculated points to ensure consistency with the points graph
        // The API's fpts field is sometimes rounded or stale
        const totalPoints = this.getPointsThroughWeek(roster.roster_id, this.currentLeagueWeek)

        return {
          ...roster,
          currentRecord: { wins, losses, ties },
          currentPoints: totalPoints
        }
      })

      // Sort by wins descending, then by total points descending
      standings.sort((a, b) => {
        if (b.currentRecord.wins !== a.currentRecord.wins) {
          return b.currentRecord.wins - a.currentRecord.wins
        }
        return b.currentPoints - a.currentPoints
      })

      return standings
    },

    // Get playoff picture
    playoffPicture() {
      if (!this.currentStandings || this.currentStandings.length === 0) return { seeds: [], hunt: [] }

      const numPlayoffTeams = this.league?.settings?.playoff_teams || 6
      const standings = [...this.currentStandings]

      // Top N teams are in
      const seeds = standings.slice(0, numPlayoffTeams).map((team, index) => ({
        ...team,
        seed: index + 1,
        status: 'projected' // TODO: Add logic for 'clinched'
      }))

      // Next 4 teams are in the hunt
      const hunt = standings.slice(numPlayoffTeams, numPlayoffTeams + 4).map((team, index) => ({
        ...team,
        gamesBack: 0 // TODO: Calculate games back
      }))

      return { seeds, hunt }
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

        // Fix timezone issue: API returns ET time without timezone
        // If we parse it directly, it might be treated as UTC, shifting it 5 hours earlier
        // This causes games to be marked as "Final" immediately at kickoff
        let gameDateStr = game.game_date
        if (gameDateStr && typeof gameDateStr === 'string' && !gameDateStr.includes('Z') && !gameDateStr.includes('+') && (gameDateStr.match(/-/g) || []).length < 3) {
          // Append EST offset (-05:00)
          // Note: This assumes standard time (Nov-Mar), which covers Thanksgiving
          gameDateStr = gameDateStr.replace(' ', 'T') + '-05:00'
        }
        const gameDate = new Date(gameDateStr)
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

    // Get win probability for a matchup
    getWinProbability: (state) => {
      return (matchupId) => state.winProbabilities[matchupId] || null
    },

    // Get team badges
    getTeamBadges: (state) => {
      return (starterIds, week = null, maxPositions = null) => {
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

        // ALWAYS use current week injury data (not historical week)
        // Users want to see current player status, not what it was in past weeks
        const currentWeek = state.league?.settings?.leg || null
        const weekInjuryData = currentWeek ? state.injuriesByWeek[currentWeek] : null

        // Limit to specific positions if specified (e.g., first 9 for starters only, excluding kicker)
        const playersToCheck = maxPositions
          ? starterIds.slice(0, maxPositions)
          : starterIds

        playersToCheck.forEach(playerId => {
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

              // Try exact match first
              let weekInjury = getPlayerInjuryStatus(weekInjuryData, playerName)

              // If not found, try normalized match
              if (!weekInjury) {
                const normalizedName = normalizePlayerName(playerName)
                // We need to iterate through injury map keys since they might not be normalized in the map
                // But getPlayerInjuryStatus expects exact key match (lowercase)
                // So we should probably normalize keys in getInjuries or iterate here.
                // Iterating here is safer for now.
                const injuryKeys = Object.keys(weekInjuryData)
                for (const key of injuryKeys) {
                  if (normalizePlayerName(key) === normalizedName) {
                    weekInjury = weekInjuryData[key]
                    break
                  }
                }
              }

              statusToCheck = weekInjury?.game_status?.toUpperCase()
              // If we have current week injury data and player is NOT in it, they're healthy
              // Don't fall back to stale enrichedPlayer data
            } else {
              // Only use enriched/base player status if we don't have current week injury data
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
    },

    // Get bracket matchup info
    getBracketMatchup: (state) => {
      return (rosterId1, rosterId2) => {
        if (!state.winnersBracket && !state.losersBracket) {
          return null
        }

        // Only show bracket info if we are in the playoffs
        const playoffStart = state.league?.settings?.playoff_week_start || 15
        if (state.currentWeek < playoffStart) {
          return null
        }
        if (!rosterId1 || !rosterId2) return null

        // Helper to check if a bracket match contains these two rosters
        const isMatch = (m) => {
          return (m.t1 === rosterId1 && m.t2 === rosterId2) ||
            (m.t1 === rosterId2 && m.t2 === rosterId1)
        }

        // Check winners bracket
        if (state.winnersBracket) {
          const winnerMatch = state.winnersBracket.find(isMatch)
          if (winnerMatch) return { ...winnerMatch, type: 'winners' }
        }

        // Check losers bracket
        if (state.losersBracket) {
          const loserMatch = state.losersBracket.find(isMatch)
          if (loserMatch) return { ...loserMatch, type: 'losers' }
        }

        return null
      }
    }
  },

  actions: {
    /**
     * Fetch playoff brackets
     */
    async fetchBrackets() {
      try {
        const [winners, losers] = await Promise.all([
          getWinnersBracket(),
          getLosersBracket()
        ])
        this.winnersBracket = winners
        this.losersBracket = losers
        return true
      } catch (error) {
        console.error('Error fetching brackets:', error)
        return false
      }
    },

    /**
     * Fetch all players
     */
    async fetchPlayers() {
      try {
        // console.log('🏈 Fetching players...')
        const players = await getRelevantPlayers()
        this.players = players
        return true
      } catch (error) {
        console.error('Error fetching players:', error)
        return false
      }
    },

    /**
     * Load static data for completed weeks
     * This improves initial load time by avoiding many API calls
     */
    async loadStaticData() {
      try {
        console.log('📦 Loading static data for completed weeks...')
        const response = await fetch('/data/completed-weeks.json')
        if (!response.ok) {
          console.warn('⚠️ No static data found (this is normal for dev/first run)')
          return false
        }

        const staticData = await response.json()

        // Validate data structure
        if (!staticData.weeks) return false

        // Populate store with static data
        Object.entries(staticData.weeks).forEach(([weekStr, data]) => {
          const week = parseInt(weekStr)

          // Only load if we don't have it or if we want to ensure it's marked completed
          this.allMatchups[week] = data.matchups
          this.weekRosters[week] = data.weekRosters
          this.playerStatsByWeek[week] = data.playerStats

          if (!this.completedWeeks.includes(week)) {
            this.completedWeeks.push(week)
          }
        })

        // console.log(`✅ Loaded static data for weeks: ${this.completedWeeks.join(', ')}`)
        return true
      } catch (error) {
        console.error('❌ Error loading static data:', error)
        return false
      }
    },


    /**
     * Main initialization method - call this from components
     * Shows cached data immediately, then loads/refreshes in background
     */
    /**
     * Main initialization method - call this from components
     * Shows cached data immediately, then loads/refreshes in background
     */
    /**
     * Initialize the store - THE SINGLE ENTRY POINT for all data loading
     *
     * This method uses a state machine to prevent race conditions:
     * - 'idle' -> 'initializing' -> 'ready' (or 'error')
     *
     * KEY FEATURE: Returns a promise that resolves when ALL initialization is complete.
     * Multiple concurrent calls will return the same promise (no duplicate work).
     *
     * Components should: await leagueStore.initialize()
     * After awaiting, ALL data (including processed injuries/transactions) is ready.
     */
    async initialize(forceRefresh = false) {
      console.log(`[INIT] initialize() called. State: ${this.initState}, forceRefresh: ${forceRefresh}`)

      // CRITICAL: Check cache version FIRST - before any early returns
      // This ensures returning users with old cache get a fresh start
      if (this.cacheVersion !== CACHE_VERSION) {
        console.log(`🗑️ Cache version mismatch (stored: ${this.cacheVersion}, current: ${CACHE_VERSION}). Clearing cache...`)
        this.clearCache()
        this.cacheVersion = CACHE_VERSION
        forceRefresh = true
        // Reset state to ensure we don't hit early returns
        this.initState = 'idle'
        this._initPromise = null
      }

      // If already ready and not forcing refresh, return immediately
      if (this.initState === 'ready' && !forceRefresh) {
        console.log('[INIT] Already ready, starting background refresh')
        // Start background refresh but don't wait for it
        this._backgroundRefresh()
        return
      }

      // If already initializing, return the existing promise (prevents duplicate work)
      if (this.initState === 'initializing' && this._initPromise) {
        console.log('[INIT] Already initializing, returning existing promise')
        return this._initPromise
      }

      // Clear any previous errors
      this.errors['init'] = null

      // Determine if we can use cached data
      const hasCachedData = !forceRefresh && this.league && this.rosters.length > 0

      // Create and store the initialization promise
      this._initPromise = this._doInitialize(hasCachedData)

      // Return the promise so callers can await it
      return this._initPromise
    },

    /**
     * Internal initialization implementation
     * Separated from initialize() to cleanly manage the promise
     */
    async _doInitialize(useCachedData) {
      // Set state to initializing
      this.initState = 'initializing'
      this.isInitializing = true // Legacy flag for backward compatibility

      try {
        if (useCachedData) {
          console.log('[INIT] Using cached data path')
          await this._initializeFromCache()
        } else {
          console.log('[INIT] Using fresh data path')
          await this._initializeFresh()
        }

        // ALL initialization complete - NOW set ready
        this.initState = 'ready'
        console.log('✅ [INIT] Initialization complete. State: ready')

        // Start background refresh (fire-and-forget) to check for week changes
        // This runs for both cached and fresh paths to ensure data stays current
        this._backgroundRefresh()

      } catch (error) {
        console.error('❌ [INIT] Initialization failed:', error)
        this.initState = 'error'
        this.errors['init'] = error.message || 'Failed to initialize league data'
        throw error
      } finally {
        this.isInitializing = false // Legacy flag
        this._initPromise = null // Clear promise so future calls start fresh
      }
    },

    /**
     * Initialize from cached data - fills in any missing pieces
     */
    async _initializeFromCache() {
      // Load NFL schedule if missing
      if (!this.nflSchedule) {
        this.loadNFLSchedule()
      }

      // Ensure brackets are loaded
      if (!this.winnersBracket || !this.losersBracket) {
        await this.fetchBrackets()
      }

      // Ensure static data is loaded (historical weeks for charts)
      if (!this.allMatchups[1]) {
        console.log('📦 Historical matchups missing, loading static data...')
        await this.loadStaticData()
      }

      // CRITICAL: Always process transaction and injury stats
      // Even if cached, we need these for charts
      if (!this.processedTransactionStats.byWeek || Object.keys(this.processedTransactionStats.byWeek).length === 0) {
        console.log('📊 Transaction stats missing, processing...')
        await this.processTransactionStats(this.currentWeek)
      }

      if (!this.processedInjuriesByTeam[`week${this.currentWeek}`]) {
        console.log('🏥 Injuries data missing, processing...')
        await this.processInjuriesData(this.currentWeek)
      }

      // Ensure enriched players are loaded
      if (Object.keys(this.enrichedPlayers).length === 0) {
        if (!this.processedInjuriesByTeam[`week${this.currentWeek}`]) {
          await this.fetchInjuriesForWeek(this.currentWeek)
        }
        await this.loadEnrichedPlayers()
      }
    },

    /**
     * Fresh initialization - load everything from API
     */
    async _initializeFresh() {
      // 1. Load League Data (REQUIRED - fail fast if this fails)
      console.log('[INIT] Step 1: Loading league data...')
      try {
        const leagueData = await getLeagueData()
        this.league = leagueData.league
        this.rosters = leagueData.rosters
        this.users = leagueData.users
        this.currentWeek = this.league?.settings?.leg || 1
      } catch (e) {
        throw new Error(`League Data Load Failed: ${e.message}`)
      }

      // 2. Load Brackets
      console.log('[INIT] Step 2: Loading brackets...')
      try {
        await this.fetchBrackets()
      } catch (e) {
        console.error('Bracket fetch failed:', e)
      }

      // 3. Load Players
      console.log('[INIT] Step 3: Loading players...')
      if (Object.keys(this.players).length === 0) {
        try {
          if (typeof this.fetchPlayers === 'function') {
            await this.fetchPlayers()
          } else {
            const players = await getRelevantPlayers()
            this.players = players
          }
        } catch (e) {
          console.error('Player fetch failed:', e)
        }
      }

      // 4. Load Static Data (historical weeks for charts)
      console.log('[INIT] Step 4: Loading static data...')
      try {
        await this.loadStaticData()
      } catch (e) {
        console.error('Static data load failed:', e)
      }

      // 5. Load Current Week Data
      console.log('[INIT] Step 5: Loading current week data...')
      try {
        await this.loadWeekData(this.currentWeek)
      } catch (e) {
        console.error('Week data load failed:', e)
      }

      // 6. Load Dynamic Data (injuries, projections, etc.)
      console.log('[INIT] Step 6: Loading dynamic data...')
      try {
        await this.refreshDynamicData()
      } catch (e) {
        console.error('Dynamic data refresh failed:', e)
      }

      // 7. Process Transaction and Injury Stats (for charts)
      // THIS IS CRITICAL - must complete before we're "ready"
      console.log('[INIT] Step 7: Processing stats for charts...')
      try {
        await this.processTransactionStats(this.currentWeek)
      } catch (e) {
        console.error('Transaction stats processing failed:', e)
      }

      try {
        await this.processInjuriesData(this.currentWeek)
      } catch (e) {
        console.error('Injuries data processing failed:', e)
      }

      this.lastFullLoad = Date.now()
    },

    /**
     * Background refresh - runs after initialization is complete
     * Checks for week changes and refreshes dynamic data
     */
    async _backgroundRefresh() {
      try {
        const leagueData = await getLeague()
        const remoteWeek = leagueData.settings.leg || 1

        if (remoteWeek !== this.currentWeek) {
          console.log(`🔄 Week advanced from ${this.currentWeek} to ${remoteWeek}. Forcing full refresh...`)
          this.refreshCurrentWeek()
        } else {
          this.refreshDynamicData()
          this.fetchBrackets()
        }
      } catch (e) {
        console.error('Background refresh failed:', e)
      }
    },



    /**
     * Ensure a specific week is loaded
     * Call this from pages that need specific week data
     */
    async ensureWeekLoaded(week) {
      // If we already have data for this week, do nothing
      if (this.allMatchups[week]) {
        return true
      }

      // Ensure core data (rosters/users) is loaded first
      // This prevents race conditions where matchups are loaded but can't be linked to rosters
      if (this.rosters.length === 0) {
        // console.log('⏳ Core data missing in ensureWeekLoaded, checking status...')

        if (!this.isInitializing && !this.isRefreshing) {
          // console.log('⚠️ Store not initializing, triggering initialization...')
          // Trigger initialization but don't await the whole thing (it loads current week)
          // We just need Phase 1 (core data) to complete
          this.initialize()
        }

        // Wait for rosters to be populated
        // console.log('⏳ Waiting for rosters to load...')
        let attempts = 0
        while (this.rosters.length === 0 && attempts < 50) { // 5 second timeout
          await new Promise(resolve => setTimeout(resolve, 100))
          attempts++
        }

        if (this.rosters.length === 0) {
          console.error('❌ Timed out waiting for rosters to load')
          return false
        }
      }

      // console.log(`🔄 On-demand loading for week ${week}...`)
      try {
        await this.loadWeekData(week)
        return true
      } catch (error) {
        console.error(`❌ Error ensuring week ${week} loaded:`, error)
        return false
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

        // Refresh player data (includes suspension status, injury status)
        const players = await getRelevantPlayers(false) // Force fetch
        this.players = players

        // Refresh current week data
        await this.loadWeekData(this.currentWeek)

        // CRITICAL: Refresh dynamic data (injuries, projections, transactions)
        // This will also re-enrich players with fresh data
        await this.refreshDynamicData()

        this.lastFullLoad = Date.now()
        console.log('✅ Current week refreshed with dynamic data and updated players')
      } catch (error) {
        console.error('❌ Error refreshing current week:', error)
      } finally {
        this.isRefreshing = false
      }
    },

    /**
     * Refresh dynamic data that changes frequently
     */
    async refreshDynamicData() {
      try {
        console.log('🔄 Refreshing dynamic data (injuries, projections, transactions)...')

        const currentWeek = this.currentWeek || 1
        const nextWeek = Math.min(currentWeek + 1, 17)

        // Refresh in parallel for better performance
        const promises = []

        // Always refresh injuries for current and next week
        promises.push(this.fetchInjuriesForWeek(currentWeek, true))  // force refresh
        if (nextWeek !== currentWeek) {
          promises.push(this.fetchInjuriesForWeek(nextWeek, true))
        }

        // Refresh projections for current week
        promises.push(this.fetchWeeklyProjectionsForWeek(currentWeek, true))

        // Refresh recent transactions
        promises.push(this.fetchTransactionsForWeek(currentWeek, true))

        // Wait for all dynamic data to refresh
        await Promise.all(promises)

        // Re-enrich players with fresh injury data
        await this.loadEnrichedPlayers(true)

        console.log('✅ Dynamic data refreshed')
      } catch (error) {
        console.error('❌ Error refreshing dynamic data:', error)
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
        // CRITICAL: Check if draftPicks is a valid array with data
        // This handles cases where cache might have corrupted data (null, undefined, or object)
        if (Array.isArray(this.draftPicks) && this.draftPicks.length > 0) {
          console.log('📦 Draft already loaded')
          return
        }
        console.log('🌐 Loading draft from /data/draft_picks.json...')
        const response = await fetch('/data/draft_picks.json')
        console.log('Draft fetch response:', response.status, response.statusText)
        if (!response.ok) throw new Error('Failed to load draft picks')
        const data = await response.json()
        console.log('Draft data loaded:', data?.length)
        // Ensure we only set valid array data
        this.draftPicks = Array.isArray(data) ? data : []
      } catch (error) {
        console.error('❌ Error loading draft:', error)
        this.errors.draft = error.message
        // Reset to empty array on error to allow retry
        this.draftPicks = []
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
    async loadEnrichedPlayers(forceRefresh = false) {
      try {
        // Skip cache check if forcing refresh
        if (!forceRefresh && Object.keys(this.enrichedPlayers).length > 0) {
          console.log('📦 Enriched players already loaded')
          return
        }
        console.log(`🌐 Loading enriched players... (force: ${forceRefresh})`)

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

            // Try exact match first
            let injuryInfo = playerName ? getPlayerInjuryStatus(injuryData, playerName) : null

            // If not found, try normalized match
            if (!injuryInfo && playerName) {
              const normalizedName = normalizePlayerName(playerName)
              const injuryKeys = Object.keys(injuryData)
              for (const key of injuryKeys) {
                if (normalizePlayerName(key) === normalizedName) {
                  injuryInfo = injuryData[key]
                  break
                }
              }
            }

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
    async fetchTransactionsForWeek(week, forceRefresh = false) {
      // Only use cached data for completed weeks (unless forcing refresh)
      // For current/recent weeks, always fetch fresh data
      const currentWeek = this.league?.settings?.leg || 17
      const isWeekCompleted = week < currentWeek - 1

      if (!forceRefresh && this.transactionsByWeek[week] && isWeekCompleted) {
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
    async fetchInjuriesForWeek(week, forceRefresh = false) {
      // Only use cached data for completed weeks (unless forcing refresh)
      // For current/recent weeks, always fetch fresh data
      const currentWeek = this.league?.settings?.leg || 17
      const isWeekCompleted = week < currentWeek - 1

      if (!forceRefresh && this.injuriesByWeek[week] && isWeekCompleted) {
        return this.injuriesByWeek[week]
      }

      try {
        console.log(`🌐 Loading injuries for week ${week}... (force: ${forceRefresh})`)
        // Add 15-second timeout to prevent hanging forever
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout fetching injuries for week ${week}`)), 15000)
        )
        const injuryData = await Promise.race([getInjuries(week), timeoutPromise])
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
    async fetchWeeklyProjectionsForWeek(week, forceRefresh = false) {
      if (!forceRefresh && this.weeklyProjectionsByWeek[week]) {
        return this.weeklyProjectionsByWeek[week]
      }

      try {
        console.log(`🌐 Loading projections for week ${week}... (force: ${forceRefresh})`)
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
     * Uses a lock to prevent concurrent processing race conditions
     */
    async processInjuriesData(maxWeek) {
      const targetWeek = Math.min(maxWeek, 17)

      // Check if data already exists
      if (this.processedInjuriesByTeam[`week${targetWeek}`]) {
        console.log(`🏥 Injuries data already exists for week ${targetWeek}`)
        return this.processedInjuriesByTeam
      }

      // If processing is already in progress, wait for it instead of starting a new one
      if (this._injuriesProcessingPromise) {
        console.log(`🔒 Injuries processing already in progress, waiting...`)
        return this._injuriesProcessingPromise
      }

      // Create a new processing promise and store it
      this._injuriesProcessingPromise = this._doProcessInjuriesData(targetWeek)

      try {
        const result = await this._injuriesProcessingPromise
        return result
      } finally {
        // Always clear the lock when done (success or failure)
        this._injuriesProcessingPromise = null
      }
    },

    /**
     * Internal method to actually process injuries data
     * Called by processInjuriesData with lock protection
     */
    async _doProcessInjuriesData(targetWeek) {
      try {
        console.log(`🌐 Processing injuries data for weeks 1-${targetWeek}...`)
        console.log(`📊 Rosters count: ${this.rosters?.length || 0}, Players count: ${Object.keys(this.players || {}).length}`)
        const transformedInjuries = {}

        for (let week = 1; week <= targetWeek; week++) {
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

          // Log count of injuries found per week
          const totalInjuriesThisWeek = Object.values(injuriesByTeam).reduce((sum, arr) => sum + arr.length, 0)
          if (totalInjuriesThisWeek > 0) {
            console.log(`🏥 Week ${week}: ${totalInjuriesThisWeek} injuries found across ${Object.keys(injuriesByTeam).length} teams`)
          }
        }

        console.log(`✅ Injuries processing complete. Total weeks: ${Object.keys(transformedInjuries).length}`)
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

        for (let week = 1; week <= Math.min(maxWeek, 17); week++) {
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
     * Set win probability for a matchup
     */
    setWinProbability(matchupId, probabilityData) {
      this.winProbabilities[matchupId] = probabilityData
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
      // Reset state machine
      this.initState = 'idle'
      this._initPromise = null
    }
  },

  // Enable persistence with localStorage
  // NOTE: Do NOT persist isInitializing or isRefreshing - these are runtime flags only
  // v17: Removed dynamic data (injuries, projections, transactions) to prevent stale data
  persist: {
    key: 'tokenbowl-league-oct2025',  // Keep same key, use CACHE_VERSION for versioning
    paths: [
      'cacheVersion',
      'league',
      'rosters',
      'users',
      'currentWeek',
      'players',
      // 'enrichedPlayers', // REMOVED - Contains injury data that becomes stale
      'allMatchups',
      'playerStatsByWeek',
      'weekRosters',
      // 'transactionsByWeek', // REMOVED - Changes frequently
      // 'injuriesByWeek', // REMOVED - Dynamic injury data
      // 'weeklyProjectionsByWeek', // REMOVED - Changes daily
      'nflSchedule',
      'draftPicks',
      'latestVideo',
      'latestShorts',
      // 'processedInjuriesByTeam', // REMOVED - Derived from injuries
      // 'processedTransactionStats', // REMOVED - Derived from transactions
      'lastFullLoad',
      'completedWeeks'
      // isInitializing and isRefreshing are intentionally excluded - runtime state only
    ],
    // CRITICAL: Reset runtime flags after restoring from cache to prevent deadlocks
    afterRestore: (ctx) => {
      ctx.store.isInitializing = false
      ctx.store.isRefreshing = false
      // Reset state machine - cached data doesn't mean initialization is complete
      // (still need to process injuries, transactions, etc.)
      ctx.store.initState = 'idle'
      ctx.store._initPromise = null
      // Reset processing promises to prevent stuck state from previous sessions
      ctx.store._injuriesProcessingPromise = null
      ctx.store._transactionsProcessingPromise = null
    }
  }
})
