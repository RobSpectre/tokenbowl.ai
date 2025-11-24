import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLeagueStore } from '../../stores/league.js'

describe('Standings Bug Fix - Use API Records Instead of Recalculating', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useLeagueStore()
  })

  it('should use API standings data directly instead of recalculating from matchups', () => {
    // Mock league data with current week 8
    store.league = {
      settings: {
        leg: 8 // Current week is 8
      }
    }

    // Mock rosters with actual API data (wins/losses from API)
    store.rosters = [
      {
        roster_id: 1,
        user: { display_name: '718Rob' },
        settings: { wins: 3, losses: 5, ties: 0, fpts: 1088 }  // API shows 3-5 record
      },
      {
        roster_id: 2,
        user: { display_name: 'rickyrobinett' },
        settings: { wins: 7, losses: 1, ties: 0, fpts: 1133 }  // API shows 7-1 record
      }
    ]

    // Mock allMatchups with data that sums to the expected fpts totals
    // getPointsThroughWeek calculates from matchup data, not roster.settings.fpts
    store.allMatchups = {
      1: [[{ roster_id: 1, points: 136 }, { roster_id: 2, points: 141.625 }]],
      2: [[{ roster_id: 1, points: 136 }, { roster_id: 2, points: 141.625 }]],
      3: [[{ roster_id: 1, points: 136 }, { roster_id: 2, points: 141.625 }]],
      4: [[{ roster_id: 1, points: 136 }, { roster_id: 2, points: 141.625 }]],
      5: [[{ roster_id: 1, points: 136 }, { roster_id: 2, points: 141.625 }]],
      6: [[{ roster_id: 1, points: 136 }, { roster_id: 2, points: 141.625 }]],
      7: [[{ roster_id: 1, points: 136 }, { roster_id: 2, points: 141.625 }]],
      8: [[{ roster_id: 1, points: 136 }, { roster_id: 2, points: 141.625 }]]
    }
    // 136 * 8 = 1088, 141.625 * 8 = 1133

    // Get current standings
    const standings = store.currentStandings

    expect(standings).toBeDefined()
    expect(standings.length).toBe(2)

    // Find each roster in standings
    const roster1 = standings.find(s => s.roster_id === 1)
    const roster2 = standings.find(s => s.roster_id === 2)

    expect(roster1).toBeDefined()
    expect(roster2).toBeDefined()

    // Should show actual API records (3-5 and 7-1) regardless of incomplete games
    expect(roster1.currentRecord.wins).toBe(3)
    expect(roster1.currentRecord.losses).toBe(5)
    expect(roster1.currentRecord.ties).toBe(0)
    expect(roster1.currentPoints).toBe(1088)

    expect(roster2.currentRecord.wins).toBe(7)
    expect(roster2.currentRecord.losses).toBe(1)
    expect(roster2.currentRecord.ties).toBe(0)
    expect(roster2.currentPoints).toBe(1133)

    // Verify sorting (roster 2 should be first with 7 wins)
    expect(standings[0].roster_id).toBe(2)
    expect(standings[1].roster_id).toBe(1)
  })

  it('should properly sort standings by wins then by points', () => {
    store.league = {
      settings: {
        leg: 8
      }
    }

    store.rosters = [
      {
        roster_id: 1,
        user: { display_name: 'Team1' },
        settings: { wins: 5, losses: 3, ties: 0, fpts: 1000 }
      },
      {
        roster_id: 2,
        user: { display_name: 'Team2' },
        settings: { wins: 5, losses: 3, ties: 0, fpts: 1100 }  // Same record, more points
      },
      {
        roster_id: 3,
        user: { display_name: 'Team3' },
        settings: { wins: 6, losses: 2, ties: 0, fpts: 950 }  // More wins
      }
    ]

    // Mock allMatchups - getPointsThroughWeek calculates from matchup data
    // Points per week: roster1=125, roster2=137.5, roster3=118.75 (x8 weeks = 1000, 1100, 950)
    store.allMatchups = {
      1: [[{ roster_id: 1, points: 125 }, { roster_id: 2, points: 137.5 }], [{ roster_id: 3, points: 118.75 }]],
      2: [[{ roster_id: 1, points: 125 }, { roster_id: 2, points: 137.5 }], [{ roster_id: 3, points: 118.75 }]],
      3: [[{ roster_id: 1, points: 125 }, { roster_id: 2, points: 137.5 }], [{ roster_id: 3, points: 118.75 }]],
      4: [[{ roster_id: 1, points: 125 }, { roster_id: 2, points: 137.5 }], [{ roster_id: 3, points: 118.75 }]],
      5: [[{ roster_id: 1, points: 125 }, { roster_id: 2, points: 137.5 }], [{ roster_id: 3, points: 118.75 }]],
      6: [[{ roster_id: 1, points: 125 }, { roster_id: 2, points: 137.5 }], [{ roster_id: 3, points: 118.75 }]],
      7: [[{ roster_id: 1, points: 125 }, { roster_id: 2, points: 137.5 }], [{ roster_id: 3, points: 118.75 }]],
      8: [[{ roster_id: 1, points: 125 }, { roster_id: 2, points: 137.5 }], [{ roster_id: 3, points: 118.75 }]]
    }

    const standings = store.currentStandings

    // Should be sorted by wins first, then by points
    expect(standings[0].roster_id).toBe(3)  // 6 wins
    expect(standings[1].roster_id).toBe(2)  // 5 wins, 1100 points
    expect(standings[2].roster_id).toBe(1)  // 5 wins, 1000 points
  })

  it('should handle missing settings data gracefully', () => {
    store.league = {
      settings: {
        leg: 8
      }
    }

    store.rosters = [
      {
        roster_id: 1,
        user: { display_name: 'Team1' }
        // No settings property
      },
      {
        roster_id: 2,
        user: { display_name: 'Team2' },
        settings: {}  // Empty settings
      },
      {
        roster_id: 3,
        user: { display_name: 'Team3' },
        settings: { wins: 3, losses: 5 }  // Missing ties and fpts
      }
    ]

    // No allMatchups data - getPointsThroughWeek will return 0 for all
    store.allMatchups = {}

    const standings = store.currentStandings

    expect(standings).toBeDefined()
    expect(standings.length).toBe(3)

    // Should use fallback values of 0
    const roster1 = standings.find(s => s.roster_id === 1)
    expect(roster1.currentRecord.wins).toBe(0)
    expect(roster1.currentRecord.losses).toBe(0)
    expect(roster1.currentRecord.ties).toBe(0)
    expect(roster1.currentPoints).toBe(0)

    const roster2 = standings.find(s => s.roster_id === 2)
    expect(roster2.currentRecord.wins).toBe(0)
    expect(roster2.currentRecord.losses).toBe(0)
    expect(roster2.currentRecord.ties).toBe(0)
    expect(roster2.currentPoints).toBe(0)

    const roster3 = standings.find(s => s.roster_id === 3)
    expect(roster3.currentRecord.wins).toBe(3)
    expect(roster3.currentRecord.losses).toBe(5)
    expect(roster3.currentRecord.ties).toBe(0)  // Defaults to 0
    expect(roster3.currentPoints).toBe(0)  // No matchup data, so 0 points
  })
})