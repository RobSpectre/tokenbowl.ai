<template lang="pug">
.container.mx-auto.px-4.py-6.max-w-7xl.bg-slate-950
  //- Loading State
  .flex.items-center.justify-center(v-if="loading" style="min-height: 50vh")
    .text-center
      .inline-block.animate-spin.rounded-full.h-16.w-16.border-4.border-blue-500.border-t-transparent
      p.text-white.mt-4.text-xl.font-bold.uppercase.tracking-wider Loading matchup...

  //- Error State
  .py-12(v-else-if="error")
    .bg-red-600.border-l-4.border-red-800.rounded.p-6.text-center
      p.text-white.text-xl.font-bold {{ error }}

  //- Main Content
  main(v-else-if="matchup")
    //- Back Button
    .mb-6
      router-link.inline-flex.items-center.gap-2.px-4.py-2.bg-slate-800.hover_bg-slate-700.text-white.font-bold.rounded-lg.transition-all.duration-200(to="/")
        span ←
        |  Back to Matchups

    //- Matchup Header
    section.mb-8
      .bg-gradient-to-r.from-blue-600.to-blue-800.rounded-t-lg.px-6.py-4.border-b-4.border-yellow-400
        h1.text-white.text-3xl.font-black.uppercase.tracking-wide
          | Week {{ week }} Matchup

      //- Score Summary
      .bg-slate-900.rounded-b-lg.p-6
        .grid.grid-cols-2.gap-8.relative
          //- Team 1
          .text-center
            img.h-24.w-24.object-contain.mx-auto.mb-4(
              :src="getTeamInfo(matchup[0].roster?.user?.display_name).logo"
              :alt="getTeamInfo(matchup[0].roster?.user?.display_name).aiModel"
              :class="getTeamInfo(matchup[0].roster?.user?.display_name).invertLogo ? 'invert brightness-200' : ''"
            )
            .text-white.font-bold.text-2xl {{ getTeamInfo(matchup[0].roster?.user?.display_name).aiModel }}
            .text-blue-400.text-lg.font-semibold {{ getTeamInfo(matchup[0].roster?.user?.display_name).owner }}
            .text-white.font-black.text-5xl.mt-4 {{ matchup[0].points?.toFixed(2) || '0.00' }}

          //- Team 2
          .text-center
            img.h-24.w-24.object-contain.mx-auto.mb-4(
              :src="getTeamInfo(matchup[1].roster?.user?.display_name).logo"
              :alt="getTeamInfo(matchup[1].roster?.user?.display_name).aiModel"
              :class="getTeamInfo(matchup[1].roster?.user?.display_name).invertLogo ? 'invert brightness-200' : ''"
            )
            .text-white.font-bold.text-2xl {{ getTeamInfo(matchup[1].roster?.user?.display_name).aiModel }}
            .text-blue-400.text-lg.font-semibold {{ getTeamInfo(matchup[1].roster?.user?.display_name).owner }}
            .text-white.font-black.text-5xl.mt-4 {{ matchup[1].points?.toFixed(2) || '0.00' }}

          //- VS Badge
          div(class="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-700 rounded-full px-4 py-2 z-10")
            span.text-white.font-black.text-lg VS

    //- Rosters
    section.mb-8
      .bg-gradient-to-r.from-purple-600.to-purple-800.rounded-t-lg.px-6.py-4.border-b-4.border-yellow-400
        h2.text-white.text-2xl.font-black.uppercase.tracking-wide Rosters

      .grid.grid-cols-1.md_grid-cols-2.gap-6.bg-slate-900.rounded-b-lg.p-6
        //- Team 1 Roster
        div
          h3.text-white.font-bold.text-xl.mb-4 {{ getTeamInfo(matchup[0].roster?.user?.display_name).aiModel }}

          //- Starters
          .space-y-2.mb-6
            .bg-slate-800.rounded.p-3(v-for="playerId in matchup[0].starters" :key="playerId")
              .flex.items-center.gap-3
                img.h-12.w-12.rounded-full.object-cover(
                  v-if="getPlayerPortrait(playerId)"
                  :src="getPlayerPortrait(playerId)"
                  :alt="getPlayerName(playerId)"
                  @error="$event.target.style.display='none'"
                )
                div.w-10.h-10.rounded.flex.items-center.justify-center.text-xs.font-bold.flex-shrink-0(
                  :class="getPositionColor(getPlayerPosition(playerId))"
                )
                  | {{ getPlayerPosition(playerId) }}
                .flex-1
                  .text-white.font-semibold {{ getPlayerName(playerId) }}
                  .text-gray-400.text-xs {{ getPlayerTeam(playerId) }}
                .text-right.flex-shrink-0
                  .text-blue-400.font-bold.text-lg {{ getPlayerPoints(matchup[0], playerId) }}
                  .text-gray-400.text-xs VORP: {{ getPlayerVORP(playerId) }}
                  .text-gray-400.text-xs ROS: {{ getPlayerROS(playerId) }}

          //- Bench
          div(v-if="getBenchPlayers(matchup[0]).length > 0")
            h4.text-gray-400.font-bold.text-sm.uppercase.tracking-wider.mb-3 Bench
            .space-y-2
              div(class="bg-slate-800/50 rounded p-3")(v-for="playerId in getBenchPlayers(matchup[0])" :key="playerId")
                .flex.items-center.gap-3
                  img.h-10.w-10.rounded-full.object-cover(
                    v-if="getPlayerPortrait(playerId)"
                    :src="getPlayerPortrait(playerId)"
                    :alt="getPlayerName(playerId)"
                    @error="$event.target.style.display='none'"
                  )
                  div.w-8.h-8.rounded.flex.items-center.justify-center.text-xs.font-bold.flex-shrink-0(
                    :class="getPositionColor(getPlayerPosition(playerId))"
                  )
                    | {{ getPlayerPosition(playerId) }}
                  .flex-1
                    .text-white.font-semibold.text-sm {{ getPlayerName(playerId) }}
                    .text-gray-400.text-xs {{ getPlayerTeam(playerId) }}
                  .text-right.flex-shrink-0
                    .text-gray-400.text-xs VORP: {{ getPlayerVORP(playerId) }}
                    .text-gray-400.text-xs ROS: {{ getPlayerROS(playerId) }}

        //- Team 2 Roster
        div
          h3.text-white.font-bold.text-xl.mb-4 {{ getTeamInfo(matchup[1].roster?.user?.display_name).aiModel }}

          //- Starters
          .space-y-2.mb-6
            .bg-slate-800.rounded.p-3(v-for="playerId in matchup[1].starters" :key="playerId")
              .flex.items-center.gap-3
                img.h-12.w-12.rounded-full.object-cover(
                  v-if="getPlayerPortrait(playerId)"
                  :src="getPlayerPortrait(playerId)"
                  :alt="getPlayerName(playerId)"
                  @error="$event.target.style.display='none'"
                )
                div.w-10.h-10.rounded.flex.items-center.justify-center.text-xs.font-bold.flex-shrink-0(
                  :class="getPositionColor(getPlayerPosition(playerId))"
                )
                  | {{ getPlayerPosition(playerId) }}
                .flex-1
                  .text-white.font-semibold {{ getPlayerName(playerId) }}
                  .text-gray-400.text-xs {{ getPlayerTeam(playerId) }}
                .text-right.flex-shrink-0
                  .text-blue-400.font-bold.text-lg {{ getPlayerPoints(matchup[1], playerId) }}
                  .text-gray-400.text-xs VORP: {{ getPlayerVORP(playerId) }}
                  .text-gray-400.text-xs ROS: {{ getPlayerROS(playerId) }}

          //- Bench
          div(v-if="getBenchPlayers(matchup[1]).length > 0")
            h4.text-gray-400.font-bold.text-sm.uppercase.tracking-wider.mb-3 Bench
            .space-y-2
              div(class="bg-slate-800/50 rounded p-3")(v-for="playerId in getBenchPlayers(matchup[1])" :key="playerId")
                .flex.items-center.gap-3
                  img.h-10.w-10.rounded-full.object-cover(
                    v-if="getPlayerPortrait(playerId)"
                    :src="getPlayerPortrait(playerId)"
                    :alt="getPlayerName(playerId)"
                    @error="$event.target.style.display='none'"
                  )
                  div.w-8.h-8.rounded.flex.items-center.justify-center.text-xs.font-bold.flex-shrink-0(
                    :class="getPositionColor(getPlayerPosition(playerId))"
                  )
                    | {{ getPlayerPosition(playerId) }}
                  .flex-1
                    .text-white.font-semibold.text-sm {{ getPlayerName(playerId) }}
                    .text-gray-400.text-xs {{ getPlayerTeam(playerId) }}
                  .text-right.flex-shrink-0
                    .text-gray-400.text-xs VORP: {{ getPlayerVORP(playerId) }}
                    .text-gray-400.text-xs ROS: {{ getPlayerROS(playerId) }}

    //- Tokens
    section.mb-8(v-if="markdownContents.length > 0")
      .bg-gradient-to-r.from-green-600.to-green-800.rounded-t-lg.px-6.py-4.border-b-4.border-yellow-400
        h2.text-white.text-2xl.font-black.uppercase.tracking-wide Tokens
      .bg-slate-900.rounded-b-lg.p-6.space-y-8
        div(v-for="(item, index) in markdownContents" :key="index")
          .flex.items-center.gap-3.mb-4.pb-3.border-b.border-slate-700
            img.h-12.w-12.object-contain(
              v-if="item.logo"
              :src="item.logo"
              :alt="item.team"
              :class="item.invertLogo ? 'invert brightness-200' : ''"
            )
            div
              h3.text-white.text-xl.font-bold {{ item.team }}
              p.text-blue-400.text-sm {{ item.owner }}
          .markdown-body(v-html="item.content")
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { getMatchups, getRosters, getLeagueUsers, getPlayers } from '../sleeperApi.js'
import { getTeamInfo } from '../teamMappings.js'
import { marked } from 'marked'
import 'github-markdown-css/github-markdown-dark.css'

export default {
  name: 'MatchupDetail',
  setup() {
    const route = useRoute()
    const week = ref(null)
    const matchupId = ref(null)
    const matchup = ref(null)
    const loading = ref(true)
    const error = ref(null)
    const players = ref({})
    const markdownContents = ref([])
    const draftData = ref({})

    const loadMatchupData = async () => {
      try {
        loading.value = true
        error.value = null

        week.value = parseInt(route.params.week)
        matchupId.value = parseInt(route.params.matchupId)

        const [matchupsData, rostersData, usersData, playersData, draftResponse] = await Promise.all([
          getMatchups(week.value),
          getRosters(),
          getLeagueUsers(),
          getPlayers(),
          fetch('/draft_picks.json')
        ])

        players.value = playersData

        if (draftResponse.ok) {
          const draftPicks = await draftResponse.json()
          draftData.value = draftPicks
        }

        // Create maps
        const userMap = {}
        usersData.forEach(user => {
          userMap[user.user_id] = user
        })

        const rosterMap = {}
        rostersData.forEach(roster => {
          rosterMap[roster.roster_id] = {
            ...roster,
            user: userMap[roster.owner_id]
          }
        })

        // Find the specific matchup
        const matchupsWithRosters = matchupsData.map(m => ({
          ...m,
          roster: rosterMap[m.roster_id]
        }))

        const matchupGroups = {}
        matchupsWithRosters.forEach(m => {
          if (!matchupGroups[m.matchup_id]) {
            matchupGroups[m.matchup_id] = []
          }
          matchupGroups[m.matchup_id].push(m)
        })

        matchup.value = matchupGroups[matchupId.value]

        if (!matchup.value) {
          throw new Error('Matchup not found')
        }

        // Try to load markdown file for this matchup
        loadMarkdownFile()
      } catch (err) {
        error.value = 'Failed to load matchup data. Please try again later.'
        console.error(err)
      } finally {
        loading.value = false
      }
    }

    const loadMarkdownFile = async () => {
      try {
        const team1 = getTeamInfo(matchup.value[0].roster?.user?.display_name).aiModel
        const team2 = getTeamInfo(matchup.value[1].roster?.user?.display_name).aiModel

        markdownContents.value = []

        // Configure marked for GitHub-flavored markdown
        marked.setOptions({
          gfm: true,
          breaks: true
        })

        // Load markdown file for team 1
        try {
          const response1 = await fetch(`/matchups/week_${week.value}_${team1}.md`)
          const contentType = response1.headers.get('content-type')
          // Only process if it's actually a markdown file, not HTML
          if (response1.ok && contentType && (contentType.includes('text/markdown') || contentType.includes('text/plain'))) {
            const text = await response1.text()
            const trimmedText = text?.trim()
            // Also check it's not HTML content
            if (trimmedText && trimmedText.length > 0 && !trimmedText.startsWith('<!DOCTYPE') && !trimmedText.startsWith('<html')) {
              const teamInfo1 = getTeamInfo(matchup.value[0].roster?.user?.display_name)
              const parsedContent = await marked.parse(trimmedText)
              if (parsedContent && parsedContent.trim().length > 0) {
                markdownContents.value.push({
                  team: team1,
                  content: parsedContent,
                  logo: teamInfo1.logo,
                  owner: teamInfo1.owner,
                  invertLogo: teamInfo1.invertLogo
                })
              }
            }
          }
        } catch (e) {
          console.log(`No markdown file found for ${team1}`)
        }

        // Load markdown file for team 2
        try {
          const response2 = await fetch(`/matchups/week_${week.value}_${team2}.md`)
          const contentType = response2.headers.get('content-type')
          // Only process if it's actually a markdown file, not HTML
          if (response2.ok && contentType && (contentType.includes('text/markdown') || contentType.includes('text/plain'))) {
            const text = await response2.text()
            const trimmedText = text?.trim()
            // Also check it's not HTML content
            if (trimmedText && trimmedText.length > 0 && !trimmedText.startsWith('<!DOCTYPE') && !trimmedText.startsWith('<html')) {
              const teamInfo2 = getTeamInfo(matchup.value[1].roster?.user?.display_name)
              const parsedContent = await marked.parse(trimmedText)
              if (parsedContent && parsedContent.trim().length > 0) {
                markdownContents.value.push({
                  team: team2,
                  content: parsedContent,
                  logo: teamInfo2.logo,
                  owner: teamInfo2.owner,
                  invertLogo: teamInfo2.invertLogo
                })
              }
            }
          }
        } catch (e) {
          console.log(`No markdown file found for ${team2}`)
        }
      } catch (err) {
        console.log('Error loading markdown files:', err)
      }
    }

    const getPlayerName = (playerId) => {
      const player = players.value[playerId]
      if (!player) return `Player ${playerId}`
      return `${player.first_name} ${player.last_name} (${player.position})`
    }

    const getPlayerPoints = (team, playerId) => {
      if (!team.players_points || !team.players_points[playerId]) return '0.0'
      return team.players_points[playerId].toFixed(1)
    }

    const getPlayerPortrait = (playerId) => {
      const player = players.value[playerId]
      if (!player) return null
      // Sleeper CDN provides player portraits
      return `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`
    }

    const getPlayerPosition = (playerId) => {
      const player = players.value[playerId]
      return player?.position || '?'
    }

    const getPlayerTeam = (playerId) => {
      const player = players.value[playerId]
      return player?.team || 'FA'
    }

    const getPlayerVORP = (playerId) => {
      const player = players.value[playerId]
      if (!player) return '-'

      const draftPick = draftData.value.find(pick =>
        pick.sleeper_id === playerId
      )

      return draftPick?.vorp || '-'
    }

    const getPlayerROS = (playerId) => {
      const player = players.value[playerId]
      if (!player) return '-'

      const draftPick = draftData.value.find(pick =>
        pick.sleeper_id === playerId
      )

      return draftPick?.projected_points_2025?.toFixed(1) || '-'
    }

    const getBenchPlayers = (team) => {
      if (!team.roster || !team.roster.players) return []
      return team.roster.players.filter(playerId => !team.starters.includes(playerId))
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

    onMounted(() => {
      loadMatchupData()
    })

    return {
      week,
      matchupId,
      matchup,
      loading,
      error,
      getTeamInfo,
      getPlayerName,
      getPlayerPoints,
      getPlayerPortrait,
      getPlayerPosition,
      getPlayerTeam,
      getPlayerVORP,
      getPlayerROS,
      getBenchPlayers,
      getPositionColor,
      markdownContents
    }
  }
}
</script>

<style>
.markdown-body {
  background-color: transparent !important;
  color: #e2e8f0 !important;
  font-size: 14px;
  line-height: 1.6;
}

.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4,
.markdown-body h5,
.markdown-body h6 {
  color: #f1f5f9 !important;
  border-bottom-color: #475569 !important;
}

.markdown-body a {
  color: #60a5fa !important;
}

.markdown-body code {
  background-color: #1e293b !important;
  color: #e2e8f0 !important;
}

.markdown-body pre {
  background-color: #1e293b !important;
}

.markdown-body table tr {
  background-color: transparent !important;
  border-top-color: #475569 !important;
}

.markdown-body table tr:nth-child(2n) {
  background-color: rgba(100, 116, 139, 0.1) !important;
}

.markdown-body table th,
.markdown-body table td {
  border-color: #475569 !important;
  color: #e2e8f0 !important;
}

.markdown-body blockquote {
  color: #94a3b8 !important;
  border-left-color: #475569 !important;
}

.markdown-body hr {
  background-color: #475569 !important;
  border-color: #475569 !important;
}
</style>
