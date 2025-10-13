import { defineStore } from 'pinia'
import { getLeagueData, getRelevantPlayers, getMatchups, getTransactions } from '../sleeperApi.js'
import { getTeamInfo } from '../teamMappings.js'
import { getLatestVideoAndShorts } from '../youtubeApi.js'
import { getInjuries, getPlayerInjuryStatus, getInjuryIndicator } from '../fantasyNerdsApi.js'
import { getPlayers as getPlayersFromService, enrichPlayerData } from '../utils/playerService.js'

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000
// YouTube cache duration: 24 hours
const YOUTUBE_CACHE_DURATION = 24 * 60 * 60 * 1000
// Cache version - increment this when making breaking changes to data structure
const CACHE_VERSION = 8 // v8: Added enrichedPlayers with consolidated data from all sources

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

    // All matchups (weeks 1-18)
    allMatchups: {},

    // Transactions by week
    transactionsByWeek: {},
    transactionsTimestampsByWeek: {},

    // Injuries by week (from Fantasy Nerds API)
    injuriesByWeek: {},
    injuriesTimestampsByWeek: {},

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

    // Check if enriched players cache is valid
    isEnrichedPlayersFresh: (state) => {
      if (!state.enrichedPlayersTimestamp) return false
      return Date.now() - state.enrichedPlayersTimestamp < CACHE_DURATION
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
    },

    // Get matchups for a specific week
    getMatchupsForWeek: (state) => {
      return (week) => state.allMatchups[week] || null
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

    // Check if processed injuries cache is valid
    isProcessedInjuriesFresh: (state) => {
      if (!state.processedInjuriesTimestamp) return false
      return Date.now() - state.processedInjuriesTimestamp < CACHE_DURATION
    },

    // Check if processed transactions cache is valid
    isProcessedTransactionsFresh: (state) => {
      if (!state.processedTransactionsTimestamp) return false
      return Date.now() - state.processedTransactionsTimestamp < CACHE_DURATION
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

    async fetchCurrentMatchups(forceRefresh = false) {
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
          // Ensure we have league data cached first
          await this.fetchLeagueData()

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

                // Bye week status (check if player's team is on bye this week)
                bye_week: this.getByeWeekForTeam(player.team, currentWeek),

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
                age: pick.age,
                college: pick.college,
                years_exp: pick.years_exp,
                status: pick.status || 'Active',

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
      // TODO: This would ideally come from an NFL schedule API
      // For now, return false - you can add bye week data later
      return false
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

    async fetchMatchupForWeek(week, forceRefresh = false) {
      // If we have fresh all matchups data, just return the specific week
      if (!forceRefresh && this.isAllMatchupsFresh && this.allMatchups[week]) {
        return this.allMatchups[week]
      }

      // Otherwise fetch just this week's matchup
      try {
        // Ensure we have rosters and users
        // Don't pass forceRefresh to avoid duplicate API calls
        await this.fetchLeagueData()

        const matchups = await getMatchups(week)

        // Create roster map
        const rosterMap = {}
        this.rosters.forEach(roster => {
          rosterMap[roster.roster_id] = roster
        })

        // Group matchups and enrich player data
        const matchupGroups = {}
        for (const matchup of matchups) {
          // Enrich player data for matchup.players_points
          let enrichedPlayers = null
          if (matchup.players_points) {
            enrichedPlayers = await enrichPlayerData(matchup.players_points, this.players)
          }

          if (!matchupGroups[matchup.matchup_id]) {
            matchupGroups[matchup.matchup_id] = []
          }
          matchupGroups[matchup.matchup_id].push({
            ...matchup,
            roster: rosterMap[matchup.roster_id],
            enrichedPlayers // Add enriched player data
          })
        }

        this.allMatchups[week] = Object.values(matchupGroups)

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
        // Use cached league data (rosters and users) instead of making new API calls
        // Don't pass forceRefresh to fetchLeagueData to avoid duplicate API calls
        // when this method is called as part of fetchAllData
        await this.fetchLeagueData()

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
              for (const matchup of matchups) {
                // Enrich player data for matchup.players_points
                let enrichedPlayers = null
                if (matchup.players_points) {
                  enrichedPlayers = await enrichPlayerData(matchup.players_points, this.players)
                }

                if (!matchupGroups[matchup.matchup_id]) {
                  matchupGroups[matchup.matchup_id] = []
                }
                matchupGroups[matchup.matchup_id].push({
                  ...matchup,
                  roster: rosterMap[matchup.roster_id],
                  enrichedPlayers // Add enriched player data
                })
              }

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

    async fetchTransactionsForWeek(week, forceRefresh = false) {
      // Check if cached data is fresh (within 5 minutes)
      const timestamp = this.transactionsTimestampsByWeek[week]
      const isFresh = timestamp && (Date.now() - timestamp < CACHE_DURATION)

      // Return cached data if exists, is fresh, and not forcing refresh
      if (!forceRefresh && isFresh && this.transactionsByWeek[week]) {
        return this.transactionsByWeek[week]
      }

      try {
        // Ensure we have league data (rosters and users) cached
        // Don't pass forceRefresh to avoid duplicate API calls
        await this.fetchLeagueData()

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

    /**
     * Process injury data and group by team for all weeks
     * This consolidates the injury processing logic that was duplicated in components
     */
    async processInjuriesData(maxWeek, forceRefresh = false) {
      // Return cached data if fresh and not forcing refresh
      if (!forceRefresh && this.isProcessedInjuriesFresh && Object.keys(this.processedInjuriesByTeam).length > 0) {
        return this.processedInjuriesByTeam
      }

      try {
        // Ensure we have all required data
        await this.fetchLeagueData()
        await this.fetchPlayers()

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
    async processTransactionStats(maxWeek, forceRefresh = false) {
      // Return cached data if fresh and not forcing refresh
      if (!forceRefresh && this.isProcessedTransactionsFresh && Object.keys(this.processedTransactionStats.byWeek).length > 0) {
        return this.processedTransactionStats
      }

      try {
        // Ensure we have league data
        await this.fetchLeagueData()

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

    // Fetch all data needed for the home page
    async fetchAllData(forceRefresh = false) {
      try {
        // Fetch critical data first
        const [leagueData, matchupsData, players, allMatchups] = await Promise.all([
          this.fetchLeagueData(forceRefresh),
          this.fetchCurrentMatchups(forceRefresh),
          this.fetchPlayers(forceRefresh),
          this.fetchAllMatchups(forceRefresh)
        ])

        // Fetch enriched players separately so it doesn't block critical data
        // If it fails, the app will still work with base player data
        let enrichedPlayers = {}
        try {
          enrichedPlayers = await this.fetchEnrichedPlayers(forceRefresh)
        } catch (err) {
          console.error('Error fetching enriched players (non-critical):', err)
          // Don't throw - allow app to continue with base player data
        }

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
     * @returns {Array} Array of badge objects with type, label, and color
     */
    getTeamBadges(starterIds) {
      if (!starterIds || !Array.isArray(starterIds)) return []

      const badges = []

      // Track different injury severities and statuses
      let hasOut = false
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

        if (enrichedPlayer) {
          // Check for BYE week
          if (enrichedPlayer.bye_week) {
            hasBye = true
          }

          // Check for suspension
          if (enrichedPlayer.is_suspended) {
            hasSuspended = true
          }

          // Check injury status using consolidated injury_status_combined field
          const statusToCheck = enrichedPlayer.injury_status_combined?.toUpperCase()

          if (statusToCheck) {
            // Check for Doubtful BEFORE Out (since "DOUBTFUL" contains "OUT")
            if (statusToCheck.includes('DOUBTFUL') || (statusToCheck.includes('D ') || statusToCheck === 'D') && !statusToCheck.includes('SUSPENDED')) {
              hasDoubtful = true
            }
            // Check for Out/IR
            else if (statusToCheck.includes('OUT') || statusToCheck.includes('IR') || statusToCheck.includes('INJURED RESERVE')) {
              hasOut = true
            }
            // Check for Questionable/PUP
            else if (statusToCheck.includes('QUESTIONABLE') || statusToCheck.includes('Q ') || statusToCheck === 'Q' || statusToCheck.includes('PUP') || statusToCheck.includes('PHYSICALLY UNABLE')) {
              hasQuestionable = true
            }
          }

          // Also check the injury_indicator field as a fallback
          if (!statusToCheck && enrichedPlayer.injury_indicator) {
            switch(enrichedPlayer.injury_indicator) {
              case 'O':
              case 'IR':
                hasOut = true
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
        } else if (basePlayer) {
          // Fallback to base player injury status if enriched data not available
          const sleeperStatus = basePlayer.injury_status?.toUpperCase()
          if (sleeperStatus) {
            if (sleeperStatus.includes('OUT') || sleeperStatus.includes('IR')) {
              hasOut = true
            } else if (sleeperStatus.includes('DOUBTFUL') || sleeperStatus === 'D') {
              hasDoubtful = true
            } else if (sleeperStatus.includes('QUESTIONABLE') || sleeperStatus === 'Q') {
              hasQuestionable = true
            } else if (sleeperStatus === 'SUS' || sleeperStatus.includes('SUSPENDED')) {
              hasSuspended = true
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
        badges.push({ type: 'out', label: 'O/IR', color: 'bg-red-600' })
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
      this.transactionsByWeek = {}
      this.transactionsTimestampsByWeek = {}
      this.injuriesByWeek = {}
      this.injuriesTimestampsByWeek = {}
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
      'transactionsByWeek',
      'transactionsTimestampsByWeek',
      'injuriesByWeek',
      'injuriesTimestampsByWeek',
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
