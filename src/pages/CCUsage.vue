<template>
  <div class="w-screen h-screen bg-[#0000FF] fixed inset-0 overflow-hidden flex items-start justify-center">
    <div
      class="w-[1920px] mt-24 grid grid-cols-4 items-center bg-gradient-to-r from-[#1a1a2e] to-[#2d2d44] border-b border-white/20 shadow-lg min-h-[80px] text-white"
      v-motion
      :initial="{ opacity: 0, y: -16 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 600, delay: 100 } }"
    >
      <!-- Model Badge -->
      <div class="flex items-center justify-center gap-2 pl-2 pr-4 border-r border-white/20">
        <img src="/images/logos/claude-color.svg" alt="Claude" class="w-8 h-8" />
        <span class="text-xl font-extrabold bg-gradient-to-r from-[#00d4ff] to-[#7b2ff7] bg-clip-text text-transparent whitespace-nowrap">
          {{ formatModelName(currentModel) }}
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
        <span class="text-3xl">📅</span>
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
        <span class="text-3xl">📊</span>
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
import OdometerNumber from '../components/ccusage/OdometerNumber.vue'
import SessionSparkline from '../components/ccusage/SessionSparkline.vue'

export default {
  name: 'CCUsage',
  components: {
    OdometerNumber,
    SessionSparkline
  },
  setup() {
    const usageData = ref(null)
    const lastUpdate = ref(Date.now())
    let refreshInterval = null

    const currentModel = computed(() => {
      if (!usageData.value?.daily?.length) return 'claude-sonnet-4-5-20250929'
      const latestDay = usageData.value.daily[usageData.value.daily.length - 1]
      return latestDay.modelsUsed?.[0] || 'claude-sonnet-4-5-20250929'
    })

    const todayStats = computed(() => {
      if (!usageData.value?.daily?.length) {
        return { inputTokens: 0, outputTokens: 0, totalCost: 0 }
      }
      const today = new Date().toISOString().split('T')[0]
      let todayData = usageData.value.daily.find(d => d.date === today)

      // If no data for today, use the most recent day
      if (!todayData) {
        console.log('[CCUSAGE] No data for', today, '- using most recent day')
        todayData = usageData.value.daily[usageData.value.daily.length - 1]
      }

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
      if (!usageData.value?.daily?.length) {
        return { inputTokens: 0, outputTokens: 0, totalCost: 0 }
      }
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

      const last30Days = usageData.value.daily.filter(d => d.date >= thirtyDaysAgoStr)

      return last30Days.reduce((acc, day) => ({
        inputTokens: acc.inputTokens + (day.inputTokens || 0),
        outputTokens: acc.outputTokens + (day.outputTokens || 0),
        totalCost: acc.totalCost + (day.totalCost || 0)
      }), { inputTokens: 0, outputTokens: 0, totalCost: 0 })
    })

    const sessionStats = computed(() => {
      // Session stats come from today's data in the daily array
      if (!usageData.value?.daily?.length) {
        return { inputTokens: 0, outputTokens: 0, totalCost: 0 }
      }

      const today = new Date().toISOString().split('T')[0]
      let todayData = usageData.value.daily.find(d => d.date === today)

      // If no data for today, use the most recent day
      if (!todayData) {
        todayData = usageData.value.daily[usageData.value.daily.length - 1]
      }

      if (!todayData) {
        return { inputTokens: 0, outputTokens: 0, totalCost: 0 }
      }

      return {
        inputTokens: todayData.inputTokens || 0,
        outputTokens: todayData.outputTokens || 0,
        totalCost: todayData.totalCost || 0
      }
    })

    const formatModelName = (modelName) => {
      if (!modelName) return 'Claude'
      // Extract friendly name from model string
      if (modelName.includes('sonnet')) return 'Claude Sonnet 4.5'
      if (modelName.includes('opus')) return 'Claude Opus 4'
      if (modelName.includes('haiku')) return 'Claude Haiku 4'
      return modelName
    }

    const abbreviateNumber = (num) => {
      if (!num || num === 0) return '0'

      const absNum = Math.abs(num)

      if (absNum >= 1000000) {
        // Millions
        return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
      } else if (absNum >= 1000) {
        // Thousands
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
      }

      return num.toString()
    }

    const loadData = async () => {
      try {
        const response = await fetch('/data/ccusage.json?' + Date.now())

        if (!response.ok) {
          console.error('[CCUSAGE] HTTP error fetching data:', response.status)
          return
        }

        const text = await response.text()

        if (!text || text.trim().length === 0) {
          console.warn('[CCUSAGE] Empty response, will retry on next interval')
          return
        }

        const data = JSON.parse(text)

        if (!data || !data.daily || !Array.isArray(data.daily)) {
          console.error('[CCUSAGE] Invalid data structure:', data)
          return
        }

        usageData.value = data
        const newTimestamp = Date.now()
        console.log('[CCUSAGE] Data loaded successfully. Days:', data.daily.length, 'Last update:', newTimestamp)
        lastUpdate.value = newTimestamp // Update timestamp to trigger sparkline
      } catch (error) {
        console.error('[CCUSAGE] Error loading usage data:', error)
      }
    }

    onMounted(async () => {
      console.log('[CCUSAGE] Component mounted, loading data...')
      await loadData()

      // Refresh every 15 seconds
      refreshInterval = setInterval(loadData, 15000)
    })

    onUnmounted(() => {
      console.log('[CCUSAGE] Component unmounted, stopping refresh...')
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
    })

    return {
      currentModel,
      sessionStats,
      todayStats,
      last30DaysStats,
      lastUpdate,
      formatModelName,
      abbreviateNumber
    }
  }
}
</script>

<style scoped>
.stat-icon {
  line-height: 1;
}
</style>
