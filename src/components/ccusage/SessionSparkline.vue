<template>
  <div class="session-sparkline">
    <div ref="chartRef" class="sparkline-chart"></div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'

export default {
  name: 'SessionSparkline',
  props: {
    inputTokens: {
      type: Number,
      default: 0
    },
    outputTokens: {
      type: Number,
      default: 0
    },
    totalCost: {
      type: Number,
      default: 0
    },
    lastUpdate: {
      type: Number,
      default: 0
    }
  },
  setup(props) {
    const chartRef = ref(null)
    let chart = null
    const dataPoints = ref([])
    const maxDataPoints = 20 // Keep last 20 data points
    const previousTotalTokens = ref(0)

    const initChart = () => {
      if (!chartRef.value) return

      chart = echarts.init(chartRef.value)

      const option = {
        grid: {
          left: 0,
          right: 0,
          top: 8,
          bottom: 8
        },
        xAxis: {
          type: 'category',
          show: false,
          boundaryGap: false
        },
        yAxis: {
          type: 'value',
          show: false
        },
        series: [
          {
            name: 'Total Tokens',
            type: 'line',
            smooth: true,
            symbol: 'none',
            lineStyle: {
              color: '#00ff88',
              width: 3
            },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(0, 255, 136, 0.4)' },
                  { offset: 1, color: 'rgba(0, 255, 136, 0.05)' }
                ]
              }
            },
            data: []
          }
        ]
      }

      chart.setOption(option)
    }

    const updateChart = () => {
      if (!chart) {
        console.log('[SPARKLINE] Chart not initialized yet')
        return
      }

      // Calculate total tokens
      const currentTotalTokens = props.inputTokens + props.outputTokens

      // Calculate incremental usage (delta from previous value)
      const tokenDelta = Math.max(0, currentTotalTokens - previousTotalTokens.value)

      console.log('[SPARKLINE] Updating chart:', {
        currentTotalTokens,
        previousTotalTokens: previousTotalTokens.value,
        tokenDelta,
        dataPointsLength: dataPoints.value.length
      })

      // Add new incremental data point
      dataPoints.value.push({
        total: tokenDelta,
        timestamp: Date.now()
      })

      // Update previous value for next calculation
      previousTotalTokens.value = currentTotalTokens

      // Keep only last N points
      if (dataPoints.value.length > maxDataPoints) {
        dataPoints.value.shift()
      }

      // Update chart
      chart.setOption({
        series: [
          {
            data: dataPoints.value.map(p => p.total)
          }
        ]
      })

      console.log('[SPARKLINE] Chart updated with data:', dataPoints.value.map(p => p.total))
    }

    // Watch for changes in lastUpdate timestamp - triggers every 15 seconds
    watch(() => props.lastUpdate, (newVal, oldVal) => {
      console.log('[SPARKLINE] lastUpdate changed:', { oldVal, newVal })
      updateChart()
    })

    onMounted(() => {
      // Initialize previous value to current total on first mount
      previousTotalTokens.value = props.inputTokens + props.outputTokens

      initChart()

      // Add initial data point with value 0
      dataPoints.value.push({
        total: 0,
        timestamp: Date.now()
      })

      // Update chart with initial data
      if (chart) {
        chart.setOption({
          series: [{
            data: dataPoints.value.map(p => p.total)
          }]
        })
      }
    })

    onUnmounted(() => {
      if (chart) {
        chart.dispose()
      }
    })

    return {
      chartRef
    }
  }
}
</script>

<style scoped>
.session-sparkline {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.sparkline-chart {
  width: 100%;
  height: 60px;
}
</style>
