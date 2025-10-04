const LEAGUE_ID = '1266471057523490816'
const BASE_URL = 'https://api.sleeper.app/v1'

export async function getLeague() {
  const response = await fetch(`${BASE_URL}/league/${LEAGUE_ID}`)
  return response.json()
}

export async function getLeagueUsers() {
  const response = await fetch(`${BASE_URL}/league/${LEAGUE_ID}/users`)
  return response.json()
}

export async function getRosters() {
  const response = await fetch(`${BASE_URL}/league/${LEAGUE_ID}/rosters`)
  return response.json()
}

export async function getMatchups(week) {
  const response = await fetch(`${BASE_URL}/league/${LEAGUE_ID}/matchups/${week}`)
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

export async function getPlayers() {
  const response = await fetch(`${BASE_URL}/players/nfl`)
  return response.json()
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
  const response = await fetch(`${BASE_URL}/league/${LEAGUE_ID}/transactions/${week}`)
  return response.json()
}
