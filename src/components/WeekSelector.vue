<template lang="pug">
div(class="fixed top-24 left-0 right-0 z-30 bg-[var(--color-background)] pb-4 pt-4 lg:pb-2 lg:pt-2 border-b border-[var(--color-primary)]")
  .container.mx-auto.px-4.max-w-7xl
    div(class="flex items-center justify-center gap-3 mb-3 lg:mb-2")
      button(class="px-4 py-2 bg-[var(--color-surface)] hover:bg-[var(--color-primary)] hover:text-black border border-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--color-primary)] font-bold transition-all duration-200"
        @click="changeWeek('prev')"
        :disabled="modelValue === 1"
      ) &lt; PREV
      div(class="relative")
        select(class="px-4 py-2 bg-[var(--color-surface)] text-[var(--color-primary)] font-bold text-xl border border-[var(--color-primary)] focus:outline-none focus:bg-[var(--color-primary)] focus:text-black transition-colors uppercase font-mono"
          :value="modelValue"
          @change="updateWeek($event.target.value)"
        )
          option(v-for="week in totalWeeks" :key="week" :value="week") Week {{ week }}
      button(class="px-4 py-2 bg-[var(--color-surface)] hover:bg-[var(--color-primary)] hover:text-black border border-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--color-primary)] font-bold transition-all duration-200"
        @click="changeWeek('next')"
        :disabled="modelValue === totalWeeks"
      ) NEXT >

    //- Season Progress Bar
    .max-w-2xl.mx-auto
      .flex.items-center.justify-between.text-xs.text-gray-400.mb-1
        span Week {{ modelValue }} of {{ totalWeeks }}
        span {{ Math.round((modelValue / totalWeeks) * 100) }}% Complete
      div(class="w-full bg-[var(--color-surface)] border border-[var(--color-primary)] h-2 overflow-hidden")
        div(class="bg-[var(--color-primary)] h-full transition-all duration-500"
          :style="{ width: `${(modelValue / totalWeeks) * 100}%` }"
        )

    //- Last Updated Indicator (only shown during active games)
    div(v-if="lastUpdated && isAutoRefreshActive" class="flex flex-col items-center gap-2 mt-3")
      div(class="flex items-center gap-2 text-xs text-gray-500")
        div(class="w-2 h-2 rounded-full bg-green-500 animate-pulse")
        span(class="text-green-400") Auto-updating every 2 minutes
        span(class="text-gray-600") •
        span Last updated: {{ lastUpdated.toLocaleTimeString() }}
      button(
        @click="$emit('refresh')"
        class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-gray-400 hover:text-white text-xs rounded transition-colors"
      ) Refresh Now
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: Number,
    required: true
  },
  totalWeeks: {
    type: Number,
    required: true
  },
  lastUpdated: {
    type: Date,
    default: null
  },
  isAutoRefreshActive: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'refresh'])

const updateWeek = (value) => {
  emit('update:modelValue', parseInt(value))
}

const changeWeek = (direction) => {
  const current = props.modelValue
  const next = direction === 'next' ? current + 1 : current - 1
  if (next >= 1 && next <= props.totalWeeks) {
    emit('update:modelValue', next)
  }
}
</script>
