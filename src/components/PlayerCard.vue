<template lang="pug">
.bg-slate-800.rounded(:class="{ 'matchup-highlight': isAnimating }")
  .p-3.cursor-pointer(@click="toggleExpanded")
    .flex.items-center.gap-3(:class="reversed ? 'flex-row-reverse' : ''")
      //- Position Label with Color
      div(
        v-if="slotName"
        class="w-16 h-16 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
        :class="getSlotColor(slotName)"
      )
        .text-center
          div {{ slotName }}

      //- Player Portrait
      img.h-12.w-12.rounded-full.object-cover(
        v-if="player && player.portrait_url"
        :src="player.portrait_url"
        :alt="playerName"
        @error="handleImageError"
      )

      //- Player Info
      .flex-1(:class="reversed ? 'text-right' : ''")
        .flex.items-center.gap-2(:class="reversed ? 'justify-end' : ''")
          //- Player name first
          .text-white.font-semibold.text-sm {{ playerName }}
          //- EMPTY badge
          div(
            v-if="isEmpty"
            class="px-2 py-0.5 rounded text-xs font-bold bg-red-600 text-white"
          ) EMPTY
          //- BYE badge
          div(
            v-if="byeWeek && !isEmpty"
            class="px-2 py-0.5 rounded text-xs font-bold bg-gray-600 text-white"
          ) BYE
          //- SUSP badge
          div(
            v-if="isSuspended && !isEmpty"
            class="px-2 py-0.5 rounded text-xs font-bold bg-purple-600 text-white"
          ) SUSP
          //- Injury badges (O, IR, D, Q)
          div(
            v-if="injuryStatus && !isEmpty"
            class="px-2 py-0.5 rounded text-xs font-bold"
            :class="getInjuryColorClass(injuryStatus)"
          ) {{ injuryStatus }}
        .text-gray-500.text-xs {{ playerTeam }} • {{ playerPosition }}

        //- Game time and status
        .text-xs.mt-1(v-if="gameTimeDisplay && !isEmpty" :class="reversed ? 'text-right' : ''")
          div(class="text-blue-400") {{ gameTimeDisplay }}
          div(
            class="mt-0.5"
            :class="gameInfo?.status === 'in_progress' ? 'text-green-400 font-semibold' : gameInfo?.status === 'final' ? 'text-gray-400' : 'text-blue-300'"
          ) {{ gameStatusText }}

        //- Compact enrichment preview (ROS, VORP)
        .flex.items-center.gap-3.mt-1.text-xs(v-if="enrichedPlayer && !isEmpty" :class="reversed ? 'justify-end' : ''")
          div(v-if="enrichedPlayer.ros" class="text-gray-400")
            span.text-gray-500 ROS:
            span.text-blue-400.ml-1.font-semibold {{ enrichedPlayer.ros?.toFixed(1) }}
          div(v-if="enrichedPlayer.vorp" class="text-gray-400")
            span.text-gray-500 VORP:
            span.text-green-400.ml-1.font-semibold {{ enrichedPlayer.vorp }}

      //- Points and Expand Icon
      .text-right.flex-shrink-0.flex.flex-col.items-end.gap-1(:class="reversed ? 'items-start' : 'items-end'")
        .flex.items-center.gap-2(:class="reversed ? 'flex-row-reverse' : ''")
          div(:class="[scoreColorClass, 'font-bold text-lg', { 'score-pulse': isAnimating }]") {{ formattedPoints }}
          //- Expand/collapse icon
          div(class="text-gray-400 text-xs")
            span(v-if="isExpanded") ▼
            span(v-else) ▶
        //- Projected points in teal
        .text-teal-400.text-xs(v-if="projectedPoints && !isEmpty") Proj: {{ projectedPoints }}

  //- Expanded Details Section
  .px-3.pb-3(v-if="isExpanded && enrichedPlayer && !isEmpty")
    .border-t.border-slate-700.pt-3.mt-2.space-y-3

      //- Physical Attributes Section
      .grid.grid-cols-2.gap-2.text-xs(v-if="hasPhysicalData")
        .bg-slate-900.rounded.p-2
          .text-gray-500.uppercase.text-[10px].font-semibold.mb-1 Physical
          .space-y-1
            div(v-if="enrichedPlayer.height")
              span.text-gray-400 Height:
              span.text-white.ml-1.font-semibold {{ enrichedPlayer.height }}
            div(v-if="enrichedPlayer.weight")
              span.text-gray-400 Weight:
              span.text-white.ml-1.font-semibold {{ enrichedPlayer.weight }} lbs
            div(v-if="enrichedPlayer.age")
              span.text-gray-400 Age:
              span.text-white.ml-1.font-semibold {{ enrichedPlayer.age }}

        .bg-slate-900.rounded.p-2
          .text-gray-500.uppercase.text-[10px].font-semibold.mb-1 Background
          .space-y-1
            div(v-if="enrichedPlayer.college")
              span.text-gray-400 College:
              span.text-white.ml-1.font-semibold {{ enrichedPlayer.college }}
            div(v-if="enrichedPlayer.years_exp !== null && enrichedPlayer.years_exp !== undefined")
              span.text-gray-400 Experience:
              span.text-white.ml-1.font-semibold {{ enrichedPlayer.years_exp }} yrs

      //- Fantasy Metrics Section
      .bg-slate-900.rounded.p-2
        .text-gray-500.uppercase.text-[10px].font-semibold.mb-2 Fantasy Metrics
        .grid.grid-cols-3.gap-2.text-xs
          div(v-if="enrichedPlayer.ros")
            .flex.flex-col
              span.text-gray-400 ROS
              span.text-blue-400.font-bold.text-sm {{ enrichedPlayer.ros?.toFixed(1) }}
          div(v-if="enrichedPlayer.vorp")
            .flex.flex-col
              span.text-gray-400 VORP
              span.text-green-400.font-bold.text-sm {{ enrichedPlayer.vorp }}
          div(v-if="enrichedPlayer.adp && enrichedPlayer.adp < 999")
            .flex.flex-col
              span.text-gray-400 ADP
              span.text-purple-400.font-bold.text-sm {{ enrichedPlayer.adp?.toFixed(1) }}
          div(v-if="enrichedPlayer.fantasy_points_2024")
            .flex.flex-col
              span.text-gray-400 2024 Pts
              span.text-yellow-400.font-bold.text-sm {{ enrichedPlayer.fantasy_points_2024?.toFixed(1) }}
          div(v-if="enrichedPlayer.projected_points_2025")
            .flex.flex-col
              span.text-gray-400 2025 Proj
              span.text-cyan-400.font-bold.text-sm {{ enrichedPlayer.projected_points_2025?.toFixed(1) }}

      //- Season Stats (if available)
      .bg-slate-900.rounded.p-2(v-if="seasonStats && seasonStats.totalGames > 0")
        .text-gray-500.uppercase.text-[10px].font-semibold.mb-2 Season Performance
        .grid.grid-cols-3.gap-2.text-xs
          div
            .flex.flex-col
              span.text-gray-400 Games
              span.text-white.font-bold.text-sm {{ seasonStats.totalGames }}
          div
            .flex.flex-col
              span.text-gray-400 Total Pts
              span.text-blue-400.font-bold.text-sm {{ seasonStats.totalPoints?.toFixed(1) }}
          div
            .flex.flex-col
              span.text-gray-400 Avg/Game
              span.text-green-400.font-bold.text-sm {{ seasonStats.averagePoints?.toFixed(1) }}
          div
            .flex.flex-col
              span.text-gray-400 Started
              span.text-green-500.font-bold.text-sm {{ seasonStats.gamesStarted }}
          div
            .flex.flex-col
              span.text-gray-400 Benched
              span.text-gray-500.font-bold.text-sm {{ seasonStats.gamesBenched }}

      //- Game Stats Breakdown (if provided via slot)
      .bg-slate-900.rounded.p-2(v-if="gameStats && gameStats.length > 0")
        .text-gray-500.uppercase.text-[10px].font-semibold.mb-2 Week {{ currentWeek }} Stats
        .grid.grid-cols-2.gap-2.text-xs
          div(v-for="stat in gameStats" :key="stat.label")
            .flex.justify-between
              span.text-gray-400 {{ stat.label }}:
              span.text-white.font-semibold {{ stat.value }}

      //- Injury Details (if available)
      .bg-red-900.bg-opacity-20.rounded.p-2(v-if="enrichedPlayer.injury_notes")
        .text-red-400.uppercase.text-[10px].font-semibold.mb-1 Injury Report
        .text-gray-300.text-xs {{ enrichedPlayer.injury_notes }}
</template>

<script>
import { computed, ref } from 'vue'
import { useLeagueStore } from '../stores/league.js'

export default {
  name: 'PlayerCard',
  props: {
    playerId: {
      type: [String, Number],
      required: true
    },
    slotName: {
      type: String,
      default: null
    },
    points: {
      type: Number,
      default: 0
    },
    currentWeek: {
      type: Number,
      default: null
    },
    isAnimating: {
      type: Boolean,
      default: false
    },
    reversed: {
      type: Boolean,
      default: false
    },
    gameStats: {
      type: Array,
      default: null
    }
  },
  emits: ['toggle-expanded'],
  setup(props, { emit }) {
    const leagueStore = useLeagueStore()
    const isExpanded = ref(false)
    const imageError = ref(false)

    // Check if player slot is empty
    const isEmpty = computed(() => {
      return props.playerId === '0' || props.playerId === 0
    })

    // Get enriched player data from store
    const enrichedPlayer = computed(() => {
      if (isEmpty.value) return null
      return leagueStore.getEnrichedPlayer(props.playerId)
    })

    // Get base player data as fallback
    const player = computed(() => {
      if (isEmpty.value) return null
      return enrichedPlayer.value || leagueStore.players[props.playerId]
    })

    // Get season stats for player
    const seasonStats = computed(() => {
      if (isEmpty.value) return null
      return leagueStore.getPlayerSeasonStats(props.playerId)
    })

    // Player name
    const playerName = computed(() => {
      if (isEmpty.value) return 'Empty'
      if (!player.value) return `Player ${props.playerId}`
      return player.value.full_name || `${player.value.first_name || ''} ${player.value.last_name || ''}`.trim()
    })

    // Player position
    const playerPosition = computed(() => {
      if (isEmpty.value) return ''
      return player.value?.position || '?'
    })

    // Player team
    const playerTeam = computed(() => {
      if (isEmpty.value) return ''
      return player.value?.team || 'FA'
    })

    // Injury status - comprehensive checking
    const injuryStatus = computed(() => {
      if (isEmpty.value || !enrichedPlayer.value) return null

      // Check injury_status_combined first (primary source)
      const statusToCheck = enrichedPlayer.value.injury_status_combined?.toUpperCase()

      if (statusToCheck) {
        // Check for Doubtful BEFORE Out (since "DOUBTFUL" contains "OUT")
        if (statusToCheck.includes('DOUBTFUL') || ((statusToCheck.includes('D ') || statusToCheck === 'D') && !statusToCheck.includes('SUSPENDED'))) {
          return 'D'
        }
        // Check for IR first, then Out (to separate them)
        if (statusToCheck.includes('INJURED RESERVE') || statusToCheck.includes('IR')) {
          return 'IR'
        }
        if (statusToCheck.includes('OUT')) {
          return 'O'
        }
        // Check for Questionable/PUP
        if (statusToCheck.includes('QUESTIONABLE') || statusToCheck.includes('Q ') || statusToCheck === 'Q' || statusToCheck.includes('PUP') || statusToCheck.includes('PHYSICALLY UNABLE')) {
          return 'Q'
        }
      }

      // Fallback to injury_indicator
      return enrichedPlayer.value.injury_indicator || null
    })

    // BYE week status
    const byeWeek = computed(() => {
      if (isEmpty.value || !enrichedPlayer.value) return false
      return enrichedPlayer.value.bye_week === true
    })

    // Suspended status
    const isSuspended = computed(() => {
      if (isEmpty.value || !enrichedPlayer.value) return false
      return enrichedPlayer.value.is_suspended === true
    })

    // Get game info for the player
    const gameInfo = computed(() => {
      if (isEmpty.value || !props.playerId || !props.currentWeek) return null
      return leagueStore.getPlayerGameInfo(props.playerId, props.currentWeek)
    })

    // Get projected points for the player
    const projectedPoints = computed(() => {
      if (isEmpty.value || !props.playerId || !props.currentWeek) return null
      const projection = leagueStore.getPlayerWeeklyProjection(props.playerId, props.currentWeek)
      if (!projection || !projection.projectedPoints) return null
      return projection.projectedPoints.toFixed(1)
    })

    // Formatted points
    const formattedPoints = computed(() => {
      return props.points?.toFixed(1) || '0.0'
    })

    // Score color based on game status
    const scoreColorClass = computed(() => {
      if (!gameInfo.value) return 'text-white' // Default if no game info

      switch (gameInfo.value.status) {
        case 'scheduled':
          return 'text-blue-400' // Blue for not yet played
        case 'in_progress':
          return 'text-green-400' // Green for live
        case 'final':
          return 'text-white' // White for completed
        default:
          return 'text-white'
      }
    })

    // Format game time display
    const gameTimeDisplay = computed(() => {
      if (!gameInfo.value) return null

      const gameDate = new Date(gameInfo.value.gameDate)
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const dayName = days[gameDate.getDay()]

      let hours = gameDate.getHours()
      const minutes = gameDate.getMinutes()
      const ampm = hours >= 12 ? 'PM' : 'AM'
      hours = hours % 12
      hours = hours ? hours : 12
      const minutesStr = minutes < 10 ? '0' + minutes : minutes

      const timeStr = `${dayName} ${hours}:${minutesStr} ${ampm}`
      const opponent = gameInfo.value.isHome ? `vs ${gameInfo.value.opponent}` : `@ ${gameInfo.value.opponent}`

      return `${timeStr} ${opponent}`
    })

    // Game status text
    const gameStatusText = computed(() => {
      if (!gameInfo.value) return null

      switch (gameInfo.value.status) {
        case 'scheduled':
          return 'Yet to play'
        case 'in_progress':
          return '🔴 In progress'
        case 'final':
          return 'Final'
        default:
          return null
      }
    })

    // Check if physical data is available
    const hasPhysicalData = computed(() => {
      if (!enrichedPlayer.value) return false
      return enrichedPlayer.value.height || enrichedPlayer.value.weight ||
             enrichedPlayer.value.age || enrichedPlayer.value.college ||
             enrichedPlayer.value.years_exp !== null
    })

    // Get slot color class
    const getSlotColor = (slotName) => {
      const colors = {
        'QB': 'bg-red-500 text-white',
        'RB1': 'bg-green-500 text-white',
        'RB2': 'bg-green-700 text-white',
        'WR1': 'bg-blue-500 text-white',
        'WR2': 'bg-blue-700 text-white',
        'TE': 'bg-yellow-500 text-black',
        'FLEX1': 'bg-teal-500 text-white',
        'FLEX2': 'bg-cyan-500 text-white',
        'K': 'bg-purple-500 text-white',
        'DEF': 'bg-orange-500 text-white'
      }
      return colors[slotName] || 'bg-gray-500 text-white'
    }

    // Get injury color class
    const getInjuryColorClass = (status) => {
      if (!status) return ''
      if (status === 'O' || status === 'IR') return 'bg-red-600 text-white'
      if (status === 'D') return 'bg-orange-500 text-white'
      return 'bg-yellow-500 text-black' // Q, PUP
    }

    // Toggle expanded state
    const toggleExpanded = () => {
      isExpanded.value = !isExpanded.value
      emit('toggle-expanded', props.playerId, isExpanded.value)
    }

    // Handle image error
    const handleImageError = (event) => {
      imageError.value = true
      event.target.style.display = 'none'
    }

    return {
      isExpanded,
      isEmpty,
      enrichedPlayer,
      player,
      seasonStats,
      playerName,
      playerPosition,
      playerTeam,
      injuryStatus,
      byeWeek,
      isSuspended,
      gameInfo,
      projectedPoints,
      formattedPoints,
      scoreColorClass,
      gameTimeDisplay,
      gameStatusText,
      hasPhysicalData,
      getSlotColor,
      getInjuryColorClass,
      toggleExpanded,
      handleImageError
    }
  }
}
</script>

<style scoped>
@keyframes scorePulse {
  0% {
    transform: scale(1);
    color: rgb(255, 255, 255);
  }
  25% {
    transform: scale(1.15);
    color: rgb(34, 197, 94);
  }
  50% {
    transform: scale(1.2);
    color: rgb(74, 222, 128);
  }
  75% {
    transform: scale(1.1);
    color: rgb(34, 197, 94);
  }
  100% {
    transform: scale(1);
    color: rgb(255, 255, 255);
  }
}

.score-pulse {
  animation: scorePulse 2s ease-out;
}

@keyframes matchupHighlight {
  0% {
    background-color: rgba(34, 197, 94, 0.1);
  }
  50% {
    background-color: rgba(34, 197, 94, 0.2);
  }
  100% {
    background-color: rgba(34, 197, 94, 0.1);
  }
}

.matchup-highlight {
  animation: matchupHighlight 2s ease-out;
  position: relative;
}
</style>
