<template>
  <div class="injury-alerts font-mono">
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
  color: var(--color-primary);
  margin: 0;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.alert-count {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-secondary);
  background: #000000;
  border: 2px solid var(--color-secondary);
  border-radius: 0;
  padding: 8px 16px;
  transition: all 0.3s ease;
}

.alert-count.critical {
  color: #ff0000;
  background: #000000;
  border-color: #ff0000;
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
  background: #000000;
  border: 2px solid var(--color-primary);
  border-radius: 0;
  padding: 16px;
  position: relative;
  transition: all 0.3s ease;
}

.alert-item:hover {
  background: var(--color-surface);
  transform: translateY(-4px);
  box-shadow: none;
}

.alert-item.severity-out {
  border-color: #ff0000;
  background: #000000;
}

.alert-item.severity-doubtful {
  border-color: #ff8c00;
  background: #000000;
}

.alert-item.severity-questionable {
  border-color: var(--color-secondary);
  background: #000000;
}

.alert-item.starter {
  box-shadow: 0 0 20px rgba(255, 107, 107, 0.3);
}

.alert-severity-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  border-radius: 0;
  position: relative;
}

.alert-severity-indicator.severity-out {
  background: #ff0000;
  color: #000000;
}

.alert-severity-indicator.severity-doubtful {
  background: #ff8c00;
  color: #000000;
}

.alert-severity-indicator.severity-questionable {
  background: var(--color-secondary);
  color: #000000;
}

.alert-severity-indicator.severity-probable {
  background: var(--color-primary);
  color: #000000;
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
  color: var(--color-text);
  text-transform: uppercase;
}

.player-position {
  font-size: 16px;
  font-weight: 600;
  color: #000000;
  background: var(--color-primary);
  padding: 4px 12px;
  border-radius: 0;
}

.player-team {
  font-size: 16px;
  color: var(--color-secondary);
  font-weight: 600;
}

.fantasy-team-badge {
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  padding: 6px 14px;
  border-radius: 0;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: none;
  border: 1px solid #ffffff;
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
  border-radius: 0;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.injury-status.severity-out {
  background: #000000;
  color: #ff0000;
  border: 1px solid #ff0000;
}

.injury-status.severity-doubtful {
  background: #000000;
  color: #ff8c00;
  border: 1px solid #ff8c00;
}

.injury-status.severity-questionable {
  background: #000000;
  color: var(--color-secondary);
  border: 1px solid var(--color-secondary);
}

.injury-status.severity-probable {
  background: #000000;
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
}

.injury-type {
  font-size: 16px;
  color: var(--color-text);
  font-weight: 500;
}

.injury-notes {
  font-size: 15px;
  color: var(--color-secondary);
  line-height: 1.5;
  font-style: italic;
}

.starter-badge {
  display: inline-block;
  font-size: 14px;
  font-weight: 700;
  color: #ff0000;
  background: #000000;
  border: 2px solid #ff0000;
  padding: 4px 12px;
  border-radius: 0;
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
  color: var(--color-secondary);
  gap: 20px;
}

.checkmark-icon {
  font-size: 100px;
  color: var(--color-primary);
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
  color: var(--color-primary);
  font-weight: 600;
}
</style>
