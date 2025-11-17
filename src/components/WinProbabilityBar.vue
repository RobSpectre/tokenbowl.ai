<template lang="pug">
.win-probability-container(v-if="winProb")
  //- Win Probability Header (hidden on lg)
  div(class="flex items-center justify-between mb-2 lg:hidden")
    div(class="text-xs text-gray-400 font-semibold uppercase tracking-wider") Win Probability
    div(class="text-xs text-gray-500") {{ winProb.simulations.toLocaleString() }} simulations

  //- Probability Bar
  div(class="relative h-12 lg:h-16 bg-slate-700 rounded-lg overflow-hidden")
    //- Team 1 Bar (left side)
    .absolute.left-0.top-0.bottom-0.transition-all.duration-500(
      :style="{ width: team1Percentage + '%' }"
      :class="team1BarColor"
    )
      div(class="absolute inset-0 flex items-center justify-start px-3 lg:px-2")
        div(class="text-white font-black text-lg lg:text-sm" v-if="team1Percentage > 15") {{ team1Percentage }}%

    //- Team 2 Bar (right side)
    .absolute.right-0.top-0.bottom-0.transition-all.duration-500(
      :style="{ width: team2Percentage + '%' }"
      :class="team2BarColor"
    )
      div(class="absolute inset-0 flex items-center justify-end px-3 lg:px-2")
        div(class="text-white font-black text-lg lg:text-sm" v-if="team2Percentage > 15") {{ team2Percentage }}%

    //- Center line
    div(class="absolute left-1/2 top-0 bottom-0 w-0.5 lg:w-px bg-white opacity-30" style="transform: translateX(-50%)")

  //- Detailed Stats (optional, toggleable)
  .mt-2.flex.items-center.justify-center.gap-4.text-xs(v-if="showDetails")
    div
      span.text-gray-400 Confidence:
      = ' '
      span.text-white.font-semibold {{ confidenceLower }}% - {{ confidenceUpper }}%
    div
      span.text-gray-400 Current:
      = ' '
      span.text-white.font-semibold {{ winProb.team1.currentPoints.toFixed(1) }} - {{ winProb.team2.currentPoints.toFixed(1) }}
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'WinProbabilityBar',
  props: {
    winProb: {
      type: Object,
      required: true
    },
    showDetails: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    const team1Percentage = computed(() => {
      return Math.round(props.winProb.team1WinProbability * 100)
    })

    const team2Percentage = computed(() => {
      return Math.round(props.winProb.team2WinProbability * 100)
    })

    const confidenceLower = computed(() => {
      return Math.round(props.winProb.confidenceInterval.lower * 100)
    })

    const confidenceUpper = computed(() => {
      return Math.round(props.winProb.confidenceInterval.upper * 100)
    })

    const team1BarColor = computed(() => {
      const prob = props.winProb.team1WinProbability
      if (prob >= 0.7) return 'bg-green-600'
      if (prob >= 0.55) return 'bg-green-500'
      if (prob >= 0.45) return 'bg-yellow-600'
      return 'bg-red-500'
    })

    const team2BarColor = computed(() => {
      const prob = props.winProb.team2WinProbability
      if (prob >= 0.7) return 'bg-green-600'
      if (prob >= 0.55) return 'bg-green-500'
      if (prob >= 0.45) return 'bg-yellow-600'
      return 'bg-red-500'
    })

    return {
      team1Percentage,
      team2Percentage,
      confidenceLower,
      confidenceUpper,
      team1BarColor,
      team2BarColor
    }
  }
}
</script>

<style scoped>
.win-probability-container {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgb(51, 65, 85); /* slate-700 */
}

/* When used inline (parent has w-32 class), make it vertical and compact */
@media (min-width: 1024px) {
  .win-probability-container {
    margin-top: 0;
    padding-top: 0;
    border-top: none;
  }
}
</style>
