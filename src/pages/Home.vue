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
            @click="handleWeekChange('prev')"
            :disabled="selectedWeek === 1"
          ) ← PREV
          select(class="px-4 py-2 bg-slate-800 text-white font-black text-xl rounded-lg border-2 border-blue-600 focus:outline-none focus:border-yellow-400 transition-colors uppercase"
            v-model="selectedWeek"
          )
            option(v-for="week in 18" :key="week" :value="week") Week {{ week }}
          button(class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
            @click="handleWeekChange('next')"
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

        //- Last Updated Indicator (only shown during active games)
        div(v-if="lastUpdated && isAutoRefreshActive" class="flex flex-col items-center gap-2 mt-3")
          div(class="flex items-center gap-2 text-xs text-gray-500")
            div(class="w-2 h-2 rounded-full bg-green-500 animate-pulse")
            span(class="text-green-400") Auto-updating every 2 minutes
            span(class="text-gray-600") •
            span Last updated: {{ lastUpdated.toLocaleTimeString() }}
          button(
            @click="refreshMatchups"
            class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-gray-400 hover:text-white text-xs rounded transition-colors"
          ) Refresh Now

    //- Spacer for fixed nav (dynamic height based on auto-refresh indicator)
    div(:style="{ height: isAutoRefreshActive ? '240px' : '192px' }")

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
              div(class="flex flex-col gap-2 md:hidden")
                //- Team 1 (Mobile)
                .flex.items-center.justify-between.w-full.bg-slate-750.rounded-lg.p-2
                  div(class="flex items-center gap-2 flex-1 min-w-0")
                    img(class="h-10 w-10 flex-shrink-0 object-contain"
                      :src="getTeamInfo(matchup[0].roster?.user?.display_name).logo"
                      :alt="getTeamInfo(matchup[0].roster?.user?.display_name).aiModel"
                      :class="getTeamInfo(matchup[0].roster?.user?.display_name).invertLogo ? 'invert brightness-200' : ''"
                    )
                    div(class="min-w-0 flex-1")
                      div(class="text-white font-bold text-sm truncate") {{ getTeamInfo(matchup[0].roster?.user?.display_name).aiModel }}
                      div(class="text-blue-400 text-xs font-semibold truncate") {{ getTeamInfo(matchup[0].roster?.user?.display_name).owner }}
                      div(:class="getRecordColor(getRecordThroughWeek(matchup[0].roster_id, selectedWeek - 1).wins, getRecordThroughWeek(matchup[0].roster_id, selectedWeek - 1).losses)" class="text-xs font-bold") {{ getRecordThroughWeek(matchup[0].roster_id, selectedWeek - 1).wins }}-{{ getRecordThroughWeek(matchup[0].roster_id, selectedWeek - 1).losses }}
                  div(class="flex flex-col items-end flex-shrink-0 ml-2")
                    div(
                      class="text-white font-black text-xl transition-all duration-300"
                      :class="{ 'score-pulse': isScoreAnimating(selectedWeek, matchup[0].matchup_id, matchup[0].roster_id) }"
                    ) {{ matchup[0].points?.toFixed(2) || '0.00' }}
                    div(v-if="isWeekComplete(matchup)")
                      span.text-green-400.text-xs.font-bold.uppercase(v-if="matchup[0].points > matchup[1].points") W
                      span.text-red-400.text-xs.font-bold.uppercase(v-else-if="matchup[0].points < matchup[1].points") L

                //- VS Separator (Mobile) - smaller and properly spaced
                div(class="flex items-center justify-center py-1")
                  div(class="relative flex items-center justify-center w-full")
                    div(class="absolute inset-0 flex items-center")
                      div(class="w-full border-t border-slate-600")
                    div(class="relative bg-slate-800 px-2")
                      span(class="text-gray-400 font-bold text-xs") VS

                //- Team 2 (Mobile)
                .flex.items-center.justify-between.w-full.bg-slate-750.rounded-lg.p-2
                  div(class="flex items-center gap-2 flex-1 min-w-0")
                    img(class="h-10 w-10 flex-shrink-0 object-contain"
                      :src="getTeamInfo(matchup[1].roster?.user?.display_name).logo"
                      :alt="getTeamInfo(matchup[1].roster?.user?.display_name).aiModel"
                      :class="getTeamInfo(matchup[1].roster?.user?.display_name).invertLogo ? 'invert brightness-200' : ''"
                    )
                    div(class="min-w-0 flex-1")
                      div(class="text-white font-bold text-sm truncate") {{ getTeamInfo(matchup[1].roster?.user?.display_name).aiModel }}
                      div(class="text-blue-400 text-xs font-semibold truncate") {{ getTeamInfo(matchup[1].roster?.user?.display_name).owner }}
                      div(:class="getRecordColor(getRecordThroughWeek(matchup[1].roster_id, selectedWeek - 1).wins, getRecordThroughWeek(matchup[1].roster_id, selectedWeek - 1).losses)" class="text-xs font-bold") {{ getRecordThroughWeek(matchup[1].roster_id, selectedWeek - 1).wins }}-{{ getRecordThroughWeek(matchup[1].roster_id, selectedWeek - 1).losses }}
                  div(class="flex flex-col items-end flex-shrink-0 ml-2")
                    div(
                      class="text-white font-black text-xl transition-all duration-300"
                      :class="{ 'score-pulse': isScoreAnimating(selectedWeek, matchup[1].matchup_id, matchup[1].roster_id) }"
                    ) {{ matchup[1].points?.toFixed(2) || '0.00' }}
                    div(v-if="isWeekComplete(matchup)")
                      span.text-green-400.text-xs.font-bold.uppercase(v-if="matchup[1].points > matchup[0].points") W
                      span.text-red-400.text-xs.font-bold.uppercase(v-else-if="matchup[1].points < matchup[0].points") L

              //- Desktop Layout (side by side with VS in the middle)
              div(class="hidden md:flex md:items-center md:gap-2")
                //- Team 1 (Desktop)
                div(class="flex-1 flex items-center justify-between bg-slate-750 rounded-lg p-3")
                  div(class="flex items-center gap-3")
                    img(class="h-12 w-12 object-contain"
                      :src="getTeamInfo(matchup[0].roster?.user?.display_name).logo"
                      :alt="getTeamInfo(matchup[0].roster?.user?.display_name).aiModel"
                      :class="getTeamInfo(matchup[0].roster?.user?.display_name).invertLogo ? 'invert brightness-200' : ''"
                    )
                    div
                      div(class="text-white font-bold text-lg") {{ getTeamInfo(matchup[0].roster?.user?.display_name).aiModel }}
                      div(class="text-blue-400 text-sm font-semibold") {{ getTeamInfo(matchup[0].roster?.user?.display_name).owner }}
                      div(:class="getRecordColor(getRecordThroughWeek(matchup[0].roster_id, selectedWeek - 1).wins, getRecordThroughWeek(matchup[0].roster_id, selectedWeek - 1).losses)" class="text-xs font-bold") {{ getRecordThroughWeek(matchup[0].roster_id, selectedWeek - 1).wins }}-{{ getRecordThroughWeek(matchup[0].roster_id, selectedWeek - 1).losses }}
                  div(class="text-right")
                    div(
                      class="text-white font-black text-3xl transition-all duration-300"
                      :class="{ 'score-pulse': isScoreAnimating(selectedWeek, matchup[0].matchup_id, matchup[0].roster_id) }"
                    ) {{ matchup[0].points?.toFixed(2) || '0.00' }}
                    div(v-if="isWeekComplete(matchup)" class="mt-2")
                      span(class="text-green-400 text-xs font-bold uppercase" v-if="matchup[0].points > matchup[1].points") W
                      span(class="text-red-400 text-xs font-bold uppercase" v-else-if="matchup[0].points < matchup[1].points") L

                //- VS Separator (Desktop) - No absolute positioning
                div(class="flex-shrink-0 px-2")
                  div(class="bg-slate-700 rounded-full px-3 py-1")
                    span(class="text-white font-black text-sm") VS

                //- Team 2 (Desktop)
                div(class="flex-1 flex items-center justify-between bg-slate-750 rounded-lg p-3")
                  div(class="text-left")
                    div(
                      class="text-white font-black text-3xl transition-all duration-300"
                      :class="{ 'score-pulse': isScoreAnimating(selectedWeek, matchup[1].matchup_id, matchup[1].roster_id) }"
                    ) {{ matchup[1].points?.toFixed(2) || '0.00' }}
                    div(v-if="isWeekComplete(matchup)" class="mt-2")
                      span(class="text-green-400 text-xs font-bold uppercase" v-if="matchup[1].points > matchup[0].points") W
                      span(class="text-red-400 text-xs font-bold uppercase" v-else-if="matchup[1].points < matchup[0].points") L
                  div(class="flex items-center gap-3")
                    div(class="text-right")
                      div(class="text-white font-bold text-lg") {{ getTeamInfo(matchup[1].roster?.user?.display_name).aiModel }}
                      div(class="text-blue-400 text-sm font-semibold") {{ getTeamInfo(matchup[1].roster?.user?.display_name).owner }}
                      div(:class="getRecordColor(getRecordThroughWeek(matchup[1].roster_id, selectedWeek - 1).wins, getRecordThroughWeek(matchup[1].roster_id, selectedWeek - 1).losses)" class="text-xs font-bold") {{ getRecordThroughWeek(matchup[1].roster_id, selectedWeek - 1).wins }}-{{ getRecordThroughWeek(matchup[1].roster_id, selectedWeek - 1).losses }}
                    img(
                      class="h-12 w-12 object-contain"
                      :src="getTeamInfo(matchup[1].roster?.user?.display_name).logo"
                      :alt="getTeamInfo(matchup[1].roster?.user?.display_name).aiModel"
                      :class="getTeamInfo(matchup[1].roster?.user?.display_name).invertLogo ? 'invert brightness-200' : ''"
                    )

              //- Point Margin Bar Chart
              .mt-4.pt-4.border-t.border-slate-700(v-if="(matchup[0].points || 0) !== (matchup[1].points || 0)")
                .relative.h-8.flex.items-center
                  //- Center Line
                  div(class="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-slate-600 z-0")

                  //- Bar pointing toward winner (team 0 on left)
                  div(
                    v-if="matchup[0].points > matchup[1].points"
                    class="absolute right-1/2 h-6 bg-gradient-to-l from-green-500 to-green-600 rounded-l flex items-center justify-start pl-2"
                    :style="{ width: `${Math.min(((matchup[0].points - matchup[1].points) / 70) * 45, 45)}%` }"
                  )
                    span.text-white.text-xs.font-bold {{ Math.abs((matchup[0].points || 0) - (matchup[1].points || 0)).toFixed(2) }}

                  //- Bar pointing toward winner (team 1 on right)
                  div(
                    v-else-if="matchup[1].points > matchup[0].points"
                    class="absolute left-1/2 h-6 bg-gradient-to-r from-green-500 to-green-600 rounded-r flex items-center justify-end pr-2"
                    :style="{ width: `${Math.min(((matchup[1].points - matchup[0].points) / 70) * 45, 45)}%` }"
                  )
                    span.text-white.text-xs.font-bold {{ Math.abs((matchup[0].points || 0) - (matchup[1].points || 0)).toFixed(2) }}

                  //- Tie indicator (only if week complete)
                  div(v-else class="absolute left-1/2 transform -translate-x-1/2 bg-yellow-500 rounded px-3 py-1")
                    span.text-white.text-xs.font-bold TIE

              //- View Tokens Button
              .mt-3.pt-3.border-t.border-slate-700.flex.justify-end
                router-link(
                  :to="`/matchup/${selectedWeek}/${matchup[0].matchup_id}#tokens`"
                  @click.stop
                  class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white text-xs rounded transition-colors duration-200 flex items-center gap-1.5"
                )
                  span 💬
                  |  View tokens

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
        h2(class="text-white text-xl sm:text-3xl font-black uppercase tracking-wide flex items-center gap-2 sm:gap-3")
          span.text-yellow-400 📈 
          | History

      div(class="bg-slate-900 rounded-b-lg p-3 sm:p-6 overflow-x-auto")
        div(ref="standingsChartRef" class="w-full min-w-[350px] h-[250px] sm:h-[400px]")

    //- Points
    section.mb-12
      .bg-gradient-to-r.from-cyan-600.to-cyan-800.rounded-t-lg.px-6.py-4.border-b-4.border-yellow-400
        h2(class="text-white text-xl sm:text-3xl font-black uppercase tracking-wide flex items-center gap-2 sm:gap-3")
          span.text-yellow-400 📊 
          | Total Points

      div(class="bg-slate-900 rounded-b-lg p-3 sm:p-6 overflow-x-auto")
        div(ref="pointsChartRef" class="w-full min-w-[350px] h-[300px] sm:h-[500px]")

    //- Transactions Volume by Week
    section.mb-12
      .bg-gradient-to-r.from-teal-600.to-teal-800.rounded-t-lg.px-6.py-4.border-b-4.border-yellow-400
        h2(class="text-white text-xl sm:text-3xl font-black uppercase tracking-wide flex items-center gap-2 sm:gap-3")
          span.text-yellow-400 📈
          | Transactions Volume by Week

      div(class="bg-slate-900 rounded-b-lg p-3 sm:p-6")
        div(ref="transactionsChartRef" class="w-full h-[300px] sm:h-[400px]")

    //- Transaction Volume by Model
    section.mb-12
      .bg-gradient-to-r.from-purple-600.to-purple-800.rounded-t-lg.px-6.py-4.border-b-4.border-yellow-400
        h2(class="text-white text-xl sm:text-3xl font-black uppercase tracking-wide flex items-center gap-2 sm:gap-3")
          span.text-yellow-400 🤖
          | Transaction Volume by Model

      div(class="bg-slate-900 rounded-b-lg p-3 sm:p-6")
        div(ref="modelTransactionsChartRef" class="w-full h-[300px] sm:h-[400px]")

    //- Injury Volume by Week
    section.mb-12
      .bg-gradient-to-r.from-red-600.to-red-800.rounded-t-lg.px-6.py-4.border-b-4.border-yellow-400
        h2(class="text-white text-xl sm:text-3xl font-black uppercase tracking-wide flex items-center gap-2 sm:gap-3")
          span.text-yellow-400 🚑
          | Injury Volume by Week

      div(class="bg-slate-900 rounded-b-lg p-3 sm:p-6")
        div(ref="injuriesChartRef" class="w-full h-[300px] sm:h-[400px]")

    //- Injury Volume by Model
    section.mb-12
      .bg-gradient-to-r.from-orange-600.to-orange-800.rounded-t-lg.px-6.py-4.border-b-4.border-yellow-400
        h2(class="text-white text-xl sm:text-3xl font-black uppercase tracking-wide flex items-center gap-2 sm:gap-3")
          span.text-yellow-400 🏥
          | Injury Volume by Model

      div(class="bg-slate-900 rounded-b-lg p-3 sm:p-6")
        div(ref="modelInjuriesChartRef" class="w-full h-[300px] sm:h-[400px]")

    //- Transactions
    section.mb-12
      div(class="bg-gradient-to-r from-orange-600 to-orange-800 rounded-t-lg px-4 sm:px-6 py-3 sm:py-4 border-b-4 border-yellow-400")
        h2(class="text-white text-xl sm:text-3xl font-black uppercase tracking-wide flex items-center gap-2 sm:gap-3")
          span.text-yellow-400 💼
          | Week {{ selectedWeek }} Transactions

      div(class="bg-slate-900 rounded-b-lg p-3 sm:p-6" v-if="transactions && transactions.length > 0")
        .space-y-3
          div(class="bg-slate-800 rounded-lg p-3 sm:p-4"
            v-for="(transaction, index) in transactions"
            :key="index"
          )
            //- Mobile Layout (stacked)
            div(class="flex flex-col gap-3 sm:hidden")
              //- Team Info
              div(v-if="transaction.teamInfo" class="flex items-center gap-2")
                img(class="h-10 w-10 object-contain"
                  v-if="transaction.teamInfo.logo"
                  :src="transaction.teamInfo.logo"
                  :alt="transaction.teamInfo.aiModel"
                  :class="transaction.teamInfo.invertLogo ? 'invert brightness-200' : ''"
                )
                div(class="flex-1")
                  .text-white.font-bold.text-sm {{ transaction.teamInfo.aiModel }}
                  .text-blue-400.text-xs {{ transaction.teamInfo.owner }}
                div(class="text-right")
                  div(:class="getTransactionDelta(transaction) > 0 ? 'text-green-400' : 'text-red-400'" class="text-xl font-black") {{ getTransactionDelta(transaction) > 0 ? '+' : '' }}{{ getTransactionDelta(transaction) }}
                  .text-gray-400.text-xs Δ ROS

              //- Transaction Type
              div
                .text-white.font-bold.text-sm {{ getTransactionType(transaction.type) }}
                div(v-if="transaction.counterpartyInfo" class="flex items-center gap-1 mt-1")
                  .text-gray-400.text-xs with
                  img(class="h-4 w-4 object-contain"
                    :src="transaction.counterpartyInfo.logo"
                    :alt="transaction.counterpartyInfo.aiModel"
                    :class="transaction.counterpartyInfo.invertLogo ? 'invert brightness-200' : ''"
                  )
                  .text-blue-400.text-xs.font-semibold {{ transaction.counterpartyInfo.aiModel }}

              //- Players
              div(class="grid grid-cols-1 gap-2")
                div(v-if="transaction.adds")
                  .text-green-400.text-xs.font-semibold.mb-1 Added:
                  div(v-for="playerId in Object.keys(transaction.adds)" :key="playerId" class="flex items-center gap-2 bg-slate-700 rounded p-2")
                    img(class="w-10 h-10 rounded object-cover" :src="getPlayerImageUrl(playerId)" :alt="getPlayerNameFromId(playerId)" @error="$event.target.style.display='none'")
                    div(class="flex-1 min-w-0")
                      div(class="text-gray-300 text-xs font-semibold truncate") {{ getPlayerNameFromId(playerId) }}
                      div(class="text-blue-400 text-xs") {{ getPlayerPosition(playerId) }}
                    div(class="text-gray-400 text-xs" v-if="getPlayerRankECR(playerId)") ROS: {{ getPlayerRankECR(playerId) }}

                div(v-if="transaction.drops")
                  .text-red-400.text-xs.font-semibold.mb-1 Dropped:
                  div(v-for="playerId in Object.keys(transaction.drops)" :key="playerId" class="flex items-center gap-2 bg-slate-700 rounded p-2")
                    img(class="w-10 h-10 rounded object-cover" :src="getPlayerImageUrl(playerId)" :alt="getPlayerNameFromId(playerId)" @error="$event.target.style.display='none'")
                    div(class="flex-1 min-w-0")
                      div(class="text-gray-300 text-xs font-semibold truncate") {{ getPlayerNameFromId(playerId) }}
                      div(class="text-blue-400 text-xs") {{ getPlayerPosition(playerId) }}
                    div(class="text-gray-400 text-xs" v-if="getPlayerRankECR(playerId)") ROS: {{ getPlayerRankECR(playerId) }}

              .text-gray-500.text-xs.text-right {{ formatTransactionDate(transaction.created) }}

            //- Desktop Layout (original)
            div(class="hidden sm:flex sm:items-start sm:gap-4")
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
                div
                  .text-white.font-bold {{ getTransactionType(transaction.type) }}
                  div(v-if="transaction.counterpartyInfo" class="flex items-center gap-2 mt-1")
                    .text-gray-400.text-sm with
                    img(class="h-5 w-5 object-contain"
                      :src="transaction.counterpartyInfo.logo"
                      :alt="transaction.counterpartyInfo.aiModel"
                      :class="transaction.counterpartyInfo.invertLogo ? 'invert brightness-200' : ''"
                    )
                    .text-blue-400.text-sm.font-semibold {{ transaction.counterpartyInfo.aiModel }}
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
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useLeagueStore } from '../stores/league.js'
import { getTeamInfo } from '../teamMappings.js'
import * as echarts from 'echarts'
import { trackButtonClick } from '../analytics.js'

export default {
  name: 'Home',
  setup() {
    const router = useRouter()
    const leagueStore = useLeagueStore()
    const loading = ref(true)
    const error = ref(null)
    const selectedWeek = ref(null)
    const standingsChartRef = ref(null)
    const pointsChartRef = ref(null)
    const transactionsChartRef = ref(null)
    const modelTransactionsChartRef = ref(null)
    const injuriesChartRef = ref(null)
    const modelInjuriesChartRef = ref(null)
    let standingsChart = null
    let pointsChart = null
    let transactionsChart = null
    let modelTransactionsChart = null
    let injuriesChart = null
    let modelInjuriesChart = null
    const injuriesData = ref(null)
    const lastUpdated = ref(null)
    const autoRefreshInterval = ref(null)
    const autoRefreshCheckInterval = ref(null)
    const isAutoRefreshActive = ref(false)

    // Score animation tracking
    const animatingScores = ref(new Set())
    const previousScores = ref({})

    // Computed properties from store
    const leagueData = computed(() => ({
      league: leagueStore.league,
      rosters: leagueStore.rosters,
      users: leagueStore.users
    }))

    const allMatchups = computed(() => leagueStore.allMatchups)
    const players = computed(() => leagueStore.players)
    const transactions = computed(() => leagueStore.getTransactionsForWeek(selectedWeek.value))
    const latestVideo = computed(() => leagueStore.latestVideo)
    const latestShorts = computed(() => leagueStore.latestShorts)

    // Check if current time is during NFL game hours
    const isNFLGameTime = () => {
      const now = new Date()
      const day = now.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const hours = now.getHours()
      const minutes = now.getMinutes()
      const timeInMinutes = hours * 60 + minutes

      // Convert to ET (assuming server might be in different timezone)
      // For simplicity, we'll use local time and assume user is watching in their timezone

      // Thursday Night Football (Thursday 7:00 PM - 11:30 PM ET)
      if (day === 4 && timeInMinutes >= 19 * 60 && timeInMinutes <= 23 * 60 + 30) {
        return true
      }

      // Sunday games (12:00 PM - 12:00 AM ET - covers early, late, and SNF)
      if (day === 0 && timeInMinutes >= 12 * 60 && timeInMinutes <= 24 * 60) {
        return true
      }

      // Monday Night Football (Monday 7:00 PM - 12:00 AM ET)
      if (day === 1 && timeInMinutes >= 19 * 60 && timeInMinutes <= 24 * 60) {
        return true
      }

      // Saturday games (late season, playoffs - 12:00 PM - 12:00 AM ET)
      if (day === 6 && timeInMinutes >= 12 * 60 && timeInMinutes <= 24 * 60) {
        return true
      }

      return false
    }

    // Check if we should auto-refresh (during game time and not viewing future weeks)
    const shouldAutoRefresh = () => {
      if (!leagueData.value) return false

      const currentWeek = leagueData.value.league?.settings?.leg || 1
      const viewingCurrentWeek = selectedWeek.value <= currentWeek

      return isNFLGameTime() && viewingCurrentWeek
    }

    const loadData = async () => {
      try {
        loading.value = true
        error.value = null

        // Use the store to fetch all data (with caching)
        await leagueStore.fetchAllData()

        // Check URL for week parameter, otherwise use current week
        const weekParam = router.currentRoute.value.query.week
        const urlWeek = weekParam ? parseInt(weekParam) : null
        const currentWeek = leagueStore.league?.settings?.leg || 5

        // Use URL week if valid, otherwise use current week
        if (urlWeek && urlWeek >= 1 && urlWeek <= 18) {
          selectedWeek.value = urlWeek
        } else {
          selectedWeek.value = currentWeek
        }

        // Load transactions for all weeks up to current week (for graphs)
        const transactionPromises = []
        for (let week = 1; week <= Math.min(currentWeek, 18); week++) {
          transactionPromises.push(leagueStore.fetchTransactionsForWeek(week))
        }
        await Promise.all(transactionPromises)

        // Load injury data
        try {
          const response = await fetch('/data/injuries_by_team.json')
          injuriesData.value = await response.json()
        } catch (err) {
          console.error('Failed to load injury data:', err)
        }

        // Set last updated timestamp
        lastUpdated.value = new Date()
      } catch (err) {
        error.value = 'Failed to load league data. Please try again later.'
        console.error(err)
      } finally {
        loading.value = false
      }
    }

    // Refresh matchups data without showing loading state
    const refreshMatchups = async () => {
      try {
        // Save scroll position and page height before refresh
        const savedScrollPosition = window.scrollY
        const savedHeight = document.body.scrollHeight

        // Fix the page height temporarily to prevent browser scroll adjustment
        document.body.style.minHeight = `${savedHeight}px`

        // Force refresh all data from API
        await Promise.all([
          leagueStore.fetchLeagueData(true),
          leagueStore.fetchAllMatchups(true),
          leagueStore.fetchTransactionsForWeek(selectedWeek.value, true)
        ])
        lastUpdated.value = new Date()
        console.log('Matchups refreshed at', lastUpdated.value.toLocaleTimeString())

        // Wait for Vue to update the DOM with new data
        await nextTick()

        // Re-render all charts with refreshed data
        renderStandingsChart()
        renderPointsChart()
        renderTransactionsChart()
        renderModelTransactionsChart()
        renderInjuriesChart()
        renderModelInjuriesChart()

        // Give charts time to complete rendering, then restore scroll and release height constraint
        setTimeout(() => {
          window.scrollTo({ top: savedScrollPosition, behavior: 'instant' })
          document.body.style.minHeight = ''
        }, 150)
      } catch (err) {
        console.error('Error refreshing matchups:', err)
        // Release height constraint even on error
        document.body.style.minHeight = ''
      }
    }

    // Set up auto-refresh
    const startAutoRefresh = () => {
      // Only start if we should be auto-refreshing
      if (!shouldAutoRefresh()) {
        isAutoRefreshActive.value = false
        return
      }

      isAutoRefreshActive.value = true
      // Refresh every 2 minutes (120000ms)
      autoRefreshInterval.value = setInterval(refreshMatchups, 120000)
    }

    const stopAutoRefresh = () => {
      if (autoRefreshInterval.value) {
        clearInterval(autoRefreshInterval.value)
        autoRefreshInterval.value = null
      }
      isAutoRefreshActive.value = false
    }

    // Check periodically if we should start/stop auto-refresh
    const checkAutoRefreshStatus = () => {
      const shouldRefresh = shouldAutoRefresh()

      if (shouldRefresh && !autoRefreshInterval.value) {
        // Should be refreshing but not currently - start it
        startAutoRefresh()
        console.log('Auto-refresh started - NFL game time detected')
      } else if (!shouldRefresh && autoRefreshInterval.value) {
        // Shouldn't be refreshing but currently is - stop it
        stopAutoRefresh()
        console.log('Auto-refresh stopped - outside NFL game time')
      }
    }

    const goToMatchupDetail = (matchup) => {
      if (matchup && matchup.length > 0 && matchup[0].matchup_id) {
        trackButtonClick('matchup_click', {
          week: selectedWeek.value,
          matchup_id: matchup[0].matchup_id
        })
        router.push(`/matchup/${selectedWeek.value}/${matchup[0].matchup_id}`)
      }
    }

    const handleWeekChange = (direction) => {
      // Capture current scroll position
      const currentScrollY = window.scrollY

      if (direction === 'prev' && selectedWeek.value > 1) {
        selectedWeek.value = Math.max(1, selectedWeek.value - 1)
        trackButtonClick('week_navigation', { direction: 'previous', week: selectedWeek.value })
      } else if (direction === 'next' && selectedWeek.value < 18) {
        selectedWeek.value = Math.min(18, selectedWeek.value + 1)
        trackButtonClick('week_navigation', { direction: 'next', week: selectedWeek.value })
      }

      // Restore scroll position after DOM updates
      nextTick(() => {
        window.scrollTo(0, currentScrollY)
      })
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
      const player = players.value?.[playerId]
      if (!player) return `Player ${playerId}`
      return `${player.first_name} ${player.last_name}`
    }

    const getPlayerPosition = (playerId) => {
      const player = players.value?.[playerId]
      if (!player || !player.position) return 'N/A'
      return player.position
    }

    const getPlayerImageUrl = (playerId) => {
      const player = players.value?.[playerId]
      if (!player) return `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`

      // For defenses, use team logo instead of player portrait
      if (player.position === 'DEF' && player.team) {
        return `https://sleepercdn.com/images/team_logos/nfl/${player.team.toLowerCase()}.png`
      }

      return `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`
    }

    const getPlayerRankECR = (playerId) => {
      const player = players.value?.[playerId]
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

    // Play sound effect
    const playHitSound = () => {
      try {
        const audio = new Audio('/sounds/hit.wav')
        audio.volume = 0.3 // Set volume to 30%
        audio.play().catch(err => console.error('Error playing sound:', err))
      } catch (err) {
        console.error('Error creating audio:', err)
      }
    }

    // Check if a score is currently animating
    const isScoreAnimating = (week, matchupId, rosterId) => {
      const key = `${week}-${matchupId}-${rosterId}`
      return animatingScores.value.has(key)
    }

    // Trigger score animation
    const animateScore = (week, matchupId, rosterId) => {
      const key = `${week}-${matchupId}-${rosterId}`
      animatingScores.value.add(key)

      // Remove animation after 1 second
      setTimeout(() => {
        animatingScores.value.delete(key)
      }, 1000)
    }

    // Watch for score changes in allMatchups
    watch(() => allMatchups.value, (newMatchups, oldMatchups) => {
      if (!newMatchups || !oldMatchups) return
      if (!selectedWeek.value) return

      let scoreChanged = false

      // Check current week's matchups for score changes
      const currentWeekMatchups = newMatchups[selectedWeek.value]
      const oldWeekMatchups = oldMatchups[selectedWeek.value]

      if (!currentWeekMatchups || !oldWeekMatchups) return

      currentWeekMatchups.forEach((matchup, matchupIndex) => {
        if (matchup.length !== 2) return

        const oldMatchup = oldWeekMatchups[matchupIndex]
        if (!oldMatchup || oldMatchup.length !== 2) return

        // Check each team's score
        matchup.forEach((team, teamIndex) => {
          const oldTeam = oldMatchup[teamIndex]
          const scoreKey = `${selectedWeek.value}-${team.matchup_id}-${team.roster_id}`

          // Get previous score from our tracking
          const prevScore = previousScores.value[scoreKey]
          const newScore = team.points || 0

          // If score changed and we have a previous score
          if (prevScore !== undefined && prevScore !== newScore && newScore > 0) {
            animateScore(selectedWeek.value, team.matchup_id, team.roster_id)
            scoreChanged = true
          }

          // Update previous score
          previousScores.value[scoreKey] = newScore
        })
      })

      // Play sound if any score changed
      if (scoreChanged) {
        playHitSound()
      }
    }, { deep: true })

    // Watch for week changes to reload transactions and check auto-refresh
    watch(selectedWeek, async (newWeek, oldWeek) => {
      if (newWeek) {
        // Save scroll position and page height before any changes
        const savedScrollPosition = window.scrollY
        const savedHeight = document.body.scrollHeight

        // Fix the page height temporarily to prevent browser scroll adjustment
        // when charts re-render and change the page height
        document.body.style.minHeight = `${savedHeight}px`

        // Fetch transactions for the new week
        await leagueStore.fetchTransactionsForWeek(newWeek)

        // Re-evaluate auto-refresh when week changes
        checkAutoRefreshStatus()

        // Update URL when week changes (skip initial load to avoid duplicate navigation)
        if (oldWeek !== null) {
          router.replace({ query: { week: newWeek } }).catch(() => {})
        }

        // Wait for Vue to update the DOM with new data
        await nextTick()

        // Re-render all charts with new week data
        renderStandingsChart()
        renderPointsChart()
        renderTransactionsChart()
        renderModelTransactionsChart()
        renderInjuriesChart()
        renderModelInjuriesChart()

        // Give charts time to complete rendering, then restore scroll and release height constraint
        setTimeout(() => {
          window.scrollTo({ top: savedScrollPosition, behavior: 'instant' })
          document.body.style.minHeight = ''
        }, 150)
      }
    })

    // Watch for URL changes and update selected week
    watch(() => router.currentRoute.value.query.week, (newWeekParam) => {
      if (newWeekParam) {
        const urlWeek = parseInt(newWeekParam)
        if (urlWeek >= 1 && urlWeek <= 18 && urlWeek !== selectedWeek.value) {
          selectedWeek.value = urlWeek
        }
      }
    })

    const loadVideos = async () => {
      try {
        await leagueStore.fetchYoutube()
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
      // Check if current week is complete by looking at matchup data
      const currentWeek = leagueData.value.league?.settings?.leg || 1
      const currentWeekMatchups = allMatchups.value[currentWeek]
      const isCurrentWeekComplete = currentWeekMatchups?.every(matchup =>
        matchup.every(team => team.points && team.points > 0)
      )

      // If viewing current week and it's complete, show through current week
      // If viewing current week and it's not complete, show through previous week
      // If viewing past weeks, show through that week
      const standingsWeek = selectedWeek.value < currentWeek
        ? selectedWeek.value
        : (selectedWeek.value === currentWeek && isCurrentWeekComplete)
          ? currentWeek
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
      const currentWeekMatchups = allMatchups.value[currentWeek]
      const isCurrentWeekComplete = currentWeekMatchups?.every(matchup =>
        matchup.every(team => team.points && team.points > 0)
      )

      const maxWeek = selectedWeek.value < currentWeek
        ? selectedWeek.value
        : (selectedWeek.value === currentWeek && isCurrentWeekComplete)
          ? currentWeek
          : Math.max(0, currentWeek - 1)

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
      const currentWeekMatchups = allMatchups.value[currentWeek]
      const isCurrentWeekComplete = currentWeekMatchups?.every(matchup =>
        matchup.every(team => team.points && team.points > 0)
      )

      const maxWeek = selectedWeek.value < currentWeek
        ? selectedWeek.value
        : (selectedWeek.value === currentWeek && isCurrentWeekComplete)
          ? currentWeek
          : Math.max(0, currentWeek - 1)

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

    // Render transactions volume by week line chart
    const renderTransactionsChart = async () => {
      if (!transactionsChartRef.value || !leagueData.value) return

      await nextTick()

      if (!transactionsChart) {
        transactionsChart = echarts.init(transactionsChartRef.value)
      }

      const targetWeek = selectedWeek.value || leagueData.value.league?.settings?.leg || 5

      // Fetch transactions for all weeks up to selected week
      const transactionCounts = []
      for (let week = 1; week <= Math.min(targetWeek, 18); week++) {
        const weekTransactions = leagueStore.getTransactionsForWeek(week)
        transactionCounts.push({
          week,
          count: weekTransactions.length
        })
      }

      const option = {
        backgroundColor: 'transparent',
        animation: true,
        animationDuration: 1000,
        animationEasing: 'cubicOut',
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'cross' },
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          borderColor: '#14b8a6',
          textStyle: { color: '#fff' },
          formatter: function(params) {
            const param = params[0]
            return `Week ${param.name}<br/>${param.marker}${param.value} transactions`
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: 40,
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: transactionCounts.map(d => `Week ${d.week}`),
          axisLabel: {
            color: '#9ca3af',
            rotate: 45
          },
          axisLine: { lineStyle: { color: '#475569' } }
        },
        yAxis: {
          type: 'value',
          minInterval: 1,
          axisLabel: {
            color: '#9ca3af',
            formatter: '{value}'
          },
          axisLine: { lineStyle: { color: '#475569' } },
          splitLine: { lineStyle: { color: '#334155' } }
        },
        series: [{
          type: 'line',
          data: transactionCounts.map(d => d.count),
          smooth: true,
          lineStyle: {
            width: 3,
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#14b8a6' },
              { offset: 1, color: '#0d9488' }
            ])
          },
          itemStyle: {
            color: '#14b8a6'
          },
          symbol: 'circle',
          symbolSize: 8,
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#14b8a640' },
              { offset: 1, color: '#14b8a610' }
            ])
          }
        }]
      }

      transactionsChart.setOption(option)
    }

    // Render transaction volume by model chart
    const renderModelTransactionsChart = async () => {
      if (!modelTransactionsChartRef.value || !leagueData.value) return

      await nextTick()

      if (!modelTransactionsChart) {
        modelTransactionsChart = echarts.init(modelTransactionsChartRef.value)
      }

      const targetWeek = selectedWeek.value || leagueData.value.league?.settings?.leg || 5
      const currentWeek = leagueData.value.league?.settings?.leg || 5

      // Initialize counts for all teams
      const teamWeeklyTransactions = {}
      const teamSeasonTransactions = {}

      if (leagueData.value.rosters) {
        leagueData.value.rosters.forEach(roster => {
          const teamInfo = getTeamInfo(roster.user?.display_name)
          teamWeeklyTransactions[teamInfo.aiModel] = 0
          teamSeasonTransactions[teamInfo.aiModel] = 0
        })
      }

      // Count transactions for selected week
      const weekTransactions = leagueStore.getTransactionsForWeek(targetWeek)
      weekTransactions.forEach(transaction => {
        if (transaction.roster_ids && transaction.roster_ids.length > 0) {
          transaction.roster_ids.forEach(rosterId => {
            const roster = leagueData.value.rosters?.find(r => r.roster_id === rosterId)
            if (roster) {
              const teamInfo = getTeamInfo(roster.user?.display_name)
              teamWeeklyTransactions[teamInfo.aiModel] = (teamWeeklyTransactions[teamInfo.aiModel] || 0) + 1
            }
          })
        }
      })

      // Count season total transactions (all weeks up to selected week)
      for (let week = 1; week <= Math.min(targetWeek, 18); week++) {
        const allTransactions = leagueStore.getTransactionsForWeek(week)
        allTransactions.forEach(transaction => {
          if (transaction.roster_ids && transaction.roster_ids.length > 0) {
            transaction.roster_ids.forEach(rosterId => {
              const roster = leagueData.value.rosters?.find(r => r.roster_id === rosterId)
              if (roster) {
                const teamInfo = getTeamInfo(roster.user?.display_name)
                teamSeasonTransactions[teamInfo.aiModel] = (teamSeasonTransactions[teamInfo.aiModel] || 0) + 1
              }
            })
          }
        })
      }

      // Sort teams by season total transaction count and get team info with logos
      const sortedTeamsWithInfo = Object.entries(teamSeasonTransactions)
        .sort((a, b) => b[1] - a[1])
        .map(([modelName]) => {
          // Find the roster for this model to get team info
          const roster = leagueData.value.rosters?.find(r => {
            const info = getTeamInfo(r.user?.display_name)
            return info.aiModel === modelName
          })
          if (roster) {
            return getTeamInfo(roster.user?.display_name)
          }
          return { aiModel: modelName, logo: '' }
        })

      const option = {
        backgroundColor: 'transparent',
        animation: true,
        animationDuration: 1000,
        animationEasing: 'cubicOut',
        legend: {
          data: ['Through Week ' + targetWeek, 'Week ' + targetWeek],
          textStyle: { color: '#9ca3af' },
          top: 10
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          borderColor: '#a855f7',
          textStyle: { color: '#fff' },
          formatter: function(params) {
            let result = `${params[0].name}<br/>`
            params.forEach(param => {
              result += `${param.marker}${param.seriesName}: ${param.value}<br/>`
            })
            return result
          }
        },
        grid: {
          left: 140,
          right: '10%',
          bottom: '3%',
          top: 60,
          containLabel: false
        },
        xAxis: [
          {
            type: 'value',
            name: 'Through Week ' + targetWeek,
            nameTextStyle: { color: '#14b8a6' },
            position: 'top',
            minInterval: 1,
            axisLabel: {
              color: '#9ca3af',
              formatter: '{value}'
            },
            axisLine: { lineStyle: { color: '#475569' } },
            splitLine: { lineStyle: { color: '#334155' } }
          },
          {
            type: 'value',
            name: 'Week ' + targetWeek,
            nameTextStyle: { color: '#a855f7' },
            position: 'bottom',
            minInterval: 1,
            axisLabel: {
              color: '#9ca3af',
              formatter: '{value}'
            },
            axisLine: { lineStyle: { color: '#475569' } },
            splitLine: { show: false }
          }
        ],
        yAxis: {
          type: 'category',
          data: sortedTeamsWithInfo.map(info => info.aiModel),
          axisLabel: {
            color: '#9ca3af',
            interval: 0,
            formatter: function(value, index) {
              const teamInfo = sortedTeamsWithInfo[index]
              return `{logo${index}|} {name|${value}}`
            },
            rich: sortedTeamsWithInfo.reduce((acc, info, index) => {
              acc[`logo${index}`] = {
                backgroundColor: {
                  image: info.logo
                },
                height: 20,
                width: 20
              }
              acc.name = {
                color: '#9ca3af',
                padding: [0, 0, 0, 5]
              }
              return acc
            }, {})
          },
          axisLine: { lineStyle: { color: '#475569' } },
          inverse: true
        },
        series: [
          {
            name: 'Through Week ' + targetWeek,
            type: 'bar',
            xAxisIndex: 0,
            data: sortedTeamsWithInfo.map(info => teamSeasonTransactions[info.aiModel]),
            itemStyle: {
              color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
                { offset: 0, color: '#14b8a6' },
                { offset: 1, color: '#0d9488' }
              ])
            }
          },
          {
            name: 'Week ' + targetWeek,
            type: 'bar',
            xAxisIndex: 1,
            data: sortedTeamsWithInfo.map(info => teamWeeklyTransactions[info.aiModel]),
            itemStyle: {
              color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
                { offset: 0, color: '#a855f7' },
                { offset: 1, color: '#7c3aed' }
              ])
            }
          }
        ]
      }

      modelTransactionsChart.setOption(option)
    }

    // Render injuries volume by week line chart
    const renderInjuriesChart = async () => {
      if (!injuriesChartRef.value || !leagueData.value || !injuriesData.value) return

      await nextTick()

      if (!injuriesChart) {
        injuriesChart = echarts.init(injuriesChartRef.value)
      }

      const targetWeek = selectedWeek.value || leagueData.value.league?.settings?.leg || 5

      // Count injuries for all weeks up to selected week
      const injuryCounts = []
      for (let week = 1; week <= Math.min(targetWeek, 18); week++) {
        const weekKey = `week${week}`
        const weekData = injuriesData.value[weekKey]
        if (weekData && weekData.injuries) {
          let count = 0
          Object.values(weekData.injuries).forEach(teamInjuries => {
            count += teamInjuries.length
          })
          injuryCounts.push({
            week,
            count
          })
        } else {
          injuryCounts.push({ week, count: 0 })
        }
      }

      const option = {
        backgroundColor: 'transparent',
        animation: true,
        animationDuration: 1000,
        animationEasing: 'cubicOut',
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'cross' },
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          borderColor: '#ef4444',
          textStyle: { color: '#fff' },
          formatter: function(params) {
            const param = params[0]
            return `Week ${param.name}<br/>${param.marker}${param.value} injuries`
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: 40,
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: injuryCounts.map(d => `Week ${d.week}`),
          axisLabel: {
            color: '#9ca3af',
            rotate: 45
          },
          axisLine: { lineStyle: { color: '#475569' } }
        },
        yAxis: {
          type: 'value',
          minInterval: 1,
          axisLabel: {
            color: '#9ca3af',
            formatter: '{value}'
          },
          axisLine: { lineStyle: { color: '#475569' } },
          splitLine: { lineStyle: { color: '#334155' } }
        },
        series: [{
          type: 'line',
          data: injuryCounts.map(d => d.count),
          smooth: true,
          lineStyle: {
            width: 3,
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#ef4444' },
              { offset: 1, color: '#dc2626' }
            ])
          },
          itemStyle: {
            color: '#ef4444'
          },
          symbol: 'circle',
          symbolSize: 8,
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#ef444440' },
              { offset: 1, color: '#ef444410' }
            ])
          }
        }]
      }

      injuriesChart.setOption(option)
    }

    // Render injury volume by model chart
    const renderModelInjuriesChart = async () => {
      if (!modelInjuriesChartRef.value || !leagueData.value || !injuriesData.value) return

      await nextTick()

      if (!modelInjuriesChart) {
        modelInjuriesChart = echarts.init(modelInjuriesChartRef.value)
      }

      const targetWeek = selectedWeek.value || leagueData.value.league?.settings?.leg || 5

      // Initialize counts for all teams
      const teamWeeklyInjuries = {}
      const teamSeasonInjuries = {}

      if (leagueData.value.rosters) {
        leagueData.value.rosters.forEach(roster => {
          const teamInfo = getTeamInfo(roster.user?.display_name)
          teamWeeklyInjuries[teamInfo.aiModel] = 0
          teamSeasonInjuries[teamInfo.aiModel] = 0
        })
      }

      // Count injuries for selected week
      const targetWeekKey = `week${targetWeek}`
      const targetWeekData = injuriesData.value[targetWeekKey]
      if (targetWeekData && targetWeekData.injuries) {
        Object.entries(targetWeekData.injuries).forEach(([teamName, injuries]) => {
          teamWeeklyInjuries[teamName] = injuries.length
        })
      }

      // Count season total injuries (all weeks up to selected week)
      for (let week = 1; week <= Math.min(targetWeek, 18); week++) {
        const weekKey = `week${week}`
        const weekData = injuriesData.value[weekKey]
        if (weekData && weekData.injuries) {
          Object.entries(weekData.injuries).forEach(([teamName, injuries]) => {
            teamSeasonInjuries[teamName] = (teamSeasonInjuries[teamName] || 0) + injuries.length
          })
        }
      }

      // Sort teams by season total injury count and get team info with logos
      const sortedTeamsWithInfo = Object.entries(teamSeasonInjuries)
        .sort((a, b) => b[1] - a[1])
        .map(([modelName]) => {
          // Find the roster for this model to get team info
          const roster = leagueData.value.rosters?.find(r => {
            const info = getTeamInfo(r.user?.display_name)
            return info.aiModel === modelName
          })
          if (roster) {
            return getTeamInfo(roster.user?.display_name)
          }
          return { aiModel: modelName, logo: '' }
        })

      const option = {
        backgroundColor: 'transparent',
        animation: true,
        animationDuration: 1000,
        animationEasing: 'cubicOut',
        legend: {
          data: ['Through Week ' + targetWeek, 'Week ' + targetWeek],
          textStyle: { color: '#9ca3af' },
          top: 10
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          borderColor: '#ef4444',
          textStyle: { color: '#fff' },
          formatter: function(params) {
            let result = `${params[0].name}<br/>`
            params.forEach(param => {
              result += `${param.marker}${param.seriesName}: ${param.value}<br/>`
            })
            return result
          }
        },
        grid: {
          left: 140,
          right: '10%',
          bottom: '3%',
          top: 60,
          containLabel: false
        },
        xAxis: [
          {
            type: 'value',
            name: 'Through Week ' + targetWeek,
            nameTextStyle: { color: '#f97316' },
            position: 'top',
            minInterval: 1,
            axisLabel: {
              color: '#9ca3af',
              formatter: '{value}'
            },
            axisLine: { lineStyle: { color: '#475569' } },
            splitLine: { lineStyle: { color: '#334155' } }
          },
          {
            type: 'value',
            name: 'Week ' + targetWeek,
            nameTextStyle: { color: '#ef4444' },
            position: 'bottom',
            minInterval: 1,
            axisLabel: {
              color: '#9ca3af',
              formatter: '{value}'
            },
            axisLine: { lineStyle: { color: '#475569' } },
            splitLine: { show: false }
          }
        ],
        yAxis: {
          type: 'category',
          data: sortedTeamsWithInfo.map(info => info.aiModel),
          axisLabel: {
            color: '#9ca3af',
            interval: 0,
            formatter: function(value, index) {
              const teamInfo = sortedTeamsWithInfo[index]
              return `{logo${index}|} {name|${value}}`
            },
            rich: sortedTeamsWithInfo.reduce((acc, info, index) => {
              acc[`logo${index}`] = {
                backgroundColor: {
                  image: info.logo
                },
                height: 20,
                width: 20
              }
              acc.name = {
                color: '#9ca3af',
                padding: [0, 0, 0, 5]
              }
              return acc
            }, {})
          },
          axisLine: { lineStyle: { color: '#475569' } },
          inverse: true
        },
        series: [
          {
            name: 'Through Week ' + targetWeek,
            type: 'bar',
            xAxisIndex: 0,
            data: sortedTeamsWithInfo.map(info => teamSeasonInjuries[info.aiModel]),
            itemStyle: {
              color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
                { offset: 0, color: '#f97316' },
                { offset: 1, color: '#ea580c' }
              ])
            }
          },
          {
            name: 'Week ' + targetWeek,
            type: 'bar',
            xAxisIndex: 1,
            data: sortedTeamsWithInfo.map(info => teamWeeklyInjuries[info.aiModel]),
            itemStyle: {
              color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
                { offset: 0, color: '#ef4444' },
                { offset: 1, color: '#dc2626' }
              ])
            }
          }
        ]
      }

      modelInjuriesChart.setOption(option)
    }


    // Handle window resize for responsive charts
    const handleResize = () => {
      if (standingsChart) {
        standingsChart.resize()
      }
      if (pointsChart) {
        pointsChart.resize()
      }
      if (transactionsChart) {
        transactionsChart.resize()
      }
      if (modelTransactionsChart) {
        modelTransactionsChart.resize()
      }
      if (injuriesChart) {
        injuriesChart.resize()
      }
      if (modelInjuriesChart) {
        modelInjuriesChart.resize()
      }
    }

    onMounted(() => {
      loadData().then(() => {
        renderStandingsChart()
        renderPointsChart()
        renderTransactionsChart()
        renderModelTransactionsChart()
        renderInjuriesChart()
        renderModelInjuriesChart()
        // Check if we should start auto-refresh
        checkAutoRefreshStatus()
        // Check every minute if we should start/stop auto-refresh
        autoRefreshCheckInterval.value = setInterval(checkAutoRefreshStatus, 60000)
      })
      loadVideos()

      // Add resize listener
      window.addEventListener('resize', handleResize)
    })

    // Clean up on unmount
    onUnmounted(() => {
      stopAutoRefresh()
      if (autoRefreshCheckInterval.value) {
        clearInterval(autoRefreshCheckInterval.value)
      }
      window.removeEventListener('resize', handleResize)
      if (standingsChart) {
        standingsChart.dispose()
      }
      if (pointsChart) {
        pointsChart.dispose()
      }
      if (transactionsChart) {
        transactionsChart.dispose()
      }
      if (modelTransactionsChart) {
        modelTransactionsChart.dispose()
      }
      if (injuriesChart) {
        injuriesChart.dispose()
      }
      if (modelInjuriesChart) {
        modelInjuriesChart.dispose()
      }
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
      lastUpdated,
      isAutoRefreshActive,
      getTeamInfo,
      goToMatchupDetail,
      handleWeekChange,
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
      pointsChartRef,
      transactionsChartRef,
      modelTransactionsChartRef,
      injuriesChartRef,
      modelInjuriesChartRef,
      refreshMatchups,
      isScoreAnimating
    }
  }
}
</script>

<style scoped>
@keyframes scorePulse {
  0% {
    transform: scale(1);
    color: rgb(255, 255, 255);
  }
  25% {
    transform: scale(1.2);
    color: rgb(34, 197, 94);
    text-shadow: 0 0 20px rgba(34, 197, 94, 0.8);
  }
  50% {
    transform: scale(1.1);
    color: rgb(34, 197, 94);
    text-shadow: 0 0 15px rgba(34, 197, 94, 0.6);
  }
  75% {
    transform: scale(1.05);
    color: rgb(34, 197, 94);
    text-shadow: 0 0 10px rgba(34, 197, 94, 0.4);
  }
  100% {
    transform: scale(1);
    color: rgb(255, 255, 255);
    text-shadow: none;
  }
}

.score-pulse {
  animation: scorePulse 1s ease-out;
}
</style>
