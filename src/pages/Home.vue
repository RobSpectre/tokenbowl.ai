<template lang="pug">
.bg-slate-950
  //- Loading State
  .flex.items-center.justify-center(v-if="loading" style="min-height: 50vh")
    .text-center
      .inline-block.animate-spin.rounded-full.h-16.w-16.border-4.border-blue-500.border-t-transparent
      p.text-white.mt-4.text-xl.font-bold.uppercase.tracking-wider Loading Matchups...

  //- Error State
  .container.mx-auto.px-4.py-12(v-else-if="error")
    .bg-red-600.border-l-4.border-red-800.rounded.p-6.text-center
      p.text-white.text-xl.font-bold {{ error }}

  //- Main Content
  main.container.mx-auto.px-4.py-6.max-w-7xl(v-else)
    //- Week Selector (Fixed)
    div(class="fixed top-20 left-0 right-0 z-30 bg-slate-950 pb-4 pt-4 shadow-lg")
      .container.mx-auto.px-4.max-w-7xl
        div(class="flex items-center justify-center gap-3 mb-3")
          button(class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
            @click="selectedWeek = Math.max(1, selectedWeek - 1)"
            :disabled="selectedWeek === 1"
          ) ← PREV
          select(class="px-4 py-2 bg-slate-800 text-white font-black text-xl rounded-lg border-2 border-blue-600 focus:outline-none focus:border-yellow-400 transition-colors uppercase"
            v-model="selectedWeek"
          )
            option(v-for="week in 18" :key="week" :value="week") Week {{ week }}
          button(class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
            @click="selectedWeek = Math.min(18, selectedWeek + 1)"
            :disabled="selectedWeek === 18"
          ) NEXT →

        //- Season Progress Bar
        .max-w-2xl.mx-auto
          .flex.items-center.justify-between.text-xs.text-gray-400.mb-1
            span Week {{ selectedWeek }} of 18
            span {{ Math.round((selectedWeek / 18) * 100) }}% Complete
          .w-full.bg-slate-800.rounded-full.h-2.overflow-hidden
            .bg-gradient-to-r.from-blue-500.to-blue-600.h-full.rounded-full.transition-all.duration-500(
              :style="{ width: `${(selectedWeek / 18) * 100}%` }"
            )

    //- Spacer for fixed nav
    div(style="height: 192px")

    //- Week Matchups
    .mb-12
      //- Week Header
      .bg-gradient-to-r.from-blue-600.to-blue-800.rounded-t-lg.px-6.py-4.border-b-4.border-yellow-400
        h2.text-white.text-3xl.font-black.uppercase.tracking-wide.flex.items-center.gap-3
          span.text-yellow-400 🏈
          | Week {{ selectedWeek }}

      //- Matchups Grid
      .bg-slate-900.rounded-b-lg.p-6(v-if="allMatchups[selectedWeek]")
        .space-y-4
          div(
            v-for="(matchup, index) in allMatchups[selectedWeek]"
            :key="index"
            @click="goToMatchupDetail(matchup)"
            class="bg-slate-800 rounded-lg overflow-hidden hover:bg-slate-750 transition-all duration-200 cursor-pointer border-2 border-slate-700 hover:border-blue-500"
          )
            div(class="p-4" v-if="matchup.length === 2")
              //- Mobile Layout (stacked)
              div(class="flex flex-col gap-3 md:hidden")
                //- Team 1 (Mobile)
                .flex.items-center.justify-between.w-full
                  div(class="flex items-center gap-2 flex-1 min-w-0")
                    img(class="h-10 w-10 flex-shrink-0 object-contain"
                      :src="getTeamInfo(matchup[0].roster?.user?.display_name).logo"
                      :alt="getTeamInfo(matchup[0].roster?.user?.display_name).aiModel"
                      :class="getTeamInfo(matchup[0].roster?.user?.display_name).invertLogo ? 'invert brightness-200' : ''"
                    )
                    div(class="min-w-0")
                      div(class="text-white font-bold text-sm truncate") {{ getTeamInfo(matchup[0].roster?.user?.display_name).aiModel }}
                      div(class="text-blue-400 text-xs font-semibold truncate") {{ getTeamInfo(matchup[0].roster?.user?.display_name).owner }}
                      div(:class="getRecordColor(getRecordThroughWeek(matchup[0].roster_id, selectedWeek - 1).wins, getRecordThroughWeek(matchup[0].roster_id, selectedWeek - 1).losses)" class="text-xs font-bold") {{ getRecordThroughWeek(matchup[0].roster_id, selectedWeek - 1).wins }}-{{ getRecordThroughWeek(matchup[0].roster_id, selectedWeek - 1).losses }}
                  div(class="text-right flex-shrink-0")
                    div(class="text-white font-black text-2xl") {{ matchup[0].points?.toFixed(2) || '0.00' }}
                    .mt-1(v-if="isWeekComplete(matchup)")
                      .text-green-400.text-xs.font-bold.uppercase(v-if="matchup[0].points > matchup[1].points") W
                      .text-red-400.text-xs.font-bold.uppercase(v-else-if="matchup[0].points < matchup[1].points") L

                //- VS Separator (Mobile)
                div(class="flex items-center justify-center")
                  span(class="text-white font-black text-xs bg-slate-700 rounded-full px-2 py-0.5") VS

                //- Team 2 (Mobile)
                .flex.items-center.justify-between.w-full
                  div(class="flex items-center gap-2 flex-1 min-w-0")
                    img(class="h-10 w-10 flex-shrink-0 object-contain"
                      :src="getTeamInfo(matchup[1].roster?.user?.display_name).logo"
                      :alt="getTeamInfo(matchup[1].roster?.user?.display_name).aiModel"
                      :class="getTeamInfo(matchup[1].roster?.user?.display_name).invertLogo ? 'invert brightness-200' : ''"
                    )
                    div(class="min-w-0")
                      div(class="text-white font-bold text-sm truncate") {{ getTeamInfo(matchup[1].roster?.user?.display_name).aiModel }}
                      div(class="text-blue-400 text-xs font-semibold truncate") {{ getTeamInfo(matchup[1].roster?.user?.display_name).owner }}
                      div(:class="getRecordColor(getRecordThroughWeek(matchup[1].roster_id, selectedWeek - 1).wins, getRecordThroughWeek(matchup[1].roster_id, selectedWeek - 1).losses)" class="text-xs font-bold") {{ getRecordThroughWeek(matchup[1].roster_id, selectedWeek - 1).wins }}-{{ getRecordThroughWeek(matchup[1].roster_id, selectedWeek - 1).losses }}
                  div(class="text-right flex-shrink-0")
                    div(class="text-white font-black text-2xl") {{ matchup[1].points?.toFixed(2) || '0.00' }}
                    .mt-1(v-if="isWeekComplete(matchup)")
                      .text-green-400.text-xs.font-bold.uppercase(v-if="matchup[1].points > matchup[0].points") W
                      .text-red-400.text-xs.font-bold.uppercase(v-else-if="matchup[1].points < matchup[0].points") L

              //- Desktop Layout (side by side)
              div(class="hidden md:grid md:grid-cols-2 gap-4 relative")
                //- Team 1 (Desktop)
                .flex.items-center.justify-between
                  div(class="flex items-center gap-3 flex-1")
                    img(class="h-12 w-12 object-contain"
                      :src="getTeamInfo(matchup[0].roster?.user?.display_name).logo"
                      :alt="getTeamInfo(matchup[0].roster?.user?.display_name).aiModel"
                      :class="getTeamInfo(matchup[0].roster?.user?.display_name).invertLogo ? 'invert brightness-200' : ''"
                    )
                    div
                      div(class="text-white font-bold text-lg") {{ getTeamInfo(matchup[0].roster?.user?.display_name).aiModel }}
                      div(class="text-blue-400 text-sm font-semibold") {{ getTeamInfo(matchup[0].roster?.user?.display_name).owner }}
                      div(:class="getRecordColor(getRecordThroughWeek(matchup[0].roster_id, selectedWeek - 1).wins, getRecordThroughWeek(matchup[0].roster_id, selectedWeek - 1).losses)" class="text-xs font-bold") {{ getRecordThroughWeek(matchup[0].roster_id, selectedWeek - 1).wins }}-{{ getRecordThroughWeek(matchup[0].roster_id, selectedWeek - 1).losses }}
                  .text-right
                    div(class="text-white font-black text-3xl") {{ matchup[0].points?.toFixed(2) || '0.00' }}
                    .mt-2(v-if="isWeekComplete(matchup)")
                      .text-green-400.text-xs.font-bold.uppercase(v-if="matchup[0].points > matchup[1].points") W
                      .text-red-400.text-xs.font-bold.uppercase(v-else-if="matchup[0].points < matchup[1].points") L

                //- Team 2 (Desktop)
                .flex.items-center.justify-between
                  div(class="text-left")
                    div(class="text-white font-black text-3xl") {{ matchup[1].points?.toFixed(2) || '0.00' }}
                    .mt-2(v-if="isWeekComplete(matchup)")
                      .text-green-400.text-xs.font-bold.uppercase(v-if="matchup[1].points > matchup[0].points") W
                      .text-red-400.text-xs.font-bold.uppercase(v-else-if="matchup[1].points < matchup[0].points") L
                  div(class="flex items-center gap-3 flex-1 justify-end")
                    .text-right
                      div(class="text-white font-bold text-lg") {{ getTeamInfo(matchup[1].roster?.user?.display_name).aiModel }}
                      div(class="text-blue-400 text-sm font-semibold") {{ getTeamInfo(matchup[1].roster?.user?.display_name).owner }}
                      div(:class="getRecordColor(getRecordThroughWeek(matchup[1].roster_id, selectedWeek - 1).wins, getRecordThroughWeek(matchup[1].roster_id, selectedWeek - 1).losses)" class="text-xs font-bold") {{ getRecordThroughWeek(matchup[1].roster_id, selectedWeek - 1).wins }}-{{ getRecordThroughWeek(matchup[1].roster_id, selectedWeek - 1).losses }}
                    img(
                      class="h-12 w-12 object-contain"
                      :src="getTeamInfo(matchup[1].roster?.user?.display_name).logo"
                      :alt="getTeamInfo(matchup[1].roster?.user?.display_name).aiModel"
                      :class="getTeamInfo(matchup[1].roster?.user?.display_name).invertLogo ? 'invert brightness-200' : ''"
                    )

                //- VS Separator (Desktop)
                div(class="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-700 rounded-full px-3 py-1 z-10")
                  span.text-white.font-black.text-sm VS

              //- Point Margin Bar Chart
              .mt-4.pt-4.border-t.border-slate-700(v-if="(matchup[0].points || 0) !== (matchup[1].points || 0)")
                .relative.h-8.flex.items-center
                  //- Center Line
                  div(class="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-slate-600 z-0")

                  //- Bar pointing toward winner (team 0 on left)
                  div(
                    v-if="matchup[0].points > matchup[1].points"
                    class="absolute right-1/2 h-6 bg-gradient-to-l from-green-500 to-green-600 rounded-l flex items-center justify-start pl-2"
                    :style="{ width: `${Math.min(((matchup[0].points - matchup[1].points) / Math.max(matchup[0].points, matchup[1].points, 1)) * 100, 45)}%` }"
                  )
                    span.text-white.text-xs.font-bold {{ Math.abs((matchup[0].points || 0) - (matchup[1].points || 0)).toFixed(2) }}

                  //- Bar pointing toward winner (team 1 on right)
                  div(
                    v-else-if="matchup[1].points > matchup[0].points"
                    class="absolute left-1/2 h-6 bg-gradient-to-r from-green-500 to-green-600 rounded-r flex items-center justify-end pr-2"
                    :style="{ width: `${Math.min(((matchup[1].points - matchup[0].points) / Math.max(matchup[0].points, matchup[1].points, 1)) * 100, 45)}%` }"
                  )
                    span.text-white.text-xs.font-bold {{ Math.abs((matchup[0].points || 0) - (matchup[1].points || 0)).toFixed(2) }}

                  //- Tie indicator (only if week complete)
                  div(v-else class="absolute left-1/2 transform -translate-x-1/2 bg-yellow-500 rounded px-3 py-1")
                    span.text-white.text-xs.font-bold TIE

      //- No Matchups
      .bg-slate-900.rounded-b-lg.p-8.text-center(v-else)
        p.text-gray-500.text-lg No matchups available for Week {{ selectedWeek }}

    //- Video
    section.mb-12(v-if="latestVideo || latestShorts.length > 0")
      .bg-gradient-to-r.from-red-600.to-red-800.rounded-t-lg.px-6.py-4.border-b-4.border-yellow-400
        h2.text-white.text-3xl.font-black.uppercase.tracking-wide.flex.items-center.gap-3
          span.text-yellow-400 📺
          | Videos

      .bg-slate-900.rounded-b-lg.p-4
        div(class="flex flex-col md:flex-row gap-4 md:gap-6")
          //- Latest Video
          a(
            v-if="latestVideo"
            :href="latestVideo.url"
            target="_blank"
            rel="noopener noreferrer"
            class="block group w-full md:flex-1"
          )
            .relative.overflow-hidden.rounded
              img(
                class="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-200"
                :src="latestVideo.thumbnail"
                :alt="latestVideo.title"
              )
              div(class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center")
                svg.w-8.h-8.text-white(fill="currentColor" viewBox="0 0 24 24")
                  path(d="M8 5v14l11-7z")
            h4(class="text-white font-medium mt-1 text-xs group-hover:text-blue-400 transition-colors line-clamp-2") {{ latestVideo.title }}

          //- Latest Shorts
          div(class="flex gap-2 w-full md:flex-1")
            a(
              v-for="short in latestShorts"
              :key="short.id"
              :href="short.url"
              target="_blank"
              rel="noopener noreferrer"
              class="block group flex-1"
            )
              .relative.overflow-hidden.rounded
                img(
                  class="w-full aspect-[9/16] object-cover group-hover:scale-105 transition-transform duration-200"
                  :src="short.thumbnail"
                  :alt="short.title"
                )
                div(class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center")
                  svg.w-8.h-8.text-white(fill="currentColor" viewBox="0 0 24 24")
                    path(d="M8 5v14l11-7z")
                div(class="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-white text-[10px] font-bold") SHORTS
              h4(class="text-white font-medium mt-1 text-xs group-hover:text-blue-400 transition-colors line-clamp-1") {{ short.title }}

    //- Standings
    section.mb-12
      .bg-gradient-to-r.from-purple-600.to-purple-800.rounded-t-lg.px-6.py-4.border-b-4.border-yellow-400
        h2.text-white.text-3xl.font-black.uppercase.tracking-wide.flex.items-center.gap-3
          span.text-yellow-400 🏆
          | Standings

      .bg-slate-900.rounded-b-lg.overflow-x-auto
        table.w-full.min-w-max
          thead.bg-slate-800.sticky.top-0
            tr.text-left.text-gray-300.uppercase.text-xs.font-bold.tracking-wider
              th(class="px-3 sm:px-6 py-4") Rank
              th(class="px-3 sm:px-6 py-4") Team
              th(class="px-3 sm:px-6 py-4 text-center") Record
              th(class="px-3 sm:px-6 py-4 text-right") Points
          tbody.divide-y.divide-slate-800
            tr(
              v-for="(roster, index) in historicalStandings"
              :key="roster.roster_id"
              class="hover:bg-slate-800 transition-colors duration-150"
            )
              td(class="px-3 sm:px-6 py-4")
                .flex.items-center.gap-2
                  span(class="text-lg sm:text-2xl font-black text-white") {{ index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}` }}
              td(class="px-3 sm:px-6 py-4")
                div(class="flex items-center gap-2 sm:gap-4")
                  img(
                    class="h-8 w-8 sm:h-10 sm:w-10 object-contain"
                    :src="getTeamInfo(roster.user?.display_name).logo"
                    :alt="getTeamInfo(roster.user?.display_name).aiModel"
                    :class="getTeamInfo(roster.user?.display_name).invertLogo ? 'invert brightness-200' : ''"
                  )
                  div
                    div(class="text-white font-bold text-sm sm:text-lg") {{ getTeamInfo(roster.user?.display_name).aiModel }}
                    div(class="text-gray-400 text-xs sm:text-sm hidden sm:block") {{ getTeamInfo(roster.user?.display_name).owner }}
              td(class="px-3 sm:px-6 py-4 text-center")
                div(:class="getRecordColor(roster.historicalRecord.wins, roster.historicalRecord.losses)" class="font-bold text-sm sm:text-lg") {{ roster.historicalRecord.wins }}-{{ roster.historicalRecord.losses }}
              td(class="px-3 sm:px-6 py-4 text-right")
                div(class="text-white font-black text-base sm:text-xl") {{ roster.historicalPoints.toFixed(2) }}

    //- History
    section.mb-12
      .bg-gradient-to-r.from-green-600.to-green-800.rounded-t-lg.px-6.py-4.border-b-4.border-yellow-400
        h2.text-white.text-3xl.font-black.uppercase.tracking-wide.flex.items-center.gap-3
          span.text-yellow-400 📊
          | History

      .bg-slate-900.rounded-b-lg.p-6
        div(ref="standingsChartRef" style="width: 100%; height: 400px;")

    //- Points
    section.mb-12
      .bg-gradient-to-r.from-cyan-600.to-cyan-800.rounded-t-lg.px-6.py-4.border-b-4.border-yellow-400
        h2.text-white.text-3xl.font-black.uppercase.tracking-wide.flex.items-center.gap-3
          span.text-yellow-400 📈
          | Total Points

      .bg-slate-900.rounded-b-lg.p-6
        div(ref="pointsChartRef" style="width: 100%; height: 500px;")

    //- Transactions
    section.mb-12
      .bg-gradient-to-r.from-orange-600.to-orange-800.rounded-t-lg.px-6.py-4.border-b-4.border-yellow-400
        h2.text-white.text-3xl.font-black.uppercase.tracking-wide.flex.items-center.gap-3
          span.text-yellow-400 💼
          | Week {{ selectedWeek }} Transactions

      .bg-slate-900.rounded-b-lg.p-6(v-if="transactions && transactions.length > 0")
        .space-y-3
          .bg-slate-800.rounded-lg.p-4(
            v-for="(transaction, index) in transactions"
            :key="index"
          )
            .flex.items-start.gap-4
              div(v-if="transaction.teamInfo" class="flex items-center gap-3 min-w-[250px]")
                img.h-16.w-16.object-contain(
                  v-if="transaction.teamInfo.logo"
                  :src="transaction.teamInfo.logo"
                  :alt="transaction.teamInfo.aiModel"
                  :class="transaction.teamInfo.invertLogo ? 'invert brightness-200' : ''"
                )
                div
                  .text-white.font-bold.text-base {{ transaction.teamInfo.aiModel }}
                  .text-blue-400.text-sm {{ transaction.teamInfo.owner }}

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
                          div(class="text-blue-400 text-xs font-bold mt-0.5") {{ getPlayerPosition(playerId) }}
                          div(class="text-gray-400 text-xs mt-0.5" v-if="getPlayerRankECR(playerId)") ROS: {{ getPlayerRankECR(playerId) }}

                  .flex-1(v-if="transaction.drops")
                    .text-red-400.text-sm.font-semibold.mb-2 Dropped:
                    .flex.items-start.gap-4.flex-wrap
                      .flex.items-start.gap-3(v-for="playerId in Object.keys(transaction.drops)" :key="playerId")
                        img.w-16.h-16.rounded-lg.bg-slate-700.object-cover(:src="getPlayerImageUrl(playerId)" :alt="getPlayerNameFromId(playerId)" @error="$event.target.style.display='none'")
                        div
                          .text-gray-300.text-sm.font-semibold {{ getPlayerNameFromId(playerId) }}
                          div(class="text-blue-400 text-xs font-bold mt-0.5") {{ getPlayerPosition(playerId) }}
                          div(class="text-gray-400 text-xs mt-0.5" v-if="getPlayerRankECR(playerId)") ROS: {{ getPlayerRankECR(playerId) }}

              .flex.flex-col.items-end.gap-2
                div(:class="getTransactionDelta(transaction) > 0 ? 'text-green-400' : 'text-red-400'" class="text-3xl font-black") {{ getTransactionDelta(transaction) > 0 ? '+' : '' }}{{ getTransactionDelta(transaction) }}
                .text-gray-400.text-xs.font-semibold.uppercase.tracking-wider Δ ROS
                .text-gray-500.text-sm.whitespace-nowrap {{ formatTransactionDate(transaction.created) }}

      .bg-slate-900.rounded-b-lg.p-8.text-center(v-else)
        p.text-gray-500.text-lg No transactions for Week {{ selectedWeek }}
</template>

<script>
import { ref, onMounted, watch, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { getLeagueData, getMatchups, getRosters, getLeagueUsers, getTransactions, getPlayers } from '../sleeperApi.js'
import { getTeamInfo } from '../teamMappings.js'
import { getLatestVideoAndShorts } from '../youtubeApi.js'
import * as echarts from 'echarts'

export default {
  name: 'Home',
  setup() {
    const router = useRouter()
    const leagueData = ref(null)
    const allMatchups = ref({})
    const loading = ref(true)
    const error = ref(null)
    const selectedWeek = ref(null)
    const transactions = ref([])
    const players = ref({})
    const latestVideo = ref(null)
    const latestShorts = ref([])
    const standingsChartRef = ref(null)
    const pointsChartRef = ref(null)
    let standingsChart = null
    let pointsChart = null

    const loadData = async () => {
      try {
        loading.value = true
        error.value = null

        const [league, playersData] = await Promise.all([
          getLeagueData(),
          getPlayers()
        ])

        leagueData.value = league
        players.value = playersData

        // Set current week from league data
        selectedWeek.value = league.league.settings.leg || 5

        // Load matchups for all weeks
        await loadAllMatchups()

        // Load transactions for current week
        await loadTransactions(selectedWeek.value)
      } catch (err) {
        error.value = 'Failed to load league data. Please try again later.'
        console.error(err)
      } finally {
        loading.value = false
      }
    }

    const loadTransactions = async (week) => {
      try {
        const [trans, rosters, users] = await Promise.all([
          getTransactions(week),
          getRosters(),
          getLeagueUsers()
        ])

        // Create user map
        const userMap = {}
        users.forEach(user => {
          userMap[user.user_id] = user
        })

        // Create roster map
        const rosterMap = {}
        rosters.forEach(roster => {
          rosterMap[roster.roster_id] = {
            ...roster,
            user: userMap[roster.owner_id]
          }
        })

        // Enhance transactions with roster/user info
        transactions.value = (trans || []).map(transaction => {
          const rosterId = transaction.roster_ids?.[0]
          const roster = rosterId ? rosterMap[rosterId] : null

          return {
            ...transaction,
            roster,
            teamInfo: roster?.user?.display_name ? getTeamInfo(roster.user.display_name) : null
          }
        })
      } catch (err) {
        console.error('Error loading transactions:', err)
        transactions.value = []
      }
    }

    const loadAllMatchups = async () => {
      try {
        const rosters = await getRosters()
        const users = await getLeagueUsers()

        // Create maps
        const userMap = {}
        users.forEach(user => {
          userMap[user.user_id] = user
        })

        const rosterMap = {}
        rosters.forEach(roster => {
          rosterMap[roster.roster_id] = {
            ...roster,
            user: userMap[roster.owner_id]
          }
        })

        // Load matchups for all 18 weeks
        for (let week = 1; week <= 18; week++) {
          try {
            const matchups = await getMatchups(week)

            // Group matchups
            const matchupGroups = {}
            matchups.forEach(matchup => {
              if (!matchupGroups[matchup.matchup_id]) {
                matchupGroups[matchup.matchup_id] = []
              }
              matchupGroups[matchup.matchup_id].push({
                ...matchup,
                roster: rosterMap[matchup.roster_id]
              })
            })

            allMatchups.value[week] = Object.values(matchupGroups)
          } catch (err) {
            console.error(`Error loading week ${week} matchups:`, err)
          }
        }
      } catch (err) {
        console.error('Error loading all matchups:', err)
      }
    }

    const goToMatchupDetail = (matchup) => {
      if (matchup && matchup.length > 0 && matchup[0].matchup_id) {
        router.push(`/matchup/${selectedWeek.value}/${matchup[0].matchup_id}`)
      }
    }

    const isWeekComplete = (matchup) => {
      // Week is complete if the current league week is past the selected week
      // This ensures all players have played their games
      if (!leagueData.value || !leagueData.value.league) return false

      const currentWeek = leagueData.value.league.settings.leg || 1
      return selectedWeek.value < currentWeek
    }

    const getTransactionType = (type) => {
      const types = {
        'waiver': 'Waiver Claim',
        'free_agent': 'Free Agent Pickup',
        'trade': 'Trade'
      }
      return types[type] || type
    }

    const getPlayerNameFromId = (playerId) => {
      const player = players.value[playerId]
      if (!player) return `Player ${playerId}`
      return `${player.first_name} ${player.last_name}`
    }

    const getPlayerPosition = (playerId) => {
      const player = players.value[playerId]
      if (!player || !player.position) return 'N/A'
      return player.position
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

    const getPlayerRankECR = (playerId) => {
      const player = players.value[playerId]
      if (!player) return null
      // Sleeper provides fantasy_positions array and search_rank
      // Use search_rank as ROS ranking if available
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

    // Watch for week changes to reload transactions
    watch(selectedWeek, (newWeek) => {
      if (newWeek) {
        loadTransactions(newWeek)
      }
    })

    const loadVideos = async () => {
      try {
        const videoData = await getLatestVideoAndShorts()
        latestVideo.value = videoData.latestVideo
        latestShorts.value = videoData.latestShorts
      } catch (err) {
        console.error('Error loading YouTube videos:', err)
      }
    }

    // Calculate record through a specific week
    const getRecordThroughWeek = (rosterId, throughWeek) => {
      let wins = 0
      let losses = 0
      let ties = 0

      for (let week = 1; week <= throughWeek; week++) {
        const weekMatchups = allMatchups.value[week]
        if (!weekMatchups) continue

        for (const matchup of weekMatchups) {
          if (matchup.length !== 2) continue

          const team1 = matchup[0]
          const team2 = matchup[1]

          // Check if this roster is in this matchup
          if (team1.roster_id === rosterId) {
            if (team1.points > team2.points) wins++
            else if (team1.points < team2.points) losses++
            else ties++
          } else if (team2.roster_id === rosterId) {
            if (team2.points > team1.points) wins++
            else if (team2.points < team1.points) losses++
            else ties++
          }
        }
      }

      return { wins, losses, ties }
    }

    // Get color class for record
    const getRecordColor = (wins, losses) => {
      if (wins > losses) return 'text-green-400'
      else if (wins < losses) return 'text-red-400'
      return 'text-gray-400'
    }

    // Calculate total points through a specific week
    const getPointsThroughWeek = (rosterId, throughWeek) => {
      let totalPoints = 0

      for (let week = 1; week <= throughWeek; week++) {
        const weekMatchups = allMatchups.value[week]
        if (!weekMatchups) continue

        for (const matchup of weekMatchups) {
          const team = matchup.find(t => t.roster_id === rosterId)
          if (team) {
            totalPoints += team.points || 0
            break
          }
        }
      }

      return totalPoints
    }

    // Computed property for current week
    const currentWeek = computed(() => {
      return leagueData.value?.league?.settings?.leg || 1
    })

    // Computed property for historical standings based on selected week
    const historicalStandings = computed(() => {
      if (!leagueData.value || !selectedWeek.value) return []

      // Determine which week to calculate standings through
      // Past weeks: show standings through that week
      // Current/future weeks: show standings through most recent completed week
      const currentWeek = leagueData.value.league?.settings?.leg || 1
      const standingsWeek = selectedWeek.value < currentWeek
        ? selectedWeek.value
        : Math.max(0, currentWeek - 1)

      const standings = leagueData.value.rosters.map(roster => {
        const record = getRecordThroughWeek(roster.roster_id, standingsWeek)
        const points = getPointsThroughWeek(roster.roster_id, standingsWeek)

        return {
          ...roster,
          historicalRecord: record,
          historicalPoints: points
        }
      })

      // Sort by wins (descending), then by points (descending)
      standings.sort((a, b) => {
        if (b.historicalRecord.wins !== a.historicalRecord.wins) {
          return b.historicalRecord.wins - a.historicalRecord.wins
        }
        return b.historicalPoints - a.historicalPoints
      })

      return standings
    })

    // Render standings history chart
    const renderStandingsChart = async () => {
      if (!standingsChartRef.value || !leagueData.value || !allMatchups.value || !selectedWeek.value) return

      await nextTick()

      if (!standingsChart) {
        standingsChart = echarts.init(standingsChartRef.value)
      }

      const currentWeek = leagueData.value.league?.settings?.leg || 1
      const maxWeek = selectedWeek.value < currentWeek ? selectedWeek.value : Math.max(0, currentWeek - 1)

      // Prepare data: track each team's rank over time
      const teamData = {}
      leagueData.value.rosters.forEach(roster => {
        const teamInfo = getTeamInfo(roster.user?.display_name)
        teamData[roster.roster_id] = {
          name: teamInfo.aiModel,
          logo: teamInfo.logo,
          invertLogo: teamInfo.invertLogo || false,
          ranks: []
        }
      })

      // Calculate rankings for each week
      for (let week = 1; week <= maxWeek; week++) {
        const weekStandings = leagueData.value.rosters.map(roster => {
          const record = getRecordThroughWeek(roster.roster_id, week)
          const points = getPointsThroughWeek(roster.roster_id, week)
          return {
            roster_id: roster.roster_id,
            wins: record.wins,
            points
          }
        })

        weekStandings.sort((a, b) => {
          if (b.wins !== a.wins) return b.wins - a.wins
          return b.points - a.points
        })

        weekStandings.forEach((standing, index) => {
          teamData[standing.roster_id].ranks.push(index + 1)
        })
      }

      // Define colors for each team
      const colors = [
        '#ef4444', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
        '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
      ]

      const series = Object.values(teamData).map((team, index) => ({
        name: team.name,
        type: 'line',
        data: team.ranks,
        smooth: true,
        lineStyle: {
          width: 2,
          color: colors[index % colors.length]
        },
        itemStyle: {
          color: colors[index % colors.length]
        }
      }))

      const option = {
        backgroundColor: 'transparent',
        animation: true,
        animationDuration: 1000,
        animationEasing: 'cubicOut',
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          borderColor: '#3b82f6',
          textStyle: { color: '#fff' }
        },
        legend: {
          data: Object.values(teamData).map((t, index) => ({
            name: t.name,
            icon: 'image://' + t.logo,
            textStyle: {
              color: colors[index % colors.length]
            }
          })),
          top: 10,
          itemWidth: 20,
          itemHeight: 20
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
          data: Array.from({ length: maxWeek }, (_, i) => `Week ${i + 1}`),
          axisLabel: { color: '#9ca3af' },
          axisLine: { lineStyle: { color: '#475569' } }
        },
        yAxis: {
          type: 'value',
          inverse: true,
          interval: 1,
          min: 1,
          max: 10,
          axisLabel: { color: '#9ca3af' },
          axisLine: { lineStyle: { color: '#475569' } },
          splitLine: { lineStyle: { color: '#334155' } }
        },
        series
      }

      standingsChart.setOption(option)
    }

    // Render points bar chart
    const renderPointsChart = async () => {
      if (!pointsChartRef.value || !leagueData.value || !allMatchups.value || !selectedWeek.value) return

      await nextTick()

      if (!pointsChart) {
        pointsChart = echarts.init(pointsChartRef.value)
      }

      const currentWeek = leagueData.value.league?.settings?.leg || 1
      const maxWeek = selectedWeek.value < currentWeek ? selectedWeek.value : Math.max(0, currentWeek - 1)

      // Get points for each team through the selected week
      const teamPoints = leagueData.value.rosters.map(roster => {
        const teamInfo = getTeamInfo(roster.user?.display_name)
        const points = getPointsThroughWeek(roster.roster_id, maxWeek)
        return {
          name: teamInfo.aiModel,
          logo: teamInfo.logo,
          invertLogo: teamInfo.invertLogo || false,
          points
        }
      })

      // Sort by points descending
      teamPoints.sort((a, b) => b.points - a.points)

      const option = {
        backgroundColor: 'transparent',
        animation: true,
        animationDuration: 1000,
        animationEasing: 'cubicOut',
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          borderColor: '#3b82f6',
          textStyle: { color: '#fff' },
          formatter: function(params) {
            const param = params[0]
            return `${param.name}<br/>${param.marker}${param.value.toFixed(2)} pts`
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'value',
          axisLabel: { color: '#9ca3af' },
          axisLine: { lineStyle: { color: '#475569' } },
          splitLine: { lineStyle: { color: '#334155' } }
        },
        yAxis: {
          type: 'category',
          data: teamPoints.map(t => t.name),
          inverse: true,
          axisLabel: {
            color: '#9ca3af',
            formatter: function(value, index) {
              // Find the team by name to get the correct logo
              const team = teamPoints.find(t => t.name === value)
              if (!team) return value

              // Create a unique key based on team name (replace all non-alphanumeric with underscore)
              const teamKey = value.replace(/[^a-zA-Z0-9]/g, '_')
              return `{logo_${teamKey}|}{name|  ${value}}`
            },
            rich: teamPoints.reduce((acc, team) => {
              const teamKey = team.name.replace(/[^a-zA-Z0-9]/g, '_')
              const logoUrl = team.logo.startsWith('http') ? team.logo : window.location.origin + team.logo
              acc[`logo_${teamKey}`] = {
                height: 24,
                width: 24,
                align: 'right',
                backgroundColor: {
                  image: logoUrl
                }
              }
              return acc
            }, {
              name: {
                color: '#9ca3af',
                padding: [0, 0, 0, 0],
                align: 'left'
              }
            })
          },
          axisLine: { lineStyle: { color: '#475569' } }
        },
        series: [{
          type: 'bar',
          data: teamPoints.map(t => t.points),
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#06b6d4' },
              { offset: 1, color: '#0891b2' }
            ])
          },
          label: {
            show: true,
            position: 'right',
            color: '#fff',
            formatter: function(params) {
              return params.value.toFixed(2)
            }
          }
        }]
      }

      pointsChart.setOption(option)

      // Fix aspect ratio for logos
      await nextTick()
      setTimeout(() => {
        const yAxisLabels = pointsChartRef.value?.querySelectorAll('image')
        teamPoints.forEach((team, index) => {
          if (yAxisLabels[index]) {
            // Set preserve aspect ratio to prevent stretching
            yAxisLabels[index].setAttribute('preserveAspectRatio', 'xMidYMid meet')

            // Force square dimensions
            yAxisLabels[index].setAttribute('width', '24')
            yAxisLabels[index].setAttribute('height', '24')
          }
        })
      }, 100)
    }

    // Watch for week changes and re-render charts
    watch(selectedWeek, () => {
      renderStandingsChart()
      renderPointsChart()
    })

    onMounted(() => {
      loadData().then(() => {
        renderStandingsChart()
        renderPointsChart()
      })
      loadVideos()
    })

    return {
      leagueData,
      allMatchups,
      loading,
      error,
      selectedWeek,
      currentWeek,
      transactions,
      latestVideo,
      latestShorts,
      getTeamInfo,
      goToMatchupDetail,
      isWeekComplete,
      getTransactionType,
      getPlayerNameFromId,
      getPlayerPosition,
      getPlayerImageUrl,
      getPlayerRankECR,
      getTransactionDelta,
      formatTransactionDate,
      getRecordThroughWeek,
      getRecordColor,
      historicalStandings,
      standingsChartRef,
      pointsChartRef
    }
  }
}
</script>
