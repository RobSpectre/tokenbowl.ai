<template>
  <div class="ccusage-container">
    <div
      class="ccusage-content grid grid-cols-6"
      v-motion
      :initial="{ opacity: 0, y: -20 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 600, delay: 100 } }"
    >
      <!-- Model Badge -->
      <div class="model-badge-col flex items-center justify-center gap-2 px-4 py-3 border-r border-white/25">
        <img src="/images/logos/claude-color.svg" alt="Claude" class="model-icon w-8 h-8" />
        <span class="model-name text-2xl">{{ formatModelName(currentModel) }}</span>
      </div>

      <!-- Session Stats with Sparkline -->
      <div class="session-col flex items-center justify-center px-4 py-3 border-r border-white/25 overflow-hidden">
        <div class="w-full max-w-full">
          <SessionSparkline
            :inputTokens="sessionStats.inputTokens"
            :outputTokens="sessionStats.outputTokens"
            :totalCost="sessionStats.totalCost"
            :lastUpdate="lastUpdate"
          />
        </div>
      </div>

      <!-- Today Stats (spans 2 columns) -->
      <div class="stat-group col-span-2 flex items-center justify-center gap-2 px-4 py-3 border-r border-white/25">
        <span class="stat-icon text-2xl">📅</span>
        <span class="stat-label text-xl">Today:</span>
        <span class="stat-value text-2xl whitespace-nowrap">
          {{ abbreviateNumber(todayStats.inputTokens) }}
          <span class="stat-unit text-base">in</span>
        </span>
        <span class="stat-value text-2xl whitespace-nowrap">
          {{ abbreviateNumber(todayStats.outputTokens) }}
          <span class="stat-unit text-base">out</span>
        </span>
        <span class="stat-value cost text-3xl whitespace-nowrap">
          $<OdometerNumber :value="todayStats.totalCost" :decimals="2" :playSound="true" />
        </span>
      </div>

      <!-- Last 30 Days Stats (spans 2 columns) -->
      <div class="stat-group col-span-2 flex flex-wrap items-center justify-center gap-2 px-4 py-3">
        <span class="stat-icon text-2xl">📊</span>
        <span class="stat-label text-xl whitespace-nowrap">Last 30 Days:</span>
        <span class="stat-value text-2xl whitespace-nowrap">
          {{ abbreviateNumber(last30DaysStats.inputTokens) }}
          <span class="stat-unit text-base">in</span>
        </span>
        <span class="stat-value text-2xl whitespace-nowrap">
          {{ abbreviateNumber(last30DaysStats.outputTokens) }}
          <span class="stat-unit text-base">out</span>
        </span>
        <span class="stat-value cost text-3xl whitespace-nowrap">
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
/* 1920px Layout - Full HD optimized with chroma key background */
.ccusage-container {
  width: 1920px;
  height: 1080px;
  background: #0000FF; /* Pure blue chroma key background */
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.ccusage-content {
  padding: 0;
  margin-top: 100px; /* Position below header with clearance */
  max-width: 1920px;
  margin-left: auto;
  margin-right: auto;
  background: linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%);
  border-bottom: 2px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  position: relative;
  z-index: 1000;
  min-height: 80px;
}

/* Model Badge Column */
.model-badge-col {
  background: rgba(255, 255, 255, 0.03);
}

.model-icon {
  line-height: 1;
}

.model-name {
  color: #ffffff;
  font-weight: 800;
  background: linear-gradient(135deg, #00d4ff, #7b2ff7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  white-space: nowrap;
}

.stat-icon {
  line-height: 1;
}

.stat-label {
  color: rgba(255, 255, 255, 0.75);
  font-weight: 700;
  white-space: nowrap;
}

.stat-value {
  font-weight: 800;
  color: #ffffff;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.stat-value.cost {
  background: linear-gradient(135deg, #00ff88, #00d4ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-unit {
  color: rgba(255, 255, 255, 0.6);
  font-weight: 600;
  margin-left: 4px;
}

/* Responsive adjustments for smaller screens */
@media (max-width: 3840px) {
  .ccusage-container {
    width: 100vw;
    height: 100vh;
  }

  .ccusage-content {
    padding: 20px;
    gap: 16px;
  }

  .stat-group {
    gap: 8px;
  }
}
</style>
