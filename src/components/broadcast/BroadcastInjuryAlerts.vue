<template>
  <div class="injury-alerts">
    <div class="panel-header">
      <h2>INJURY ALERTS</h2>
      <div class="alert-count" :class="{ critical: hasCriticalInjuries }">
        {{ activeInjuryAlerts.length }} ALERTS
      </div>
    </div>

    <div class="alerts-container">
      <div
        v-for="(alert, index) in activeInjuryAlerts"
        :key="`${alert.playerId}-${alert.timestamp}`"
        class="alert-item"
        :class="[`severity-${alert.severity.toLowerCase()}`, { starter: alert.isStarter }]"
        v-motion
        :initial="{ opacity: 0, scale: 0.9 }"
        :enter="{ opacity: 1, scale: 1, transition: { duration: 500, delay: index * 50 } }"
      >
        <div class="alert-severity-indicator" :class="`severity-${alert.severity.toLowerCase()}`">
          <div class="severity-icon">
            {{ getSeverityIcon(alert.severity) }}
          </div>
        </div>

        <div class="alert-content">
          <div class="alert-header">
            <div class="player-info">
              <span class="player-name">{{ alert.playerName }}</span>
              <span class="player-position">{{ alert.position }}</span>
              <span class="player-team">{{ alert.team }}</span>
            </div>
            <div
              class="fantasy-team-badge"
              :style="{ background: alert.fantasyTeamColor }"
            >
              {{ alert.fantasyTeam }}
            </div>
          </div>

          <div class="injury-details">
            <div class="injury-status" :class="`severity-${alert.severity.toLowerCase()}`">
              {{ alert.gameStatus }}
            </div>
            <div v-if="alert.injury" class="injury-type">
              {{ alert.injury }}
            </div>
          </div>

          <div v-if="alert.notes" class="injury-notes">
            {{ truncateNotes(alert.notes) }}
          </div>

          <div v-if="alert.isStarter" class="starter-badge">
            ⚠️ STARTER
          </div>
        </div>

        <div class="alert-timestamp">
          {{ formatTime(alert.timestamp) }}
        </div>
      </div>

      <div v-if="activeInjuryAlerts.length === 0" class="no-alerts">
        <div class="checkmark-icon">✓</div>
        <p>No active injury alerts</p>
        <div class="status-message">All teams healthy</div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useBroadcastStore } from '../../stores/broadcast.js'

export default {
  name: 'BroadcastInjuryAlerts',
  setup() {
    const store = useBroadcastStore()

    const activeInjuryAlerts = computed(() => store.activeInjuryAlerts)

    const hasCriticalInjuries = computed(() => {
      return activeInjuryAlerts.value.some(alert =>
        alert.severity === 'OUT' || alert.severity === 'DOUBTFUL'
      )
    })

    const getSeverityIcon = (severity) => {
      const icons = {
        'OUT': '🚫',
        'DOUBTFUL': '⚠️',
        'QUESTIONABLE': '❓',
        'PROBABLE': 'ℹ️',
        'CLEAR': '✓'
      }
      return icons[severity] || '•'
    }

    const formatTime = (timestamp) => {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    }

    const truncateNotes = (notes) => {
      if (!notes) return ''
      return notes.length > 120 ? notes.substring(0, 120) + '...' : notes
    }

    return {
      activeInjuryAlerts,
      hasCriticalInjuries,
      getSeverityIcon,
      formatTime,
      truncateNotes
    }
  }
}
</script>

<style scoped>
.injury-alerts {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px 16px 5px 16px;
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
  background: linear-gradient(135deg, #ff6b6b, #feca57);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.alert-count {
  font-size: 20px;
  font-weight: 700;
  color: #feca57;
  background: rgba(254, 202, 87, 0.1);
  border: 2px solid rgba(254, 202, 87, 0.3);
  border-radius: 12px;
  padding: 8px 16px;
  transition: all 0.3s ease;
}

.alert-count.critical {
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.15);
  border-color: rgba(255, 107, 107, 0.5);
  animation: criticalPulse 2s ease-in-out infinite;
}

@keyframes criticalPulse {
  0%, 100% {
    box-shadow: 0 0 0 rgba(255, 107, 107, 0.4);
  }
  50% {
    box-shadow: 0 0 20px rgba(255, 107, 107, 0.6);
  }
}

.alerts-container {
  flex: 1;
  overflow: hidden; /* No scroll bars */
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.alert-item {
  display: flex;
  align-items: stretch;
  gap: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  position: relative;
  transition: all 0.3s ease;
}

.alert-item:hover {
  background: rgba(255, 255, 255, 0.05);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.alert-item.severity-out {
  border-color: rgba(255, 107, 107, 0.5);
  background: rgba(255, 107, 107, 0.05);
}

.alert-item.severity-doubtful {
  border-color: rgba(255, 140, 0, 0.5);
  background: rgba(255, 140, 0, 0.05);
}

.alert-item.severity-questionable {
  border-color: rgba(254, 202, 87, 0.5);
  background: rgba(254, 202, 87, 0.05);
}

.alert-item.starter {
  box-shadow: 0 0 20px rgba(255, 107, 107, 0.3);
}

.alert-severity-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  border-radius: 8px;
  position: relative;
}

.alert-severity-indicator.severity-out {
  background: rgba(255, 107, 107, 0.2);
}

.alert-severity-indicator.severity-doubtful {
  background: rgba(255, 140, 0, 0.2);
}

.alert-severity-indicator.severity-questionable {
  background: rgba(254, 202, 87, 0.2);
}

.alert-severity-indicator.severity-probable {
  background: rgba(78, 205, 196, 0.2);
}

.severity-icon {
  font-size: 36px;
  animation: iconPulse 2s ease-in-out infinite;
}

@keyframes iconPulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.15);
  }
}

.alert-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.alert-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.player-info {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.player-name {
  font-size: 24px;
  font-weight: 700;
  color: #ffffff;
}

.player-position {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.1);
  padding: 4px 12px;
  border-radius: 6px;
}

.player-team {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 600;
}

.fantasy-team-badge {
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  padding: 6px 14px;
  border-radius: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.injury-details {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.injury-status {
  font-size: 18px;
  font-weight: 700;
  padding: 6px 14px;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.injury-status.severity-out {
  background: rgba(255, 107, 107, 0.3);
  color: #ff6b6b;
}

.injury-status.severity-doubtful {
  background: rgba(255, 140, 0, 0.3);
  color: #ff8c00;
}

.injury-status.severity-questionable {
  background: rgba(254, 202, 87, 0.3);
  color: #feca57;
}

.injury-status.severity-probable {
  background: rgba(78, 205, 196, 0.3);
  color: #4ecdc4;
}

.injury-type {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}

.injury-notes {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.5;
  font-style: italic;
}

.starter-badge {
  display: inline-block;
  font-size: 14px;
  font-weight: 700;
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.15);
  border: 2px solid rgba(255, 107, 107, 0.4);
  padding: 4px 12px;
  border-radius: 6px;
  animation: starterPulse 2s ease-in-out infinite;
}

@keyframes starterPulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.alert-timestamp {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.4);
  font-variant-numeric: tabular-nums;
  min-width: 60px;
  text-align: right;
  align-self: flex-start;
}

.no-alerts {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.4);
  gap: 20px;
}

.checkmark-icon {
  font-size: 100px;
  color: #00d4ff;
  opacity: 0.5;
  animation: checkmarkPulse 3s ease-in-out infinite;
}

@keyframes checkmarkPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.7;
  }
}

.no-alerts p {
  font-size: 24px;
  margin: 0;
}

.status-message {
  font-size: 18px;
  color: #00d4ff;
  font-weight: 600;
}
</style>
