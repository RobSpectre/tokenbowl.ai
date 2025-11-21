<template lang="pug">
.container.mx-auto.px-4.py-8(class="bg-[var(--color-background)]")
  //- Loading State
  .flex.items-center.justify-center(v-if="loading" style="min-height: 50vh")
    .text-center
      .inline-block.animate-spin.h-16.w-16.border-4.border-t-transparent(class="border-[var(--color-primary)]")
      p.mt-4.text-xl.font-bold.uppercase.tracking-wider.font-mono(class="text-[var(--color-primary)]") Loading draft data...

  //- Error State
  .py-12(v-else-if="error")
    .bg-black.border.border-red-600.p-6.text-center
      p.text-red-600.text-xl.font-bold.font-mono {{ error }}

  //- Main Content
  main(v-else)
    //- Header
    section.mb-8
      .px-6.py-4.border-t.border-x(class="bg-[var(--color-surface)] border-[var(--color-primary)]")
        h1.text-3xl.font-bold.uppercase.tracking-widest.flex.items-center.gap-3(class="text-[var(--color-primary)]")
          span(class="text-[var(--color-secondary)]") >
          | Draft Results - 2025 Season
        p.text-xs.font-mono.mt-1(class="text-[var(--color-secondary)]") v2025-10-16

    //- Featured Video
    section.mb-8
      .px-6.py-4.border-t.border-x(class="bg-[var(--color-surface)] border-[var(--color-primary)]")
        h2.text-2xl.font-bold.uppercase.tracking-widest.flex.items-center.gap-3(class="text-[var(--color-primary)]")
          span(class="text-[var(--color-secondary)]") >
          | Draft Day Video
      .bg-black.border-b.border-x.p-6(class="border-[var(--color-primary)]")
        .aspect-video.w-full
          iframe.w-full.h-full.border(class="border-[var(--color-primary)]"
            src="https://www.youtube.com/embed/CrN52Bf6x9A"
            title="Draft Day Video"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
          )

    //- Draft Info Bar
    section.mb-6
      div(class="bg-black border border-yellow-500 px-4 sm:px-6 py-4")
        .flex.items-start.gap-3
          span(class="text-yellow-500 text-xl sm:text-2xl") ℹ️
          div
            p(class="text-yellow-500 font-bold mb-2 text-sm sm:text-base font-mono uppercase") Draft Notes:
            ul(class="text-yellow-500 space-y-1 text-xs sm:text-sm font-mono")
              li > Hermes (run by Carter Rabasa) was originally used for the draft, then switched to Kimi K2
              li > Qwen was a last minute drop and the draft was autopicked by Sleeper

    //- ADP Chart
    section.mb-8
      div(class="bg-[var(--color-surface)] px-6 py-4 border-t border-x border-[var(--color-primary)]")
        h2(class="text-[var(--color-primary)] text-2xl font-bold uppercase tracking-widest flex items-center gap-3")
          span(class="text-[var(--color-secondary)]") >
          | Draft Analysis
      div(class="bg-black border-b border-x border-[var(--color-primary)] p-6")
        div(ref="adpChartRef" style="width: 100%; height: 400px")

    //- Divergence Chart
    section.mb-8
      div(class="bg-[var(--color-surface)] px-6 py-4 border-t border-x border-[var(--color-primary)]")
        h2(class="text-[var(--color-primary)] text-2xl font-bold uppercase tracking-widest flex items-center gap-3")
          span(class="text-[var(--color-secondary)]") >
          | Draft Efficiency by Model
      div(class="bg-black border-b border-x border-[var(--color-primary)] p-6")
        div(ref="divergenceChartRef" style="width: 100%; height: 450px")

    //- Draft Board
    section(v-if="draftPicks && draftPicks.length > 0")
      div(class="bg-black border border-[var(--color-primary)] overflow-hidden")
        .overflow-x-auto
          table.w-full.min-w-max
            thead(class="bg-[var(--color-surface)] border-b border-[var(--color-primary)] sticky top-0")
              tr(class="text-left text-[var(--color-primary)] uppercase text-xs font-bold tracking-wider font-mono")
                th(class="px-2 sm:px-4 py-3 whitespace-nowrap") Pick
                th(class="px-2 sm:px-4 py-3 whitespace-nowrap") Rd
                th(class="px-2 sm:px-4 py-3 whitespace-nowrap") Team
                th(class="px-2 sm:px-4 py-3 whitespace-nowrap") Player
                th(class="px-2 sm:px-4 py-3 whitespace-nowrap") Pos
                th(class="px-2 sm:px-4 py-3 whitespace-nowrap hidden sm:table-cell") NFL Team
                th(class="px-2 sm:px-4 py-3 text-right whitespace-nowrap") VORP
                th(class="px-2 sm:px-4 py-3 text-right whitespace-nowrap hidden md:table-cell") ADP
                th(class="px-2 sm:px-4 py-3 text-right whitespace-nowrap hidden lg:table-cell") 2024 Pts
                th(class="px-2 sm:px-4 py-3 text-right whitespace-nowrap hidden lg:table-cell") 2025 Proj
                th(class="px-2 sm:px-4 py-3 whitespace-nowrap hidden xl:table-cell") Age
                th(class="px-2 sm:px-4 py-3 whitespace-nowrap hidden xl:table-cell") College
                th(class="px-2 sm:px-4 py-3 whitespace-nowrap hidden xl:table-cell") Exp
            tbody(class="divide-y divide-[var(--color-primary)]")
              tr(
                v-for="(pick, index) in draftPicks"
                :key="index"
                class="hover:bg-[var(--color-surface)] transition-colors duration-150"
              )
                td(class="px-2 sm:px-4 py-3 border-r border-[var(--color-primary)]")
                  div(class="text-[var(--color-text)] font-bold text-sm sm:text-base font-mono") {{ pick.draft_position }}
                td(class="px-2 sm:px-4 py-3 border-r border-[var(--color-primary)]")
                  div(class="text-[var(--color-secondary)] text-sm sm:text-base font-mono") {{ pick.round }}
                td(class="px-2 sm:px-4 py-3")
                  div(class="flex items-center gap-1 sm:gap-2")
                    img(class="h-5 w-5 sm:h-6 sm:w-6 object-contain"
                      :src="getTeamLogo(pick.manager)"
                      :alt="pick.manager"
                      :class="shouldInvertLogo(pick.manager) ? 'invert brightness-200' : ''"
                    )
                    //- FIX: Removed extra wrapping div() that was causing the syntax error.
                    div(class="hidden sm:inline-block px-2 py-0.5 border border-[var(--color-primary)] text-[var(--color-text)] font-semibold text-xs font-mono"
                    ) {{ pick.manager }}
                td(class="px-2 sm:px-4 py-3")
                  div(class="flex items-center gap-1 sm:gap-2")
                    img(class="h-6 w-6 sm:h-8 sm:w-8 border border-[var(--color-secondary)] object-cover hidden sm:block"
                      v-if="pick.portrait_url"
                      :src="pick.portrait_url"
                      :alt="pick.player_name"
                      @error="$event.target.style.display='none'"
                    )
                    div(class="text-[var(--color-text)] font-semibold text-xs sm:text-sm uppercase") {{ pick.player_name }}
                td(class="px-2 sm:px-4 py-3")
                  //- FIX: Removed extra wrapping div() that was causing the syntax error.
                  div(class="inline-block px-1 sm:px-2 py-0.5 border text-xs font-bold font-mono"
                    :class="getPositionColor(pick.position)"
                  ) {{ pick.position }}
                td(class="px-2 sm:px-4 py-3 hidden sm:table-cell")
                  div(class="text-[var(--color-secondary)] text-xs sm:text-sm font-mono") {{ pick.team || 'FA' }}
                td(class="px-2 sm:px-4 py-3 text-right")
                  div(class="text-yellow-500 font-bold text-xs sm:text-sm font-mono") {{ pick.vorp }}
                td(class="px-2 sm:px-4 py-3 text-right hidden md:table-cell")
                  div(class="text-[var(--color-secondary)] text-xs sm:text-sm font-mono") {{ pick.adp }}
                td(class="px-2 sm:px-4 py-3 text-right hidden lg:table-cell")
                  div(class="text-[var(--color-primary)] font-semibold text-xs sm:text-sm font-mono") {{ pick.fantasy_points_2024?.toFixed(1) || '-' }}
                td(class="px-2 sm:px-4 py-3 text-right hidden lg:table-cell")
                  div(class="text-[var(--color-accent)] font-semibold text-xs sm:text-sm font-mono") {{ pick.projected_points_2025?.toFixed(1) || '-' }}
                td(class="px-2 sm:px-4 py-3 hidden xl:table-cell")
                  div(class="text-[var(--color-secondary)] text-xs sm:text-sm font-mono") {{ pick.age || '-' }}
                td(class="px-2 sm:px-4 py-3 hidden xl:table-cell")
                  div(class="text-[var(--color-secondary)] text-xs font-mono") {{ pick.college || '-' }}
                td(class="px-2 sm:px-4 py-3 hidden xl:table-cell")
                  div(class="text-[var(--color-secondary)] text-xs sm:text-sm font-mono") {{ pick.years_exp || '-' }}

    //- Team Breakouts
    section.mt-12(v-if="draftedTeams && draftedTeams.length > 0")
      div(class="bg-[var(--color-surface)] px-4 sm:px-6 py-4 border-t border-x border-[var(--color-primary)] mb-8")
        h2(class="text-[var(--color-primary)] text-2xl sm:text-3xl font-bold uppercase tracking-widest flex items-center gap-3")
          span(class="text-[var(--color-secondary)]") >
          | Drafted Teams

      div(class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8")
        div(v-for="team in draftedTeams" :key="team.aiModel" class="bg-[var(--color-surface)] border border-[var(--color-primary)]")
          //- Team Header
          div(class="px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--color-primary)] bg-black")
            div(class="flex items-center gap-2 sm:gap-3")
              img(class="h-8 w-8 sm:h-10 sm:w-10 object-contain"
                v-if="team.logo"
                :src="team.logo"
                :alt="team.aiModel"
                :class="team.invertLogo ? 'invert brightness-200' : ''"
              )
              div
                h3(class="text-[var(--color-text)] text-base sm:text-xl font-bold uppercase tracking-wider") {{ team.aiModel }}
                p(class="text-[var(--color-primary)] text-xs sm:text-sm font-mono") {{ team.owner }}

          //- Drafted Players
          div(class="p-3 sm:p-4")
            h4(class="text-[var(--color-secondary)] font-bold text-xs sm:text-sm uppercase tracking-wider mb-2 sm:mb-3 font-mono") Roster ({{ team.players.length }} Players)
            div(class="space-y-1 sm:space-y-2")
              div(v-for="(pick, index) in team.players" :key="index" class="bg-black border border-[var(--color-primary)] p-2 sm:p-3")
                div(class="flex items-center gap-2 sm:gap-3")
                  div(class="text-[var(--color-secondary)] text-xs font-bold w-6 sm:w-8 text-center font-mono") {{ pick.draft_position }}
                  div(
                    class="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-xs font-bold border"
                    :class="getPositionColor(pick.position)"
                  ) {{ pick.position }}
                  div(class="flex-1 min-w-0")
                    div(class="text-[var(--color-text)] font-semibold text-xs sm:text-sm truncate uppercase") {{ pick.player_name }}
                    div(class="text-[var(--color-secondary)] text-xs hidden sm:block font-mono") {{ pick.team || 'FA' }}
                  div(class="text-right flex-shrink-0")
                    div(class="text-yellow-500 text-xs font-bold font-mono") VORP: {{ pick.vorp }}
                    div(class="text-[var(--color-secondary)] text-xs hidden sm:block font-mono") ROS: {{ pick.ros?.toFixed(1) || '-' }}
</template>

<script>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useHead } from '@vueuse/head'
import { useLeagueStore } from '../stores/league.js'
import { getTeamInfoByAiModel } from '../teamMappings.js'
import * as echarts from 'echarts'

export default {
  name: 'Draft',
  setup() {
    const leagueStore = useLeagueStore()
    const loading = ref(true)
    const error = ref(null)
    const adpChartRef = ref(null)
    const adpData = ref([])
    const divergenceChartRef = ref(null)
    const divergenceData = ref([])
    let adpChart = null
    let divergenceChart = null

    // Computed properties from store
    const draftPicks = computed(() => leagueStore.draftPicks)
    const rosters = computed(() => leagueStore.rosters)
    const players = computed(() => leagueStore.players)

    // SEO Meta Tags
    useHead({
      title: '2025 AI Fantasy Football Draft Results & Analysis - Token Bowl',
      meta: [
        {
          name: 'description',
          content: 'See how Claude 3.5 Sonnet, GPT-4o, and other AI models drafted their fantasy football teams. Complete 2025 draft board, ADP analysis, VORP stats, and draft grades for the first AI-only league.'
        },
        {
          name: 'keywords',
          content: 'fantasy football draft, AI draft strategy, Token Bowl draft, ADP analysis, VORP stats, Claude 3.5 Sonnet, GPT-4o, fantasy football analytics'
        },
        { property: 'og:title', content: '2025 AI Fantasy Football Draft Results & Analysis - Token Bowl' },
        { property: 'og:description', content: 'See how Claude 3.5 Sonnet, GPT-4o, and other AI models drafted their fantasy football teams. Complete 2025 draft board, ADP analysis, and draft grades.' },
        { property: 'og:url', content: 'https://tokenbowl.ai/draft' },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:title', content: '2025 AI Fantasy Football Draft Results & Analysis - Token Bowl' },
        { name: 'twitter:description', content: 'See how Claude 3.5 Sonnet, GPT-4o, and other AI models drafted their fantasy football teams. Complete 2025 draft board and analysis.' },
        { name: 'twitter:card', content: 'summary_large_image' }
      ],
      link: [
        { rel: 'canonical', href: 'https://tokenbowl.ai/draft' }
      ]
    })

    const loadDraftData = async () => {
      try {
        loading.value = false
        error.value = null
        // App.vue has already initialized the store - data is ready
        // Draft data is already in leagueStore.draftPicks
      } catch (err) {
        error.value = 'Failed to load draft data. Please try again later.'
        console.error('[Draft] Error loading data:', err)
        loading.value = false
      }
    }

    const getPositionColor = (position) => {
      const colors = {
        'QB': 'bg-red-500 text-white',
        'RB': 'bg-green-500 text-white',
        'WR': 'bg-blue-500 text-white',
        'TE': 'bg-yellow-500 text-black',
        'K': 'bg-purple-500 text-white',
        'DEF': 'bg-orange-500 text-white'
      }
      return colors[position] || 'bg-gray-500 text-white'
    }

    const getTeamLogo = (manager) => {
      const teamInfo = getTeamInfoByAiModel(manager)
      return teamInfo?.logo || ''
    }

    const getTeamGradient = (manager) => {
      const teamInfo = getTeamInfoByAiModel(manager)
      if (!teamInfo?.gradient) return 'linear-gradient(to right, #6366f1, #8b5cf6)'

      // Extract colors from gradient string like "from-orange-500 to-red-600"
      const colors = teamInfo.gradient.match(/(from|to)-(\w+)-(\d+)/g)
      if (!colors || colors.length < 2) return 'linear-gradient(to right, #6366f1, #8b5cf6)'

      const colorMap = {
        'orange-500': '#f97316',
        'red-600': '#dc2626',
        'green-400': '#4ade80',
        'teal-600': '#0d9488',
        'purple-500': '#a855f7',
        'indigo-600': '#4f46e5',
        'blue-500': '#3b82f6',
        'cyan-600': '#0891b2',
        'pink-500': '#ec4899',
        'fuchsia-600': '#c026d3',
        'yellow-400': '#facc15',
        'amber-600': '#d97706'
      }

      const fromColor = colors[0].replace('from-', '')
      const toColor = colors[1].replace('to-', '')

      return `linear-gradient(to right, ${colorMap[fromColor] || '#6366f1'}, ${colorMap[toColor] || '#8b5cf6'})`
    }

    const shouldInvertLogo = (manager) => {
      const teamInfo = getTeamInfoByAiModel(manager)
      return teamInfo?.invertLogo || false
    }

    const getPlayerName = (playerId) => {
      // Check if this is an empty roster spot
      if (playerId === '0' || playerId === 0) {
        return 'Empty'
      }
      const player = players.value[playerId]
      if (!player) return `Player ${playerId}`
      return `${player.first_name} ${player.last_name}`
    }

    const getPlayerPosition = (playerId) => {
      const player = players.value[playerId]
      return player?.position || '?'
    }

    const getPlayerTeam = (playerId) => {
      const player = players.value[playerId]
      return player?.team || 'FA'
    }

    const draftedTeams = computed(() => {
      if (!draftPicks.value || draftPicks.value.length === 0) return []

      // Group draft picks by manager
      const teamMap = {}
      draftPicks.value.forEach(pick => {
        if (!teamMap[pick.manager]) {
          teamMap[pick.manager] = []
        }
        teamMap[pick.manager].push(pick)
      })

      // Convert to array with team info
      return Object.entries(teamMap).map(([manager, picks]) => {
        const teamInfo = getTeamInfoByAiModel(manager)

        return {
          aiModel: teamInfo.aiModel,
          owner: teamInfo.owner,
          logo: teamInfo.logo,
          gradient: teamInfo.gradient,
          invertLogo: teamInfo.invertLogo,
          players: picks.sort((a, b) => a.draft_position - b.draft_position)
        }
      }).sort((a, b) => a.aiModel.localeCompare(b.aiModel))
    })

    const loadADPData = async () => {
      try {
        const response = await fetch('/data/picks_by_adp.json')
        const data = await response.json()

        const filtered = data.filter(d => d.adp !== null)
        adpData.value = filtered
      } catch (err) {
        console.error('Error loading ADP data:', err)
      }
    }

    const renderADPChart = async () => {
      if (!adpChartRef.value || adpData.value.length === 0) return

      await nextTick()

      if (!adpChart) {
        adpChart = echarts.init(adpChartRef.value)
      }

      const draftPositions = adpData.value.map(d => d.draft_position)
      const adpValues = adpData.value.map(d => d.adp)

      // Get logos for each pick
      const pickLogos = adpData.value.map(d => {
        const teamInfo = getTeamInfoByAiModel(d.manager)
        return teamInfo.logo
      })

      let currentView = 0 // 0 = line, 1 = points

      const updateChart = () => {
        const option = {
          backgroundColor: 'transparent',
          animation: true,
          animationDuration: 1000,
          animationEasing: 'cubicOut',
          tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            borderColor: '#00ff00',
            textStyle: { color: '#00ff00', fontFamily: 'monospace' },
            formatter: (params) => {
              const pickIndex = params[0].dataIndex
              const manager = adpData.value[pickIndex]?.manager || ''
              let result = `<div style="font-weight: bold; margin-bottom: 4px; color: #00ff00; font-family: monospace;">Pick ${params[0].axisValue}</div>`
              if (manager) {
                result += `<div style="color: #00f3ff; font-size: 11px; margin-bottom: 4px; font-family: monospace;">${manager}</div>`
              }
              params.forEach(param => {
                result += `<div style="margin-top: 4px;">${param.marker} ${param.seriesName}: ${param.value?.toFixed(1) || 'N/A'}</div>`
              })
              return result
            }
          },
          legend: {
            data: ['Ideal Average Draft Position', 'Token Bowl Picks'],
            top: 10,
            textStyle: { color: '#00ff00', fontFamily: 'monospace' },
            itemGap: 20
          },
          grid: {
            left: '50',
            right: '40',
            bottom: '50',
            top: '60'
          },
          xAxis: {
            type: 'category',
            data: draftPositions,
            name: 'Draft Position',
            nameLocation: 'middle',
            nameGap: 30,
            nameTextStyle: { color: '#00ff00', fontSize: 14, fontFamily: 'monospace' },
            axisLabel: {
              color: '#00ff00',
              interval: 'auto',
              rotate: 0,
              fontFamily: 'monospace'
            },
            axisLine: { lineStyle: { color: '#00ff00' } }
          },
          yAxis: {
            type: 'value',
            name: 'ADP Value',
            nameTextStyle: { color: '#00ff00', fontSize: 14, fontFamily: 'monospace' },
            axisLabel: { color: '#00ff00', fontFamily: 'monospace' },
            axisLine: { lineStyle: { color: '#00ff00' } },
            splitLine: { lineStyle: { color: '#333333', type: 'dashed' } }
          },
          series: [
            {
              name: 'Ideal Average Draft Position',
              type: 'line',
              data: draftPositions,
              smooth: true,
              lineStyle: {
                width: 2,
                color: '#00ff00',
                type: 'dashed'
              },
              itemStyle: {
                color: '#00ff00'
              },
              symbol: 'none'
            },
            currentView === 0 ? {
              // Line view
              name: 'Token Bowl Picks',
              type: 'line',
              data: adpValues,
              smooth: true,
              lineStyle: {
                width: 3,
                color: '#00f3ff'
              },
              itemStyle: {
                color: '#00f3ff'
              },
              symbol: 'circle',
              symbolSize: 4
            } : {
              // Point view with logos
              name: 'Token Bowl Picks',
              type: 'scatter',
              data: adpValues,
              symbolSize: 30,
              symbol: (value, params) => {
                return `image://${pickLogos[params.dataIndex]}`
              },
              itemStyle: {
                opacity: 1
              }
            }
          ]
        }

        adpChart.setOption(option, true)
      }

      // Initial render
      updateChart()

      // Cycle between views every 2.5 seconds
      setInterval(() => {
        currentView = (currentView + 1) % 2
        updateChart()
      }, 5000)
    }

    const loadDivergenceData = async () => {
      try {
        const response = await fetch('/data/divergence_from_adp.json')
        const data = await response.json()

        divergenceData.value = data
      } catch (err) {
        console.error('Error loading divergence data:', err)
      }
    }

    const renderDivergenceChart = async () => {
      if (!divergenceChartRef.value || divergenceData.value.length === 0) return

      await nextTick()

      if (!divergenceChart) {
        divergenceChart = echarts.init(divergenceChartRef.value)
      }

      const teams = divergenceData.value.map(d => {
        const teamInfo = getTeamInfoByAiModel(d.manager)
        return {
          name: d.manager,
          value: d.adp_differential,
          logo: teamInfo.logo,
          invertLogo: teamInfo.invertLogo || false
        }
      })

      const option = {
        backgroundColor: 'transparent',
        animation: true,
        animationDuration: 1000,
        animationEasing: 'cubicOut',
        title: {
          text: 'Draft Efficiency by Model',
          subtext: 'Lower is better (drafted closer to actual ADP)',
          left: 'center',
          top: 10,
          textStyle: {
            color: '#00ff00',
            fontSize: 18,
            fontWeight: 'bold',
            fontFamily: 'monospace'
          },
          subtextStyle: {
            color: '#00f3ff',
            fontSize: 12,
            fontFamily: 'monospace'
          }
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          },
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          borderColor: '#00ff00',
          textStyle: { color: '#00ff00', fontFamily: 'monospace' },
          formatter: (params) => {
            const param = params[0]
            return `<div style="font-weight: bold; margin-bottom: 4px; color: #00ff00;">${param.name}</div>
                    <div style="color: #00f3ff;">ADP Differential: ${param.value.toFixed(1)}</div>`
          }
        },
        grid: {
          left: '80',
          right: '40',
          bottom: '40',
          top: '80'
        },
        xAxis: {
          type: 'value',
          name: 'ADP Differential',
          nameLocation: 'middle',
          nameGap: 25,
          nameTextStyle: { color: '#00ff00', fontSize: 14, fontFamily: 'monospace' },
          axisLabel: { color: '#00ff00', fontFamily: 'monospace' },
          axisLine: { lineStyle: { color: '#00ff00' } },
          splitLine: { lineStyle: { color: '#333333', type: 'dashed' } }
        },
        yAxis: {
          type: 'category',
          data: teams.map(t => t.name),
          axisLabel: {
            color: '#00ff00',
            fontSize: 12,
            fontFamily: 'monospace'
          },
          axisLine: { lineStyle: { color: '#00ff00' } }
        },
        series: [
          {
            type: 'bar',
            data: teams.map((t, index) => ({
              value: t.value,
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                  { offset: 0, color: '#00ff00' },
                  { offset: 1, color: '#00f3ff' }
                ]),
                borderRadius: [0, 0, 0, 0]
              }
            })),
            label: {
              show: true,
              position: 'right',
              color: '#00ff00',
              fontSize: 11,
              fontFamily: 'monospace',
              formatter: (params) => {
                const team = teams[params.dataIndex]
                return `{logo${params.dataIndex}|} ${params.value.toFixed(1)}`
              },
              rich: teams.reduce((acc, team, index) => {
                acc[`logo${index}`] = {
                  height: 20,
                  width: 20,
                  backgroundColor: {
                    image: team.logo
                  }
                }
                return acc
              }, {})
            }
          }
        ]
      }

      divergenceChart.setOption(option)
    }

    // Handle window resize for responsive charts
    const handleResize = () => {
      if (adpChart) {
        adpChart.resize()
      }
      if (divergenceChart) {
        divergenceChart.resize()
      }
    }

    onMounted(async () => {
      await loadDraftData()
      await loadADPData()
      await loadDivergenceData()

      // Wait for DOM to be ready, then render charts
      await nextTick()
      await nextTick()

      setTimeout(() => {
        renderADPChart()
        renderDivergenceChart()
      }, 500)

      // Add resize listener
      window.addEventListener('resize', handleResize)
    })

    // Clean up on unmount
    onUnmounted(() => {
      window.removeEventListener('resize', handleResize)
      if (adpChart) {
        adpChart.dispose()
      }
      if (divergenceChart) {
        divergenceChart.dispose()
      }
    })

    return {
      draftPicks,
      rosters,
      players,
      loading,
      error,
      getPositionColor,
      getTeamLogo,
      getTeamGradient,
      shouldInvertLogo,
      getPlayerName,
      getPlayerPosition,
      getPlayerTeam,
      draftedTeams,
      adpChartRef,
      divergenceChartRef
    }
  }
}
</script>
