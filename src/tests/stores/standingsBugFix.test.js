import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLeagueStore } from '../../stores/league.js'

describe('Standings Bug Fix - Week 8 Incomplete Games', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useLeagueStore()
  })

  it('should NOT count week 8 standings when games are incomplete (Thursday only)', () => {
    // Mock league data with current week 8
    store.league = {
      settings: {
        leg: 8 // Current week is 8
      }
    }

    // Mock rosters
    store.rosters = [
      { roster_id: 1, user: { display_name: '718Rob' } },
      { roster_id: 2, user: { display_name: 'rickyrobinett' } }
    ]

    // Mock week 7 matchups (complete)
    store.allMatchups = {
      7: [
        [
          {
            roster_id: 1,
            points: 128.34,
            starters_points: [11.34, 7.2, 12.8, 12.9, 8.2, 13.5, 28.9, 6.5, 18.0, 9.0]
          },
          {
            roster_id: 2,
            points: 160.08,
            starters_points: [5.68, 8.4, 36.8, 33.3, 26.8, 21.9, 4.2, 11.0, 7.0, 5.0]
          }
        ]
      ],
      // Week 8 matchups (incomplete - only Thursday games played)
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

    // The standings should calculate through week 7 (not 8)
    // because week 8 has incomplete games (starters with 0 points)
    expect(standings).toBeDefined()
    expect(standings.length).toBe(2)

    // Verify the standings are calculated through week 7
    // Roster 2 won week 7 (160.08 > 128.34)
    const roster2 = standings.find(s => s.roster_id === 2)
    expect(roster2.currentRecord.wins).toBe(1)
    expect(roster2.currentRecord.losses).toBe(0)

    const roster1 = standings.find(s => s.roster_id === 1)
    expect(roster1.currentRecord.wins).toBe(0)
    expect(roster1.currentRecord.losses).toBe(1)
  })

  it('should count current week standings when ALL games are complete', () => {
    // Mock league data with current week 8
    store.league = {
      settings: {
        leg: 8
      }
    }

    store.rosters = [
      { roster_id: 1, user: { display_name: '718Rob' } },
      { roster_id: 2, user: { display_name: 'rickyrobinett' } }
    ]

    // Mock week 8 matchups (ALL COMPLETE - all starters have points)
    store.allMatchups = {
      7: [
        [
          {
            roster_id: 1,
            points: 128.34,
            starters_points: [11.34, 7.2, 12.8, 12.9, 8.2, 13.5, 28.9, 6.5, 18.0, 9.0]
          },
          {
            roster_id: 2,
            points: 160.08,
            starters_points: [5.68, 8.4, 36.8, 33.3, 26.8, 21.9, 4.2, 11.0, 7.0, 5.0]
          }
        ]
      ],
      8: [
        [
          {
            roster_id: 1,
            points: 145.5,
            starters_points: [12.5, 15.3, 19.9, 24.4, 18.2, 11.5, 18.4, 11.6, 9.3, 5.0] // All non-zero
          },
          {
            roster_id: 2,
            points: 138.2,
            starters_points: [10.1, 17.9, 14.8, 13.6, 16.5, 12.3, 9.2, 15.0, 11.8, 17.0] // All non-zero
          }
        ]
      ]
    }

    const standings = store.currentStandings

    // Now week 8 should be counted because ALL starters have non-zero points
    const roster1 = standings.find(s => s.roster_id === 1)
    const roster2 = standings.find(s => s.roster_id === 2)

    // Roster 2 won week 7, roster 1 won week 8
    expect(roster1.currentRecord.wins).toBe(1)
    expect(roster1.currentRecord.losses).toBe(1)
    expect(roster2.currentRecord.wins).toBe(1)
    expect(roster2.currentRecord.losses).toBe(1)
  })

  it('should handle missing starters_points data gracefully', () => {
    store.league = {
      settings: {
        leg: 8
      }
    }

    store.rosters = [
      { roster_id: 1, user: { display_name: '718Rob' } }
    ]

    // Week 8 with missing starters_points
    store.allMatchups = {
      7: [
        [
          {
            roster_id: 1,
            points: 128.34,
            starters_points: [11.34, 7.2, 12.8, 12.9, 8.2, 13.5, 28.9, 6.5, 18.0, 9.0]
          },
          {
            roster_id: 2,
            points: 160.08,
            starters_points: [5.68, 8.4, 36.8, 33.3, 26.8, 21.9, 4.2, 11.0, 7.0, 5.0]
          }
        ]
      ],
      8: [
        [
          {
            roster_id: 1,
            points: 55.2
            // No starters_points field
          },
          {
            roster_id: 2,
            points: 18.62
            // No starters_points field
          }
        ]
      ]
    }

    const standings = store.currentStandings

    // Should fall back to week 7 since week 8 has no starters_points
    expect(standings).toBeDefined()
  })
})
