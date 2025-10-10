import { defineStore } from 'pinia'
import { getLeagueData, getCurrentMatchups, getRelevantPlayers, getMatchups, getRosters, getLeagueUsers, getTransactions } from '../sleeperApi.js'
import { getTeamInfo } from '../teamMappings.js'
import { getLatestVideoAndShorts } from '../youtubeApi.js'
import { getInjuries } from '../fantasyNerdsApi.js'

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000
// YouTube cache duration: 24 hours
const YOUTUBE_CACHE_DURATION = 24 * 60 * 60 * 1000
// Cache version - increment this when making breaking changes to data structure
const CACHE_VERSION = 4 // v4: Optimized to store relevant players (~600 instead of 11,400: rosters + transactions + top 400)

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

    // All matchups (weeks 1-18)
    allMatchups: {},

    // Transactions by week
    transactionsByWeek: {},
    transactionsTimestampsByWeek: {},

    // Injuries by week (from Fantasy Nerds API)
    injuriesByWeek: {},
    injuriesTimestampsByWeek: {},

    // Draft data (never expires - loaded once)
    draftPicks: [],

    // YouTube data (cached for 24 hours)
    latestVideo: null,
    latestShorts: [],

    // Cache timestamps
    leagueDataTimestamp: null,
    matchupsTimestamp: null,
    playersTimestamp: null,
    allMatchupsTimestamp: null,
    draftTimestamp: null,
    youtubeTimestamp: null,

    // Loading states
    isLoadingLeagueData: false,
    isLoadingMatchups: false,
    isLoadingPlayers: false,
    isLoadingAllMatchups: false,
    isLoadingDraft: false,
    isLoadingYoutube: false,

    // Promise tracking for concurrent requests
    playersPromise: null,

    // Error states
    leagueDataError: null,
    matchupsError: null,
    playersError: null,
    allMatchupsError: null,
    draftError: null,
    youtubeError: null
  }),

  getters: {
    // Check if league data cache is valid
    isLeagueDataFresh: (state) => {
      if (!state.leagueDataTimestamp) return false
      return Date.now() - state.leagueDataTimestamp < CACHE_DURATION
    },

    // Check if matchups cache is valid
    isMatchupsFresh: (state) => {
      if (!state.matchupsTimestamp) return false
      return Date.now() - state.matchupsTimestamp < CACHE_DURATION
    },

    // Check if players cache is valid
    isPlayersFresh: (state) => {
      if (!state.playersTimestamp) return false
      return Date.now() - state.playersTimestamp < CACHE_DURATION
    },

    // Check if all matchups cache is valid
    isAllMatchupsFresh: (state) => {
      if (!state.allMatchupsTimestamp) return false
      return Date.now() - state.allMatchupsTimestamp < CACHE_DURATION
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
    }
  },

  actions: {
    async fetchLeagueData(forceRefresh = false) {
      // Return cached data if fresh and not forcing refresh
      if (!forceRefresh && this.isLeagueDataFresh && this.rosters.length > 0) {
        return {
          league: this.league,
          rosters: this.rosters,
          users: this.users
        }
      }

      // Skip if already loading
      if (this.isLoadingLeagueData) return

      this.isLoadingLeagueData = true
      this.leagueDataError = null

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
      }
    },

    async fetchCurrentMatchups(forceRefresh = false) {
      // Return cached data if fresh and not forcing refresh
      if (!forceRefresh && this.isMatchupsFresh && this.currentMatchups) {
        return {
          week: this.currentWeek,
          matchups: this.currentMatchups
        }
      }

      // Skip if already loading
      if (this.isLoadingMatchups) return

      this.isLoadingMatchups = true
      this.matchupsError = null

      try {
        const data = await getCurrentMatchups()

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
      }
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

    async fetchAllMatchups(forceRefresh = false) {
      // Return cached data if fresh and not forcing refresh
      if (!forceRefresh && this.isAllMatchupsFresh && Object.keys(this.allMatchups).length > 0) {
        return this.allMatchups
      }

      // Skip if already loading
      if (this.isLoadingAllMatchups) return this.allMatchups

      this.isLoadingAllMatchups = true
      this.allMatchupsError = null

      try {
        const rosters = await getRosters()
        const users = await getLeagueUsers()

        // Create maps
        const userMap = {}
        users.forEach(user => {
          userMap[user.user_id] = user
        })

        const rosterMap = {}
        rosters.forEach(roster => {
          rosterMap[roster.roster_id] = {
            ...roster,
            user: userMap[roster.owner_id]
          }
        })

        // Load matchups for all 18 weeks IN PARALLEL
        const weekPromises = []
        for (let week = 1; week <= 18; week++) {
          weekPromises.push(
            getMatchups(week).then(matchups => {
              // Group matchups
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

              this.allMatchups[week] = Object.values(matchupGroups)
            }).catch(err => {
              console.error(`Error loading week ${week} matchups:`, err)
            })
          )
        }

        // Wait for all weeks to load
        await Promise.all(weekPromises)
        this.allMatchupsTimestamp = Date.now()

        return this.allMatchups
      } catch (error) {
        console.error('Error fetching all matchups:', error)
        this.allMatchupsError = error.message
        throw error
      } finally {
        this.isLoadingAllMatchups = false
      }
    },

    async fetchTransactionsForWeek(week, forceRefresh = false) {
      // Check if cached data is fresh (within 5 minutes)
      const timestamp = this.transactionsTimestampsByWeek[week]
      const isFresh = timestamp && (Date.now() - timestamp < CACHE_DURATION)

      // Return cached data if exists, is fresh, and not forcing refresh
      if (!forceRefresh && isFresh && this.transactionsByWeek[week]) {
        return this.transactionsByWeek[week]
      }

      try {
        const [trans, rosters, users] = await Promise.all([
          getTransactions(week),
          getRosters(),
          getLeagueUsers()
        ])

        // Create user map
        const userMap = {}
        users.forEach(user => {
          userMap[user.user_id] = user
        })

        // Create roster map
        const rosterMap = {}
        rosters.forEach(roster => {
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

        this.transactionsByWeek[week] = enhancedTransactions
        this.transactionsTimestampsByWeek[week] = Date.now()
        return enhancedTransactions
      } catch (error) {
        console.error(`Error fetching transactions for week ${week}:`, error)
        this.transactionsByWeek[week] = []
        return []
      }
    },

    async fetchInjuriesForWeek(week, forceRefresh = false) {
      // Check if cached data is fresh (within 5 minutes)
      const timestamp = this.injuriesTimestampsByWeek[week]
      const isFresh = timestamp && (Date.now() - timestamp < CACHE_DURATION)

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

    // Fetch all data needed for the home page
    async fetchAllData(forceRefresh = false) {
      try {
        const [leagueData, matchupsData, players, allMatchups] = await Promise.all([
          this.fetchLeagueData(forceRefresh),
          this.fetchCurrentMatchups(forceRefresh),
          this.fetchPlayers(forceRefresh),
          this.fetchAllMatchups(forceRefresh)
        ])

        return {
          leagueData,
          matchupsData,
          players,
          allMatchups
        }
      } catch (error) {
        console.error('Error fetching all data:', error)
        throw error
      }
    },

    // Clear all cached data
    clearCache() {
      this.league = null
      this.rosters = []
      this.users = []
      this.currentMatchups = null
      this.currentWeek = null
      this.players = {}
      this.allMatchups = {}
      this.transactionsByWeek = {}
      this.transactionsTimestampsByWeek = {}
      this.injuriesByWeek = {}
      this.injuriesTimestampsByWeek = {}
      this.draftPicks = []
      this.latestVideo = null
      this.latestShorts = []
      this.leagueDataTimestamp = null
      this.matchupsTimestamp = null
      this.playersTimestamp = null
      this.allMatchupsTimestamp = null
      this.draftTimestamp = null
      this.youtubeTimestamp = null
      this.leagueDataError = null
      this.matchupsError = null
      this.playersError = null
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
      'allMatchups',
      'transactionsByWeek',
      'transactionsTimestampsByWeek',
      'injuriesByWeek',
      'injuriesTimestampsByWeek',
      'draftPicks',
      'latestVideo',
      'latestShorts',
      'leagueDataTimestamp',
      'matchupsTimestamp',
      'playersTimestamp',
      'allMatchupsTimestamp',
      'draftTimestamp',
      'youtubeTimestamp'
    ]
  }
})
