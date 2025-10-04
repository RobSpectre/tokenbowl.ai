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

    //- Draft Board
    section
      .bg-slate-900.rounded-lg.overflow-hidden
        .overflow-x-auto
          table.w-full
            thead.bg-slate-800.sticky.top-0
              tr.text-left.text-gray-300.uppercase.text-xs.font-bold.tracking-wider
                th.px-4.py-3 Pick
                th.px-4.py-3 Rd
                th.px-4.py-3 Team
                th.px-4.py-3 Player
                th.px-4.py-3 Pos
                th.px-4.py-3 NFL Team
                th.px-4.py-3.text-right VORP
                th.px-4.py-3.text-right ADP
                th.px-4.py-3.text-right 2024 Pts
                th.px-4.py-3.text-right 2025 Proj
                th.px-4.py-3 Age
                th.px-4.py-3 College
                th.px-4.py-3 Exp
            tbody.divide-y.divide-slate-800
              tr.hover_bg-slate-800.transition-colors.duration-150(
                v-for="(pick, index) in draftPicks"
                :key="index"
              )
                td.px-4.py-3
                  .text-white.font-bold {{ pick.draft_position }}
                td.px-4.py-3
                  .text-gray-300 {{ pick.round }}
                td.px-4.py-3
                  .flex.items-center.gap-2
                    img.h-6.w-6.object-contain(
                      :src="getTeamLogo(pick.manager)"
                      :alt="pick.manager"
                      :class="shouldInvertLogo(pick.manager) ? 'invert brightness-200' : ''"
                    )
                    div(
                      class="inline-block px-2 py-0.5 rounded text-white font-semibold text-xs"
                      :style="{ background: getTeamGradient(pick.manager) }"
                    ) {{ pick.manager }}
                td.px-4.py-3
                  .flex.items-center.gap-2
                    img.h-8.w-8.rounded-full.object-cover(
                      v-if="pick.portrait_url"
                      :src="pick.portrait_url"
                      :alt="pick.player_name"
                      @error="$event.target.style.display='none'"
                    )
                    .text-white.font-semibold {{ pick.player_name }}
                td.px-4.py-3
                  div(
                    class="inline-block px-2 py-0.5 rounded text-xs font-bold"
                    :class="getPositionColor(pick.position)"
                  ) {{ pick.position }}
                td.px-4.py-3
                  .text-gray-300.text-sm {{ pick.team || 'FA' }}
                td.px-4.py-3.text-right
                  .text-yellow-400.font-bold {{ pick.vorp }}
                td.px-4.py-3.text-right
                  .text-gray-300 {{ pick.adp }}
                td.px-4.py-3.text-right
                  .text-blue-400.font-semibold {{ pick.fantasy_points_2024?.toFixed(1) || '-' }}
                td.px-4.py-3.text-right
                  .text-green-400.font-semibold {{ pick.projected_points_2025?.toFixed(1) || '-' }}
                td.px-4.py-3
                  .text-gray-300.text-sm {{ pick.age || '-' }}
                td.px-4.py-3
                  .text-gray-400.text-xs {{ pick.college || '-' }}
                td.px-4.py-3
                  .text-gray-300.text-sm {{ pick.years_exp || '-' }}

    //- Team Breakouts
    section.mt-12(v-if="draftedTeams.length > 0")
      .bg-gradient-to-r.from-purple-600.to-purple-800.rounded-t-lg.px-6.py-4.border-b-4.border-yellow-400.mb-8
        h2.text-white.text-3xl.font-black.uppercase.tracking-wide.flex.items-center.gap-3
          span.text-yellow-400 🏈
          | Drafted Teams

      .grid.grid-cols-1.lg_grid-cols-2.gap-8
        .bg-slate-900.rounded-lg.overflow-hidden(v-for="team in draftedTeams" :key="team.aiModel")
          //- Team Header
          .px-6.py-4.border-b.border-slate-800(:style="{ background: getTeamGradient(team.aiModel) }")
            .flex.items-center.gap-3
              img.h-10.w-10.object-contain(
                v-if="team.logo"
                :src="team.logo"
                :alt="team.aiModel"
                :class="team.invertLogo ? 'invert brightness-200' : ''"
              )
              div
                h3.text-white.text-xl.font-bold {{ team.aiModel }}
                p(class="text-white/80 text-sm") {{ team.owner }}

          //- Drafted Players
          .p-4
            h4.text-white.font-bold.text-sm.uppercase.tracking-wider.mb-3.text-gray-400 Roster ({{ team.players.length }} Players)
            .space-y-2
              .bg-slate-800.rounded.p-3(v-for="(pick, index) in team.players" :key="index")
                .flex.items-center.gap-3
                  .text-gray-500.text-xs.font-bold.w-8.text-center {{ pick.draft_position }}
                  div.w-8.h-8.rounded.flex.items-center.justify-center.text-xs.font-bold(
                    :class="getPositionColor(pick.position)"
                  ) {{ pick.position }}
                  .flex-1
                    .text-white.font-semibold.text-sm {{ pick.player_name }}
                    .text-gray-400.text-xs {{ pick.team || 'FA' }}
                  .text-right
                    .text-yellow-400.text-xs.font-bold VORP: {{ pick.vorp }}
                    .text-gray-400.text-xs ROS: {{ pick.ros?.toFixed(1) || '-' }}
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { getTeamInfoByAiModel } from '../teamMappings.js'
import { getRosters, getLeagueUsers, getPlayers } from '../sleeperApi.js'

export default {
  name: 'Draft',
  setup() {
    const draftPicks = ref([])
    const rosters = ref([])
    const players = ref({})
    const loading = ref(true)
    const error = ref(null)

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

    onMounted(() => {
      loadDraftData()
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
      draftedTeams
    }
  }
}
</script>
