<template>
  <div class="broadcast-container">
    <!-- 4K Grid Layout: 2 columns - Head to Head on left, rest on right -->
    <div class="broadcast-grid">
      <!-- Left: Matchup Detail (full height) -->
      <div
        class="broadcast-panel"
        v-motion
        :initial="{ opacity: 0, x: -50 }"
        :enter="{ opacity: 1, x: 0, transition: { duration: 800, delay: 100 } }"
      >
        <BroadcastMatchupDetail />
      </div>

      <!-- Right Side: Vertical layout with Matchups List + Bottom Panels -->
      <div class="right-column">
        <!-- Top: Current Matchups (taller) -->
        <div
          class="broadcast-panel matchups-panel"
          v-motion
          :initial="{ opacity: 0, x: 50 }"
          :enter="{ opacity: 1, x: 0, transition: { duration: 800, delay: 200 } }"
        >
          <BroadcastMatchupsList />
        </div>

        <!-- Bottom: Split into two panels (shorter) -->
        <div class="bottom-panels">
          <!-- Scoring Plays -->
          <div
            class="broadcast-panel"
            v-motion
            :initial="{ opacity: 0, y: 50 }"
            :enter="{ opacity: 1, y: 0, transition: { duration: 800, delay: 300 } }"
          >
            <BroadcastScoringPlays />
          </div>

          <!-- Injury Alerts -->
          <div
            class="broadcast-panel"
            v-motion
            :initial="{ opacity: 0, y: 50 }"
            :enter="{ opacity: 1, y: 0, transition: { duration: 800, delay: 400 } }"
          >
            <BroadcastInjuryAlerts />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { onMounted, onUnmounted, computed } from 'vue'
import { useBroadcastStore } from '../stores/broadcast.js'
import BroadcastMatchupsList from '../components/broadcast/BroadcastMatchupsList.vue'
import BroadcastMatchupDetail from '../components/broadcast/BroadcastMatchupDetail.vue'
import BroadcastScoringPlays from '../components/broadcast/BroadcastScoringPlays.vue'
import BroadcastInjuryAlerts from '../components/broadcast/BroadcastInjuryAlerts.vue'

export default {
  name: 'Broadcast',
  components: {
    BroadcastMatchupsList,
    BroadcastMatchupDetail,
    BroadcastScoringPlays,
    BroadcastInjuryAlerts
  },
  setup() {
    const store = useBroadcastStore()

    const lastRefresh = computed(() => store.lastRefresh)

    const formatTime = (timestamp) => {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }

    onMounted(async () => {
      console.log('[BROADCAST] Page mounted, initializing...')
      await store.initialize()
    })

    onUnmounted(() => {
      console.log('[BROADCAST] Page unmounted, stopping auto-refresh...')
      store.stopAutoRefresh()
    })

    return {
      lastRefresh,
      formatTime
    }
  }
}
</script>

<style scoped>
/* 4K Layout - 3840x2160 optimized */
.broadcast-container {
  width: 3840px;
  height: 2160px;
  background: #00B140; /* Darker chroma key green - easier to key */
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.broadcast-grid {
  display: grid;
  grid-template-columns: 1fr 1fr; /* 2 equal columns */
  gap: 12px;
  padding: 16px 16px 5px 16px;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

/* Right column layout */
.right-column {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
}

/* Matchups panel - sized to fit 5 matchups without scroll (50%) */
.matchups-panel {
  flex: 5;
  min-height: 0;
}

/* Bottom panels split horizontally (50%) */
.bottom-panels {
  flex: 5;
  display: flex;
  gap: 12px;
  min-height: 0;
}

.bottom-panels .broadcast-panel {
  flex: 1;
  min-width: 0;
}

.broadcast-panel {
  background: #1a1a2e;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  overflow: hidden;
  position: relative;
  box-sizing: border-box;
}

.broadcast-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #00d4ff, #7b2ff7, #f107a3);
  opacity: 0.6;
}

/* Chromakey friendly - blue background alternative */
.broadcast-container.chromakey {
  background: #0000ff;
}
</style>
