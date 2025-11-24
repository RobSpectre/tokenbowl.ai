import { createPinia, setActivePinia } from 'pinia'
import { useLeagueStore } from '../../stores/league.js'

/**
 * Standard mock data for league store tests
 * This mirrors the real Sleeper API data structure
 */
export const createMockLeagueData = (overrides = {}) => ({
  name: 'Token Bowl',
  league_id: '1266471057523490816',
  season: '2024',
  settings: {
    leg: 5, // Current week
    playoff_teams: 6,
    ...overrides.leagueSettings
  },
  ...overrides.league
})

export const createMockUsers = (overrides = []) => {
  const defaultUsers = [
    { user_id: 'user1', display_name: 'Greg Baugues' },
    { user_id: 'user2', display_name: 'rickyrobinett' },
    { user_id: 'user3', display_name: 'Carter Rabasa' }
  ]
  return overrides.length > 0 ? overrides : defaultUsers
}

export const createMockRosters = (users, overrides = []) => {
  if (overrides.length > 0) return overrides

  return users.map((user, index) => ({
    roster_id: index + 1,
    owner_id: user.user_id,
    user: user,
    settings: {
      wins: 3 - index,
      losses: index,
      ties: 0,
      fpts: 500 - (index * 50)
    },
    starters: ['4984', '8138', '9221'],
    players: ['4984', '8138', '9221', '5001', '5002'],
    taxi: [],
    reserve: []
  }))
}

export const createMockPlayers = (overrides = {}) => ({
  '4984': {
    player_id: '4984',
    first_name: 'Josh',
    last_name: 'Allen',
    full_name: 'Josh Allen',
    position: 'QB',
    team: 'BUF',
    status: 'Active',
    injury_status: null,
    ...overrides['4984']
  },
  '8138': {
    player_id: '8138',
    first_name: 'James',
    last_name: 'Cook',
    full_name: 'James Cook',
    position: 'RB',
    team: 'BUF',
    status: 'Active',
    injury_status: null,
    ...overrides['8138']
  },
  '9221': {
    player_id: '9221',
    first_name: 'Jahmyr',
    last_name: 'Gibbs',
    full_name: 'Jahmyr Gibbs',
    position: 'RB',
    team: 'DET',
    status: 'Active',
    injury_status: null,
    ...overrides['9221']
  },
  '5001': {
    player_id: '5001',
    first_name: 'Davante',
    last_name: 'Adams',
    full_name: 'Davante Adams',
    position: 'WR',
    team: 'LV',
    status: 'Active',
    injury_status: null,
    ...overrides['5001']
  },
  '5002': {
    player_id: '5002',
    first_name: 'Travis',
    last_name: 'Kelce',
    full_name: 'Travis Kelce',
    position: 'TE',
    team: 'KC',
    status: 'Active',
    injury_status: null,
    ...overrides['5002']
  },
  ...overrides
})

export const createMockMatchups = (week, rosters) => {
  const matchups = []
  for (let i = 0; i < rosters.length; i += 2) {
    const matchupId = Math.floor(i / 2) + 1
    const roster1 = rosters[i]
    const roster2 = rosters[i + 1]

    if (roster1) {
      matchups.push({
        roster_id: roster1.roster_id,
        matchup_id: matchupId,
        points: 120.5 - (i * 5),
        starters: roster1.starters || ['4984', '8138'],
        players: roster1.players || ['4984', '8138', '9221'],
        players_points: {
          '4984': 25.5,
          '8138': 18.0,
          '9221': 12.0
        }
      })
    }

    if (roster2) {
      matchups.push({
        roster_id: roster2.roster_id,
        matchup_id: matchupId,
        points: 110.0 - (i * 5),
        starters: roster2.starters || ['5001', '5002'],
        players: roster2.players || ['5001', '5002'],
        players_points: {
          '5001': 20.0,
          '5002': 15.0
        }
      })
    }
  }
  return matchups
}

export const createMockAllMatchups = (rosters, weeksCount = 5) => {
  const allMatchups = {}
  for (let week = 1; week <= weeksCount; week++) {
    const weekMatchups = createMockMatchups(week, rosters)
    // Group by matchup_id like the real store does
    const matchupGroups = {}
    for (const matchup of weekMatchups) {
      if (!matchupGroups[matchup.matchup_id]) {
        matchupGroups[matchup.matchup_id] = []
      }
      matchupGroups[matchup.matchup_id].push(matchup)
    }
    allMatchups[week] = Object.values(matchupGroups)
  }
  return allMatchups
}

export const createMockNFLSchedule = () => ({
  current_week: 5,
  schedule: [
    { week: '5', home_team: 'BUF', away_team: 'MIA', game_date: '2024-10-13T13:00:00Z', tv_station: 'CBS' },
    { week: '5', home_team: 'DET', away_team: 'GB', game_date: '2024-10-13T13:00:00Z', tv_station: 'FOX' },
    { week: '5', home_team: 'KC', away_team: 'LAC', game_date: '2024-10-13T16:25:00Z', tv_station: 'CBS' }
  ]
})

/**
 * Creates a fresh Pinia instance and populates the league store with mock data
 * @param {Object} options - Configuration options
 * @param {Object} options.league - Override league data
 * @param {Array} options.users - Override users data
 * @param {Array} options.rosters - Override rosters data
 * @param {Object} options.players - Override players data
 * @param {Object} options.allMatchups - Override all matchups data
 * @param {Object} options.nflSchedule - Override NFL schedule data
 * @param {number} options.currentWeek - Override current week
 * @returns {Object} - { pinia, store } - The pinia instance and populated store
 */
export function setupLeagueStore(options = {}) {
  // Create fresh pinia instance
  const pinia = createPinia()
  setActivePinia(pinia)

  // Get the store
  const store = useLeagueStore()

  // Create mock data
  const users = options.users || createMockUsers()
  const rosters = options.rosters || createMockRosters(users)
  const players = options.players || createMockPlayers()
  const currentWeek = options.currentWeek || 5

  // Pre-populate the store with mock data
  store.$patch({
    league: options.league || createMockLeagueData({ leagueSettings: { leg: currentWeek } }),
    users: users,
    rosters: rosters.map(roster => ({
      ...roster,
      user: users.find(u => u.user_id === roster.owner_id) || roster.user
    })),
    players: players,
    enrichedPlayers: createEnrichedPlayers(players),
    currentWeek: currentWeek,
    allMatchups: options.allMatchups || createMockAllMatchups(rosters, currentWeek),
    nflSchedule: options.nflSchedule || createMockNFLSchedule(),
    draftPicks: options.draftPicks || [],
    latestVideo: options.latestVideo || null,
    latestShorts: options.latestShorts || [],
    transactionsByWeek: options.transactionsByWeek || {},
    injuriesByWeek: options.injuriesByWeek || {},
    weeklyProjectionsByWeek: options.weeklyProjectionsByWeek || {},
    completedWeeks: options.completedWeeks || [1, 2, 3, 4],
    lastFullLoad: Date.now(),
    isInitializing: false,
    isRefreshing: false
  })

  return { pinia, store }
}

/**
 * Creates enriched player data from base players
 */
function createEnrichedPlayers(players) {
  const enriched = {}
  for (const [playerId, player] of Object.entries(players)) {
    enriched[playerId] = {
      ...player,
      portrait_url: `https://sleepercdn.com/content/nfl/players/${playerId}.jpg`,
      vorp: 10,
      ros: 8.5,
      adp: 50,
      injury_indicator: null,
      injury_status_combined: player.injury_status || null,
      is_suspended: player.status === 'Sus',
      is_available: player.status === 'Active'
    }
  }
  return enriched
}

/**
 * Creates a minimal store setup for simple tests
 * Just enough to prevent crashes, not fully populated
 */
export function setupMinimalStore() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useLeagueStore()

  store.$patch({
    league: { name: 'Token Bowl', settings: { leg: 1 } },
    users: [],
    rosters: [],
    players: {},
    currentWeek: 1,
    allMatchups: { 1: [] },
    isInitializing: false,
    isRefreshing: false
  })

  return { pinia, store }
}

/**
 * Creates standard fetch mock that handles common API calls
 * Use this when you need API mocking in addition to store setup
 */
export function createStandardFetchMock(overrides = {}) {
  const mockData = {
    players: overrides.players || createMockPlayers(),
    users: overrides.users || createMockUsers(),
    rosters: overrides.rosters || createMockRosters(overrides.users || createMockUsers()),
    league: overrides.league || createMockLeagueData(),
    matchups: overrides.matchups || [],
    injuries: overrides.injuries || {},
    ...overrides
  }

  return (url) => {
    // More specific patterns first
    if (url.includes('/players/nfl') || url.includes('/players.json')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockData.players) })
    }
    if (url.includes('/rosters')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockData.rosters) })
    }
    if (url.includes('/users')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockData.users) })
    }
    if (url.includes('/matchups/')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockData.matchups) })
    }
    if (url.includes('/league/')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockData.league) })
    }
    if (url.includes('completed-weeks.json')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ weeks: {} }) })
    }
    if (url.includes('draft_picks.json')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    }
    if (url.includes('tokenbowl-api-proxy') || url.includes('/nfl/injuries')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockData.injuries) })
    }
    if (url.includes('youtube')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ latestVideo: null, latestShorts: [] }) })
    }
    // Default fallback
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
  }
}
