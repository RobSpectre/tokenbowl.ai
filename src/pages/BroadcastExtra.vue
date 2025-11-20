<template>
  <div class="broadcast-extra-container font-mono">
    <div class="box-scores-grid">
      <BoxScore
        v-for="game in liveGames"
        :key="game.id"
        :game="game"
        v-motion
        :initial="{ opacity: 0, scale: 0.9 }"
        :enter="{ opacity: 1, scale: 1, transition: { duration: 600, delay: liveGames.indexOf(game) * 100 } }"
      />

      <div
        v-if="liveGames.length === 0"
        class="no-games-message"
        v-motion
        :initial="{ opacity: 0 }"
        :enter="{ opacity: 1, transition: { duration: 800 } }"
      >
        <div class="icon">🏈</div>
        <div class="title">No Live Games</div>
        <div class="subtitle">Check back during game time</div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import { getLiveGames } from '../espnApi.js'
import BoxScore from '../components/broadcast/BoxScore.vue'

export default {
  name: 'BroadcastExtra',
  components: {
    BoxScore
  },
  setup() {
    const liveGames = ref([])
    const loading = ref(true)
    const error = ref(null)
    let refreshInterval = null

    const loadGames = async () => {
      try {
        console.log('[BROADCAST-EXTRA] Loading live games...')
        const games = await getLiveGames()

        // Filter to only show active (in-progress) games
        liveGames.value = games.filter(game => game.isActive)

        console.log(`[BROADCAST-EXTRA] Loaded ${liveGames.value.length} live games`)
        loading.value = false
        error.value = null
      } catch (err) {
        console.error('[BROADCAST-EXTRA] Error loading games:', err)
        error.value = err.message
        loading.value = false
      }
    }

    const startAutoRefresh = () => {
      // Refresh every 5 seconds
      refreshInterval = setInterval(async () => {
        console.log('[BROADCAST-EXTRA] Auto-refreshing...')
        await loadGames()
      }, 5000)
    }

    const stopAutoRefresh = () => {
      if (refreshInterval) {
        clearInterval(refreshInterval)
        refreshInterval = null
        console.log('[BROADCAST-EXTRA] Auto-refresh stopped')
      }
    }

    onMounted(async () => {
      await loadGames()
      startAutoRefresh()
    })

    onUnmounted(() => {
      stopAutoRefresh()
    })

    return {
      liveGames,
      loading,
      error
    }
  }
}
</script>

<style scoped>
/* Broadcast Extra - Smaller components for overlays */
.broadcast-extra-container {
  width: 100vw;
  height: 100vh;
  background: #000000;
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  padding: 20px;
  box-sizing: border-box;
}

.box-scores-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 450px));
  gap: 16px;
  justify-content: center;
  align-content: start;
}

.no-games-message {
  grid-column: 1 / -1;
  text-align: center;
  padding: 80px 20px;
  color: var(--color-secondary);
}

.no-games-message .icon {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.5;
  color: var(--color-primary);
}

.no-games-message .title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--color-text);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.no-games-message .subtitle {
  font-size: 16px;
  color: var(--color-secondary);
}

@media (max-width: 768px) {
  .box-scores-grid {
    grid-template-columns: 1fr;
  }
}
</style>
