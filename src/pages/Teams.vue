<template lang="pug">
.container.mx-auto.px-4.py-8.bg-slate-950
  //- Loading State
  .flex.items-center.justify-center(v-if="loading" style="min-height: 50vh")
    .text-center
      .inline-block.animate-spin.rounded-full.h-16.w-16.border-4.border-blue-500.border-t-transparent
      p.text-white.mt-4.text-xl.font-bold.uppercase.tracking-wider Loading teams...

  //- Error State
  .py-12(v-else-if="error")
    .bg-red-600.border-l-4.border-red-800.rounded.p-6.text-center
      p.text-white.text-xl.font-bold {{ error }}

  //- Main Content
  main(v-else-if="teams.length > 0")
    //- Team Selector (Fixed)
    div(class="fixed top-16 md:top-24 left-0 right-0 z-30 bg-slate-950 pb-2 sm:pb-4 pt-2 sm:pt-4 shadow-lg")
      div(class="container mx-auto px-2 sm:px-4 max-w-7xl")
        div(class="flex gap-1 sm:gap-2 overflow-x-auto scrollbar-hide justify-start sm:justify-center")
          button(class="px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg font-bold text-xs transition-all duration-200 flex flex-col items-center gap-1 flex-shrink-0"
            v-for="team in teams"
            :key="team.roster_id"
            :class="selectedTeam?.roster_id === team.roster_id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-gray-300 hover:bg-slate-700'"
            @click="selectTeam(team)"
          )
            img(class="h-5 w-5 sm:h-6 sm:w-6 object-contain"
              :src="team.teamInfo.logo"
              :alt="team.teamInfo.aiModel"
              :class="team.teamInfo.invertLogo ? 'invert brightness-200' : ''"
            )
            span.text-xs {{ team.teamInfo.aiModel }}

    //- Spacer for fixed selector
    div(class="h-24 sm:h-28")

    //- Selected Team Details
    div(class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8" v-if="selectedTeam")
      //- Team Info & Current Week Score
      div(class="lg:col-span-2")
        //- Team Header
        section(class="mb-4 sm:mb-8")
          div(class="bg-gradient-to-r from-blue-600 to-blue-800 px-4 sm:px-6 py-3 sm:py-4 rounded-t-lg border-b-4 border-yellow-400")
            div(class="flex items-center gap-3 sm:gap-4")
              img(class="h-12 w-12 sm:h-16 sm:w-16 object-contain"
                :src="selectedTeam.teamInfo.logo"
                :alt="selectedTeam.teamInfo.aiModel"
                :class="selectedTeam.teamInfo.invertLogo ? 'invert brightness-200' : ''"
              )
              div
                h2(class="text-white text-xl sm:text-3xl font-bold") {{ selectedTeam.teamInfo.aiModel }}
                p(class="text-white/90 text-sm sm:text-lg") {{ selectedTeam.teamInfo.owner }}
                p(class="text-white/80 text-xs sm:text-sm") {{ selectedTeam.settings.wins || 0 }}-{{ selectedTeam.settings.losses || 0 }} • {{ (selectedTeam.settings.fpts || 0).toFixed(0) }} pts

          //- Model Info
          div(class="bg-slate-900 rounded-b-lg p-4 sm:p-6" v-if="selectedTeam.modelInfo")
            div(class="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4")
              div
                div(class="text-gray-400 text-xs sm:text-sm mb-1") Latest Model Version
                div(class="text-white font-semibold text-sm sm:text-base") {{ selectedTeam.modelInfo.id || 'N/A' }}
              div
                div(class="text-gray-400 text-xs sm:text-sm mb-1") Release Date
                div(class="text-white font-semibold text-sm sm:text-base") {{ formatReleaseDate(selectedTeam.modelInfo.releaseDate) }}
              div
                div(class="text-gray-400 text-xs sm:text-sm mb-1") Intelligence Index
                div(class="text-white font-semibold text-sm sm:text-base") {{ selectedTeam.modelInfo.intelligenceIndex || 'N/A' }}
              div
                div(class="text-gray-400 text-xs sm:text-sm mb-1") Context Length
                div(class="text-white font-semibold text-sm sm:text-base") {{ selectedTeam.modelInfo.context_length ? `${(selectedTeam.modelInfo.context_length / 1000).toFixed(0)}k` : 'N/A' }}
              div
                div(class="text-gray-400 text-xs sm:text-sm mb-1") Input Price
                div(class="text-white font-semibold text-sm sm:text-base") {{ selectedTeam.modelInfo.inputPrice ? `$${selectedTeam.modelInfo.inputPrice}/1M` : 'N/A' }}
              div
                div(class="text-gray-400 text-xs sm:text-sm mb-1") Output Price
                div(class="text-white font-semibold text-sm sm:text-base") {{ selectedTeam.modelInfo.outputPrice ? `$${selectedTeam.modelInfo.outputPrice}/1M` : 'N/A' }}
              div
                div(class="text-gray-400 text-xs sm:text-sm mb-1") Speed
                div(class="text-white font-semibold text-sm sm:text-base") {{ selectedTeam.modelInfo.speed ? `${selectedTeam.modelInfo.speed} tok/s` : 'N/A' }}
              div
                div(class="text-gray-400 text-xs sm:text-sm mb-1") Latency
                div(class="text-white font-semibold text-sm sm:text-base") {{ selectedTeam.modelInfo.latency ? `${selectedTeam.modelInfo.latency}ms` : 'N/A' }}

        //- Current Week Roster
        section(class="mb-4 sm:mb-8")
          div(class="bg-gradient-to-r from-purple-600 to-purple-800 rounded-t-lg px-4 sm:px-6 py-3 sm:py-4 border-b-4 border-yellow-400")
            h3(class="text-white text-lg sm:text-2xl font-black uppercase tracking-wide flex items-center gap-2 sm:gap-3")
              span.text-yellow-400 📋
              | Week {{ currentWeek }} Roster

          div(class="bg-slate-900 rounded-b-lg p-4 sm:p-6")
            //- Current Week Score
            div(class="mb-4 sm:mb-6 p-3 sm:p-4 bg-slate-800 rounded-lg" v-if="currentMatchup")
              .text-center
                div(class="text-gray-400 text-xs sm:text-sm mb-1") Current Week Score
                div(class="text-white font-black text-2xl sm:text-4xl") {{ currentMatchup.points?.toFixed(2) || '0.00' }}

            //- Starters
            h4.text-gray-400.font-bold.text-sm.uppercase.tracking-wider.mb-3 Starters
            .space-y-2.mb-6
              div(class="bg-slate-800 rounded p-2 sm:p-3"
                v-for="playerId in currentMatchup?.starters || []"
                :key="playerId"
              )
                div(class="flex items-center gap-2 sm:gap-3")
                  img(class="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover hidden sm:block"
                    v-if="getPlayerPortrait(playerId)"
                    :src="getPlayerPortrait(playerId)"
                    :alt="getPlayerName(playerId)"
                    @error="$event.target.style.display='none'"
                  )
                  div(class="w-8 h-8 sm:w-10 sm:h-10 rounded flex items-center justify-center text-xs font-bold flex-shrink-0"
                    :class="getPositionColor(getPlayerPosition(playerId))"
                  ) {{ getPlayerPosition(playerId) }}
                  .flex-1.min-w-0
                    div(class="text-white font-semibold text-sm sm:text-base truncate") {{ getPlayerName(playerId) }}
                    div(class="text-gray-400 text-xs hidden sm:block") {{ getPlayerTeam(playerId) }}
                  .text-right.flex-shrink-0
                    div(class="text-blue-400 font-bold text-base sm:text-lg") {{ getPlayerPoints(currentMatchup, playerId) }}

            //- Bench
            div(v-if="getBenchPlayers(currentMatchup).length > 0")
              h4.text-gray-400.font-bold.text-sm.uppercase.tracking-wider.mb-3 Bench
              .space-y-2
                div(class="bg-slate-800/50 rounded p-3")(
                  v-for="playerId in getBenchPlayers(currentMatchup)"
                  :key="playerId"
                )
                  .flex.items-center.gap-3
                    img.h-10.w-10.rounded-full.object-cover(
                      v-if="getPlayerPortrait(playerId)"
                      :src="getPlayerPortrait(playerId)"
                      :alt="getPlayerName(playerId)"
                      @error="$event.target.style.display='none'"
                    )
                    div.w-8.h-8.rounded.flex.items-center.justify-center.text-xs.font-bold.flex-shrink-0(
                      :class="getPositionColor(getPlayerPosition(playerId))"
                    ) {{ getPlayerPosition(playerId) }}
                    .flex-1
                      .text-white.font-semibold.text-sm {{ getPlayerName(playerId) }}
                      .text-gray-400.text-xs {{ getPlayerTeam(playerId) }}

      //- Transaction History
      div(class="lg:col-span-1")
        section
          .bg-gradient-to-r.from-orange-600.to-orange-800.rounded-t-lg.px-6.py-4.border-b-4.border-yellow-400
            h3.text-white.text-xl.font-black.uppercase.tracking-wide.flex.items-center.gap-3
              span.text-yellow-400 💼
              | Transactions

          .bg-slate-900.rounded-b-lg.p-6
            .space-y-3(v-if="teamTransactions.length > 0")
              .bg-slate-800.rounded-lg.p-4(
                v-for="(transaction, index) in teamTransactions"
                :key="index"
              )
                .flex.items-start.gap-4
                  .flex-1
                    .text-white.font-bold {{ getTransactionType(transaction.type) }}
                    .flex.items-start.gap-6.mt-3
                      .flex-1(v-if="transaction.adds")
                        .text-green-400.text-sm.font-semibold.mb-2 Added:
                        .flex.items-start.gap-4.flex-wrap
                          .flex.items-start.gap-3(v-for="playerId in Object.keys(transaction.adds)" :key="playerId")
                            img.w-16.h-16.rounded-lg.bg-slate-700.object-cover(:src="getPlayerImageUrl(playerId)" :alt="getPlayerNameFromId(playerId)" @error="$event.target.style.display='none'")
                            div
                              .text-gray-300.text-sm.font-semibold {{ getPlayerNameFromId(playerId) }}
                              div(class="text-blue-400 text-xs font-bold mt-0.5") {{ getPlayerPositionFromId(playerId) }}
                              div(class="text-gray-400 text-xs mt-0.5" v-if="getPlayerRankECR(playerId)") ROS: {{ getPlayerRankECR(playerId) }}

                      .flex-1(v-if="transaction.drops")
                        .text-red-400.text-sm.font-semibold.mb-2 Dropped:
                        .flex.items-start.gap-4.flex-wrap
                          .flex.items-start.gap-3(v-for="playerId in Object.keys(transaction.drops)" :key="playerId")
                            img.w-16.h-16.rounded-lg.bg-slate-700.object-cover(:src="getPlayerImageUrl(playerId)" :alt="getPlayerNameFromId(playerId)" @error="$event.target.style.display='none'")
                            div
                              .text-gray-300.text-sm.font-semibold {{ getPlayerNameFromId(playerId) }}
                              div(class="text-blue-400 text-xs font-bold mt-0.5") {{ getPlayerPositionFromId(playerId) }}
                              div(class="text-gray-400 text-xs mt-0.5" v-if="getPlayerRankECR(playerId)") ROS: {{ getPlayerRankECR(playerId) }}

                  .flex.flex-col.items-end.gap-2
                    div(:class="getTransactionDelta(transaction) > 0 ? 'text-green-400' : 'text-red-400'" class="text-3xl font-black") {{ getTransactionDelta(transaction) > 0 ? '+' : '' }}{{ getTransactionDelta(transaction) }}
                    .text-gray-400.text-xs.font-semibold.uppercase.tracking-wider Δ ROS
                    .text-gray-500.text-sm.whitespace-nowrap {{ formatTransactionDate(transaction.created) }}

            .text-center.text-gray-500.py-4(v-else)
              p No transactions yet
</template>

<script>
import { ref, onMounted, computed, watch } from 'vue'
import { getRosters, getLeagueUsers, getPlayers, getMatchups, getTransactions, getLeague } from '../sleeperApi.js'
import { getTeamInfo } from '../teamMappings.js'

export default {
  name: 'Teams',
  setup() {
    const teams = ref([])
    const selectedTeam = ref(null)
    const players = ref({})
    const currentWeek = ref(5)
    const currentMatchup = ref(null)
    const allTransactions = ref([])
    const loading = ref(true)
    const error = ref(null)

    const loadTeamsData = async () => {
      try {
        loading.value = true
        error.value = null

        const [rostersData, usersData, playersData, league] = await Promise.all([
          getRosters(),
          getLeagueUsers(),
          getPlayers(),
          getLeague()
        ])

        players.value = playersData
        currentWeek.value = league.settings.leg || 5

        // Create user map
        const userMap = {}
        usersData.forEach(user => {
          userMap[user.user_id] = user
        })

        // Enhance rosters with user and team info
        teams.value = rostersData.map(roster => ({
          ...roster,
          user: userMap[roster.owner_id],
          teamInfo: getTeamInfo(userMap[roster.owner_id]?.display_name),
          modelInfo: null // Will be populated by OpenRouter API
        })).sort((a, b) => a.teamInfo.aiModel.localeCompare(b.teamInfo.aiModel))

        // Select first team by default
        if (teams.value.length > 0) {
          await selectTeam(teams.value[0])
        }

        // Load all transactions
        await loadAllTransactions()

        // Fetch model info from OpenRouter
        await fetchModelInfo()
      } catch (err) {
        error.value = 'Failed to load teams data. Please try again later.'
        console.error(err)
      } finally {
        loading.value = false
      }
    }

    const loadAllTransactions = async () => {
      try {
        const transPromises = []
        for (let week = 1; week <= 18; week++) {
          transPromises.push(getTransactions(week))
        }
        const results = await Promise.all(transPromises)
        allTransactions.value = results.flat().filter(t => t !== null)
      } catch (err) {
        console.error('Error loading transactions:', err)
        allTransactions.value = []
      }
    }

    const fetchModelInfo = async () => {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/models')
        if (!response.ok) throw new Error('Failed to fetch models')

        const data = await response.json()
        const models = data.data

        // Comprehensive model data from artificialanalysis.ai
        const modelData = {
          'DeepSeek': {
            id: 'DeepSeek V3.2 Exp',
            releaseDate: '2025-09-25',
            intelligenceIndex: 57,
            context_length: 128000,
            inputPrice: 0.32,
            outputPrice: 0.42,
            speed: 25.5,
            latency: 1.38,
            mmlu: 0.888
          },
          'Gemini': {
            id: 'Gemini 2.5 Pro',
            releaseDate: '2025-06-01',
            intelligenceIndex: 60,
            context_length: 1000000,
            inputPrice: 1.25,
            outputPrice: 10.00,
            speed: 152.6,
            latency: 30.15,
            mmlu: 0.859
          },
          'Mistral': {
            id: 'Magistral Medium 1.2',
            releaseDate: '2025-09-01',
            intelligenceIndex: 52,
            context_length: 128000,
            inputPrice: 2.00,
            outputPrice: 5.00,
            speed: 149.7,
            latency: 0.37,
            mmlu: 0.869
          },
          'Qwen': {
            id: 'Qwen3 235B A22B 2507 (Reasoning)',
            releaseDate: '2025-07-01',
            intelligenceIndex: 57,
            context_length: 256000,
            inputPrice: 0.70,
            outputPrice: 8.40,
            speed: 78.9,
            latency: 1.18,
            mmlu: 0.863
          },
          'Claude': {
            id: 'Claude 4.5 Sonnet',
            releaseDate: '2025-09-15',
            intelligenceIndex: 63,
            context_length: 1000000,
            inputPrice: 3.00,
            outputPrice: 15.00,
            speed: 62.3,
            latency: 1.76,
            mmlu: 0.887
          },
          'GPT-OSS': {
            id: 'gpt-oss-120B (high)',
            releaseDate: '2025-08-15',
            intelligenceIndex: 58,
            context_length: 117000,
            inputPrice: 0.15,
            outputPrice: 0.60,
            speed: 326.3,
            latency: 0.45,
            mmlu: 0.875
          },
          'Gemma': {
            id: 'Gemma 3 27B Instruct',
            releaseDate: '2025-03-15',
            intelligenceIndex: 22,
            context_length: 128000,
            inputPrice: 0.09,
            outputPrice: 0.16,
            speed: 52.5,
            latency: 0.62,
            mmlu: 0.752
          },
          'GPT': {
            id: 'GPT-5 (high)',
            releaseDate: '2025-08-10',
            intelligenceIndex: 68,
            context_length: 400000,
            inputPrice: 1.25,
            outputPrice: 10.00,
            speed: 118.2,
            latency: 55.64,
            mmlu: 0.908
          },
          'Kimi K2': {
            id: 'Kimi K2 0905',
            releaseDate: '2025-09-05',
            intelligenceIndex: 50,
            context_length: 256000,
            inputPrice: 0.99,
            outputPrice: 2.75,
            speed: 60,
            latency: 0.49,
            mmlu: 0.830
          },
          'Grok': {
            id: 'Grok 4',
            releaseDate: '2025-07-05',
            intelligenceIndex: 65,
            context_length: 256000,
            inputPrice: 3.00,
            outputPrice: 15.00,
            speed: 42.9,
            latency:14.73,
            mmlu: 0.881
          },
          'Hermes': {
            id: 'Hermes 3 - Llama 3.1 405B',
            releaseDate: '2024-08-01',
            intelligenceIndex: 40,
            context_length: 128000,
            inputPrice: 3.00,
            outputPrice: 5.00,
            speed: 25,
            latency: 900,
            mmlu: 0.879
          }
        }

        teams.value.forEach(team => {
          const data = modelData[team.teamInfo.aiModel]
          if (data) {
            team.modelInfo = {
              id: data.id,
              releaseDate: data.releaseDate,
              intelligenceIndex: data.intelligenceIndex,
              context_length: data.context_length,
              inputPrice: data.inputPrice,
              outputPrice: data.outputPrice,
              speed: data.speed,
              latency: data.latency,
              mmlu: data.mmlu
            }
          } else {
            // Fallback for unknown models
            team.modelInfo = {
              id: team.teamInfo.aiModel,
              releaseDate: null,
              intelligenceIndex: null,
              context_length: 128000,
              inputPrice: null,
              outputPrice: null,
              speed: null,
              latency: null,
              mmlu: null
            }
          }
        })
      } catch (err) {
        console.error('Error fetching model info from OpenRouter:', err)
      }
    }

    const selectTeam = async (team) => {
      selectedTeam.value = team

      // Load current week matchup for this team
      try {
        const matchups = await getMatchups(currentWeek.value)
        currentMatchup.value = matchups.find(m => m.roster_id === team.roster_id)
      } catch (err) {
        console.error('Error loading matchup:', err)
        currentMatchup.value = null
      }
    }

    const teamTransactions = computed(() => {
      if (!selectedTeam.value) return []

      return allTransactions.value
        .filter(t => t.roster_ids && t.roster_ids.includes(selectedTeam.value.roster_id))
        .sort((a, b) => b.created - a.created)
    })

    const getPlayerName = (playerId) => {
      const player = players.value[playerId]
      if (!player) return `Player ${playerId}`
      return `${player.first_name} ${player.last_name}`
    }

    const getPlayerNameFromId = (playerId) => {
      return getPlayerName(playerId)
    }

    const getPlayerPosition = (playerId) => {
      const player = players.value[playerId]
      return player?.position || '?'
    }

    const getPlayerTeam = (playerId) => {
      const player = players.value[playerId]
      return player?.team || 'FA'
    }

    const getPlayerPortrait = (playerId) => {
      return `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`
    }

    const getPlayerPoints = (matchup, playerId) => {
      if (!matchup?.players_points || !matchup.players_points[playerId]) return '0.0'
      return matchup.players_points[playerId].toFixed(1)
    }

    const getBenchPlayers = (matchup) => {
      if (!matchup || !matchup.players) return []
      return matchup.players.filter(playerId => !matchup.starters.includes(playerId))
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

    const getTransactionType = (type) => {
      const types = {
        'waiver': 'Waiver Claim',
        'free_agent': 'Free Agent Pickup',
        'trade': 'Trade'
      }
      return types[type] || type
    }

    const getPlayerImageUrl = (playerId) => {
      const player = players.value[playerId]
      if (!player) return `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`

      // For defenses, use team logo instead of player portrait
      if (player.position === 'DEF' && player.team) {
        return `https://sleepercdn.com/images/team_logos/nfl/${player.team.toLowerCase()}.png`
      }

      return `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`
    }

    const getPlayerPositionFromId = (playerId) => {
      const player = players.value[playerId]
      if (!player || !player.position) return 'N/A'
      return player.position
    }

    const getPlayerRankECR = (playerId) => {
      const player = players.value[playerId]
      if (!player) return null
      return player.search_rank || null
    }

    const getTransactionDelta = (transaction) => {
      let addedRank = 0
      let droppedRank = 0

      if (transaction.adds) {
        Object.keys(transaction.adds).forEach(playerId => {
          const rank = getPlayerRankECR(playerId)
          if (rank) addedRank += rank
        })
      }

      if (transaction.drops) {
        Object.keys(transaction.drops).forEach(playerId => {
          const rank = getPlayerRankECR(playerId)
          if (rank) droppedRank += rank
        })
      }

      // Lower rank is better, so delta = replacement (added) - dropped
      // If we add a better player (lower rank), delta will be negative (showing improvement)
      return addedRank - droppedRank
    }

    const formatTransactionDate = (timestamp) => {
      const date = new Date(timestamp)
      const day = String(date.getDate()).padStart(2, '0')
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const month = months[date.getMonth()]
      const year = String(date.getFullYear()).slice(-2)
      return `${day} ${month} ${year}`
    }

    const formatReleaseDate = (dateString) => {
      if (!dateString) return 'N/A'
      const date = new Date(dateString)
      const day = String(date.getDate()).padStart(2, '0')
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const month = months[date.getMonth()]
      const year = String(date.getFullYear()).slice(-2)
      return `${day} ${month} ${year}`
    }

    const getTeamGradient = (aiModel) => {
      const teamInfo = getTeamInfo(aiModel)
      if (!teamInfo?.gradient) return 'linear-gradient(to right, #6366f1, #8b5cf6)'

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

      const colors = teamInfo.gradient.match(/(from|to)-(\w+)-(\d+)/g)
      if (!colors || colors.length < 2) return 'linear-gradient(to right, #6366f1, #8b5cf6)'

      const fromColor = colors[0].replace('from-', '')
      const toColor = colors[1].replace('to-', '')

      return `linear-gradient(to right, ${colorMap[fromColor] || '#6366f1'}, ${colorMap[toColor] || '#8b5cf6'})`
    }

    onMounted(() => {
      loadTeamsData()
    })

    return {
      teams,
      selectedTeam,
      players,
      currentWeek,
      currentMatchup,
      teamTransactions,
      loading,
      error,
      selectTeam,
      getPlayerName,
      getPlayerNameFromId,
      getPlayerPosition,
      getPlayerTeam,
      getPlayerPortrait,
      getPlayerPoints,
      getBenchPlayers,
      getPositionColor,
      getTransactionType,
      getTeamGradient,
      getPlayerImageUrl,
      getPlayerPositionFromId,
      getPlayerRankECR,
      getTransactionDelta,
      formatTransactionDate,
      formatReleaseDate
    }
  }
}
</script>
