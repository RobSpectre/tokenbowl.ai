import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  randomNormal,
  preparePlayerForSimulation,
  estimateGameProgress,
  calculateWinProbability,
  calculateWinProbabilityNormalApproximation,
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

    it('should generate values with correct standard deviation', () => {
      const samples = []
      const targetMean = 20
      const targetStdDev = 5

      for (let i = 0; i < 5000; i++) {
        samples.push(randomNormal(targetMean, targetStdDev))
      }

      const mean = samples.reduce((sum, v) => sum + v, 0) / samples.length
      const variance = samples.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / samples.length
      const stdDev = Math.sqrt(variance)

      expect(stdDev).toBeGreaterThan(4.5)
      expect(stdDev).toBeLessThan(5.5)
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

    it('should handle in-progress game at 75% complete', () => {
      const player = {
        playerId: '1234',
        currentPoints: 15,
        projection: 20,
        variance: 16,
        gameStatus: 'in_progress',
        percentComplete: 0.75
      }

      const result = preparePlayerForSimulation(player)

      expect(result.currentPoints).toBe(15)
      expect(result.remainingProjection).toBe(5) // 20 * 0.25
      expect(result.remainingStdDev).toBe(2) // sqrt(16 * 0.25) = sqrt(4)
    })

    it('should handle player with default values', () => {
      const player = {
        playerId: '1234'
      }

      const result = preparePlayerForSimulation(player)

      expect(result.currentPoints).toBe(0)
      expect(result.remainingProjection).toBe(0)
      expect(result.remainingStdDev).toBe(0)
    })
  })

  describe('estimateGameProgress', () => {
    it('should return 0 for game that hasnt started', () => {
      const gameStart = new Date('2024-11-17T13:00:00')
      const currentTime = new Date('2024-11-17T12:00:00')

      const progress = estimateGameProgress(gameStart, currentTime)
      expect(progress).toBe(0)
    })

    it('should return 0.25 for game in first hour', () => {
      const gameStart = new Date('2024-11-17T13:00:00')
      const currentTime = new Date('2024-11-17T13:30:00')

      const progress = estimateGameProgress(gameStart, currentTime)
      expect(progress).toBe(0.25)
    })

    it('should return 0.50 for game at halftime', () => {
      const gameStart = new Date('2024-11-17T13:00:00')
      const currentTime = new Date('2024-11-17T14:30:00')

      const progress = estimateGameProgress(gameStart, currentTime)
      expect(progress).toBe(0.50)
    })

    it('should return 0.75 for game in third quarter', () => {
      const gameStart = new Date('2024-11-17T13:00:00')
      const currentTime = new Date('2024-11-17T15:30:00')

      const progress = estimateGameProgress(gameStart, currentTime)
      expect(progress).toBe(0.75)
    })

    it('should return 0.90 for game in late 4th quarter', () => {
      const gameStart = new Date('2024-11-17T13:00:00')
      const currentTime = new Date('2024-11-17T16:10:00')

      const progress = estimateGameProgress(gameStart, currentTime)
      expect(progress).toBe(0.90)
    })

    it('should return 1.0 for finished game', () => {
      const gameStart = new Date('2024-11-17T13:00:00')
      const currentTime = new Date('2024-11-17T16:30:00')

      const progress = estimateGameProgress(gameStart, currentTime)
      expect(progress).toBe(1.0)
    })
  })

  describe('calculateWinProbability', () => {
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

      const result = calculateWinProbability(team1, team2, 1000)

      expect(result.team1WinProbability).toBe(1)
      expect(result.team2WinProbability).toBe(0)
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

      const result = calculateWinProbability(team1, team2, 1000)

      expect(result.team1WinProbability).toBe(0)
      expect(result.team2WinProbability).toBe(1)
    })

    it('should give approximately 50% when teams are evenly matched', () => {
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

      const result = calculateWinProbability(team1, team2, 10000)

      expect(result.team1WinProbability).toBeGreaterThan(0.45)
      expect(result.team1WinProbability).toBeLessThan(0.55)
    })

    it('should handle mixed game states (some finished, some in progress, some scheduled)', () => {
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
        },
        {
          playerId: '3',
          currentPoints: 0,
          projection: 15,
          variance: 25,
          gameStatus: 'scheduled',
          percentComplete: 0
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
        },
        {
          playerId: '6',
          currentPoints: 0,
          projection: 12,
          variance: 16,
          gameStatus: 'scheduled',
          percentComplete: 0
        }
      ]

      const result = calculateWinProbability(team1, team2, 5000)

      // Team1 current: 30, Team2 current: 33
      // Team1 remaining: ~20, Team2 remaining: ~22
      // Team2 should have slight edge
      expect(result.team1WinProbability).toBeGreaterThan(0.3)
      expect(result.team1WinProbability).toBeLessThan(0.6)
      expect(result.simulations).toBe(5000)
    })

    it('should include confidence interval', () => {
      const team1 = [{
        playerId: '1',
        currentPoints: 60,
        projection: 20,
        variance: 25,
        gameStatus: 'in_progress',
        percentComplete: 0.5
      }]

      const team2 = [{
        playerId: '2',
        currentPoints: 50,
        projection: 20,
        variance: 25,
        gameStatus: 'in_progress',
        percentComplete: 0.5
      }]

      const result = calculateWinProbability(team1, team2, 5000)

      expect(result.confidenceInterval).toBeDefined()
      expect(result.confidenceInterval.lower).toBeGreaterThanOrEqual(0)
      expect(result.confidenceInterval.upper).toBeLessThanOrEqual(1)
      expect(result.confidenceInterval.lower).toBeLessThan(result.team1WinProbability)
      expect(result.confidenceInterval.upper).toBeGreaterThan(result.team1WinProbability)
    })

    it('should handle empty player arrays', () => {
      const result = calculateWinProbability([], [], 1000)

      // With no players, both teams have 0 points
      // Since we use > (not >=), team1 never wins on a tie
      expect(result.team1WinProbability).toBe(0)
      expect(result.team2WinProbability).toBe(1)
    })
  })

  describe('calculateWinProbabilityNormalApproximation', () => {
    it('should give 100% when team1 is certain to win', () => {
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

      const result = calculateWinProbabilityNormalApproximation(team1, team2)

      expect(result).toBe(1)
    })

    it('should give 0% when team1 is certain to lose', () => {
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

      const result = calculateWinProbabilityNormalApproximation(team1, team2)

      expect(result).toBe(0)
    })

    it('should give approximately 50% when tied with no variance', () => {
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
        currentPoints: 100,
        projection: 0,
        variance: 0,
        gameStatus: 'final',
        percentComplete: 1.0
      }]

      const result = calculateWinProbabilityNormalApproximation(team1, team2)

      expect(result).toBe(0.5)
    })

    it('should be close to Monte Carlo results', () => {
      const team1 = [
        {
          playerId: '1',
          currentPoints: 20,
          projection: 20,
          variance: 16,
          gameStatus: 'in_progress',
          percentComplete: 0.5
        },
        {
          playerId: '2',
          currentPoints: 0,
          projection: 15,
          variance: 25,
          gameStatus: 'scheduled',
          percentComplete: 0
        }
      ]

      const team2 = [
        {
          playerId: '3',
          currentPoints: 18,
          projection: 18,
          variance: 16,
          gameStatus: 'in_progress',
          percentComplete: 0.5
        },
        {
          playerId: '4',
          currentPoints: 0,
          projection: 17,
          variance: 25,
          gameStatus: 'scheduled',
          percentComplete: 0
        }
      ]

      const normalApprox = calculateWinProbabilityNormalApproximation(team1, team2)
      const monteCarlo = calculateWinProbability(team1, team2, 10000)

      // Should be within 5% of each other
      expect(Math.abs(normalApprox - monteCarlo.team1WinProbability)).toBeLessThan(0.05)
    })
  })

  describe('getPlayerProjectionAndVariance', () => {
    it('should use weekly projection when available', () => {
      const weeklyProjections = {
        'patrick mahomes': { projectedPoints: 22.5 }
      }

      const result = getPlayerProjectionAndVariance('1234', null, 'QB', weeklyProjections, 'Patrick Mahomes')

      expect(result.projection).toBe(22.5)
      expect(result.variance).toBeGreaterThan(0)
      expect(result.source).toBe('weekly_projection')
    })

    it('should calculate projection from historical data when no weekly projection', () => {
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
      expect(result.source).toBe('historical_average')
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
      expect(result.source).toBe('historical_average')
    })

    it('should return QB defaults when no stats available', () => {
      const result = getPlayerProjectionAndVariance('1234', null, 'QB')

      expect(result.projection).toBe(18)
      expect(result.variance).toBe(36)
      expect(result.source).toBe('position_default')
    })

    it('should return RB defaults when no stats available', () => {
      const result = getPlayerProjectionAndVariance('1234', null, 'RB')

      expect(result.projection).toBe(12)
      expect(result.variance).toBe(25)
      expect(result.source).toBe('position_default')
    })

    it('should return WR defaults when no stats available', () => {
      const result = getPlayerProjectionAndVariance('1234', null, 'WR')

      expect(result.projection).toBe(11)
      expect(result.variance).toBe(25)
      expect(result.source).toBe('position_default')
    })

    it('should return TE defaults when no stats available', () => {
      const result = getPlayerProjectionAndVariance('1234', null, 'TE')

      expect(result.projection).toBe(8)
      expect(result.variance).toBe(16)
      expect(result.source).toBe('position_default')
    })

    it('should return K defaults when no stats available', () => {
      const result = getPlayerProjectionAndVariance('1234', null, 'K')

      expect(result.projection).toBe(8)
      expect(result.variance).toBe(9)
      expect(result.source).toBe('position_default')
    })

    it('should return DEF defaults when no stats available', () => {
      const result = getPlayerProjectionAndVariance('1234', null, 'DEF')

      expect(result.projection).toBe(7)
      expect(result.variance).toBe(16)
      expect(result.source).toBe('position_default')
    })

    it('should have minimum variance of 1', () => {
      const playerStats = {
        weeks: [
          { points: 10 },
          { points: 10 },
          { points: 10 },
          { points: 10 }
        ]
      }

      const result = getPlayerProjectionAndVariance('1234', playerStats, 'QB')

      expect(result.projection).toBe(10)
      expect(result.variance).toBe(1) // Minimum variance
    })
  })
})
