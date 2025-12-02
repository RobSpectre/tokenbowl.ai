<template lang="pug">
.win-probability-container
  template(v-if="winProb")
    //- Win Probability Header (hidden on lg)
    div(class="flex items-center justify-between mb-2 lg:hidden font-mono")
      div(class="text-xs text-[var(--color-secondary)] font-semibold uppercase tracking-wider") Win Probability
      div(class="text-xs text-[var(--color-secondary)]" v-if="winProb.simulations") {{ winProb.simulations.toLocaleString() }} simulations
      div(class="text-xs text-[var(--color-secondary)]" v-else) Analytical Model

    //- Probability Bar
    div(class="relative h-12 lg:h-6 bg-black border border-[var(--color-primary)] rounded-none overflow-hidden")
      //- Team 1 Bar (left side)
      .absolute.left-0.top-0.bottom-0.transition-all.duration-500(
        :style="{ width: team1Percentage + '%' }"
        :class="team1BarColor"
      )
        div(class="absolute inset-0 flex items-center justify-start px-3 lg:px-1.5")
          div(class="text-black font-black text-lg lg:text-xs font-mono" v-if="team1Percentage > 15") {{ team1Percentage }}%

      //- Team 2 Bar (right side)
      .absolute.right-0.top-0.bottom-0.transition-all.duration-500(
        :style="{ width: team2Percentage + '%' }"
        :class="team2BarColor"
      )
        div(class="absolute inset-0 flex items-center justify-end px-3 lg:px-1.5")
          div(class="text-black font-black text-lg lg:text-xs font-mono" v-if="team2Percentage > 15") {{ team2Percentage }}%

      //- Center line
      div(class="absolute left-1/2 top-0 bottom-0 w-0.5 lg:w-px bg-[var(--color-secondary)] opacity-100" style="transform: translateX(-50%)")

    //- Detailed Stats (optional, toggleable)
    .mt-2.flex.items-center.justify-center.gap-4.text-xs.font-mono(v-if="showDetails")
      div
        span(class="text-[var(--color-secondary)]") Confidence:
        = ' '
        span(class="text-[var(--color-primary)] font-semibold") {{ confidenceLower }}% - {{ confidenceUpper }}%
      div
        span(class="text-[var(--color-secondary)]") Current:
        = ' '
        span(class="text-[var(--color-primary)] font-semibold") {{ winProb.team1.currentPoints.toFixed(1) }} - {{ winProb.team2.currentPoints.toFixed(1) }}
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'WinProbabilityBar',
  props: {
    winProb: {
      type: Object,
      required: false,
      default: null
    },
    showDetails: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    const team1Percentage = computed(() => {
      return props.winProb ? Math.round(props.winProb.team1WinProbability * 100) : 0
    })

    const team2Percentage = computed(() => {
      return props.winProb ? Math.round(props.winProb.team2WinProbability * 100) : 0
    })

    const confidenceLower = computed(() => {
      return props.winProb.confidenceInterval ? Math.round(props.winProb.confidenceInterval.lower * 100) : 0
    })

    const confidenceUpper = computed(() => {
      return props.winProb.confidenceInterval ? Math.round(props.winProb.confidenceInterval.upper * 100) : 0
    })

    const team1BarColor = computed(() => {
      if (!props.winProb) return 'bg-gray-400'
      const prob = props.winProb.team1WinProbability
      if (prob >= 0.7) return 'bg-[var(--color-primary)]'
      if (prob >= 0.55) return 'bg-[var(--color-primary)] opacity-80'
      if (prob >= 0.45) return 'bg-yellow-500'
      return 'bg-red-600'
    })

    const team2BarColor = computed(() => {
      if (!props.winProb) return 'bg-gray-400'
      const prob = props.winProb.team2WinProbability
      if (prob >= 0.7) return 'bg-[var(--color-primary)]'
      if (prob >= 0.55) return 'bg-[var(--color-primary)] opacity-80'
      if (prob >= 0.45) return 'bg-yellow-500'
      return 'bg-red-600'
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
  border-top: 1px solid var(--color-primary);
}

@media (min-width: 1024px) {
  .win-probability-container {
    margin-top: 0.5rem; /* 8px */
    padding-top: 0.5rem; /* 8px */
  }
}
</style>
