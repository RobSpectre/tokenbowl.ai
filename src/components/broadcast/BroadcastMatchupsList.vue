<template>
  <div class="matchups-list">
    <div class="panel-header">
      <h2>TOKEN BOWL</h2>
      <div class="week-controls">
        <button
          @click="previousWeek"
          :disabled="currentWeek <= 1 || isRefreshing"
          class="week-arrow"
          aria-label="Previous week"
        >
          ‹
        </button>
        <div class="week-indicator">WEEK {{ currentWeek }}</div>
        <button
          @click="nextWeek"
          :disabled="currentWeek >= 18 || isRefreshing"
          class="week-arrow"
          aria-label="Next week"
        >
          ›
        </button>
      </div>
    </div>

    <div class="matchups-container">
      <div
        v-for="(matchup, index) in enrichedMatchups"
        :key="matchup.matchup_id"
        class="matchup-card"
        :class="{ selected: matchup.matchup_id === selectedMatchupId }"
        @click="selectMatchup(matchup.matchup_id)"
        v-motion
        :initial="{ opacity: 0, x: -30 }"
        :enter="{ opacity: 1, x: 0, transition: { duration: 500, delay: index * 100 } }"
      >
        <!-- Desktop Layout (side by side with VS in the middle) -->
        <div class="matchup-inner">
          <!-- Team 1 -->
          <div class="team-side" v-if="matchup.teams[0]" :class="{ 'scoring': isTeamScoring(matchup.teams[0]) }">
            <div class="team-content">
              <img
                v-if="matchup.teams[0].teamInfo?.logoPath"
                :src="matchup.teams[0].teamInfo.logoPath"
                :alt="matchup.teams[0].teamInfo?.aiModel"
                class="team-logo"
                :class="{ 'invert-logo': matchup.teams[0].teamInfo?.invertLogo }"
              />
              <div class="team-info">
                <div class="team-name">{{ matchup.teams[0].teamInfo?.aiModel || 'Unknown' }}</div>
                <div class="team-owner">{{ matchup.teams[0].teamInfo?.owner || 'Unknown' }}</div>
                <div class="team-meta">
                  <div
                    :class="getRecordColor(matchup.teams[0])"
                    class="team-record"
                  >
                    {{ getRecordText(matchup.teams[0]) }}
                  </div>
                  <div
                    v-for="badge in getTeamBadges(matchup.teams[0])"
                    :key="badge.type"
                    :class="[badge.color, badge.color === 'bg-yellow-500' ? 'text-black' : 'text-white']"
                    class="team-badge"
                  >
                    {{ badge.label }}
                  </div>
                </div>
              </div>
            </div>
            <div class="score-section">
              <div class="team-score">{{ formatPoints(matchup.teams[0].points) }}</div>
              <div v-if="isWeekComplete" class="win-loss-indicator">
                <span class="win-text" v-if="matchup.teams[0].points > matchup.teams[1].points">W</span>
                <span class="loss-text" v-else-if="matchup.teams[0].points < matchup.teams[1].points">L</span>
              </div>
            </div>
          </div>

          <!-- VS Separator -->
          <div class="vs-separator">
            <div class="vs-badge">
              <span class="vs-text">VS</span>
            </div>
          </div>

          <!-- Team 2 -->
          <div class="team-side" v-if="matchup.teams[1]" :class="{ 'scoring': isTeamScoring(matchup.teams[1]) }">
            <div class="score-section">
              <div class="team-score">{{ formatPoints(matchup.teams[1].points) }}</div>
              <div v-if="isWeekComplete" class="win-loss-indicator">
                <span class="win-text" v-if="matchup.teams[1].points > matchup.teams[0].points">W</span>
                <span class="loss-text" v-else-if="matchup.teams[1].points < matchup.teams[0].points">L</span>
              </div>
            </div>
            <div class="team-content">
              <div class="team-info text-right">
                <div class="team-name">{{ matchup.teams[1].teamInfo?.aiModel || 'Unknown' }}</div>
                <div class="team-owner">{{ matchup.teams[1].teamInfo?.owner || 'Unknown' }}</div>
                <div class="team-meta justify-end">
                  <div
                    v-for="badge in getTeamBadges(matchup.teams[1])"
                    :key="badge.type"
                    :class="[badge.color, badge.color === 'bg-yellow-500' ? 'text-black' : 'text-white']"
                    class="team-badge"
                  >
                    {{ badge.label }}
                  </div>
                  <div
                    :class="getRecordColor(matchup.teams[1])"
                    class="team-record"
                  >
                    {{ getRecordText(matchup.teams[1]) }}
                  </div>
                </div>
              </div>
              <img
                v-if="matchup.teams[1].teamInfo?.logoPath"
                :src="matchup.teams[1].teamInfo.logoPath"
                :alt="matchup.teams[1].teamInfo?.aiModel"
                class="team-logo"
                :class="{ 'invert-logo': matchup.teams[1].teamInfo?.invertLogo }"
              />
            </div>
          </div>
        </div>

        <!-- Point Margin Bar Chart -->
        <div
          class="point-differential"
          v-if="matchup.teams[0] && matchup.teams[1] && (matchup.teams[0].points || 0) !== (matchup.teams[1].points || 0)"
        >
          <div class="differential-container">
            <!-- Center Line -->
            <div class="center-line"></div>

            <!-- Bar pointing toward winner (team 0 on left) -->
            <div
              v-if="matchup.teams[0].points > matchup.teams[1].points"
              class="differential-bar left-bar"
              :style="{ width: `${Math.min(((matchup.teams[0].points - matchup.teams[1].points) / 70) * 45, 45)}%` }"
            >
              <span class="differential-value">
                {{ Math.abs((matchup.teams[0].points || 0) - (matchup.teams[1].points || 0)).toFixed(2) }}
              </span>
            </div>

            <!-- Bar pointing toward winner (team 1 on right) -->
            <div
              v-else-if="matchup.teams[1].points > matchup.teams[0].points"
              class="differential-bar right-bar"
              :style="{ width: `${Math.min(((matchup.teams[1].points - matchup.teams[0].points) / 70) * 45, 45)}%` }"
            >
              <span class="differential-value">
                {{ Math.abs((matchup.teams[0].points || 0) - (matchup.teams[1].points || 0)).toFixed(2) }}
              </span>
            </div>

            <!-- Tie indicator (only if week complete) -->
            <div v-else class="tie-indicator">
              <span class="tie-text">TIE</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="enrichedMatchups.length === 0" class="no-data">
        <div class="loading-spinner"></div>
        <p>Loading matchups...</p>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, watch, ref } from 'vue'
import { useBroadcastStore } from '../../stores/broadcast.js'
import { playScoreSound } from '../../utils/soundEffects.js'

export default {
  name: 'BroadcastMatchupsList',
  setup() {
    const store = useBroadcastStore()
    const scoringTeams = ref(new Set())
    const animationTimeout = ref(null)

    const enrichedMatchups = computed(() => store.enrichedMatchups)
    const selectedMatchupId = computed(() => store.selectedMatchupId)
    const isWeekComplete = computed(() => store.isWeekComplete())
    const currentWeek = computed(() => store.currentWeek)
    const isRefreshing = computed(() => store.isRefreshing)

    // Watch for score changes
    watch(
      () => store.lastScoreChangeTimestamp,
      (newTimestamp) => {
        if (!newTimestamp) return

        // Get all teams that scored
        const teamChanges = store.scoreChanges.filter(change => change.type === 'team')

        if (teamChanges.length > 0) {
          // Play sound for the largest score increase
          const largestIncrease = Math.max(...teamChanges.map(c => c.scoreIncrease))
          playScoreSound(largestIncrease)

          // Add teams to scoring animation set
          teamChanges.forEach(change => {
            scoringTeams.value.add(change.rosterId)
          })

          // Clear animations after 2 seconds
          if (animationTimeout.value) {
            clearTimeout(animationTimeout.value)
          }

          animationTimeout.value = setTimeout(() => {
            scoringTeams.value.clear()
            store.clearScoreChanges()
          }, 2000)
        }
      }
    )

    const selectMatchup = (matchupId) => {
      store.selectMatchup(matchupId)
    }

    const formatPoints = (points) => {
      return points ? points.toFixed(2) : '0.00'
    }

    const getRecordText = (team) => {
      if (!team?.roster_id || !store.currentWeek) return '0-0'
      const record = store.getRecordThroughWeek(team.roster_id, store.currentWeek - 1)
      return `${record.wins}-${record.losses}`
    }

    const getRecordColor = (team) => {
      if (!team?.roster_id || !store.currentWeek) return 'text-gray-400'
      const record = store.getRecordThroughWeek(team.roster_id, store.currentWeek - 1)
      if (record.wins > record.losses) return 'text-green-400'
      else if (record.wins < record.losses) return 'text-red-400'
      return 'text-gray-400'
    }

    const getTeamBadges = (team) => {
      if (!team?.starters || !store.currentWeek) return []
      return store.getTeamBadges(team.starters, store.currentWeek)
    }

    const isTeamScoring = (team) => {
      return scoringTeams.value.has(team?.roster_id)
    }

    const previousWeek = async () => {
      if (currentWeek.value > 1 && !isRefreshing.value) {
        await store.loadMatchupsForWeek(currentWeek.value - 1)
      }
    }

    const nextWeek = async () => {
      if (currentWeek.value < 18 && !isRefreshing.value) {
        await store.loadMatchupsForWeek(currentWeek.value + 1)
      }
    }

    return {
      enrichedMatchups,
      selectedMatchupId,
      isWeekComplete,
      currentWeek,
      isRefreshing,
      selectMatchup,
      formatPoints,
      getRecordText,
      getRecordColor,
      getTeamBadges,
      isTeamScoring,
      previousWeek,
      nextWeek
    }
  }
}
</script>

<style scoped>
.matchups-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.panel-header h2 {
  font-size: 48px;
  font-weight: 900;
  color: #ffffff;
  margin: 0;
  letter-spacing: 3px;
  text-transform: uppercase;
  background: linear-gradient(135deg, #00d4ff, #7b2ff7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 0 40px rgba(0, 212, 255, 0.5);
}

.week-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.week-indicator {
  font-size: 32px;
  font-weight: 900;
  color: #ffffff;
  letter-spacing: 2px;
  background: linear-gradient(135deg, #7b2ff7, #f107a3);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 0 30px rgba(123, 47, 247, 0.5);
}

.week-arrow {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 28px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
  line-height: 1;
}

.week-arrow:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
  color: rgba(255, 255, 255, 0.9);
  transform: scale(1.05);
}

.week-arrow:active:not(:disabled) {
  transform: scale(0.95);
}

.week-arrow:disabled {
  opacity: 0.2;
  cursor: not-allowed;
}

.matchups-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow: hidden; /* No scrollbars - content must fit */
  padding-bottom: 16px;
}

.matchup-card {
  background: rgba(30, 41, 59, 0.8);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 32px;
  cursor: pointer;
  transition: all 0.3s ease;
  flex-shrink: 0;
  height: 700px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.matchup-card:hover {
  background: rgba(30, 41, 59, 0.95);
  border-color: rgba(0, 212, 255, 0.5);
  transform: scale(1.01);
}

.matchup-card.selected {
  background: rgba(0, 212, 255, 0.15);
  border-color: #00d4ff;
  box-shadow: 0 0 30px rgba(0, 212, 255, 0.4);
}

.matchup-inner {
  display: flex;
  align-items: center;
  gap: 32px;
  flex: 1;
}

.team-side {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(51, 65, 85, 0.6);
  border-radius: 20px;
  padding: 32px 24px;
  min-width: 0;
  transition: all 0.3s ease;
}

.team-side.scoring {
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.3), rgba(123, 47, 247, 0.3));
  border: 2px solid #00d4ff;
  box-shadow: 0 0 40px rgba(0, 212, 255, 0.6), 0 0 80px rgba(123, 47, 247, 0.4);
  animation: scoreFlash 0.5s ease-in-out 3;
}

@keyframes scoreFlash {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 40px rgba(0, 212, 255, 0.6), 0 0 80px rgba(123, 47, 247, 0.4);
  }
  50% {
    transform: scale(1.02);
    box-shadow: 0 0 60px rgba(0, 212, 255, 0.9), 0 0 120px rgba(123, 47, 247, 0.6);
  }
}

.team-content {
  display: flex;
  align-items: center;
  gap: 24px;
  min-width: 0;
  flex: 1;
}

.team-logo {
  width: 160px;
  height: 160px;
  object-fit: contain;
  filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.6));
  flex-shrink: 0;
}

.team-logo.invert-logo {
  filter: invert(1) brightness(2) drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5));
}

.team-info {
  min-width: 0;
  flex: 1;
}

.team-info.text-right {
  text-align: right;
}

.team-name {
  font-size: 56px;
  font-weight: 800;
  color: #ffffff;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.1;
}

.team-owner {
  font-size: 32px;
  font-weight: 600;
  color: #60a5fa;
  margin-bottom: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.team-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.team-meta.justify-end {
  justify-content: flex-end;
}

.team-record {
  font-size: 28px;
  font-weight: 700;
}

.team-badge {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 24px;
  font-weight: 700;
}

.score-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.team-score {
  font-size: 120px;
  font-weight: 900;
  color: #ffffff;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  min-width: 300px;
  text-align: center;
  line-height: 1;
}

.win-loss-indicator {
  margin-top: 16px;
}

.win-text {
  color: #4ade80;
  font-size: 32px;
  font-weight: 700;
  text-transform: uppercase;
}

.loss-text {
  color: #f87171;
  font-size: 32px;
  font-weight: 700;
  text-transform: uppercase;
}

.vs-separator {
  flex-shrink: 0;
  padding: 0 16px;
}

.vs-badge {
  background: rgba(71, 85, 105, 0.8);
  border-radius: 50%;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4px solid rgba(255, 255, 255, 0.2);
}

.vs-text {
  font-size: 40px;
  font-weight: 900;
  color: #ffffff;
  letter-spacing: 2px;
}

.point-differential {
  margin-top: 32px;
  padding-top: 32px;
  border-top: 4px solid rgba(71, 85, 105, 0.5);
}

.differential-container {
  position: relative;
  height: 64px;
  display: flex;
  align-items: center;
}

.center-line {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 100%;
  background: rgba(148, 163, 184, 0.5);
  z-index: 0;
}

.differential-bar {
  position: absolute;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  z-index: 1;
}

.left-bar {
  right: 50%;
  background: linear-gradient(to left, #00d4ff, #0ea5e9);
  justify-content: flex-start;
  padding-left: 16px;
  border-radius: 8px 0 0 8px;
}

.right-bar {
  left: 50%;
  background: linear-gradient(to right, #00d4ff, #0ea5e9);
  justify-content: flex-end;
  padding-right: 16px;
  border-radius: 0 8px 8px 0;
}

.differential-value {
  color: #ffffff;
  font-size: 28px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.tie-indicator {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  background: #eab308;
  border-radius: 12px;
  padding: 12px 24px;
}

.tie-text {
  color: #ffffff;
  font-size: 28px;
  font-weight: 700;
}

.no-data {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.4);
  gap: 24px;
}

.no-data p {
  font-size: 28px;
  margin: 0;
}

.loading-spinner {
  width: 80px;
  height: 80px;
  border: 6px solid rgba(255, 255, 255, 0.1);
  border-top-color: #00d4ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Tailwind color classes for badges */
.bg-red-600 {
  background-color: rgb(220, 38, 38);
}

.bg-orange-500 {
  background-color: rgb(249, 115, 22);
}

.bg-yellow-500 {
  background-color: rgb(234, 179, 8);
}

.bg-slate-500 {
  background-color: rgb(100, 116, 139);
}

.bg-gray-600 {
  background-color: rgb(75, 85, 99);
}

.text-white {
  color: rgb(255, 255, 255);
}

.text-black {
  color: rgb(0, 0, 0);
}

.text-green-400 {
  color: rgb(74, 222, 128);
}

.text-red-400 {
  color: rgb(248, 113, 113);
}

.text-gray-400 {
  color: rgb(156, 163, 175);
}
</style>
