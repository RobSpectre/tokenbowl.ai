import { defineStore } from 'pinia'
import { getLeagueData, getMatchups } from '../sleeperApi.js'
import { getTeamInfo } from '../teamMappings.js'
import { getInjuries, getPlayerInjuryStatus } from '../fantasyNerdsApi.js'
import { useLeagueStore } from './league.js'

const REFRESH_INTERVAL = 5000 // 5 seconds for live scoring updates

export const useBroadcastStore = defineStore('broadcast', {
  state: () => ({
    // Core data
    league: null,
    rosters: [],
    users: [],
    currentWeek: null,
    players: {}, // Player data from league store

    // Matchup data
    currentMatchups: [],
    allMatchups: {}, // All matchups by week for record calculation
    selectedMatchupId: null,

    // Scoring plays - sorted chronologically
    scoringPlays: [],

    // Injury alerts for current week
    injuryAlerts: [],

    // Score tracking for animations
    previousScores: {}, // { rosterId: points }
    previousPlayerScores: {}, // { 'rosterId-playerId': points }
    scoreChanges: [], // Recent score changes for animations
    lastScoreChangeTimestamp: null,

    // Auto-refresh
    refreshTimer: null,
    lastRefresh: null,
    isRefreshing: false,

    // Error tracking
    errors: {}
  }),

  getters: {
    // Get all matchups with team info
    enrichedMatchups() {
      if (!this.currentMatchups) return []

      return this.currentMatchups.map(matchup => {
        const teams = matchup.map(team => {
          const roster = this.rosters.find(r => r.roster_id === team.roster_id)
          const user = this.users.find(u => u.user_id === roster?.owner_id)
          const teamInfoRaw = user?.display_name ? getTeamInfo(user.display_name) : null

          // Map logo to logoPath for consistency with other components
          const teamInfo = teamInfoRaw ? {
            ...teamInfoRaw,
            logoPath: teamInfoRaw.logo,
            colors: {
              from: teamInfoRaw.color,
              to: teamInfoRaw.color
            }
          } : null

          return {
            ...team,
            roster,
            user,
            teamInfo
          }
        })

        return {
          matchup_id: matchup[0]?.matchup_id,
          teams
        }
      })
    },

    // Get selected matchup details
    selectedMatchup() {
      if (!this.selectedMatchupId) return null
      return this.enrichedMatchups.find(m => m.matchup_id === this.selectedMatchupId)
    },

    // Get recent scoring plays (last 50)
    recentScoringPlays() {
      return this.scoringPlays.slice(0, 50)
    },

    // Get active injury alerts
    activeInjuryAlerts() {
      return this.injuryAlerts.filter(alert => alert.severity !== 'CLEAR')
    }
  },

  actions: {
    /**
     * Initialize broadcast data and start auto-refresh
     */
    async initialize() {
      console.log('[BROADCAST] Initializing...')

      try {
        // Load player data from league store
        const leagueStore = useLeagueStore()
        await leagueStore.initialize()
        this.players = leagueStore.players

        await this.loadData()
        this.startAutoRefresh()
        console.log('[BROADCAST] Initialized successfully')
      } catch (error) {
        console.error('[BROADCAST] Initialization error:', error)
        this.errors.initialization = error.message
      }
    },

    /**
     * Get player name from player ID
     */
    getPlayerName(playerId) {
      const player = this.players[playerId]
      if (!player) return `Player ${playerId}`

      return `${player.first_name || ''} ${player.last_name || ''}`.trim() || `Player ${playerId}`
    },

    /**
     * Load all broadcast data
     */
    async loadData() {
      if (this.isRefreshing) return

      this.isRefreshing = true

      try {
        // Load league data
        const leagueData = await getLeagueData()
        this.league = leagueData.league
        this.rosters = leagueData.rosters
        this.users = leagueData.users
        this.currentWeek = this.league?.settings?.leg || 1

        // Ensure players are loaded from league store
        const leagueStore = useLeagueStore()
        if (Object.keys(this.players).length === 0) {
          console.log('[BROADCAST] Players not loaded, syncing from league store...')
          this.players = leagueStore.players
          console.log('[BROADCAST] Players loaded:', Object.keys(this.players).length)
        }

        // Load projections for current week (required for projected points display)
        await leagueStore.fetchWeeklyProjectionsForWeek(this.currentWeek)

        // Load current week matchups
        await this.loadCurrentMatchups()

        // Load injury alerts for current week
        await this.loadInjuryAlerts()

        // Process scoring plays from matchups
        this.processScoringPlays()

        this.lastRefresh = Date.now()
        this.errors = {}
      } catch (error) {
        console.error('[BROADCAST] Error loading data:', error)
        this.errors.loadData = error.message
      } finally {
        this.isRefreshing = false
      }
    },

    /**
     * Load current week matchups
     */
    async loadCurrentMatchups() {
      try {
        const matchups = await getMatchups(this.currentWeek)

        // Group by matchup_id
        const matchupGroups = {}
        for (const matchup of matchups) {
          if (!matchupGroups[matchup.matchup_id]) {
            matchupGroups[matchup.matchup_id] = []
          }
          matchupGroups[matchup.matchup_id].push(matchup)
        }

        // Detect score changes before updating currentMatchups
        this.detectScoreChanges(Object.values(matchupGroups))

        this.currentMatchups = Object.values(matchupGroups)

        // Auto-select first matchup if none selected
        if (!this.selectedMatchupId && this.currentMatchups.length > 0) {
          this.selectedMatchupId = this.currentMatchups[0][0]?.matchup_id
        }

        // Load all matchups for record calculation (weeks 1 through current)
        await this.loadAllMatchups()
      } catch (error) {
        console.error('[BROADCAST] Error loading matchups:', error)
        this.errors.matchups = error.message
      }
    },

    /**
     * Detect score changes for animations and create scoring plays
     */
    detectScoreChanges(newMatchups) {
      const changes = []
      const newScoringPlays = []
      const now = Date.now()

      for (const matchup of newMatchups) {
        for (const team of matchup) {
          const rosterId = team.roster_id
          const newScore = team.points || 0
          const previousScore = this.previousScores[rosterId] || 0

          const roster = this.rosters.find(r => r.roster_id === rosterId)
          const user = this.users.find(u => u.user_id === roster?.owner_id)
          const teamInfo = user?.display_name ? getTeamInfo(user.display_name) : null

          // Check for team score change
          if (newScore > previousScore && previousScore > 0) {
            const scoreIncrease = newScore - previousScore

            console.log(`[BROADCAST] Score change detected: Roster ${rosterId} +${scoreIncrease.toFixed(2)} (${previousScore.toFixed(2)} -> ${newScore.toFixed(2)})`)

            changes.push({
              type: 'team',
              rosterId,
              previousScore,
              newScore,
              scoreIncrease,
              timestamp: now
            })

            // Detect individual player score changes
            if (team.players_points) {
              Object.entries(team.players_points).forEach(([playerId, newPoints]) => {
                const key = `${rosterId}-${playerId}`
                const previousPoints = this.previousPlayerScores[key] || 0

                if (newPoints > previousPoints) {
                  const playerIncrease = newPoints - previousPoints

                  console.log(`[BROADCAST] Player score change: ${this.getPlayerName(playerId)} +${playerIncrease.toFixed(2)}`)

                  changes.push({
                    type: 'player',
                    rosterId,
                    playerId,
                    playerName: this.getPlayerName(playerId),
                    previousScore: previousPoints,
                    newScore: newPoints,
                    scoreIncrease: playerIncrease,
                    timestamp: now
                  })

                  // Create a scoring play entry for this player
                  const isDefenseTeam = typeof playerId === 'string' && /^[A-Z]{2,3}$/.test(playerId)
                  const player = this.players[playerId]

                  const getTeamNameFromAbbr = (abbr) => {
                    const teamNames = {
                      'ARI': 'Arizona', 'ATL': 'Atlanta', 'BAL': 'Baltimore', 'BUF': 'Buffalo',
                      'CAR': 'Carolina', 'CHI': 'Chicago', 'CIN': 'Cincinnati', 'CLE': 'Cleveland',
                      'DAL': 'Dallas', 'DEN': 'Denver', 'DET': 'Detroit', 'GB': 'Green Bay',
                      'HOU': 'Houston', 'IND': 'Indianapolis', 'JAC': 'Jacksonville', 'KC': 'Kansas City',
                      'LAC': 'LA Chargers', 'LAR': 'LA Rams', 'LV': 'Las Vegas', 'MIA': 'Miami',
                      'MIN': 'Minnesota', 'NE': 'New England', 'NO': 'New Orleans', 'NYG': 'NY Giants',
                      'NYJ': 'NY Jets', 'PHI': 'Philadelphia', 'PIT': 'Pittsburgh', 'SEA': 'Seattle',
                      'SF': 'San Francisco', 'TB': 'Tampa Bay', 'TEN': 'Tennessee', 'WAS': 'Washington'
                    }
                    return teamNames[abbr] || `${abbr} Defense`
                  }

                  let playerName, playerPosition, playerTeam, playerImageUrl

                  if (isDefenseTeam) {
                    playerName = getTeamNameFromAbbr(playerId) + ' Defense'
                    playerPosition = 'DEF'
                    playerTeam = playerId
                    playerImageUrl = `https://sleepercdn.com/images/team_logos/nfl/${playerId.toLowerCase()}.png`
                  } else if (player?.position === 'DEF') {
                    playerName = player.full_name || getTeamNameFromAbbr(player.team || playerId) + ' Defense'
                    playerPosition = 'DEF'
                    playerTeam = player.team || playerId
                    playerImageUrl = `https://sleepercdn.com/images/team_logos/nfl/${player.team.toLowerCase()}.png`
                  } else {
                    playerName = player
                      ? (player.full_name || `${player.first_name || ''} ${player.last_name || ''}`.trim())
                      : `Player ${playerId}`
                    playerPosition = player?.position || 'N/A'
                    playerTeam = player?.team || 'N/A'
                    playerImageUrl = `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`
                  }

                  newScoringPlays.push({
                    playerId,
                    playerName,
                    playerPosition,
                    playerTeam,
                    playerImageUrl,
                    points: playerIncrease, // Show the increase, not total
                    totalPoints: newPoints,
                    rosterId: rosterId,
                    teamName: teamInfo?.aiModel || 'Unknown',
                    teamColor: teamInfo?.color || '#666',
                    teamLogo: teamInfo?.logo || null,
                    matchupId: team.matchup_id,
                    week: this.currentWeek,
                    timestamp: now
                  })

                  // Update player score tracking
                  this.previousPlayerScores[key] = newPoints
                }
              })
            }
          }

          // Update team score tracking
          this.previousScores[rosterId] = newScore
        }
      }

      // Add new scoring plays to the beginning of the array (most recent first)
      if (newScoringPlays.length > 0) {
        this.scoringPlays = [...newScoringPlays, ...this.scoringPlays].slice(0, 100) // Keep last 100
        console.log(`[BROADCAST] Added ${newScoringPlays.length} new scoring plays`)
      }

      // Store score changes for animations
      if (changes.length > 0) {
        this.scoreChanges = changes
        this.lastScoreChangeTimestamp = now
        console.log(`[BROADCAST] Total ${changes.length} score changes detected`)
      }
    },

    /**
     * Clear score changes (called after animations complete)
     */
    clearScoreChanges() {
      this.scoreChanges = []
    },

    /**
     * Get score changes for a specific roster
     */
    getScoreChangesForRoster(rosterId) {
      return this.scoreChanges.filter(change => change.rosterId === rosterId)
    },

    /**
     * Get score changes for a specific player
     */
    getScoreChangesForPlayer(rosterId, playerId) {
      return this.scoreChanges.filter(
        change => change.type === 'player' &&
                 change.rosterId === rosterId &&
                 change.playerId === playerId
      )
    },

    /**
     * Load all matchups for record calculation
     */
    async loadAllMatchups() {
      try {
        const allMatchups = {}

        // Load matchups for weeks 1 through current week
        for (let week = 1; week <= this.currentWeek; week++) {
          const weekMatchups = await getMatchups(week)

          // Group by matchup_id
          const matchupGroups = {}
          for (const matchup of weekMatchups) {
            if (!matchupGroups[matchup.matchup_id]) {
              matchupGroups[matchup.matchup_id] = []
            }
            matchupGroups[matchup.matchup_id].push(matchup)
          }

          allMatchups[week] = Object.values(matchupGroups)
        }

        this.allMatchups = allMatchups
      } catch (error) {
        console.error('[BROADCAST] Error loading all matchups:', error)
        this.errors.allMatchups = error.message
      }
    },

    /**
     * Get team record through a specific week
     */
    getRecordThroughWeek(rosterId, throughWeek) {
      let wins = 0
      let losses = 0
      let ties = 0

      for (let week = 1; week <= throughWeek; week++) {
        const weekMatchups = this.allMatchups[week]
        if (!weekMatchups) continue

        for (const matchup of weekMatchups) {
          if (matchup.length !== 2) continue

          const team1 = matchup[0]
          const team2 = matchup[1]

          // Check if this roster is in this matchup
          if (team1.roster_id === rosterId) {
            if (team1.points > team2.points) wins++
            else if (team1.points < team2.points) losses++
            else ties++
          } else if (team2.roster_id === rosterId) {
            if (team2.points > team1.points) wins++
            else if (team2.points < team1.points) losses++
            else ties++
          }
        }
      }

      return { wins, losses, ties }
    },

    /**
     * Get team badges using the league store
     */
    getTeamBadges(starters, week) {
      const leagueStore = useLeagueStore()
      return leagueStore.getTeamBadges(starters, week)
    },

    /**
     * Check if week is complete
     */
    isWeekComplete() {
      if (!this.league || !this.currentWeek) return false
      const leagueCurrentWeek = this.league?.settings?.leg || 1
      return this.currentWeek < leagueCurrentWeek
    },

    /**
     * Load injury alerts for current week
     */
    async loadInjuryAlerts() {
      try {
        const injuryData = await getInjuries(this.currentWeek)
        const alerts = []

        // Check all rostered players for injuries
        for (const roster of this.rosters) {
          const user = this.users.find(u => u.user_id === roster.owner_id)
          const teamInfo = user?.display_name ? getTeamInfo(user.display_name) : null

          // Check starters for injuries (highest priority)
          const allPlayers = [
            ...(roster.starters || []),
            ...(roster.players || [])
          ]

          for (const playerId of allPlayers) {
            const player = roster.players?.[playerId]
            if (!player) continue

            const playerName = player.full_name || `${player.first_name || ''} ${player.last_name || ''}`.trim()
            const injuryStatus = playerName ? getPlayerInjuryStatus(injuryData, playerName) : null

            if (injuryStatus && injuryStatus.game_status) {
              alerts.push({
                playerId,
                playerName,
                team: player.team,
                position: player.position,
                fantasyTeam: teamInfo?.aiModel || 'Unknown',
                fantasyTeamColor: teamInfo?.colors?.from || '#666',
                injury: injuryStatus.injury,
                gameStatus: injuryStatus.game_status,
                practiceStatus: injuryStatus.practice_status,
                notes: injuryStatus.notes,
                severity: this.getInjurySeverity(injuryStatus.game_status),
                timestamp: Date.now(),
                isStarter: roster.starters?.includes(playerId)
              })
            }
          }
        }

        // Sort by severity (most severe first) then by starters first
        alerts.sort((a, b) => {
          const severityOrder = { 'OUT': 0, 'DOUBTFUL': 1, 'QUESTIONABLE': 2, 'PROBABLE': 3, 'CLEAR': 4 }
          if (severityOrder[a.severity] !== severityOrder[b.severity]) {
            return severityOrder[a.severity] - severityOrder[b.severity]
          }
          if (a.isStarter !== b.isStarter) {
            return b.isStarter ? 1 : -1
          }
          return 0
        })

        this.injuryAlerts = alerts
      } catch (error) {
        console.error('[BROADCAST] Error loading injuries:', error)
        this.errors.injuries = error.message
      }
    },

    /**
     * Process scoring plays from matchup data
     */
    processScoringPlays() {
      const plays = []

      console.log('[BROADCAST] Processing scoring plays...')
      console.log('[BROADCAST] Players available:', Object.keys(this.players).length)
      console.log('[BROADCAST] Current matchups:', this.currentMatchups.length)

      for (const matchup of this.currentMatchups) {
        for (const team of matchup) {
          const roster = this.rosters.find(r => r.roster_id === team.roster_id)
          const user = this.users.find(u => u.user_id === roster?.owner_id)
          const teamInfo = user?.display_name ? getTeamInfo(user.display_name) : null

          // Get all player points
          if (team.players_points) {
            Object.entries(team.players_points).forEach(([playerId, points]) => {
              if (points > 0) {
                // Check if this is a defense team abbreviation (2-3 uppercase letters)
                const isDefenseTeam = typeof playerId === 'string' && /^[A-Z]{2,3}$/.test(playerId)

                // Get player data
                const player = this.players[playerId]

                if (!player && !isDefenseTeam) {
                  console.warn(`[BROADCAST] Player ${playerId} not found in players data`)
                }

                // Helper to get team name from abbreviation
                const getTeamNameFromAbbr = (abbr) => {
                  const teamNames = {
                    'ARI': 'Arizona', 'ATL': 'Atlanta', 'BAL': 'Baltimore', 'BUF': 'Buffalo',
                    'CAR': 'Carolina', 'CHI': 'Chicago', 'CIN': 'Cincinnati', 'CLE': 'Cleveland',
                    'DAL': 'Dallas', 'DEN': 'Denver', 'DET': 'Detroit', 'GB': 'Green Bay',
                    'HOU': 'Houston', 'IND': 'Indianapolis', 'JAC': 'Jacksonville', 'KC': 'Kansas City',
                    'LAC': 'LA Chargers', 'LAR': 'LA Rams', 'LV': 'Las Vegas', 'MIA': 'Miami',
                    'MIN': 'Minnesota', 'NE': 'New England', 'NO': 'New Orleans', 'NYG': 'NY Giants',
                    'NYJ': 'NY Jets', 'PHI': 'Philadelphia', 'PIT': 'Pittsburgh', 'SEA': 'Seattle',
                    'SF': 'San Francisco', 'TB': 'Tampa Bay', 'TEN': 'Tennessee', 'WAS': 'Washington'
                  }
                  return teamNames[abbr] || `${abbr} Defense`
                }

                let playerName, playerPosition, playerTeam

                if (isDefenseTeam) {
                  // Defense team abbreviation
                  playerName = getTeamNameFromAbbr(playerId) + ' Defense'
                  playerPosition = 'DEF'
                  playerTeam = playerId
                } else if (player?.position === 'DEF') {
                  // Defense in player data
                  playerName = player.full_name || getTeamNameFromAbbr(player.team || playerId) + ' Defense'
                  playerPosition = 'DEF'
                  playerTeam = player.team || playerId
                } else {
                  // Regular player
                  playerName = player
                    ? (player.full_name || `${player.first_name || ''} ${player.last_name || ''}`.trim())
                    : `Player ${playerId}`
                  playerPosition = player?.position || 'N/A'
                  playerTeam = player?.team || 'N/A'
                }

                // Handle player images - special case for defense teams
                let playerImageUrl

                if (playerId === '0' || playerId === 0) {
                  playerImageUrl = '/images/logos/nfl.svg'
                } else if (isDefenseTeam) {
                  // Defense team abbreviation - use Sleeper team logo CDN
                  playerImageUrl = `https://sleepercdn.com/images/team_logos/nfl/${playerId.toLowerCase()}.png`
                } else if (player?.position === 'DEF' && player?.team) {
                  // Defense in player data with team - use Sleeper team logo CDN
                  playerImageUrl = `https://sleepercdn.com/images/team_logos/nfl/${player.team.toLowerCase()}.png`
                } else {
                  // Regular players use Sleeper CDN
                  playerImageUrl = `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`
                }

                plays.push({
                  playerId,
                  playerName,
                  playerPosition,
                  playerTeam,
                  playerImageUrl,
                  points: points,
                  rosterId: team.roster_id,
                  teamName: teamInfo?.aiModel || 'Unknown',
                  teamColor: teamInfo?.color || '#666',
                  teamLogo: teamInfo?.logo || null,
                  matchupId: team.matchup_id,
                  week: this.currentWeek,
                  timestamp: Date.now() // In real app, would use actual game time
                })
              }
            })
          }
        }
      }

      // Sort by points (highest first) then by timestamp
      plays.sort((a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points
        }
        return b.timestamp - a.timestamp
      })

      console.log(`[BROADCAST] Processed ${plays.length} scoring plays`)
      if (plays.length > 0) {
        console.log('[BROADCAST] Sample play:', plays[0])
      }

      this.scoringPlays = plays
    },

    /**
     * Get injury severity level
     */
    getInjurySeverity(gameStatus) {
      if (!gameStatus) return 'CLEAR'

      const status = gameStatus.toUpperCase()
      if (status.includes('OUT') || status.includes('IR')) return 'OUT'
      if (status.includes('DOUBTFUL') || status.includes('D ') || status === 'D') return 'DOUBTFUL'
      if (status.includes('QUESTIONABLE') || status.includes('Q ') || status === 'Q') return 'QUESTIONABLE'
      if (status.includes('PROBABLE') || status.includes('P ') || status === 'P') return 'PROBABLE'

      return 'CLEAR'
    },

    /**
     * Select a matchup for detailed view
     */
    selectMatchup(matchupId) {
      this.selectedMatchupId = matchupId
    },

    /**
     * Start auto-refresh timer
     */
    startAutoRefresh() {
      // Clear existing timer
      this.stopAutoRefresh()

      // Start new timer
      this.refreshTimer = setInterval(() => {
        console.log('[BROADCAST] Auto-refreshing data...')
        this.loadData()
      }, REFRESH_INTERVAL)

      console.log('[BROADCAST] Auto-refresh started (every 5s for live scoring)')
    },

    /**
     * Stop auto-refresh timer
     */
    stopAutoRefresh() {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer)
        this.refreshTimer = null
        console.log('[BROADCAST] Auto-refresh stopped')
      }
    },

    /**
     * Manual refresh
     */
    async refresh() {
      console.log('[BROADCAST] Manual refresh triggered')
      await this.loadData()
    },

    /**
     * Load matchups for a specific week
     */
    async loadMatchupsForWeek(week) {
      if (this.isRefreshing) return
      if (week < 1 || week > 18) {
        console.error('[BROADCAST] Invalid week:', week)
        return
      }

      this.isRefreshing = true
      console.log(`[BROADCAST] Loading matchups for week ${week}`)

      try {
        // Update current week
        this.currentWeek = week

        // Load projections for this week (required for projected points display)
        const leagueStore = useLeagueStore()
        await leagueStore.fetchWeeklyProjectionsForWeek(week)

        // Load matchups for the specified week
        await this.loadCurrentMatchups()

        // Load injury alerts for the specified week
        await this.loadInjuryAlerts()

        // Process scoring plays from matchups
        this.processScoringPlays()

        this.lastRefresh = Date.now()
        console.log(`[BROADCAST] Loaded week ${week} successfully`)
      } catch (error) {
        console.error('[BROADCAST] Error loading week matchups:', error)
        this.errors.loadWeek = error.message
      } finally {
        this.isRefreshing = false
      }
    }
  }
})
