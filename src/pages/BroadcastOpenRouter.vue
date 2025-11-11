<template>
  <div class="w-screen h-screen bg-[#0000FF] fixed inset-0 font-sans overflow-hidden flex items-start justify-center">
    <div
      class="w-[1920px] mt-24 grid grid-cols-4 items-center bg-gradient-to-r from-[#1a1a2e] to-[#2d2d44] border-b border-white/20 shadow-lg min-h-[80px] text-white"
      v-motion
      :initial="{ opacity: 0, y: -16 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 600, delay: 100 } }"
    >
      <!-- Model Badge -->
      <div class="flex items-center justify-center gap-2 pl-2 pr-4 border-r border-white/20">
        <span
          v-if="emoji"
          class="text-3xl leading-none"
        >
          {{ emoji }}
        </span>
        <img
          v-else
          src="/images/logos/claude-color.svg"
          alt="OpenRouter"
          class="w-8 h-8"
        />
        <span class="text-xl font-extrabold bg-gradient-to-r from-[#00d4ff] to-[#7b2ff7] bg-clip-text text-transparent whitespace-nowrap">
          {{ displayModelName }}
        </span>
      </div>

      <!-- Session Stats with Sparkline -->
      <div class="flex items-center justify-center px-4 border-r border-white/20 overflow-hidden">
        <div class="w-full max-w-full">
          <SessionSparkline
            :inputTokens="sessionStats.inputTokens"
            :outputTokens="sessionStats.outputTokens"
            :totalCost="sessionStats.totalCost"
            :lastUpdate="lastUpdate"
          />
        </div>
      </div>

      <!-- Today Stats -->
      <div class="flex items-center justify-center gap-2 px-4 border-r border-white/20">
        <span class="text-3xl" style="line-height: 1;">📅</span>
        <span class="text-base text-white/70 font-bold uppercase tracking-wide">Today</span>
        <span class="text-xl font-extrabold tabular-nums whitespace-nowrap">
          {{ abbreviateNumber(todayStats.inputTokens) }}<span class="ml-1 text-sm text-white/60 font-semibold">in</span>
        </span>
        <span class="text-xl font-extrabold tabular-nums whitespace-nowrap">
          {{ abbreviateNumber(todayStats.outputTokens) }}<span class="ml-1 text-sm text-white/60 font-semibold">out</span>
        </span>
        <span class="text-3xl font-extrabold bg-gradient-to-r from-[#00ff88] to-[#00d4ff] bg-clip-text text-transparent whitespace-nowrap">
          $<OdometerNumber :value="todayStats.totalCost" :decimals="2" :playSound="true" />
        </span>
      </div>

      <!-- Last 30 Days Stats -->
      <div class="flex items-center justify-center gap-2 px-4">
        <span class="text-3xl" style="line-height: 1;">📊</span>
        <span class="text-base text-white/70 font-bold uppercase tracking-wide whitespace-nowrap">30 Days</span>
        <span class="text-xl font-extrabold tabular-nums whitespace-nowrap">
          {{ abbreviateNumber(last30DaysStats.inputTokens) }}<span class="ml-1 text-sm text-white/60 font-semibold">in</span>
        </span>
        <span class="text-xl font-extrabold tabular-nums whitespace-nowrap">
          {{ abbreviateNumber(last30DaysStats.outputTokens) }}<span class="ml-1 text-sm text-white/60 font-semibold">out</span>
        </span>
        <span class="text-3xl font-extrabold bg-gradient-to-r from-[#00ff88] to-[#00d4ff] bg-clip-text text-transparent whitespace-nowrap">
          $<OdometerNumber :value="last30DaysStats.totalCost" :decimals="2" :playSound="true" />
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import OdometerNumber from '../components/ccusage/OdometerNumber.vue'
import SessionSparkline from '../components/ccusage/SessionSparkline.vue'

/**
 * BroadcastOpenRouter
 *
 * Mirrors the /ccusage broadcast overlay UI, but backed by OpenRouter API usage.
 * Mounted at /broadcast/openrouter.
 *
 * Behavior:
 * - Reads ?model=<slug> to filter to a specific model (optional).
 * - Reads ?show_30=true|false to include last 30 days (default true).
 * - Reads ?emoji=<emoji> to show a custom emoji in the model badge (optional).
 */

export default {
  name: 'BroadcastOpenRouter',
  components: {
    OdometerNumber,
    SessionSparkline
  },
  setup() {
    const route = useRoute()
    const router = useRouter()

    const usageData = ref(null)
    const lastUpdate = ref(Date.now())
    let refreshInterval = null

    const modelFilter = computed(() => {
      const raw = route.query.model
      if (typeof raw !== 'string' || raw.trim().length === 0) return null
      try {
        return decodeURIComponent(raw.trim())
      } catch {
        return raw.trim()
      }
    })

    const show30 = computed(() => {
      const q = route.query.show_30
      if (q === 'false' || q === '0' || q === 'no') return false
      if (q === 'true' || q === '1' || q === 'yes') return true
      return true
    })

    // Keep URL explicit for defaults (non-destructive)
    onMounted(() => {
      const query = { ...route.query }
      let changed = false

      if (query.show_30 === undefined) {
        query.show_30 = 'true'
        changed = true
      }

      if (changed) {
        router.replace({ query }).catch(() => {})
      }
    })

    const displayModelName = computed(() => {
      if (modelFilter.value) return formatModelName(modelFilter.value)
      return 'All OpenRouter Models'
    })

    const emoji = computed(() => {
      const raw = route.query.emoji
      if (typeof raw !== 'string' || raw.trim().length === 0) return ''
      try {
        return decodeURIComponent(raw)
      } catch {
        return raw
      }
    })

    const filteredDaily = computed(() => {
      if (!usageData.value?.daily || !Array.isArray(usageData.value.daily)) {
        return []
      }

      let days = usageData.value.daily

      if (show30.value) {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const cutoff = thirtyDaysAgo.toISOString().split('T')[0]
        days = days.filter(d => d.date >= cutoff)
      }

      if (modelFilter.value) {
        const target = modelFilter.value
        return days.map(day => {
          const modelUsage = (day.models && day.models[target]) || null
          if (!modelUsage) {
            return {
              date: day.date,
              inputTokens: 0,
              outputTokens: 0,
              totalCost: 0
            }
          }
          return {
            date: day.date,
            inputTokens: modelUsage.input_tokens || 0,
            outputTokens: modelUsage.output_tokens || 0,
            totalCost: modelUsage.total_cost || 0
          }
        })
      }

      // Aggregate all models
      return days.map(day => {
        if (!day.models) {
          return {
            date: day.date,
            inputTokens: day.inputTokens || 0,
            outputTokens: day.outputTokens || 0,
            totalCost: day.totalCost || 0
          }
        }
        let input = 0
        let output = 0
        let cost = 0
        for (const m of Object.values(day.models)) {
          input += m.input_tokens || 0
          output += m.output_tokens || 0
          cost += m.total_cost || 0
        }
        return {
          date: day.date,
          inputTokens: input,
          outputTokens: output,
          totalCost: cost
        }
      })
    })

    const sessionStats = computed(() => {
      const days = filteredDaily.value
      if (!days.length) {
        return { inputTokens: 0, outputTokens: 0, totalCost: 0 }
      }
      const latest = days[days.length - 1]
      return {
        inputTokens: latest.inputTokens || 0,
        outputTokens: latest.outputTokens || 0,
        totalCost: latest.totalCost || 0
      }
    })

    const todayStats = computed(() => {
      const days = filteredDaily.value
      if (!days.length) {
        return { inputTokens: 0, outputTokens: 0, totalCost: 0 }
      }

      const today = new Date().toISOString().split('T')[0]
      const todayData = days.find(d => d.date === today) || days[days.length - 1]

      if (!todayData) {
        return { inputTokens: 0, outputTokens: 0, totalCost: 0 }
      }

      return {
        inputTokens: todayData.inputTokens || 0,
        outputTokens: todayData.outputTokens || 0,
        totalCost: todayData.totalCost || 0
      }
    })

    const last30DaysStats = computed(() => {
      const days = filteredDaily.value
      if (!days.length) {
        return { inputTokens: 0, outputTokens: 0, totalCost: 0 }
      }

      return days.reduce(
        (acc, d) => {
          acc.inputTokens += d.inputTokens || 0
          acc.outputTokens += d.outputTokens || 0
          acc.totalCost += d.totalCost || 0
          return acc
        },
        { inputTokens: 0, outputTokens: 0, totalCost: 0 }
      )
    })

    const formatModelName = (slug) => {
      if (!slug) return 'All OpenRouter Models'
      return slug
        .replace(/^openrouter\//, '')
        .replace(/:/g, ' ')
        .replace(/-/g, ' ')
        .replace(/\b(\w)/g, c => c.toUpperCase())
    }

    const abbreviateNumber = (num) => {
      if (!num || num === 0) return '0'

      const absNum = Math.abs(num)

      if (absNum >= 1000000) {
        return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
      } else if (absNum >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
      }

      return num.toString()
    }

    const loadUsageFromOpenRouter = async () => {
      try {
        const url = '/api/openrouter/usage'
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json'
          }
        })

        if (!response.ok) {
          console.error('[BroadcastOpenRouter] HTTP error fetching usage:', response.status)
          return
        }

        const data = await response.json()

        if (!data || !Array.isArray(data.daily)) {
          console.error(
            '[BroadcastOpenRouter] Invalid data structure from usage endpoint:',
            data
          )
          return
        }

        usageData.value = data
        const ts = Date.now()
        lastUpdate.value = ts
        console.log(
          '[BroadcastOpenRouter] Usage loaded. Days:',
          data.daily.length,
          'Last update:',
          ts
        )
      } catch (err) {
        console.error('[BroadcastOpenRouter] Error loading OpenRouter usage:', err)
      }
    }

    onMounted(async () => {
      await loadUsageFromOpenRouter()
      // Match CCUsage refresh feel (slightly less frequent to be safe)
      refreshInterval = setInterval(loadUsageFromOpenRouter, 30000)
    })

    onUnmounted(() => {
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
    })

    return {
      displayModelName,
      emoji,
      sessionStats,
      todayStats,
      last30DaysStats,
      lastUpdate,
      abbreviateNumber
    }
  }
}
</script>

<style scoped>
/* Minimal scoped overrides for chroma key background context if needed */
</style>
