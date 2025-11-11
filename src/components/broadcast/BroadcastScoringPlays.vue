<template>
  <div class="scoring-plays">
    <div class="panel-header">
      <h2>SCORING PLAYS</h2>
      <div class="play-count">{{ recentScoringPlays.length }} PLAYS</div>
    </div>

    <div class="plays-ticker">
      <div
        v-for="(play, index) in recentScoringPlays"
        :key="`${play.playerId}-${play.timestamp}-${index}`"
        class="play-item"
        v-motion
        :initial="{ opacity: 0, x: -40 }"
        :enter="{ opacity: 1, x: 0, transition: { duration: 500, delay: index * 30 } }"
      >
        <div class="play-time">
          {{ formatTimestamp(play.timestamp) }}
        </div>

        <div
          class="play-team-indicator"
          :style="{ background: play.teamColor }"
        ></div>

        <!-- Player Image -->
        <div class="play-player-image">
          <img
            :src="play.playerImageUrl"
            :alt="play.playerName"
            @error="handleImageError"
          />
        </div>

        <div class="play-content">
          <div class="play-header">
            <div class="play-team-info">
              <img
                v-if="play.teamLogo"
                :src="play.teamLogo"
                :alt="play.teamName"
                class="play-team-logo"
              />
              <span class="play-team">{{ play.teamName }}</span>
            </div>
            <span class="play-points" :class="getPointsClass(play.points)">
              +{{ formatPoints(play.points) }}
            </span>
          </div>
          <div class="play-player-info">
            <div class="play-player-name">
              {{ play.playerName }}
            </div>
            <div class="play-player-meta">
              <span class="play-player-position">{{ play.playerPosition }}</span>
              <span class="play-player-separator">•</span>
              <span class="play-player-team">{{ play.playerTeam }}</span>
            </div>
          </div>
        </div>

        <div class="play-animation">
          <div class="points-flash">{{ formatPoints(play.points) }}</div>
        </div>
      </div>

      <div v-if="recentScoringPlays.length === 0" class="no-plays">
        <div class="ticker-icon">📊</div>
        <p>Waiting for scoring plays...</p>
        <div class="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useBroadcastStore } from '../../stores/broadcast.js'

export default {
  name: 'BroadcastScoringPlays',
  setup() {
    const store = useBroadcastStore()

    const recentScoringPlays = computed(() => store.recentScoringPlays.slice(0, 5))

    const formatPoints = (points) => {
      return points ? points.toFixed(2) : '0.00'
    }

    const formatTimestamp = (timestamp) => {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    }

    const getPointsClass = (points) => {
      if (points >= 20) return 'huge'
      if (points >= 10) return 'big'
      if (points >= 5) return 'medium'
      return 'small'
    }

    const handleImageError = (event) => {
      // Hide broken images gracefully
      event.target.style.display = 'none'
    }

    return {
      recentScoringPlays,
      formatPoints,
      formatTimestamp,
      getPointsClass,
      handleImageError
    }
  }
}
</script>

<style scoped>
.scoring-plays {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px 16px 5px 16px;
  overflow: hidden;
  box-sizing: border-box;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.panel-header h2 {
  font-size: 42px;
  font-weight: 800;
  color: #ffffff;
  margin: 0;
  letter-spacing: 2px;
  text-transform: uppercase;
  background: linear-gradient(135deg, #00d4ff, #7b2ff7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.play-count {
  font-size: 20px;
  font-weight: 700;
  color: #00d4ff;
  background: rgba(0, 212, 255, 0.1);
  border: 2px solid rgba(0, 212, 255, 0.3);
  border-radius: 12px;
  padding: 8px 16px;
}

.plays-ticker {
  flex: 1;
  overflow: hidden; /* No scroll bars */
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.play-item {
  display: flex;
  align-items: center;
  gap: 20px;
  background: rgba(255, 255, 255, 0.03);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 20px;
  position: relative;
  transition: all 0.3s ease;
  overflow: hidden;
}

.play-item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(0, 255, 136, 0.4);
  transform: translateX(8px);
}

.play-time {
  font-size: 20px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  font-variant-numeric: tabular-nums;
  min-width: 100px;
}

.play-team-indicator {
  width: 8px;
  height: 120px;
  border-radius: 4px;
  box-shadow: 0 0 20px currentColor;
}

.play-player-image {
  width: 120px;
  height: 120px;
  flex-shrink: 0;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  border: 3px solid rgba(255, 255, 255, 0.1);
}

.play-player-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.play-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.play-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.play-team-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.play-team-logo {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.play-team {
  font-size: 32px;
  font-weight: 700;
  color: #00d4ff;
}

.play-points {
  font-size: 48px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.play-points.small {
  color: #ffffff;
}

.play-points.medium {
  color: #ffffff;
}

.play-points.big {
  color: #ffffff;
}

.play-points.huge {
  color: #ffffff;
}

@keyframes pointsPulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.play-player-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.play-player-name {
  font-size: 28px;
  color: #ffffff;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.play-player-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
}

.play-player-position {
  color: #00d4ff;
  font-weight: 700;
  text-transform: uppercase;
}

.play-player-separator {
  color: rgba(255, 255, 255, 0.3);
}

.play-player-team {
  color: rgba(255, 255, 255, 0.6);
  font-weight: 600;
}

.play-animation {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  pointer-events: none;
}

.play-item:hover .play-animation {
  animation: flashPoints 1s ease-out;
}

@keyframes flashPoints {
  0% {
    opacity: 0;
    transform: translateY(-50%) scale(0.5);
  }
  50% {
    opacity: 1;
    transform: translateY(-50%) scale(1.5);
  }
  100% {
    opacity: 0;
    transform: translateY(-50%) scale(2);
  }
}

.points-flash {
  font-size: 60px;
  font-weight: 900;
  color: #00d4ff;
  text-shadow: 0 0 40px rgba(0, 212, 255, 0.8);
}

.no-plays {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.4);
  gap: 20px;
}

.ticker-icon {
  font-size: 80px;
  opacity: 0.3;
}

.no-plays p {
  font-size: 24px;
  margin: 0;
}

.loading-dots {
  display: flex;
  gap: 12px;
}

.loading-dots span {
  width: 12px;
  height: 12px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  animation: dotPulse 1.5s ease-in-out infinite;
}

.loading-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.loading-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes dotPulse {
  0%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.3);
  }
}
</style>
