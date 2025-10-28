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

    // Mock week 8 matchups (incomplete - only Thursday games played)
    // This should NO LONGER affect the standings since we use API data
    store.allMatchups = {
      8: [
        [
          {
            roster_id: 1,
            points: 55.2,
            starters_points: [0.0, 3.9, 9.9, 14.4, 0.0, 0.0, 8.4, 11.6, 0.0, 7.0] // Many zeros
          },
          {
            roster_id: 2,
            points: 18.62,
            starters_points: [2.12, 7.9, 0.0, 3.6, 0.0, 0.0, 0.0, 0.0, 0.0, 5.0] // Many zeros
          }
        ]
      ]
    }

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
    expect(roster3.currentPoints).toBe(0)  // Defaults to 0
  })
})