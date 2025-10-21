<template>
  <div class="box-score-container">
    <!-- Main box score - horizontal layout -->
    <div class="box-score">
      <!-- Away Team -->
      <div class="team" :class="{ 'has-possession': hasPossession(game.awayTeam.abbreviation) }">
        <div class="team-section">
          <div class="team-name">
            {{ game.awayTeam.abbreviation }}
            <span v-if="hasPossession(game.awayTeam.abbreviation)" class="possession-indicator">🏈</span>
          </div>
          <div class="team-logo">
            <img :src="game.awayTeam.logo" :alt="game.awayTeam.abbreviation" />
          </div>
          <div class="timeouts">
            <span v-for="i in 3" :key="i" class="timeout-dot" :class="{ 'used': i > game.awayTeam.timeoutsRemaining }"></span>
          </div>
        </div>
        <div class="team-score">{{ game.awayTeam.score }}</div>
      </div>

      <!-- Center - Quarter, Clock, and Down & Distance -->
      <div class="game-status-center">
        <div class="quarter">{{ quarterText }}</div>
        <div class="clock">{{ displayClock }}</div>
        <div v-if="game.situation && game.situation.down" class="down-distance">
          {{ game.situation.downDistanceText }}
        </div>
      </div>

      <!-- Home Team -->
      <div class="team" :class="{ 'has-possession': hasPossession(game.homeTeam.abbreviation) }">
        <div class="team-score">{{ game.homeTeam.score }}</div>
        <div class="team-section">
          <div class="team-name">
            {{ game.homeTeam.abbreviation }}
            <span v-if="hasPossession(game.homeTeam.abbreviation)" class="possession-indicator">🏈</span>
          </div>
          <div class="team-logo">
            <img :src="game.homeTeam.logo" :alt="game.homeTeam.abbreviation" />
          </div>
          <div class="timeouts">
            <span v-for="i in 3" :key="i" class="timeout-dot" :class="{ 'used': i > game.homeTeam.timeoutsRemaining }"></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onUnmounted } from 'vue'

export default {
  name: 'BoxScore',
  props: {
    game: {
      type: Object,
      required: true
    }
  },
  setup(props) {
    const displayClock = ref(props.game.clock || '0:00')
    let countdownInterval = null
    let lastApiUpdate = Date.now()
    let previousClock = props.game.clock

    const quarterText = computed(() => {
      const period = props.game.period
      if (period === 1) return '1ST'
      if (period === 2) return '2ND'
      if (period === 3) return '3RD'
      if (period === 4) return '4TH'
      if (period === 5) return 'OT'
      return 'PRE'
    })

    const parseClockToSeconds = (clockStr) => {
      if (!clockStr) return 0
      const parts = clockStr.split(':')
      const minutes = parseInt(parts[0], 10) || 0
      const seconds = parseInt(parts[1], 10) || 0
      return minutes * 60 + seconds
    }

    const formatSecondsToClockString = (totalSeconds) => {
      if (totalSeconds <= 0) return '0:00'
      const minutes = Math.floor(totalSeconds / 60)
      const seconds = totalSeconds % 60
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }

    const stopCountdown = () => {
      if (countdownInterval) {
        clearInterval(countdownInterval)
        countdownInterval = null
      }
    }

    const startCountdown = () => {
      stopCountdown()

      countdownInterval = setInterval(() => {
        // Stop countdown if game is not active
        if (!props.game.isActive) {
          stopCountdown()
          return
        }

        // Stop countdown if 4.5 seconds have passed since last API update
        const timeSinceLastUpdate = Date.now() - lastApiUpdate
        if (timeSinceLastUpdate > 4500) {
          stopCountdown()
          return
        }

        // Decrement clock by 1 second
        const currentSeconds = parseClockToSeconds(displayClock.value)
        if (currentSeconds > 0) {
          displayClock.value = formatSecondsToClockString(currentSeconds - 1)
        } else {
          stopCountdown()
        }
      }, 200)
    }

    // Watch for changes in game.clock
    watch(() => props.game.clock, (newClock) => {
      if (!newClock) return

      // Update display clock
      displayClock.value = newClock

      // Check if clock decreased (indicating running game)
      const newSeconds = parseClockToSeconds(newClock)
      const prevSeconds = parseClockToSeconds(previousClock)

      if (props.game.isActive && newSeconds < prevSeconds) {
        // Clock decreased, start countdown
        lastApiUpdate = Date.now()
        startCountdown()
      } else if (newSeconds >= prevSeconds) {
        // Clock increased or stayed same, stop countdown
        stopCountdown()
      }

      previousClock = newClock
    })

    // Watch for game active state changes
    watch(() => props.game.isActive, (isActive) => {
      if (!isActive) {
        stopCountdown()
      }
    })

    onUnmounted(() => {
      stopCountdown()
    })

    const hasPossession = (teamAbbr) => {
      return props.game.situation?.possession === teamAbbr
    }

    return {
      quarterText,
      displayClock,
      hasPossession
    }
  }
}
</script>

<style scoped>
/* Container */
.box-score-container {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* Main Box Score - Horizontal Layout */
.box-score {
  background: rgba(26, 26, 46, 0.95);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  overflow: hidden;
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  gap: 24px;
}

/* Teams */
.team {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  transition: all 0.3s ease;
  flex: 1;
  min-width: 0;
}

.team-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.team-name {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.8px;
  text-align: center;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.possession-indicator {
  font-size: 12px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

.team-logo {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.team-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.timeouts {
  display: flex;
  gap: 4px;
  justify-content: center;
  align-items: center;
}

.timeout-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #00d4ff;
  transition: all 0.3s ease;
}

.timeout-dot.used {
  background: rgba(255, 255, 255, 0.2);
  opacity: 0.3;
}

.team-score {
  font-size: 36px;
  font-weight: 700;
  color: #fff;
  font-variant-numeric: tabular-nums;
  min-width: 50px;
  text-align: center;
  line-height: 1;
}

/* Center Status */
.game-status-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 24px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  flex-shrink: 0;
}

.quarter {
  font-size: 14px;
  font-weight: 700;
  color: #00d4ff;
  letter-spacing: 0.5px;
}

.clock {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  font-variant-numeric: tabular-nums;
}

.down-distance {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  text-transform: uppercase;
  margin-top: 4px;
  opacity: 0.9;
}

/* Animations */
.box-score-container {
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
