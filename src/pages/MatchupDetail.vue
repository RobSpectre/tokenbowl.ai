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
      router-link(to="/" class="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-all duration-200")
        span ←
        |  Back to Matchups

    //- Matchup Header with Auto-refresh Status
    section.mb-8
      div(class="bg-gradient-to-r from-blue-600 to-blue-800 rounded-t-lg px-4 sm:px-6 py-3 sm:py-4 border-b-4 border-yellow-400")
        .flex.items-center.justify-between
          h1(class="text-white text-xl sm:text-3xl font-black uppercase tracking-wide")
            | Week {{ week }} Matchup
          //- Auto-refresh indicator
          div(v-if="isAutoRefreshActive" class="flex items-center gap-2 text-xs")
            div(class="w-2 h-2 rounded-full bg-green-500 animate-pulse")
            span(class="text-green-400") Live
            span(class="text-gray-300") • {{ lastUpdated?.toLocaleTimeString() || 'Updating...' }}

      //- Score Summary with Animation
      div(class="bg-slate-900 rounded-b-lg p-4 sm:p-6")
        //- Desktop Layout
        div(class="hidden sm:flex sm:items-center sm:gap-4")
          //- Team 1
          div(class="flex-1 text-center bg-slate-800 rounded-lg p-6")
            img(
              class="h-24 w-24 object-contain mx-auto mb-4"
              :src="getTeamInfo(matchup[0].roster?.user?.display_name).logo"
              :alt="getTeamInfo(matchup[0].roster?.user?.display_name).aiModel"
              :class="getTeamInfo(matchup[0].roster?.user?.display_name).invertLogo ? 'invert brightness-200' : ''"
            )
            div(class="text-white font-bold text-2xl") {{ getTeamInfo(matchup[0].roster?.user?.display_name).aiModel }}
            div(class="text-blue-400 text-lg font-semibold") {{ getTeamInfo(matchup[0].roster?.user?.display_name).owner }}
            div(
              class="text-white font-black text-5xl mt-4 transition-all duration-300"
              :class="{ 'score-pulse': isScoreAnimating(matchup[0].roster_id) }"
            ) {{ matchup[0].points?.toFixed(2) || '0.00' }}

          //- VS Separator
          div(class="flex-shrink-0 px-4")
            div(class="bg-slate-700 rounded-full px-4 py-2")
              span(class="text-white font-black text-lg") VS

          //- Team 2
          div(class="flex-1 text-center bg-slate-800 rounded-lg p-6")
            img(
              class="h-24 w-24 object-contain mx-auto mb-4"
              :src="getTeamInfo(matchup[1].roster?.user?.display_name).logo"
              :alt="getTeamInfo(matchup[1].roster?.user?.display_name).aiModel"
              :class="getTeamInfo(matchup[1].roster?.user?.display_name).invertLogo ? 'invert brightness-200' : ''"
            )
            div(class="text-white font-bold text-2xl") {{ getTeamInfo(matchup[1].roster?.user?.display_name).aiModel }}
            div(class="text-blue-400 text-lg font-semibold") {{ getTeamInfo(matchup[1].roster?.user?.display_name).owner }}
            div(
              class="text-white font-black text-5xl mt-4 transition-all duration-300"
              :class="{ 'score-pulse': isScoreAnimating(matchup[1].roster_id) }"
            ) {{ matchup[1].points?.toFixed(2) || '0.00' }}

        //- Mobile Layout
        div(class="flex flex-col gap-3 sm:hidden")
          //- Team 1
          .bg-slate-800.rounded-lg.p-4
            .flex.items-center.justify-between
              div(class="flex items-center gap-3")
                img(
                  class="h-14 w-14 object-contain"
                  :src="getTeamInfo(matchup[0].roster?.user?.display_name).logo"
                  :alt="getTeamInfo(matchup[0].roster?.user?.display_name).aiModel"
                  :class="getTeamInfo(matchup[0].roster?.user?.display_name).invertLogo ? 'invert brightness-200' : ''"
                )
                div
                  div(class="text-white font-bold text-base") {{ getTeamInfo(matchup[0].roster?.user?.display_name).aiModel }}
                  div(class="text-blue-400 text-sm font-semibold") {{ getTeamInfo(matchup[0].roster?.user?.display_name).owner }}
              div(
                class="text-white font-black text-2xl transition-all duration-300"
                :class="{ 'score-pulse': isScoreAnimating(matchup[0].roster_id) }"
              ) {{ matchup[0].points?.toFixed(2) || '0.00' }}

          //- VS
          div(class="text-center")
            span(class="text-gray-400 font-semibold text-xs uppercase") vs

          //- Team 2
          .bg-slate-800.rounded-lg.p-4
            .flex.items-center.justify-between
              div(class="flex items-center gap-3")
                img(
                  class="h-14 w-14 object-contain"
                  :src="getTeamInfo(matchup[1].roster?.user?.display_name).logo"
                  :alt="getTeamInfo(matchup[1].roster?.user?.display_name).aiModel"
                  :class="getTeamInfo(matchup[1].roster?.user?.display_name).invertLogo ? 'invert brightness-200' : ''"
                )
                div
                  div(class="text-white font-bold text-base") {{ getTeamInfo(matchup[1].roster?.user?.display_name).aiModel }}
                  div(class="text-blue-400 text-sm font-semibold") {{ getTeamInfo(matchup[1].roster?.user?.display_name).owner }}
              div(
                class="text-white font-black text-2xl transition-all duration-300"
                :class="{ 'score-pulse': isScoreAnimating(matchup[1].roster_id) }"
              ) {{ matchup[1].points?.toFixed(2) || '0.00' }}

        //- Point Differential Graph (like Home page)
        .mt-6.pt-6.border-t.border-slate-700(v-if="(matchup[0].points || 0) !== (matchup[1].points || 0)")
          .text-center.text-gray-400.text-sm.font-semibold.mb-3 POINT DIFFERENTIAL
          .relative.h-12.flex.items-center.bg-slate-800.rounded-lg.overflow-hidden
            //- Center Line
            div(class="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-slate-600 z-10")

            //- Team 1 winning bar (left side)
            div(
              v-if="matchup[0].points > matchup[1].points"
              class="absolute right-1/2 h-8 bg-gradient-to-l from-green-500 to-green-600 flex items-center justify-start pl-3 transition-all duration-500"
              :style="{ width: `${Math.min(((matchup[0].points - matchup[1].points) / Math.max(matchup[0].points, matchup[1].points)) * 45, 45)}%` }"
            )
              span.text-white.text-sm.font-bold +{{ Math.abs((matchup[0].points || 0) - (matchup[1].points || 0)).toFixed(2) }}

            //- Team 2 winning bar (right side)
            div(
              v-else-if="matchup[1].points > matchup[0].points"
              class="absolute left-1/2 h-8 bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-end pr-3 transition-all duration-500"
              :style="{ width: `${Math.min(((matchup[1].points - matchup[0].points) / Math.max(matchup[0].points, matchup[1].points)) * 45, 45)}%` }"
            )
              span.text-white.text-sm.font-bold +{{ Math.abs((matchup[0].points || 0) - (matchup[1].points || 0)).toFixed(2) }}

            //- Tie indicator
            div(v-else class="absolute left-1/2 transform -translate-x-1/2 bg-yellow-500 rounded px-3 py-1 z-20")
              span.text-black.text-xs.font-bold TIE

    //- Head-to-Head Player Matchups
    section.mb-8
      .bg-gradient-to-r.from-purple-600.to-purple-800.rounded-t-lg.px-6.py-4.border-b-4.border-yellow-400
        h2.text-white.text-2xl.font-black.uppercase.tracking-wide Head to Head

      div(class="bg-slate-900 rounded-b-lg p-4 sm:p-6 space-y-3")
        //- Position Groups
        div(v-for="position in ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']" :key="position")
          div(v-if="getPositionPlayers(position).team1.length > 0 || getPositionPlayers(position).team2.length > 0")
            //- Position Header
            .text-gray-400.font-bold.text-sm.uppercase.tracking-wider.mb-2 {{ position }}

            //- Player matchups for this position
            .space-y-2
              div(v-for="index in Math.max(getPositionPlayers(position).team1.length, getPositionPlayers(position).team2.length)" :key="index")
                div(class="grid grid-cols-1 md:grid-cols-2 gap-2")
                  //- Team 1 Player
                  div(v-if="getPositionPlayers(position).team1[index - 1]")
                    .bg-slate-800.rounded.p-3(:class="{ 'matchup-highlight': isPlayerScoreAnimating(getPositionPlayers(position).team1[index - 1]) }")
                      .flex.items-center.gap-3
                        img.h-10.w-10.rounded-full.object-cover(
                          v-if="getPlayerPortrait(getPositionPlayers(position).team1[index - 1])"
                          :src="getPlayerPortrait(getPositionPlayers(position).team1[index - 1])"
                          :alt="getPlayerName(getPositionPlayers(position).team1[index - 1])"
                          @error="$event.target.style.display='none'"
                        )
                        .flex-1
                          .flex.items-center.gap-2
                            .text-white.font-semibold.text-sm {{ getPlayerName(getPositionPlayers(position).team1[index - 1]) }}
                            div(
                              v-if="getPlayerInjury(getPositionPlayers(position).team1[index - 1])"
                              class="px-2 py-0.5 rounded text-xs font-bold"
                              :class="getPlayerInjury(getPositionPlayers(position).team1[index - 1]) === 'O' || getPlayerInjury(getPositionPlayers(position).team1[index - 1]) === 'IR' ? 'bg-red-600 text-white' : getPlayerInjury(getPositionPlayers(position).team1[index - 1]) === 'D' ? 'bg-orange-500 text-white' : 'bg-yellow-500 text-black'"
                            ) {{ getPlayerInjury(getPositionPlayers(position).team1[index - 1]) }}
                          .text-gray-500.text-xs {{ getPlayerTeam(getPositionPlayers(position).team1[index - 1]) }}
                        .text-right.flex-shrink-0
                          .text-blue-400.font-bold.text-lg(
                            :class="{ 'score-pulse': isPlayerScoreAnimating(getPositionPlayers(position).team1[index - 1]) }"
                          ) {{ getPlayerPoints(matchup[0], getPositionPlayers(position).team1[index - 1]) }}
                  div(v-else)
                    .bg-slate-800.rounded.p-3.opacity-30
                      .text-center.text-gray-600 -

                  //- Team 2 Player
                  div(v-if="getPositionPlayers(position).team2[index - 1]")
                    .bg-slate-800.rounded.p-3(:class="{ 'matchup-highlight': isPlayerScoreAnimating(getPositionPlayers(position).team2[index - 1]) }")
                      .flex.items-center.gap-3
                        img.h-10.w-10.rounded-full.object-cover(
                          v-if="getPlayerPortrait(getPositionPlayers(position).team2[index - 1])"
                          :src="getPlayerPortrait(getPositionPlayers(position).team2[index - 1])"
                          :alt="getPlayerName(getPositionPlayers(position).team2[index - 1])"
                          @error="$event.target.style.display='none'"
                        )
                        .flex-1
                          .flex.items-center.gap-2
                            .text-white.font-semibold.text-sm {{ getPlayerName(getPositionPlayers(position).team2[index - 1]) }}
                            div(
                              v-if="getPlayerInjury(getPositionPlayers(position).team2[index - 1])"
                              class="px-2 py-0.5 rounded text-xs font-bold"
                              :class="getPlayerInjury(getPositionPlayers(position).team2[index - 1]) === 'O' || getPlayerInjury(getPositionPlayers(position).team2[index - 1]) === 'IR' ? 'bg-red-600 text-white' : getPlayerInjury(getPositionPlayers(position).team2[index - 1]) === 'D' ? 'bg-orange-500 text-white' : 'bg-yellow-500 text-black'"
                            ) {{ getPlayerInjury(getPositionPlayers(position).team2[index - 1]) }}
                          .text-gray-500.text-xs {{ getPlayerTeam(getPositionPlayers(position).team2[index - 1]) }}
                        .text-right.flex-shrink-0
                          .text-blue-400.font-bold.text-lg(
                            :class="{ 'score-pulse': isPlayerScoreAnimating(getPositionPlayers(position).team2[index - 1]) }"
                          ) {{ getPlayerPoints(matchup[1], getPositionPlayers(position).team2[index - 1]) }}
                  div(v-else)
                    .bg-slate-800.rounded.p-3.opacity-30
                      .text-center.text-gray-600 -

    //- Bench Players
    section.mb-8
      .bg-gradient-to-r.from-gray-600.to-gray-800.rounded-t-lg.px-6.py-4.border-b-4.border-yellow-400
        h2.text-white.text-2xl.font-black.uppercase.tracking-wide Bench

      div(class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900 rounded-b-lg p-6")
        //- Team 1 Bench
        div
          h3.text-white.font-bold.text-xl.mb-4 {{ getTeamInfo(matchup[0].roster?.user?.display_name).aiModel }}
          .space-y-2(v-if="getBenchPlayers(matchup[0]).length > 0")
            div(v-for="playerId in getBenchPlayers(matchup[0])" :key="playerId" class="bg-slate-800/50 rounded p-2")
              .flex.items-center.gap-2
                img.h-8.w-8.rounded-full.object-cover(
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
                  .text-white.font-semibold.text-xs {{ getPlayerName(playerId) }}
                  .text-gray-500.text-xs {{ getPlayerTeam(playerId) }}
                .text-right.flex-shrink-0
                  .text-gray-400.font-bold(
                    :class="{ 'score-pulse': isPlayerScoreAnimating(playerId) }"
                  ) {{ getPlayerPoints(matchup[0], playerId) }}
          div(v-else)
            .text-gray-500.text-sm No bench players

        //- Team 2 Bench
        div
          h3.text-white.font-bold.text-xl.mb-4 {{ getTeamInfo(matchup[1].roster?.user?.display_name).aiModel }}
          .space-y-2(v-if="getBenchPlayers(matchup[1]).length > 0")
            div(v-for="playerId in getBenchPlayers(matchup[1])" :key="playerId" class="bg-slate-800/50 rounded p-2")
              .flex.items-center.gap-2
                img.h-8.w-8.rounded-full.object-cover(
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
                  .text-white.font-semibold.text-xs {{ getPlayerName(playerId) }}
                  .text-gray-500.text-xs {{ getPlayerTeam(playerId) }}
                .text-right.flex-shrink-0
                  .text-gray-400.font-bold(
                    :class="{ 'score-pulse': isPlayerScoreAnimating(playerId) }"
                  ) {{ getPlayerPoints(matchup[1], playerId) }}
          div(v-else)
            .text-gray-500.text-sm No bench players

    //- Tokens
    section.mb-8(v-if="markdownContents.length > 0" id="tokens")
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
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { getTeamInfo } from '../teamMappings.js'
import { getPlayerInjuryStatus, getInjuryIndicator } from '../fantasyNerdsApi.js'
import { useLeagueStore } from '../stores/league.js'
import { marked } from 'marked'
import 'github-markdown-css/github-markdown-dark.css'

export default {
  name: 'MatchupDetail',
  setup() {
    const route = useRoute()
    const leagueStore = useLeagueStore()
    const week = ref(null)
    const matchupId = ref(null)
    const matchup = ref(null)
    const loading = ref(true)
    const error = ref(null)
    const injuries = ref({})
    const markdownContents = ref([])
    const draftData = ref({})
    const lastUpdated = ref(null)
    const isAutoRefreshActive = ref(false)
    const autoRefreshInterval = ref(null)
    const autoRefreshCheckInterval = ref(null)

    // Score animation tracking
    const animatingScores = ref(new Set())
    const animatingPlayerScores = ref(new Set())
    const previousScores = ref({})
    const previousPlayerScores = ref({})

    // Use computed property to access players from store
    const players = computed(() => leagueStore.players)

    // Check if current time is during NFL game hours (Thursday 8PM - Monday 11:59PM EST)
    const isNFLGameTime = () => {
      const now = new Date()
      const day = now.getDay() // 0 = Sunday, 1 = Monday, etc.
      const hour = now.getHours()

      // Thursday after 8PM EST through Monday
      if (day === 4 && hour >= 20) return true // Thursday 8PM+
      if (day === 5) return true // Friday all day
      if (day === 6) return true // Saturday all day
      if (day === 0) return true // Sunday all day
      if (day === 1) return true // Monday all day

      return false
    }

    // Check if a score is animating
    const isScoreAnimating = (rosterId) => {
      return animatingScores.value.has(rosterId)
    }

    const isPlayerScoreAnimating = (playerId) => {
      return animatingPlayerScores.value.has(playerId)
    }

    // Trigger score animation
    const animateScore = (rosterId) => {
      animatingScores.value.add(rosterId)
      setTimeout(() => {
        animatingScores.value.delete(rosterId)
      }, 2000)
    }

    const animatePlayerScore = (playerId) => {
      animatingPlayerScores.value.add(playerId)
      setTimeout(() => {
        animatingPlayerScores.value.delete(playerId)
      }, 2000)
    }

    // Play hit sound effect
    const playHitSound = () => {
      try {
        const audio = new Audio('/sounds/hit.wav')
        audio.volume = 0.3
        audio.play().catch(err => console.error('Error playing sound:', err))
      } catch (err) {
        console.error('Error creating audio:', err)
      }
    }

    // Watch for score changes
    watch(matchup, (newMatchup, oldMatchup) => {
      if (!newMatchup || !oldMatchup) return

      let scoreChanged = false

      // Check team scores
      newMatchup.forEach((team, index) => {
        const rosterId = team.roster_id
        const oldScore = previousScores.value[rosterId]
        const newScore = team.points

        if (oldScore !== undefined && oldScore !== newScore) {
          animateScore(rosterId)
          scoreChanged = true
        }
        previousScores.value[rosterId] = newScore

        // Check player scores
        if (team.players_points) {
          Object.entries(team.players_points).forEach(([playerId, points]) => {
            const key = `${rosterId}-${playerId}`
            const oldPoints = previousPlayerScores.value[key]

            if (oldPoints !== undefined && oldPoints !== points) {
              animatePlayerScore(playerId)
              scoreChanged = true
            }
            previousPlayerScores.value[key] = points
          })
        }
      })

      // Play sound if any score changed
      if (scoreChanged) {
        playHitSound()
      }
    }, { deep: true })

    const loadMatchupData = async () => {
      try {
        loading.value = true
        error.value = null

        week.value = parseInt(route.params.week)
        matchupId.value = parseInt(route.params.matchupId)

        // Use the store to fetch all needed data (uses cache if available)
        const [matchupsData, , draftPicks] = await Promise.all([
          leagueStore.fetchMatchupForWeek(week.value),
          leagueStore.fetchPlayers(), // Fetch to ensure data is loaded in store
          leagueStore.fetchDraft()
        ])

        draftData.value = draftPicks

        // Find the specific matchup from the week's matchups
        const matchupGroups = {}
        matchupsData.forEach(matchupGroup => {
          // Each matchupGroup is already an array of 2 teams in a matchup
          const matchupIdKey = matchupGroup[0].matchup_id
          matchupGroups[matchupIdKey] = matchupGroup
        })

        matchup.value = matchupGroups[matchupId.value]

        if (!matchup.value) {
          throw new Error('Matchup not found')
        }

        // Initialize previous scores
        matchup.value.forEach(team => {
          previousScores.value[team.roster_id] = team.points
          if (team.players_points) {
            Object.entries(team.players_points).forEach(([playerId, points]) => {
              previousPlayerScores.value[`${team.roster_id}-${playerId}`] = points
            })
          }
        })

        // Load injury data for this week
        injuries.value = await leagueStore.fetchInjuriesForWeek(week.value)

        // Try to load markdown file for this matchup
        loadMarkdownFile()

        lastUpdated.value = new Date()
      } catch (err) {
        error.value = 'Failed to load matchup data. Please try again later.'
        console.error(err)
      } finally {
        loading.value = false
      }
    }

    // Refresh matchup data without showing loading state
    const refreshMatchupData = async () => {
      try {
        // Fetch fresh data from API, forcing refresh
        const matchupsData = await leagueStore.fetchMatchupForWeek(week.value, true)

        // Find the specific matchup from the week's matchups
        const matchupGroups = {}
        matchupsData.forEach(matchupGroup => {
          const matchupIdKey = matchupGroup[0].matchup_id
          matchupGroups[matchupIdKey] = matchupGroup
        })

        const newMatchup = matchupGroups[matchupId.value]
        if (newMatchup) {
          matchup.value = newMatchup
        }

        // Update injury data
        injuries.value = await leagueStore.fetchInjuriesForWeek(week.value)

        lastUpdated.value = new Date()
      } catch (err) {
        console.error('Error refreshing matchup:', err)
      }
    }

    // Start auto-refresh
    const startAutoRefresh = () => {
      if (autoRefreshInterval.value) return

      console.log('Starting auto-refresh for matchup detail')
      isAutoRefreshActive.value = true
      // Refresh every 1 minute
      autoRefreshInterval.value = setInterval(refreshMatchupData, 60000)
    }

    // Stop auto-refresh
    const stopAutoRefresh = () => {
      if (autoRefreshInterval.value) {
        clearInterval(autoRefreshInterval.value)
        autoRefreshInterval.value = null
      }
      isAutoRefreshActive.value = false
      console.log('Stopped auto-refresh for matchup detail')
    }

    // Check if auto-refresh should be active
    const checkAutoRefreshStatus = () => {
      const shouldRefresh = isNFLGameTime()

      if (shouldRefresh && !autoRefreshInterval.value) {
        startAutoRefresh()
      } else if (!shouldRefresh && autoRefreshInterval.value) {
        stopAutoRefresh()
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
      return `${player.first_name} ${player.last_name}`
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

    const getPlayerInjury = (playerId) => {
      const playerName = getPlayerName(playerId)
      const injury = getPlayerInjuryStatus(injuries.value, playerName)
      return getInjuryIndicator(injury)
    }

    // Get players for each team by position for head-to-head display
    const getPositionPlayers = (position) => {
      const team1Players = matchup.value[0].starters.filter(playerId => {
        const player = players.value[playerId]
        return player?.position === position
      })

      const team2Players = matchup.value[1].starters.filter(playerId => {
        const player = players.value[playerId]
        return player?.position === position
      })

      return {
        team1: team1Players,
        team2: team2Players
      }
    }

    onMounted(async () => {
      await loadMatchupData()

      // Check if we should start auto-refresh
      checkAutoRefreshStatus()

      // Check every minute if we should start/stop auto-refresh
      autoRefreshCheckInterval.value = setInterval(checkAutoRefreshStatus, 60000)
    })

    onUnmounted(() => {
      // Clean up intervals
      stopAutoRefresh()
      if (autoRefreshCheckInterval.value) {
        clearInterval(autoRefreshCheckInterval.value)
      }
    })

    return {
      week,
      matchupId,
      matchup,
      loading,
      error,
      lastUpdated,
      isAutoRefreshActive,
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
      getPlayerInjury,
      getPositionPlayers,
      markdownContents,
      isScoreAnimating,
      isPlayerScoreAnimating
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

/* Score animation */
@keyframes scorePulse {
  0% {
    transform: scale(1);
    color: rgb(255, 255, 255);
  }
  25% {
    transform: scale(1.15);
    color: rgb(34, 197, 94);
  }
  50% {
    transform: scale(1.2);
    color: rgb(74, 222, 128);
  }
  75% {
    transform: scale(1.1);
    color: rgb(34, 197, 94);
  }
  100% {
    transform: scale(1);
    color: rgb(255, 255, 255);
  }
}

.score-pulse {
  animation: scorePulse 2s ease-out;
}

@keyframes matchupHighlight {
  0% {
    background-color: rgba(34, 197, 94, 0.1);
  }
  50% {
    background-color: rgba(34, 197, 94, 0.2);
  }
  100% {
    background-color: rgba(34, 197, 94, 0.1);
  }
}

.matchup-highlight {
  animation: matchupHighlight 2s ease-out;
  position: relative;
}
</style>