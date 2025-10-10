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
  const url = bustCache
    ? `${BASE_URL}/players/nfl?_t=${Date.now()}`
    : `${BASE_URL}/players/nfl`
  const response = await fetch(url, {
    cache: bustCache ? 'reload' : 'default'
  })
  return response.json()
}

/**
 * Get only relevant players for the league
 * Includes:
 * 1. All rostered players (~150)
 * 2. All players from transactions (~100)
 * 3. Top 400 players by search_rank (likely waiver targets)
 * Total: ~500-600 players (95% reduction from 11,400)
 */
export async function getRelevantPlayers(bustCache = false) {
  try {
    // Fetch all players first
    const allPlayers = await getPlayers(bustCache)

    // Try to get rosters and transactions for filtering
    // If this fails (e.g., in test environment), just return all players
    let rosters = []
    let transactions = []

    try {
      rosters = await getRosters()
    } catch (err) {
      console.warn('Could not fetch rosters for filtering:', err.message)
      return allPlayers // Fallback to all players
    }

    try {
      // Get transactions for all weeks to catch dropped/traded players
      const transactionPromises = Array.from({ length: 18 }, (_, i) =>
        getTransactions(i + 1).catch(() => [])
      )
      transactions = await Promise.all(transactionPromises)
    } catch (err) {
      console.warn('Could not fetch transactions for filtering:', err.message)
      // Continue with just roster filtering
    }

    // Collect all relevant player IDs
    const relevantPlayerIds = new Set()

    // Add all rostered players
    rosters.forEach(roster => {
      if (roster.players) {
        roster.players.forEach(playerId => relevantPlayerIds.add(playerId))
      }
    })

    // Add all players from transactions
    const allTransactions = transactions.flat()
    allTransactions.forEach(transaction => {
      if (transaction.adds) {
        Object.keys(transaction.adds).forEach(playerId => relevantPlayerIds.add(playerId))
      }
      if (transaction.drops) {
        Object.keys(transaction.drops).forEach(playerId => relevantPlayerIds.add(playerId))
      }
    })

    // Add top 400 players by search_rank to cover likely waiver pickups
    // This prevents "Player 4984" bug when new players are added
    const topPlayers = Object.entries(allPlayers)
      .filter(([_, player]) => player.search_rank && player.search_rank > 0)
      .sort((a, b) => a[1].search_rank - b[1].search_rank)
      .slice(0, 400)
      .map(([playerId, _]) => playerId)

    topPlayers.forEach(playerId => relevantPlayerIds.add(playerId))

    // If we couldn't collect any player IDs, return all players
    if (relevantPlayerIds.size === 0) {
      console.warn('No relevant player IDs found, returning all players')
      return allPlayers
    }

    // Filter players to only include relevant ones
    const relevantPlayers = {}
    relevantPlayerIds.forEach(playerId => {
      if (allPlayers[playerId]) {
        relevantPlayers[playerId] = allPlayers[playerId]
      }
    })

    console.log(`Filtered ${Object.keys(allPlayers).length} players down to ${Object.keys(relevantPlayers).length} relevant players (rosters + transactions + top 400)`)

    return relevantPlayers
  } catch (error) {
    console.error('Error fetching relevant players, falling back to full list:', error)
    // Fallback to full player list if filtering fails
    return getPlayers(bustCache)
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
