<template>
  <div class="player-goal-container">
    <div
      class="player-goal-content w-11/12 max-w-4xl"
      v-motion
      :initial="{ opacity: 0, scale: 0.9 }"
      :enter="{ opacity: 1, scale: 1, transition: { duration: 600 } }"
    >
      <div v-if="loading" class="loading">
        <div class="loading-spinner"></div>
        <p>Loading player data...</p>
      </div>

      <div v-else-if="error" class="error">
        <div class="error-icon">⚠️</div>
        <p>{{ error }}</p>
      </div>

      <div v-else-if="playerData" class="player-goal-display">
        <!-- Left: Player Avatar -->
        <div class="player-avatar">
          <img
            :src="playerImageUrl"
            :alt="playerData.name"
            @error="handleImageError"
          />
        </div>

        <!-- Center: Player Info and Progress -->
        <div class="player-info-section">
          <div class="player-header">
            <h1 class="player-name">{{ playerData.name }}</h1>
            <div class="player-meta">
              <span class="player-position">{{ playerData.position }}</span>
              <span class="separator">•</span>
              <span class="player-team">{{ playerData.team }}</span>
            </div>
          </div>

          <div class="progress-section">
            <div class="progress-bar-container">
              <div
                class="progress-bar"
                :style="{
                  width: progressPercentage + '%',
                  background: progressColor
                }"
              >
                <span class="progress-text">{{ progressPercentage.toFixed(0) }}%</span>
              </div>
            </div>
            <div class="progress-stats">
              <span class="current-points">{{ currentPoints.toFixed(1) }}</span>
              <span class="separator">/</span>
              <span class="goal-points">{{ goal.toFixed(1) }}</span>
            </div>
          </div>
        </div>

        <!-- Right: Model Logo -->
        <div class="model-section">
          <img
            v-if="teamInfo?.logo"
            :src="teamInfo.logo"
            :alt="teamInfo.aiModel"
            class="model-logo"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { getLeagueData, getMatchups } from '../sleeperApi.js'
import { getTeamInfo } from '../teamMappings.js'
import { useLeagueStore } from '../stores/league.js'

export default {
  name: 'PlayerGoal',
  setup() {
    const route = useRoute()
    const loading = ref(true)
    const error = ref(null)
    const playerData = ref(null)
    const currentPoints = ref(0)
    const teamInfo = ref(null)
    const playerId = ref(null)
    const goal = ref(0)
    let refreshInterval = null

    const playerImageUrl = computed(() => {
      if (!playerId.value) return ''

      // Check if defense team
      const isDefenseTeam = typeof playerId.value === 'string' && /^[A-Z]{2,3}$/.test(playerId.value)

      if (isDefenseTeam) {
        return `https://sleepercdn.com/images/team_logos/nfl/${playerId.value.toLowerCase()}.png`
      }

      return `https://sleepercdn.com/content/nfl/players/thumb/${playerId.value}.jpg`
    })

    const progressPercentage = computed(() => {
      if (goal.value === 0) return 0
      return Math.min((currentPoints.value / goal.value) * 100, 100)
    })

    const progressColor = computed(() => {
      const percentage = progressPercentage.value
      if (percentage >= 100) return 'linear-gradient(90deg, #00ff88, #00d4ff)'
      if (percentage >= 75) return 'linear-gradient(90deg, #ffaa00, #ff6600)'
      if (percentage >= 50) return 'linear-gradient(90deg, #00d4ff, #7b2ff7)'
      return 'linear-gradient(90deg, #7b2ff7, #ff0066)'
    })

    const pointsRemaining = computed(() => {
      return Math.max(goal.value - currentPoints.value, 0)
    })

    const handleImageError = (event) => {
      event.target.style.display = 'none'
    }

    const loadData = async () => {
      try {
        // Get query params
        const playerIdParam = route.query.playerId
        const goalParam = route.query.goal

        if (!playerIdParam || !goalParam) {
          error.value = 'Missing required parameters: playerId and goal'
          loading.value = false
          return
        }

        playerId.value = playerIdParam
        goal.value = parseFloat(goalParam)

        if (isNaN(goal.value)) {
          error.value = 'Invalid goal parameter'
          loading.value = false
          return
        }

        // Load player data from league store
        const leagueStore = useLeagueStore()
        await leagueStore.initialize()

        const player = leagueStore.players[playerId.value]
        if (!player) {
          error.value = `Player not found: ${playerId.value}`
          loading.value = false
          return
        }

        // Get player name
        const playerName = player.full_name || `${player.first_name || ''} ${player.last_name || ''}`.trim()

        playerData.value = {
          id: playerId.value,
          name: playerName,
          position: player.position || 'N/A',
          team: player.team || 'N/A'
        }

        // Load league data to find which roster has this player
        const leagueData = await getLeagueData()
        const rosters = leagueData.rosters
        const users = leagueData.users
        const currentWeek = leagueData.league?.settings?.leg || 1

        // Find roster that has this player
        let rosterWithPlayer = null
        for (const roster of rosters) {
          if (roster.players && roster.players.includes(playerId.value)) {
            rosterWithPlayer = roster
            break
          }
        }

        if (rosterWithPlayer) {
          const user = users.find(u => u.user_id === rosterWithPlayer.owner_id)
          if (user?.display_name) {
            teamInfo.value = getTeamInfo(user.display_name)
          }
        }

        // Get current week matchups to find player's score
        const matchups = await getMatchups(currentWeek)

        if (rosterWithPlayer) {
          const matchup = matchups.find(m => m.roster_id === rosterWithPlayer.roster_id)
          if (matchup?.players_points && matchup.players_points[playerId.value]) {
            currentPoints.value = matchup.players_points[playerId.value]
          }
        }

        loading.value = false
      } catch (err) {
        console.error('[PLAYER GOAL] Error loading data:', err)
        error.value = 'Failed to load player data'
        loading.value = false
      }
    }

    onMounted(async () => {
      console.log('[PLAYER GOAL] Component mounted')
      await loadData()

      // Refresh every 30 seconds
      refreshInterval = setInterval(loadData, 30000)
    })

    onUnmounted(() => {
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
    })

    return {
      loading,
      error,
      playerData,
      currentPoints,
      goal,
      teamInfo,
      playerImageUrl,
      progressPercentage,
      progressColor,
      pointsRemaining,
      handleImageError
    }
  }
}
</script>

<style scoped>
.player-goal-container {
  width: 100vw;
  height: 100vh;
  background: var(--color-background);
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
}

.player-goal-content {
  height: 100px;
  background: #000000;
  border: 1px solid var(--color-primary);
  border-radius: 0;
  padding: 8px;
  display: flex;
  align-items: center;
}

.loading,
.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--color-text);
  font-size: 14px;
  width: 100%;
  height: 100%;
}

.loading-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid var(--color-primary);
  border-top-color: transparent;
  border-radius: 0;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon {
  font-size: 40px;
}

.player-goal-display {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 100%;
}

.player-avatar {
  width: 80px;
  height: 80px;
  border-radius: 0;
  overflow: hidden;
  background: #000000;
  border: 1px solid var(--color-secondary);
  flex-shrink: 0;
}

.player-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.player-info-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.player-header {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.player-name {
  font-size: 20px;
  font-weight: 900;
  color: var(--color-text);
  margin: 0;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.player-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
}

.player-position {
  color: var(--color-primary);
  font-weight: 700;
  text-transform: uppercase;
}

.separator {
  color: var(--color-secondary);
}

.player-team {
  color: var(--color-text);
  font-weight: 600;
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.progress-bar-container {
  width: 100%;
  height: 24px;
  background: #000000;
  border-radius: 0;
  overflow: hidden;
  border: 1px solid var(--color-primary);
  position: relative;
}

.progress-bar {
  height: 100%;
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: width 0.6s ease, background 0.3s ease;
  position: relative;
  min-width: 35px;
  background: var(--color-primary) !important;
}

.progress-text {
  font-size: 12px;
  font-weight: 900;
  color: #000000;
  text-shadow: none;
}

.progress-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.current-points {
  color: var(--color-primary);
}

.goal-points {
  color: var(--color-secondary);
}

.model-section {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.model-logo {
  width: 50px;
  height: 50px;
  object-fit: contain;
}
</style>
