const LEAGUE_ID = '1266471057523490816'
const BASE_URL = 'https://api.sleeper.app/v1'

// Cache for transaction rounds to prevent duplicate API calls
// Each call to getTransactions() was fetching all 20 rounds
let transactionRoundsCache = null
let transactionRoundsCacheTimestamp = null
let transactionRoundsPromise = null
const TRANSACTION_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Export function to reset cache (useful for testing)
export function resetTransactionCache() {
  transactionRoundsCache = null
  transactionRoundsCacheTimestamp = null
  transactionRoundsPromise = null
}

export async function getLeague() {
  // Cache-busting v2 - timestamp query prevents CDN/browser caching stale data
  const response = await fetch(`${BASE_URL}/league/${LEAGUE_ID}?_t=${Date.now()}`)
  return response.json()
}

export async function getLeagueUsers() {
  // Add cache-busting timestamp to ensure fresh data
  const response = await fetch(`${BASE_URL}/league/${LEAGUE_ID}/users?_t=${Date.now()}`)
  return response.json()
}

export async function getRosters() {
  // Add cache-busting timestamp to ensure fresh data
  const response = await fetch(`${BASE_URL}/league/${LEAGUE_ID}/rosters?_t=${Date.now()}`)
  return response.json()
}

export async function getMatchups(week) {
  // Add cache-busting timestamp to ensure fresh data
  const response = await fetch(`${BASE_URL}/league/${LEAGUE_ID}/matchups/${week}?_t=${Date.now()}`)
  return response.json()
}

export async function getLeagueData() {
  try {
    const [league, users, rosters] = await Promise.all([
      getLeague(),
      getLeagueUsers(),
      getRosters()
    ])

    // Create a map of user_id to user data
    const userMap = {}
    users.forEach(user => {
      userMap[user.user_id] = user
    })

    // Enhance rosters with user information
    const enhancedRosters = rosters.map(roster => ({
      ...roster,
      user: userMap[roster.owner_id]
    }))

    // Sort by wins descending, then points
    enhancedRosters.sort((a, b) => {
      if (b.settings.wins !== a.settings.wins) {
        return b.settings.wins - a.settings.wins
      }
      return (b.settings.fpts || 0) - (a.settings.fpts || 0)
    })

    return {
      league,
      rosters: enhancedRosters,
      users
    }
  } catch (error) {
    console.error('Error fetching league data:', error)
    throw error
  }
}

export async function getCurrentMatchups() {
  try {
    const league = await getLeague()
    const currentWeek = league.settings.leg || 1
    const matchups = await getMatchups(currentWeek)
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

    return {
      week: currentWeek,
      matchups: Object.values(matchupGroups)
    }
  } catch (error) {
    console.error('Error fetching current matchups:', error)
    throw error
  }
}

export async function getDrafts() {
  const response = await fetch(`${BASE_URL}/league/${LEAGUE_ID}/drafts`)
  return response.json()
}

export async function getDraftPicks(draftId) {
  const response = await fetch(`${BASE_URL}/draft/${draftId}/picks`)
  return response.json()
}

export async function getPlayers(bustCache = false) {
  // Use local JSON file with top 500 players instead of API call
  const url = bustCache
    ? `/data/players.json?_t=${Date.now()}`
    : `/data/players.json`
  const response = await fetch(url, {
    cache: bustCache ? 'reload' : 'default'
  })
  return response.json()
}

// Cache for all NFL players from Sleeper API
let allPlayersCache = null
let allPlayersCacheTimestamp = null
const ALL_PLAYERS_CACHE_DURATION = 60 * 60 * 1000 // 1 hour

/**
 * Get only relevant players for the league
 * Note: getPlayers() now returns top 500 players from local JSON file,
 * so this function adds any rostered/transacted players that
 * might not be in the top 500 by fetching from Sleeper API.
 */
export async function getRelevantPlayers(bustCache = false) {
  try {
    // Fetch top 500 players from local JSON file
    const topPlayers = await getPlayers(bustCache)
    console.log(`Loaded ${Object.keys(topPlayers).length} players from local data file`)

    // Fetch rosters to identify all rostered player IDs
    const rosters = await getRosters()
    const rosteredPlayerIds = new Set()

    rosters.forEach(roster => {
      // Add all players from the roster (players array)
      if (roster.players) {
        roster.players.forEach(playerId => rosteredPlayerIds.add(playerId))
      }
      // Add starters
      if (roster.starters) {
        roster.starters.forEach(playerId => rosteredPlayerIds.add(playerId))
      }
      // Add taxi squad
      if (roster.taxi) {
        roster.taxi.forEach(playerId => rosteredPlayerIds.add(playerId))
      }
      // Add reserve
      if (roster.reserve) {
        roster.reserve.forEach(playerId => rosteredPlayerIds.add(playerId))
      }
    })

    // Find player IDs that are rostered but not in our top 500
    const missingPlayerIds = Array.from(rosteredPlayerIds).filter(id => !topPlayers[id])

    if (missingPlayerIds.length === 0) {
      console.log('All rostered players found in local data')
      return topPlayers
    }

    console.log(`Found ${missingPlayerIds.length} rostered players not in local data:`, missingPlayerIds)

    // Check if we need to fetch all players from Sleeper API
    const isCacheFresh = allPlayersCacheTimestamp &&
                         (Date.now() - allPlayersCacheTimestamp < ALL_PLAYERS_CACHE_DURATION)

    let allPlayers
    if (isCacheFresh && allPlayersCache && !bustCache) {
      console.log('Using cached Sleeper all-players data')
      allPlayers = allPlayersCache
    } else {
      console.log('Fetching all players from Sleeper API...')
      const response = await fetch(`${BASE_URL}/players/nfl`)
      allPlayers = await response.json()

      // Cache the result
      allPlayersCache = allPlayers
      allPlayersCacheTimestamp = Date.now()
      console.log(`Fetched ${Object.keys(allPlayers).length} players from Sleeper API`)
    }

    // Add missing players to our top 500
    const enhancedPlayers = { ...topPlayers }
    let addedCount = 0

    missingPlayerIds.forEach(playerId => {
      if (allPlayers[playerId]) {
        enhancedPlayers[playerId] = allPlayers[playerId]
        addedCount++
      } else {
        console.warn(`Player ${playerId} not found in Sleeper API`)
      }
    })

    console.log(`Added ${addedCount} missing players. Total: ${Object.keys(enhancedPlayers).length} players`)

    return enhancedPlayers
  } catch (error) {
    console.error('Error fetching players:', error)
    // Fallback to just the top 500 if something goes wrong
    const topPlayers = await getPlayers(bustCache)
    console.log(`Fallback: using ${Object.keys(topPlayers).length} players from local data file`)
    return topPlayers
  }
}

export async function getDraftData() {
  try {
    const drafts = await getDrafts()
    if (!drafts || drafts.length === 0) {
      return null
    }

    const draftId = drafts[0].draft_id
    const [picks, players, users] = await Promise.all([
      getDraftPicks(draftId),
      getPlayers(),
      getLeagueUsers()
    ])

    // Create user map
    const userMap = {}
    users.forEach(user => {
      userMap[user.user_id] = user
    })

    // Enhance picks with player and user data
    const enhancedPicks = picks.map(pick => ({
      ...pick,
      player: players[pick.player_id],
      user: userMap[pick.picked_by]
    }))

    return {
      draft: drafts[0],
      picks: enhancedPicks,
      players
    }
  } catch (error) {
    console.error('Error fetching draft data:', error)
    throw error
  }
}

export async function getTransactions(week) {
  // Sleeper uses "rounds" not "weeks" for transactions
  // A round increments each time waivers process
  // We need to fetch all rounds and filter by the "leg" field (which is the NFL week)

  // Check if we have cached rounds that are still fresh
  const isCacheFresh = transactionRoundsCacheTimestamp &&
                       (Date.now() - transactionRoundsCacheTimestamp < TRANSACTION_CACHE_DURATION)

  let allRounds
  if (isCacheFresh && transactionRoundsCache) {
    // Use cached rounds
    allRounds = transactionRoundsCache
  } else if (transactionRoundsPromise) {
    // Another call is already fetching - wait for it
    allRounds = await transactionRoundsPromise
  } else {
    // Create and store the promise so concurrent calls can await it
    transactionRoundsPromise = (async () => {
      // Fetch up to 20 rounds (should cover the entire season)
      // We fetch in parallel for speed
      const roundPromises = []
      for (let round = 1; round <= 20; round++) {
        roundPromises.push(
          fetch(`${BASE_URL}/league/${LEAGUE_ID}/transactions/${round}`)
            .then(res => res.json())
            .catch(() => []) // Ignore errors for rounds that don't exist
        )
      }

      const rounds = await Promise.all(roundPromises)

      // Cache the rounds for future calls
      transactionRoundsCache = rounds
      transactionRoundsCacheTimestamp = Date.now()
      transactionRoundsPromise = null

      return rounds
    })()

    allRounds = await transactionRoundsPromise
  }

  // Combine all transactions and filter by week (leg field)
  const allTransactions = []
  for (const roundTransactions of allRounds) {
    if (Array.isArray(roundTransactions)) {
      for (const transaction of roundTransactions) {
        // Filter by leg (NFL week) - leg field indicates which week the transaction belongs to
        if (transaction.leg === week) {
          allTransactions.push(transaction)
        }
      }
    }
  }

  return allTransactions
}
