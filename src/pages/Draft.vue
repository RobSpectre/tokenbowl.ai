<template lang="pug">
.container.mx-auto.px-4.py-8.bg-slate-950
  //- Loading State
  .flex.items-center.justify-center(v-if="loading" style="min-height: 50vh")
    .text-center
      .inline-block.animate-spin.rounded-full.h-16.w-16.border-4.border-blue-500.border-t-transparent
      p.text-white.mt-4.text-xl.font-bold.uppercase.tracking-wider Loading draft data...

  //- Error State
  .py-12(v-else-if="error")
    .bg-red-600.border-l-4.border-red-800.rounded.p-6.text-center
      p.text-white.text-xl.font-bold {{ error }}

  //- Main Content
  main(v-else-if="draftPicks && draftPicks.length > 0")
    //- Header
    section.mb-8
      .bg-gradient-to-r.from-blue-600.to-blue-800.rounded-t-lg.px-6.py-4.border-b-4.border-yellow-400
        h1.text-white.text-3xl.font-black.uppercase.tracking-wide.flex.items-center.gap-3
          span.text-yellow-400 📜
          | Draft Results - 2025 Season

    //- Featured Video
    section.mb-8
      .bg-gradient-to-r.from-red-600.to-red-800.rounded-t-lg.px-6.py-4.border-b-4.border-yellow-400
        h2.text-white.text-2xl.font-black.uppercase.tracking-wide.flex.items-center.gap-3
          span.text-yellow-400 📺
          | Draft Day Video
      .bg-slate-900.rounded-b-lg.p-6
        .aspect-video.w-full
          iframe.w-full.h-full.rounded-lg(
            src="https://www.youtube.com/embed/CrN52Bf6x9A"
            title="Draft Day Video"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
          )

    //- Draft Info Bar
    section.mb-6
      div(class="bg-gradient-to-r from-amber-600 to-yellow-600 rounded-lg px-4 sm:px-6 py-4 border-l-4 border-yellow-400")
        .flex.items-start.gap-3
          span(class="text-yellow-100 text-xl sm:text-2xl") ℹ️
          div
            p(class="text-white font-bold mb-2 text-sm sm:text-base") Draft Notes:
            ul(class="text-white space-y-1 text-xs sm:text-sm")
              li • Hermes (run by Carter Rabasa) was originally used for the draft, then switched to Kimi K2
              li • Qwen was a last minute drop and the draft was autopicked by Sleeper

    //- ADP Chart
    section.mb-8
      .bg-gradient-to-r.from-green-600.to-emerald-800.rounded-t-lg.px-6.py-4.border-b-4.border-yellow-400
        h2.text-white.text-2xl.font-black.uppercase.tracking-wide.flex.items-center.gap-3
          span.text-yellow-400 📊
          | Draft Analysis
      .bg-slate-900.rounded-b-lg.p-6
        div(ref="adpChartRef" style="width: 100%; height: 400px")

    //- Draft Board
    section
      .bg-slate-900.rounded-lg.overflow-hidden
        .overflow-x-auto
          table.w-full.min-w-max
            thead.bg-slate-800.sticky.top-0
              tr.text-left.text-gray-300.uppercase.text-xs.font-bold.tracking-wider
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
            tbody.divide-y.divide-slate-800
              tr(
                v-for="(pick, index) in draftPicks"
                :key="index"
                class="hover:bg-slate-800 transition-colors duration-150"
              )
                td(class="px-2 sm:px-4 py-3")
                  div(class="text-white font-bold text-sm sm:text-base") {{ pick.draft_position }}
                td(class="px-2 sm:px-4 py-3")
                  div(class="text-gray-300 text-sm sm:text-base") {{ pick.round }}
                td(class="px-2 sm:px-4 py-3")
                  div(class="flex items-center gap-1 sm:gap-2")
                    img(class="h-5 w-5 sm:h-6 sm:w-6 object-contain"
                      :src="getTeamLogo(pick.manager)"
                      :alt="pick.manager"
                      :class="shouldInvertLogo(pick.manager) ? 'invert brightness-200' : ''"
                    )
                    //- FIX: Removed extra wrapping div() that was causing the syntax error.
                    div(class="hidden sm:inline-block px-2 py-0.5 rounded text-white font-semibold text-xs"
                      :style="{ background: getTeamGradient(pick.manager) }"
                    ) {{ pick.manager }}
                td(class="px-2 sm:px-4 py-3")
                  div(class="flex items-center gap-1 sm:gap-2")
                    img(class="h-6 w-6 sm:h-8 sm:w-8 rounded-full object-cover hidden sm:block"
                      v-if="pick.portrait_url"
                      :src="pick.portrait_url"
                      :alt="pick.player_name"
                      @error="$event.target.style.display='none'"
                    )
                    div(class="text-white font-semibold text-xs sm:text-sm") {{ pick.player_name }}
                td(class="px-2 sm:px-4 py-3")
                  //- FIX: Removed extra wrapping div() that was causing the syntax error.
                  div(class="inline-block px-1 sm:px-2 py-0.5 rounded text-xs font-bold"
                    :class="getPositionColor(pick.position)"
                  ) {{ pick.position }}
                td(class="px-2 sm:px-4 py-3 hidden sm:table-cell")
                  div(class="text-gray-300 text-xs sm:text-sm") {{ pick.team || 'FA' }}
                td(class="px-2 sm:px-4 py-3 text-right")
                  div(class="text-yellow-400 font-bold text-xs sm:text-sm") {{ pick.vorp }}
                td(class="px-2 sm:px-4 py-3 text-right hidden md:table-cell")
                  div(class="text-gray-300 text-xs sm:text-sm") {{ pick.adp }}
                td(class="px-2 sm:px-4 py-3 text-right hidden lg:table-cell")
                  div(class="text-blue-400 font-semibold text-xs sm:text-sm") {{ pick.fantasy_points_2024?.toFixed(1) || '-' }}
                td(class="px-2 sm:px-4 py-3 text-right hidden lg:table-cell")
                  div(class="text-green-400 font-semibold text-xs sm:text-sm") {{ pick.projected_points_2025?.toFixed(1) || '-' }}
                td(class="px-2 sm:px-4 py-3 hidden xl:table-cell")
                  div(class="text-gray-300 text-xs sm:text-sm") {{ pick.age || '-' }}
                td(class="px-2 sm:px-4 py-3 hidden xl:table-cell")
                  div(class="text-gray-400 text-xs") {{ pick.college || '-' }}
                td(class="px-2 sm:px-4 py-3 hidden xl:table-cell")
                  div(class="text-gray-300 text-xs sm:text-sm") {{ pick.years_exp || '-' }}

    //- Team Breakouts
    section.mt-12(v-if="draftedTeams.length > 0")
      div(class="bg-gradient-to-r from-purple-600 to-purple-800 rounded-t-lg px-4 sm:px-6 py-4 border-b-4 border-yellow-400 mb-8")
        h2(class="text-white text-2xl sm:text-3xl font-black uppercase tracking-wide flex items-center gap-3")
          span.text-yellow-400 🏈
          | Drafted Teams

      div(class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8")
        div(v-for="team in draftedTeams" :key="team.aiModel" class="bg-slate-900 rounded-lg overflow-hidden")
          //- Team Header
          div(class="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800" :style="{ background: getTeamGradient(team.aiModel) }")
            div(class="flex items-center gap-2 sm:gap-3")
              img(class="h-8 w-8 sm:h-10 sm:w-10 object-contain"
                v-if="team.logo"
                :src="team.logo"
                :alt="team.aiModel"
                :class="team.invertLogo ? 'invert brightness-200' : ''"
              )
              div
                h3(class="text-white text-base sm:text-xl font-bold") {{ team.aiModel }}
                p(class="text-white/80 text-xs sm:text-sm") {{ team.owner }}

          //- Drafted Players
          div(class="p-3 sm:p-4")
            h4(class="text-white font-bold text-xs sm:text-sm uppercase tracking-wider mb-2 sm:mb-3 text-gray-400") Roster ({{ team.players.length }} Players)
            div(class="space-y-1 sm:space-y-2")
              div(v-for="(pick, index) in team.players" :key="index" class="bg-slate-800 rounded p-2 sm:p-3")
                div(class="flex items-center gap-2 sm:gap-3")
                  div(class="text-gray-500 text-xs font-bold w-6 sm:w-8 text-center") {{ pick.draft_position }}
                  div(
                    class="w-6 h-6 sm:w-8 sm:h-8 rounded flex items-center justify-center text-xs font-bold"
                    :class="getPositionColor(pick.position)"
                  ) {{ pick.position }}
                  div(class="flex-1 min-w-0")
                    div(class="text-white font-semibold text-xs sm:text-sm truncate") {{ pick.player_name }}
                    div(class="text-gray-400 text-xs hidden sm:block") {{ pick.team || 'FA' }}
                  div(class="text-right flex-shrink-0")
                    div(class="text-yellow-400 text-xs font-bold") VORP: {{ pick.vorp }}
                    div(class="text-gray-400 text-xs hidden sm:block") ROS: {{ pick.ros?.toFixed(1) || '-' }}
</template>

<script>
import { ref, onMounted, computed, nextTick } from 'vue'
import { getTeamInfoByAiModel } from '../teamMappings.js'
import { getRosters, getLeagueUsers, getPlayers } from '../sleeperApi.js'
import * as echarts from 'echarts'

export default {
  name: 'Draft',
  setup() {
    const draftPicks = ref([])
    const rosters = ref([])
    const players = ref({})
    const loading = ref(true)
    const error = ref(null)
    const adpChartRef = ref(null)
    const adpData = ref([])
    let adpChart = null

    const loadDraftData = async () => {
      try {
        loading.value = true
        error.value = null

        const [draftResponse, rostersData, usersData, playersData] = await Promise.all([
          fetch('/draft_picks.json'),
          getRosters(),
          getLeagueUsers(),
          getPlayers()
        ])

        if (!draftResponse.ok) {
          throw new Error('Failed to load draft picks')
        }

        const draftData = await draftResponse.json()
        draftPicks.value = draftData

        players.value = playersData

        // Create user map
        const userMap = {}
        usersData.forEach(user => {
          userMap[user.user_id] = user
        })

        // Enhance rosters with user information
        rosters.value = rostersData.map(roster => ({
          ...roster,
          user: userMap[roster.owner_id]
        }))
      } catch (err) {
        error.value = 'Failed to load draft data. Please try again later.'
        console.error(err)
      } finally {
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
        const response = await fetch('/picks_by_adp.csv')
        const text = await response.text()

        // Parse CSV
        const lines = text.trim().split('\n')
        const headers = lines[0].split(',')

        const data = lines.slice(1).map(line => {
          const values = line.split(',')
          return {
            manager: values[1],
            draft_position: parseFloat(values[2]),
            adp: values[3] ? parseFloat(values[3]) : null
          }
        })

        adpData.value = data.filter(d => d.adp !== null)
        renderADPChart()
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

      const option = {
        backgroundColor: 'transparent',
        animation: true,
        animationDuration: 1000,
        animationEasing: 'cubicOut',
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          borderColor: '#3b82f6',
          textStyle: { color: '#fff' },
          formatter: (params) => {
            let result = `<div style="font-weight: bold; margin-bottom: 4px;">Pick ${params[0].axisValue}</div>`
            params.forEach(param => {
              result += `<div style="margin-top: 4px;">${param.marker} ${param.seriesName}: ${param.value.toFixed(1)}</div>`
            })
            return result
          }
        },
        legend: {
          data: ['Ideal Average Draft Position', 'Token Bowl Picks'],
          top: 10,
          textStyle: { color: '#9ca3af' }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: 60,
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: draftPositions,
          name: 'Draft Position',
          nameLocation: 'middle',
          nameGap: 30,
          nameTextStyle: { color: '#9ca3af', fontSize: 12 },
          axisLabel: { color: '#9ca3af', interval: 9 },
          axisLine: { lineStyle: { color: '#475569' } }
        },
        yAxis: {
          type: 'value',
          name: 'ADP Value',
          nameTextStyle: { color: '#9ca3af', fontSize: 12 },
          axisLabel: { color: '#9ca3af' },
          axisLine: { lineStyle: { color: '#475569' } },
          splitLine: { lineStyle: { color: '#334155' } }
        },
        series: [
          {
            name: 'Ideal Average Draft Position',
            type: 'line',
            data: draftPositions,
            smooth: true,
            lineStyle: {
              width: 3,
              color: '#3b82f6'
            },
            itemStyle: {
              color: '#3b82f6'
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
                { offset: 1, color: 'rgba(59, 130, 246, 0.05)' }
              ])
            }
          },
          {
            name: 'Token Bowl Picks',
            type: 'line',
            data: adpValues,
            smooth: true,
            lineStyle: {
              width: 3,
              color: '#facc15'
            },
            itemStyle: {
              color: '#facc15'
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(250, 204, 21, 0.3)' },
                { offset: 1, color: 'rgba(250, 204, 21, 0.05)' }
              ])
            }
          }
        ]
      }

      adpChart.setOption(option)
    }

    onMounted(() => {
      loadDraftData()
      loadADPData()
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
      adpChartRef
    }
  }
}
</script>
