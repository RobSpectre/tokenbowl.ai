<template>
  <div class="matchup-detail">
    <div class="panel-header">
      <h2>HEAD TO HEAD MATCHUP</h2>
    </div>

    <div v-if="selectedMatchup" class="matchup-content">
      <!-- Positions Yet to Start -->
      <div v-if="getPositionsYetToStart().length > 0" class="positions-yet-to-start">
        <div class="flex items-center justify-center gap-2 flex-wrap">
          <span class="yet-label">Yet to play:</span>
          <div class="flex items-center gap-2 flex-wrap">
            <span
              v-for="position in getPositionsYetToStart()"
              :key="position"
              class="position-tag"
            >
              {{ position }}
            </span>
          </div>
        </div>
      </div>

      <!-- Team Comparison -->
      <div class="teams-container">
        <!-- Team 1 -->
        <div class="team-column" v-if="selectedMatchup.teams[0]">
          <!-- Team Header -->
          <div
            class="team-header"
            :style="{
              background: `linear-gradient(135deg, ${selectedMatchup.teams[0].teamInfo?.colors?.from}, ${selectedMatchup.teams[0].teamInfo?.colors?.to})`
            }"
          >
            <img
              v-if="selectedMatchup.teams[0].teamInfo?.logoPath"
              :src="selectedMatchup.teams[0].teamInfo.logoPath"
              :alt="selectedMatchup.teams[0].teamInfo?.aiModel"
              class="team-logo"
            />
            <div class="team-info">
              <div class="team-name">{{ selectedMatchup.teams[0].teamInfo?.aiModel || 'Unknown' }}</div>
              <div class="team-owner">{{ selectedMatchup.teams[0].teamInfo?.owner || 'Unknown' }}</div>
            </div>
            <div class="team-score">{{ formatPoints(selectedMatchup.teams[0].points) }}</div>
          </div>

          <!-- Starters Section -->
          <div class="players-section">
            <div class="section-title">STARTERS</div>
            <div
              v-for="(playerId, index) in selectedMatchup.teams[0].starters"
              :key="`starter-${playerId}-${index}`"
              class="player-card"
              :class="{ 'scoring-player': isPlayerScoring(selectedMatchup.teams[0].roster_id, playerId) }"
            >
              <div class="position-badge" :class="getPositionColor(getPlayerPosition(playerId, index))">
                {{ getPlayerPosition(playerId, index) }}
              </div>
              <img
                v-if="getPlayerPortrait(playerId)"
                :src="getPlayerPortrait(playerId)"
                :alt="getPlayerName(playerId)"
                class="player-portrait"
                @error="handleImageError"
              />
              <div class="player-info">
                <div class="player-name-row">
                  <span class="player-name">{{ getPlayerName(playerId) }}</span>
                  <span v-if="getPlayerBadge(playerId)" class="player-badge" :class="getPlayerBadgeClass(playerId)">
                    {{ getPlayerBadge(playerId) }}
                  </span>
                </div>
                <div class="player-team-pos">{{ getPlayerTeam(playerId) }} • {{ getPlayerPositionFull(playerId) }}</div>
              </div>
              <div class="player-points-column">
                <div class="player-points">
                  {{ formatPoints(selectedMatchup.teams[0].players_points?.[playerId] || 0) }}
                </div>
                <div v-if="getPlayerProjection(playerId)" class="player-projection-small">
                  Proj: {{ getPlayerProjection(playerId) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Bench Section -->
          <div class="players-section" v-if="getBenchPlayers(selectedMatchup.teams[0]).length > 0">
            <div class="section-title">BENCH</div>
            <div
              v-for="(playerId, index) in getBenchPlayers(selectedMatchup.teams[0])"
              :key="`bench-${playerId}-${index}`"
              class="player-card bench-card"
              :class="{ 'scoring-player': isPlayerScoring(selectedMatchup.teams[0].roster_id, playerId) }"
            >
              <div class="position-badge bench-badge">BN</div>
              <img
                v-if="getPlayerPortrait(playerId)"
                :src="getPlayerPortrait(playerId)"
                :alt="getPlayerName(playerId)"
                class="player-portrait"
                @error="handleImageError"
              />
              <div class="player-info">
                <div class="player-name-row">
                  <span class="player-name">{{ getPlayerName(playerId) }}</span>
                  <span v-if="getPlayerBadge(playerId)" class="player-badge" :class="getPlayerBadgeClass(playerId)">
                    {{ getPlayerBadge(playerId) }}
                  </span>
                </div>
                <div class="player-team-pos">{{ getPlayerTeam(playerId) }} • {{ getPlayerPositionFull(playerId) }}</div>
              </div>
              <div class="player-points bench-points">
                {{ formatPoints(selectedMatchup.teams[0].players_points?.[playerId] || 0) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Team 2 -->
        <div class="team-column" v-if="selectedMatchup.teams[1]">
          <!-- Team Header -->
          <div
            class="team-header"
            :style="{
              background: `linear-gradient(135deg, ${selectedMatchup.teams[1].teamInfo?.colors?.from}, ${selectedMatchup.teams[1].teamInfo?.colors?.to})`
            }"
          >
            <img
              v-if="selectedMatchup.teams[1].teamInfo?.logoPath"
              :src="selectedMatchup.teams[1].teamInfo.logoPath"
              :alt="selectedMatchup.teams[1].teamInfo?.aiModel"
              class="team-logo"
            />
            <div class="team-info">
              <div class="team-name">{{ selectedMatchup.teams[1].teamInfo?.aiModel || 'Unknown' }}</div>
              <div class="team-owner">{{ selectedMatchup.teams[1].teamInfo?.owner || 'Unknown' }}</div>
            </div>
            <div class="team-score">{{ formatPoints(selectedMatchup.teams[1].points) }}</div>
          </div>

          <!-- Starters Section -->
          <div class="players-section">
            <div class="section-title">STARTERS</div>
            <div
              v-for="(playerId, index) in selectedMatchup.teams[1].starters"
              :key="`starter-${playerId}-${index}`"
              class="player-card"
              :class="{ 'scoring-player': isPlayerScoring(selectedMatchup.teams[1].roster_id, playerId) }"
            >
              <div class="position-badge" :class="getPositionColor(getPlayerPosition(playerId, index))">
                {{ getPlayerPosition(playerId, index) }}
              </div>
              <img
                v-if="getPlayerPortrait(playerId)"
                :src="getPlayerPortrait(playerId)"
                :alt="getPlayerName(playerId)"
                class="player-portrait"
                @error="handleImageError"
              />
              <div class="player-info">
                <div class="player-name-row">
                  <span class="player-name">{{ getPlayerName(playerId) }}</span>
                  <span v-if="getPlayerBadge(playerId)" class="player-badge" :class="getPlayerBadgeClass(playerId)">
                    {{ getPlayerBadge(playerId) }}
                  </span>
                </div>
                <div class="player-team-pos">{{ getPlayerTeam(playerId) }} • {{ getPlayerPositionFull(playerId) }}</div>
              </div>
              <div class="player-points-column">
                <div class="player-points">
                  {{ formatPoints(selectedMatchup.teams[1].players_points?.[playerId] || 0) }}
                </div>
                <div v-if="getPlayerProjection(playerId)" class="player-projection-small">
                  Proj: {{ getPlayerProjection(playerId) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Bench Section -->
          <div class="players-section" v-if="getBenchPlayers(selectedMatchup.teams[1]).length > 0">
            <div class="section-title">BENCH</div>
            <div
              v-for="(playerId, index) in getBenchPlayers(selectedMatchup.teams[1])"
              :key="`bench-${playerId}-${index}`"
              class="player-card bench-card"
              :class="{ 'scoring-player': isPlayerScoring(selectedMatchup.teams[1].roster_id, playerId) }"
            >
              <div class="position-badge bench-badge">BN</div>
              <img
                v-if="getPlayerPortrait(playerId)"
                :src="getPlayerPortrait(playerId)"
                :alt="getPlayerName(playerId)"
                class="player-portrait"
                @error="handleImageError"
              />
              <div class="player-info">
                <div class="player-name-row">
                  <span class="player-name">{{ getPlayerName(playerId) }}</span>
                  <span v-if="getPlayerBadge(playerId)" class="player-badge" :class="getPlayerBadgeClass(playerId)">
                    {{ getPlayerBadge(playerId) }}
                  </span>
                </div>
                <div class="player-team-pos">{{ getPlayerTeam(playerId) }} • {{ getPlayerPositionFull(playerId) }}</div>
              </div>
              <div class="player-points bench-points">
                {{ formatPoints(selectedMatchup.teams[1].players_points?.[playerId] || 0) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Point Differential Bar Graph -->
      <div class="point-differential-section">
        <div class="differential-header">
          <div class="team-differential-label">
            <span class="differential-team-name">{{ selectedMatchup.teams[0].teamInfo?.aiModel || 'Team 1' }}</span>
            <span class="differential-score">{{ formatPoints(selectedMatchup.teams[0].points) }}</span>
          </div>
          <div class="differential-value">
            <span class="diff-label">DIFF</span>
            <span class="diff-number">{{ getScoreDifferential() }}</span>
          </div>
          <div class="team-differential-label">
            <span class="differential-score">{{ formatPoints(selectedMatchup.teams[1].points) }}</span>
            <span class="differential-team-name">{{ selectedMatchup.teams[1].teamInfo?.aiModel || 'Team 2' }}</span>
          </div>
        </div>
        <div class="bar-graph-container">
          <div class="bar-graph-wrapper">
            <div
              class="score-bar team1-bar"
              :style="{
                width: getBarWidth(selectedMatchup.teams[0].points) + '%',
                background: `linear-gradient(90deg, ${selectedMatchup.teams[0].teamInfo?.colors?.from}, ${selectedMatchup.teams[0].teamInfo?.colors?.to})`
              }"
            >
              <span class="bar-label">{{ formatPoints(selectedMatchup.teams[0].points) }}</span>
            </div>
          </div>
          <div class="bar-graph-wrapper">
            <div
              class="score-bar team2-bar"
              :style="{
                width: getBarWidth(selectedMatchup.teams[1].points) + '%',
                background: `linear-gradient(90deg, ${selectedMatchup.teams[1].teamInfo?.colors?.from}, ${selectedMatchup.teams[1].teamInfo?.colors?.to})`
              }"
            >
              <span class="bar-label">{{ formatPoints(selectedMatchup.teams[1].points) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="no-matchup">
      <div class="loading-spinner"></div>
      <p>Select a matchup to view details</p>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'
import { useBroadcastStore } from '../../stores/broadcast.js'
import { useLeagueStore } from '../../stores/league.js'
import { playScoreSound } from '../../utils/soundEffects.js'

export default {
  name: 'BroadcastMatchupDetail',
  setup() {
    const store = useBroadcastStore()
    const leagueStore = useLeagueStore()
    const scoringPlayers = ref(new Set())
    const animationTimeout = ref(null)

    const enrichedMatchups = computed(() => store.enrichedMatchups)
    const selectedMatchup = computed(() => store.selectedMatchup)
    const localSelectedMatchupId = ref(store.selectedMatchupId)

    // Watch for changes from store
    watch(() => store.selectedMatchupId, (newId) => {
      localSelectedMatchupId.value = newId
    })

    // Watch for score changes
    watch(
      () => store.lastScoreChangeTimestamp,
      (newTimestamp) => {
        if (!newTimestamp) return

        // Get player score changes
        const playerChanges = store.scoreChanges.filter(change => change.type === 'player')

        if (playerChanges.length > 0) {
          // Play sound for the largest player score increase
          const largestIncrease = Math.max(...playerChanges.map(c => c.scoreIncrease))
          playScoreSound(largestIncrease)

          // Add players to scoring animation set
          playerChanges.forEach(change => {
            const key = `${change.rosterId}-${change.playerId}`
            scoringPlayers.value.add(key)
          })

          // Clear animations after 2 seconds
          if (animationTimeout.value) {
            clearTimeout(animationTimeout.value)
          }

          animationTimeout.value = setTimeout(() => {
            scoringPlayers.value.clear()
          }, 2000)
        }
      }
    )

    const onMatchupChange = () => {
      store.selectMatchup(localSelectedMatchupId.value)
    }

    const getMatchupLabel = (matchup) => {
      if (!matchup.teams || matchup.teams.length < 2) return 'Unknown Matchup'
      const team1 = matchup.teams[0].teamInfo?.aiModel || 'Team 1'
      const team2 = matchup.teams[1].teamInfo?.aiModel || 'Team 2'
      return `${team1} vs ${team2}`
    }

    const formatPoints = (points) => {
      return points ? points.toFixed(1) : '0.0'
    }

    const getScoreDifferential = () => {
      if (!selectedMatchup.value || !selectedMatchup.value.teams || selectedMatchup.value.teams.length < 2) {
        return '0.0'
      }
      const team1Points = selectedMatchup.value.teams[0].points || 0
      const team2Points = selectedMatchup.value.teams[1].points || 0
      const diff = Math.abs(team1Points - team2Points)
      return diff.toFixed(1)
    }

    const getPlayerName = (playerId) => {
      if (playerId === '0' || playerId === 0) return 'Empty'
      return store.getPlayerName(playerId)
    }

    const getPlayerPosition = (playerId, index) => {
      // Map starter index to position labels
      const positions = ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'TE', 'FLEX1', 'FLEX2', 'K', 'DEF']
      return positions[index] || 'FLEX'
    }

    const getPlayerPositionFull = (playerId) => {
      if (playerId === '0' || playerId === 0) return ''
      const player = leagueStore.players[playerId]
      return player?.position || '?'
    }

    const getPlayerTeam = (playerId) => {
      if (playerId === '0' || playerId === 0) return ''
      const player = leagueStore.players[playerId]
      return player?.team || 'FA'
    }

    const getPlayerBadge = (playerId) => {
      if (playerId === '0' || playerId === 0) return 'EMPTY'
      const enrichedPlayer = leagueStore.getEnrichedPlayer(playerId)
      if (!enrichedPlayer) return null

      // Check for injury status
      const statusToCheck = enrichedPlayer.injury_status_combined?.toUpperCase()
      if (statusToCheck) {
        if (statusToCheck.includes('INJURED RESERVE') || statusToCheck.includes('IR')) return 'IR'
        if (statusToCheck.includes('OUT')) return 'O'
        if (statusToCheck.includes('DOUBTFUL') || (statusToCheck.includes('D ') || statusToCheck === 'D')) return 'D'
        if (statusToCheck.includes('QUESTIONABLE') || statusToCheck.includes('Q ') || statusToCheck === 'Q') return 'Q'
      }

      // Check for bye week
      if (enrichedPlayer.bye_week === true) return 'BYE'

      // Check for suspended
      if (enrichedPlayer.is_suspended === true) return 'SUSP'

      return null
    }

    const getPlayerBadgeClass = (playerId) => {
      const badge = getPlayerBadge(playerId)
      if (!badge) return ''

      if (badge === 'O' || badge === 'IR' || badge === 'EMPTY') return 'badge-red'
      if (badge === 'D') return 'badge-orange'
      if (badge === 'Q') return 'badge-yellow'
      if (badge === 'BYE') return 'badge-gray'
      if (badge === 'SUSP') return 'badge-purple'
      return ''
    }

    const getPlayerProjection = (playerId) => {
      // Match MatchupDetail.vue implementation
      if (!playerId || playerId === '0' || playerId === 0 || !store.currentWeek) return null

      const projection = leagueStore.getPlayerWeeklyProjection(playerId, store.currentWeek)
      if (!projection || !projection.projectedPoints) return null

      return projection.projectedPoints.toFixed(1)
    }

    const getPositionColor = (position) => {
      const colors = {
        'QB': 'pos-qb',
        'RB1': 'pos-rb1',
        'RB2': 'pos-rb2',
        'WR1': 'pos-wr1',
        'WR2': 'pos-wr2',
        'TE': 'pos-te',
        'FLEX1': 'pos-flex1',
        'FLEX2': 'pos-flex2',
        'K': 'pos-k',
        'DEF': 'pos-def'
      }
      return colors[position] || 'pos-default'
    }

    const getBenchPlayers = (team) => {
      if (!team || !team.players || !team.starters) return []
      // Get all players that aren't starters
      return team.players.filter(playerId => !team.starters.includes(playerId))
    }

    const isPlayerScoring = (rosterId, playerId) => {
      const key = `${rosterId}-${playerId}`
      return scoringPlayers.value.has(key)
    }

    const getPlayerPortrait = (playerId) => {
      if (playerId === '0' || playerId === 0) return null
      const player = leagueStore.players[playerId]
      if (!player) return null

      // For DEF positions, use team logo
      if (player.position === 'DEF' && player.team) {
        return `https://sleepercdn.com/images/team_logos/nfl/${player.team.toLowerCase()}.png`
      }

      // Sleeper CDN provides player portraits
      return `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`
    }

    const handleImageError = (event) => {
      event.target.style.display = 'none'
    }

    const getBarWidth = (points) => {
      if (!selectedMatchup.value || !selectedMatchup.value.teams || selectedMatchup.value.teams.length < 2) {
        return 0
      }
      const team1Points = selectedMatchup.value.teams[0].points || 0
      const team2Points = selectedMatchup.value.teams[1].points || 0
      const maxPoints = Math.max(team1Points, team2Points)

      if (maxPoints === 0) return 0

      // Calculate percentage, minimum 5% for visibility
      const percentage = (points / maxPoints) * 100
      return Math.max(percentage, 5)
    }

    const getPositionsYetToStart = () => {
      if (!selectedMatchup.value || !selectedMatchup.value.teams || !store.currentWeek) return []

      const positions = new Set()

      // Check both teams
      selectedMatchup.value.teams.forEach(team => {
        if (!team.starters) return

        team.starters.forEach((playerId, index) => {
          // Skip empty slots
          if (playerId === '0' || playerId === 0) return

          const gameInfo = leagueStore.getPlayerGameInfo(playerId, store.currentWeek)
          if (gameInfo && gameInfo.status === 'scheduled') {
            // Get position label for this starter index
            const positionLabels = ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'TE', 'FLEX1', 'FLEX2', 'K', 'DEF']
            positions.add(positionLabels[index] || 'FLEX')
          }
        })
      })

      return Array.from(positions)
    }

    return {
      enrichedMatchups,
      selectedMatchup,
      localSelectedMatchupId,
      onMatchupChange,
      getMatchupLabel,
      formatPoints,
      getScoreDifferential,
      getPlayerName,
      getPlayerPosition,
      getPlayerPositionFull,
      getPlayerTeam,
      getPlayerBadge,
      getPlayerBadgeClass,
      getPlayerProjection,
      getPositionColor,
      getBenchPlayers,
      isPlayerScoring,
      getPlayerPortrait,
      handleImageError,
      getBarWidth,
      getPositionsYetToStart
    }
  }
}
</script>

<style scoped>
.matchup-detail {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px 20px 5px 20px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.panel-header h2 {
  font-size: 38px;
  font-weight: 800;
  color: #ffffff;
  margin: 0;
  letter-spacing: 2px;
  text-transform: uppercase;
  background: linear-gradient(135deg, #f107a3, #7b2ff7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.matchup-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.positions-yet-to-start {
  background: rgba(30, 41, 59, 0.8);
  border: 2px solid rgba(0, 212, 255, 0.3);
  border-radius: 12px;
  padding: 14px 20px;
  flex-shrink: 0;
}

.yet-label {
  font-size: 16px;
  font-weight: 700;
  color: #00d4ff;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.position-tag {
  padding: 6px 12px;
  background: rgb(37, 99, 235);
  color: #ffffff;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 700;
}

.flex {
  display: flex;
}

.items-center {
  align-items: center;
}

.justify-center {
  justify-content: center;
}

.gap-2 {
  gap: 8px;
}

.flex-wrap {
  flex-wrap: wrap;
}

.teams-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.team-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
  overflow-x: hidden;
}

.team-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  flex-shrink: 0;
}

.team-logo {
  width: 84px;
  height: 84px;
  object-fit: contain;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5));
  flex-shrink: 0;
}

.team-info {
  flex: 1;
  min-width: 0;
}

.team-name {
  font-size: 30px;
  font-weight: 800;
  color: #ffffff;
  margin-bottom: 3px;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.team-owner {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.team-score {
  font-size: 64px;
  font-weight: 900;
  color: #ffffff;
  text-align: center;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
}

.players-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 20px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 1.5px;
  margin-bottom: 6px;
}

.player-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 14px;
  transition: all 0.2s ease;
  min-height: 100px;
}

.player-card:hover {
  background: rgba(30, 41, 59, 0.8);
  border-color: rgba(255, 255, 255, 0.2);
}

.player-card.scoring-player {
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.4), rgba(123, 47, 247, 0.4));
  border: 2px solid #00d4ff;
  box-shadow: 0 0 30px rgba(0, 212, 255, 0.8), 0 0 60px rgba(123, 47, 247, 0.5);
  animation: playerScoreFlash 0.4s ease-in-out 4;
}

@keyframes playerScoreFlash {
  0%, 100% {
    transform: scale(1) translateY(0);
    box-shadow: 0 0 30px rgba(0, 212, 255, 0.8), 0 0 60px rgba(123, 47, 247, 0.5);
  }
  50% {
    transform: scale(1.03) translateY(-2px);
    box-shadow: 0 0 50px rgba(0, 212, 255, 1), 0 0 100px rgba(123, 47, 247, 0.7);
  }
}

.bench-card {
  background: rgba(30, 41, 59, 0.4);
  opacity: 0.9;
}

.position-badge {
  width: 68px;
  height: 68px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 700;
  flex-shrink: 0;
}

.player-portrait {
  width: 68px;
  height: 68px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.bench-badge {
  background: rgba(100, 116, 139, 0.6);
  color: #ffffff;
}

.pos-qb { background: rgb(239, 68, 68); color: #ffffff; }
.pos-rb1 { background: rgb(34, 197, 94); color: #ffffff; }
.pos-rb2 { background: rgb(21, 128, 61); color: #ffffff; }
.pos-wr1 { background: rgb(59, 130, 246); color: #ffffff; }
.pos-wr2 { background: rgb(29, 78, 216); color: #ffffff; }
.pos-te { background: rgb(234, 179, 8); color: #000000; }
.pos-flex1 { background: rgb(20, 184, 166); color: #ffffff; }
.pos-flex2 { background: rgb(6, 182, 212); color: #ffffff; }
.pos-k { background: rgb(168, 85, 247); color: #ffffff; }
.pos-def { background: rgb(249, 115, 22); color: #ffffff; }
.pos-default { background: rgb(100, 116, 139); color: #ffffff; }

.player-info {
  flex: 1;
  min-width: 0;
}

.player-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.player-name {
  color: #ffffff;
  font-weight: 600;
  font-size: 20px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-badge {
  padding: 3px 8px;
  border-radius: 5px;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

.badge-red { background: rgb(220, 38, 38); color: #ffffff; }
.badge-orange { background: rgb(249, 115, 22); color: #ffffff; }
.badge-yellow { background: rgb(234, 179, 8); color: #000000; }
.badge-gray { background: rgb(75, 85, 99); color: #ffffff; }
.badge-purple { background: rgb(168, 85, 247); color: #ffffff; }

.player-team-pos {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 3px;
}

.player-projection {
  font-size: 15px;
  color: #2dd4bf;
  margin-top: 3px;
}

.player-points-column {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  min-width: 85px;
  flex-shrink: 0;
}

.player-points {
  font-size: 28px;
  font-weight: 700;
  color: #00d4ff;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.player-projection-small {
  font-size: 14px;
  color: rgba(45, 212, 191, 0.7);
  text-align: right;
}

.bench-points {
  color: rgba(0, 212, 255, 0.6);
  font-size: 26px;
}

/* Point Differential Section */
.point-differential-section {
  margin-top: 24px;
  padding: 20px;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

.differential-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.team-differential-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.team-differential-label:first-child {
  align-items: flex-start;
}

.team-differential-label:last-child {
  align-items: flex-end;
}

.differential-team-name {
  font-size: 18px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
}

.differential-score {
  font-size: 28px;
  font-weight: 900;
  color: #00d4ff;
  font-variant-numeric: tabular-nums;
}

.differential-value {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0 24px;
}

.diff-label {
  font-size: 14px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 1px;
}

.diff-number {
  font-size: 32px;
  font-weight: 900;
  color: #ffaa00;
  font-variant-numeric: tabular-nums;
}

.bar-graph-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bar-graph-wrapper {
  position: relative;
  width: 100%;
  height: 48px;
  background: rgba(15, 23, 42, 0.8);
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.score-bar {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 16px;
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
}

.score-bar::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 4px;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
}

.bar-label {
  font-size: 22px;
  font-weight: 900;
  color: #ffffff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
  font-variant-numeric: tabular-nums;
  z-index: 1;
}

.no-matchup {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.4);
  gap: 24px;
}

.no-matchup p {
  font-size: 24px;
  margin: 0;
}

.loading-spinner {
  width: 60px;
  height: 60px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-top-color: #f107a3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
