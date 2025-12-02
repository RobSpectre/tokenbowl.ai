import { describe, it, expect } from 'vitest'
import {
  randomNormal,
  preparePlayerForSimulation,
  estimateGameProgress,
  calculateWinProbability,
  getPlayerProjectionAndVariance
} from '../../utils/winProbability.js'

describe('winProbability', () => {
  describe('randomNormal', () => {
    it('should generate values around the mean', () => {
      const samples = []
      for (let i = 0; i < 1000; i++) {
        samples.push(randomNormal(10, 2))
      }

      const mean = samples.reduce((sum, v) => sum + v, 0) / samples.length
      expect(mean).toBeGreaterThan(9)
      expect(mean).toBeLessThan(11)
    })
  })

  describe('preparePlayerForSimulation', () => {
    it('should handle scheduled game (not started)', () => {
      const player = {
        playerId: '1234',
        currentPoints: 0,
        projection: 20,
        variance: 25,
        gameStatus: 'scheduled',
        percentComplete: 0
      }

      const result = preparePlayerForSimulation(player)

      expect(result.currentPoints).toBe(0)
      expect(result.remainingProjection).toBe(20)
      expect(result.remainingStdDev).toBe(5) // sqrt(25)
    })

    it('should handle finished game', () => {
      const player = {
        playerId: '1234',
        currentPoints: 18.4,
        projection: 20,
        variance: 25,
        gameStatus: 'final',
        percentComplete: 1.0
      }

      const result = preparePlayerForSimulation(player)

      expect(result.currentPoints).toBe(18.4)
      expect(result.remainingProjection).toBe(0)
      expect(result.remainingStdDev).toBe(0)
    })

    it('should handle in-progress game at halftime', () => {
      const player = {
        playerId: '1234',
        currentPoints: 12,
        projection: 24,
        variance: 36,
        gameStatus: 'in_progress',
        percentComplete: 0.5
      }

      const result = preparePlayerForSimulation(player)

      expect(result.currentPoints).toBe(12)
      expect(result.remainingProjection).toBe(12) // 24 * 0.5
      expect(result.remainingStdDev).toBeCloseTo(4.24, 1) // sqrt(36 * 0.5) = sqrt(18)
    })
  })

  describe('estimateGameProgress', () => {
    it('should return 0 for game that hasnt started', () => {
      const gameStart = new Date('2024-11-17T13:00:00')
      const currentTime = new Date('2024-11-17T12:00:00')

      const progress = estimateGameProgress(gameStart, currentTime)
      expect(progress).toBe(0)
    })

    it('should return approx 0.28 for game in first hour (60 mins / 210)', () => {
      const gameStart = new Date('2024-11-17T13:00:00')
      const currentTime = new Date('2024-11-17T14:00:00') // 60 mins

      const progress = estimateGameProgress(gameStart, currentTime)
      expect(progress).toBeCloseTo(60 / 210, 2)
    })

    it('should return approx 0.57 for game at 2 hours (120 mins / 210)', () => {
      const gameStart = new Date('2024-11-17T13:00:00')
      const currentTime = new Date('2024-11-17T15:00:00') // 120 mins

      const progress = estimateGameProgress(gameStart, currentTime)
      expect(progress).toBeCloseTo(120 / 210, 2)
    })

    it('should return 1.0 for finished game (> 3.5 hours)', () => {
      const gameStart = new Date('2024-11-17T13:00:00')
      const currentTime = new Date('2024-11-17T16:40:00') // 220 mins

      const progress = estimateGameProgress(gameStart, currentTime)
      expect(progress).toBe(1.0)
    })
  })

  describe('calculateWinProbability (Analytical)', () => {
    it('should give 100% win probability when team1 is certain to win', () => {
      const team1 = [{
        playerId: '1',
        currentPoints: 100,
        projection: 0,
        variance: 0,
        gameStatus: 'final',
        percentComplete: 1.0
      }]

      const team2 = [{
        playerId: '2',
        currentPoints: 50,
        projection: 0,
        variance: 0,
        gameStatus: 'final',
        percentComplete: 1.0
      }]

      const result = calculateWinProbability(team1, team2)

      expect(result.team1WinProbability).toBe(1)
      expect(result.team2WinProbability).toBe(0)
      expect(result.method).toBe('analytical_gaussian')
    })

    it('should give 0% win probability when team1 is certain to lose', () => {
      const team1 = [{
        playerId: '1',
        currentPoints: 50,
        projection: 0,
        variance: 0,
        gameStatus: 'final',
        percentComplete: 1.0
      }]

      const team2 = [{
        playerId: '2',
        currentPoints: 100,
        projection: 0,
        variance: 0,
        gameStatus: 'final',
        percentComplete: 1.0
      }]

      const result = calculateWinProbability(team1, team2)

      expect(result.team1WinProbability).toBe(0)
      expect(result.team2WinProbability).toBe(1)
    })

    it('should give 50% when teams are perfectly tied with equal variance', () => {
      const team1 = [{
        playerId: '1',
        currentPoints: 0,
        projection: 100,
        variance: 100,
        gameStatus: 'scheduled',
        percentComplete: 0
      }]

      const team2 = [{
        playerId: '2',
        currentPoints: 0,
        projection: 100,
        variance: 100,
        gameStatus: 'scheduled',
        percentComplete: 0
      }]

      const result = calculateWinProbability(team1, team2)

      expect(result.team1WinProbability).toBeCloseTo(0.5, 4)
    })

    it('should handle mixed game states correctly', () => {
      const team1 = [
        {
          playerId: '1',
          currentPoints: 20,
          projection: 20,
          variance: 0,
          gameStatus: 'final',
          percentComplete: 1.0
        },
        {
          playerId: '2',
          currentPoints: 10,
          projection: 20,
          variance: 16,
          gameStatus: 'in_progress',
          percentComplete: 0.5
        }
      ]

      const team2 = [
        {
          playerId: '4',
          currentPoints: 25,
          projection: 25,
          variance: 0,
          gameStatus: 'final',
          percentComplete: 1.0
        },
        {
          playerId: '5',
          currentPoints: 8,
          projection: 20,
          variance: 16,
          gameStatus: 'in_progress',
          percentComplete: 0.5
        }
      ]

      // Team 1: 30 current, ~10 remaining. Total ~40. Variance ~8.
      // Team 2: 33 current, ~10 remaining. Total ~43. Variance ~8.
      // Team 2 should be favored.

      const result = calculateWinProbability(team1, team2)

      expect(result.team1WinProbability).toBeLessThan(0.5)
      expect(result.team2WinProbability).toBeGreaterThan(0.5)
    })

    it('should return projected scores', () => {
      const team1 = [{
        playerId: '1',
        currentPoints: 10,
        projection: 20,
        variance: 25,
        gameStatus: 'scheduled',
        percentComplete: 0
      }]

      const team2 = [{
        playerId: '2',
        currentPoints: 5,
        projection: 15,
        variance: 25,
        gameStatus: 'scheduled',
        percentComplete: 0
      }]

      const result = calculateWinProbability(team1, team2)

      expect(result.projectedScore.team1).toBe(30) // 10 + 20
      expect(result.projectedScore.team2).toBe(20) // 5 + 15
    })
  })

  describe('getPlayerProjectionAndVariance', () => {
    it('should calculate projection from historical data', () => {
      const playerStats = {
        weeks: [
          { points: 20 },
          { points: 18 },
          { points: 22 },
          { points: 16 }
        ]
      }

      const result = getPlayerProjectionAndVariance('1234', playerStats, 'QB')

      expect(result.projection).toBe(19) // (20 + 18 + 22 + 16) / 4
      expect(result.variance).toBeGreaterThan(0)
    })

    it('should use only last 4 weeks of data', () => {
      const playerStats = {
        weeks: [
          { points: 5 },
          { points: 5 },
          { points: 5 },
          { points: 20 },
          { points: 18 },
          { points: 22 },
          { points: 16 }
        ]
      }

      const result = getPlayerProjectionAndVariance('1234', playerStats, 'QB')

      // Should only use last 4 weeks: 20, 18, 22, 16
      expect(result.projection).toBe(19)
    })
  })
})
