<template lang="pug">
div(class="bg-[var(--color-background)]")
  //- Main Content - App.vue ensures data is ready before rendering this component
  main.container.mx-auto.px-4.py-6.max-w-7xl
    //- Week Selector (Fixed)
    div(class="fixed top-24 left-0 right-0 z-30 bg-[var(--color-background)] pb-4 pt-4 lg:pb-2 lg:pt-2 border-b border-[var(--color-primary)]")
      .container.mx-auto.px-4.max-w-7xl
        div(class="flex items-center justify-center gap-3 mb-3 lg:mb-2")
          button(class="px-4 py-2 bg-[var(--color-surface)] hover:bg-[var(--color-primary)] hover:text-black border border-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--color-primary)] font-bold transition-all duration-200"
            @click="handleWeekChange('prev')"
            :disabled="selectedWeek === 1"
          ) < PREV
          div(class="relative")
            select(class="px-4 py-2 bg-[var(--color-surface)] text-[var(--color-primary)] font-bold text-xl border border-[var(--color-primary)] focus:outline-none focus:bg-[var(--color-primary)] focus:text-black transition-colors uppercase font-mono"
              v-model="selectedWeek"
            )
              option(v-for="week in 18" :key="week" :value="week") Week {{ week }}
          button(class="px-4 py-2 bg-[var(--color-surface)] hover:bg-[var(--color-primary)] hover:text-black border border-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--color-primary)] font-bold transition-all duration-200"
            @click="handleWeekChange('next')"
            :disabled="selectedWeek === 18"
          ) NEXT >

        //- Season Progress Bar
        .max-w-2xl.mx-auto
          .flex.items-center.justify-between.text-xs.text-gray-400.mb-1
            span Week {{ selectedWeek }} of 18
            span {{ Math.round((selectedWeek / 18) * 100) }}% Complete
          div(class="w-full bg-[var(--color-surface)] border border-[var(--color-primary)] h-2 overflow-hidden")
            div(class="bg-[var(--color-primary)] h-full transition-all duration-500"
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

    //- Spacer for fixed nav (consistent height to prevent scroll jumps)
    div(class="h-[156px] lg:h-[136px]")

    //- Week Matchups
    .mb-12
      //- Week Header
      div(class="bg-[var(--color-surface)] border-t border-x border-[var(--color-primary)] px-6 py-4")
        h2(class="text-[var(--color-primary)] text-3xl font-bold uppercase tracking-widest flex items-center gap-3")
          span(class="text-[var(--color-secondary)]") >
          | Week {{ selectedWeek }}

      //- Matchups Grid
      div(class="bg-black border-b border-x border-[var(--color-primary)] p-6 lg:p-4" v-if="allMatchups[selectedWeek]")
        div(class="grid grid-cols-1 gap-4 lg:gap-3")
          div(
            v-for="(matchup, index) in allMatchups[selectedWeek]"
            :key="index"
            @click="goToMatchupDetail(matchup)"
            class="bg-[var(--color-surface)] overflow-hidden hover:bg-[var(--color-background)] transition-all duration-200 cursor-pointer border border-[var(--color-primary)] terminal-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
            :class="{ 'matchup-highlight': matchup.length === 2 && isMatchupAnimating(selectedWeek, matchup[0].matchup_id) }"
          )
            div(class="p-4 lg:p-3" v-if="matchup.length === 2")
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
                      div(class="flex items-center gap-1 flex-wrap")
                        div(:class="getRecordColor(getRecordThroughWeek(matchup[0].roster_id, selectedWeek - 1).wins, getRecordThroughWeek(matchup[0].roster_id, selectedWeek - 1).losses)" class="text-xs font-bold") {{ getRecordThroughWeek(matchup[0].roster_id, selectedWeek - 1).wins }}-{{ getRecordThroughWeek(matchup[0].roster_id, selectedWeek - 1).losses }}
                        div(
                          v-for="badge in getTeamBadges(matchup[0])"
                          :key="badge.type"
                          :class="[badge.color, badge.color === 'bg-yellow-500' ? 'text-black' : 'text-white']"
                          class="px-1.5 py-0.5 rounded text-[10px] font-bold"
                        ) {{ badge.label }}
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
                      div(class="flex items-center gap-1 flex-wrap")
                        div(:class="getRecordColor(getRecordThroughWeek(matchup[1].roster_id, selectedWeek - 1).wins, getRecordThroughWeek(matchup[1].roster_id, selectedWeek - 1).losses)" class="text-xs font-bold") {{ getRecordThroughWeek(matchup[1].roster_id, selectedWeek - 1).wins }}-{{ getRecordThroughWeek(matchup[1].roster_id, selectedWeek - 1).losses }}
                        div(
                          v-for="badge in getTeamBadges(matchup[1])"
                          :key="badge.type"
                          :class="[badge.color, badge.color === 'bg-yellow-500' ? 'text-black' : 'text-white']"
                          class="px-1.5 py-0.5 rounded text-[10px] font-bold"
                        ) {{ badge.label }}
                  div(class="flex flex-col items-end flex-shrink-0 ml-2")
                    div(
                      class="text-white font-black text-xl transition-all duration-300"
                      :class="{ 'score-pulse': isScoreAnimating(selectedWeek, matchup[1].matchup_id, matchup[1].roster_id) }"
                    ) {{ matchup[1].points?.toFixed(2) || '0.00' }}
                    div(v-if="isWeekComplete(matchup)")
                      span.text-green-400.text-xs.font-bold.uppercase(v-if="matchup[1].points > matchup[0].points") W
                      span.text-red-400.text-xs.font-bold.uppercase(v-else-if="matchup[1].points < matchup[0].points") L

              //- Desktop Layout (single horizontal line on lg screens, 2-row grid on lg)
              div(class="hidden md:flex md:flex-col md:gap-2 lg:grid lg:grid-cols-[48px_minmax(200px,1fr)_auto_auto_auto_minmax(200px,1fr)_48px] lg:grid-rows-[auto_auto] lg:gap-x-4 lg:gap-y-3 lg:py-4 lg:px-6")
                //- Team 1 Logo (hidden on md, shown on lg in grid)
                img(class="hidden lg:block h-12 w-12 object-contain"
                  :src="getTeamInfo(matchup[0].roster?.user?.display_name).logo"
                  :alt="getTeamInfo(matchup[0].roster?.user?.display_name).aiModel"
                  :class="getTeamInfo(matchup[0].roster?.user?.display_name).invertLogo ? 'invert brightness-200' : ''"
                )

                //- Team 1 Info (full width on md, grid column on lg)
                div(class="flex items-center gap-3 md:bg-slate-750 md:rounded-lg md:p-3 lg:bg-transparent lg:p-0 lg:min-w-0")
                  img(class="h-12 w-12 lg:hidden object-contain flex-shrink-0"
                    :src="getTeamInfo(matchup[0].roster?.user?.display_name).logo"
                    :alt="getTeamInfo(matchup[0].roster?.user?.display_name).aiModel"
                    :class="getTeamInfo(matchup[0].roster?.user?.display_name).invertLogo ? 'invert brightness-200' : ''"
                  )
                  div(class="flex-1 min-w-0")
                    div(class="text-white font-bold text-base") {{ getTeamInfo(matchup[0].roster?.user?.display_name).aiModel }}
                    div(class="flex items-center gap-2 text-xs")
                      span(class="text-blue-400 font-semibold") {{ getTeamInfo(matchup[0].roster?.user?.display_name).owner }}
                      span(:class="getRecordColor(getRecordThroughWeek(matchup[0].roster_id, selectedWeek - 1).wins, getRecordThroughWeek(matchup[0].roster_id, selectedWeek - 1).losses)" class="font-bold") {{ getRecordThroughWeek(matchup[0].roster_id, selectedWeek - 1).wins }}-{{ getRecordThroughWeek(matchup[0].roster_id, selectedWeek - 1).losses }}
                      span(
                        v-for="badge in getTeamBadges(matchup[0])"
                        :key="badge.type"
                        :class="[badge.color, badge.color === 'bg-yellow-500' ? 'text-black' : 'text-white']"
                        class="px-1.5 py-0.5 rounded font-bold"
                      ) {{ badge.label }}
                  div(class="lg:hidden flex items-center gap-1")
                    div(class="text-white font-black text-2xl") {{ matchup[0].points?.toFixed(2) || '0.00' }}
                    span(v-if="isWeekComplete(matchup) && matchup[0].points > matchup[1].points" class="text-green-400 text-sm font-bold") W
                    span(v-else-if="isWeekComplete(matchup) && matchup[0].points < matchup[1].points" class="text-red-400 text-sm font-bold") L

                //- Team 1 Score (lg grid column only)
                div(class="hidden lg:flex items-center gap-2")
                  div(class="text-white font-black text-2xl whitespace-nowrap") {{ matchup[0].points?.toFixed(2) || '0.00' }}
                  span(v-if="isWeekComplete(matchup) && matchup[0].points > matchup[1].points" class="text-green-400 text-sm font-bold") W
                  span(v-else-if="isWeekComplete(matchup) && matchup[0].points < matchup[1].points" class="text-red-400 text-sm font-bold") L

                //- VS Separator (lg grid column only)
                div(class="hidden lg:flex flex-col items-center justify-center gap-2")
                  div(class="bg-slate-700 rounded px-3 py-1")
                    span(class="text-white font-black text-sm") VS

                //- Team 2 Score (lg grid column only)
                div(class="hidden lg:flex items-center gap-2")
                  span(v-if="isWeekComplete(matchup) && matchup[1].points > matchup[0].points" class="text-green-400 text-sm font-bold") W
                  span(v-else-if="isWeekComplete(matchup) && matchup[1].points < matchup[0].points" class="text-red-400 text-sm font-bold") L
                  div(class="text-white font-black text-2xl whitespace-nowrap") {{ matchup[1].points?.toFixed(2) || '0.00' }}

                //- Team 2 Info (full width on md, grid column on lg)
                div(class="flex items-center gap-3 md:bg-slate-750 md:rounded-lg md:p-3 lg:bg-transparent lg:p-0 lg:min-w-0")
                  div(class="lg:hidden flex items-center gap-1 order-first")
                    span(v-if="isWeekComplete(matchup) && matchup[1].points > matchup[0].points" class="text-green-400 text-sm font-bold") W
                    span(v-else-if="isWeekComplete(matchup) && matchup[1].points < matchup[0].points" class="text-red-400 text-sm font-bold") L
                    div(class="text-white font-black text-2xl") {{ matchup[1].points?.toFixed(2) || '0.00' }}
                  div(class="flex-1 min-w-0 lg:text-right")
                    div(class="text-white font-bold text-base") {{ getTeamInfo(matchup[1].roster?.user?.display_name).aiModel }}
                    div(class="flex items-center gap-2 text-xs lg:justify-end")
                      span(class="text-blue-400 font-semibold") {{ getTeamInfo(matchup[1].roster?.user?.display_name).owner }}
                      span(:class="getRecordColor(getRecordThroughWeek(matchup[1].roster_id, selectedWeek - 1).wins, getRecordThroughWeek(matchup[1].roster_id, selectedWeek - 1).losses)" class="font-bold") {{ getRecordThroughWeek(matchup[1].roster_id, selectedWeek - 1).wins }}-{{ getRecordThroughWeek(matchup[1].roster_id, selectedWeek - 1).losses }}
                      span(
                        v-for="badge in getTeamBadges(matchup[1])"
                        :key="badge.type"
                        :class="[badge.color, badge.color === 'bg-yellow-500' ? 'text-black' : 'text-white']"
                        class="px-1.5 py-0.5 rounded font-bold"
                      ) {{ badge.label }}
                  img(class="h-12 w-12 lg:hidden object-contain flex-shrink-0"
                    :src="getTeamInfo(matchup[1].roster?.user?.display_name).logo"
                    :alt="getTeamInfo(matchup[1].roster?.user?.display_name).aiModel"
                    :class="getTeamInfo(matchup[1].roster?.user?.display_name).invertLogo ? 'invert brightness-200' : ''"
                  )

                //- Team 2 Logo (hidden on md, shown on lg in grid)
                img(class="hidden lg:block h-12 w-12 object-contain"
                  :src="getTeamInfo(matchup[1].roster?.user?.display_name).logo"
                  :alt="getTeamInfo(matchup[1].roster?.user?.display_name).aiModel"
                  :class="getTeamInfo(matchup[1].roster?.user?.display_name).invertLogo ? 'invert brightness-200' : ''"
                )

                //- Point Differential Bar (Row 2 - spans columns 2-6 on lg)
                div(v-if="(selectedWeek === leagueStore.currentWeek || isWeekComplete(matchup)) && (matchup[0].points || 0) !== (matchup[1].points || 0)" class="hidden lg:block lg:col-start-2 lg:col-end-7")
                  div(class="relative h-8 flex items-center bg-slate-800/50 rounded-lg px-4")
                    //- Center Line
                    div(class="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-slate-600 z-0")

                    //- Bar pointing toward winner (team 0 on left)
                    div(
                      v-if="matchup[0].points > matchup[1].points"
                      class="absolute right-1/2 h-6 bg-gradient-to-l from-cyan-500 to-cyan-600 rounded-l flex items-center justify-start pl-3"
                      :style="{ width: `${Math.min(((matchup[0].points - matchup[1].points) / 70) * 48, 48)}%` }"
                    )
                      span(class="text-white text-sm font-bold") +{{ Math.abs((matchup[0].points || 0) - (matchup[1].points || 0)).toFixed(1) }}

                    //- Bar pointing toward winner (team 1 on right)
                    div(
                      v-else-if="matchup[1].points > matchup[0].points"
                      class="absolute left-1/2 h-6 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-r flex items-center justify-end pr-3"
                      :style="{ width: `${Math.min(((matchup[1].points - matchup[0].points) / 70) * 48, 48)}%` }"
                    )
                      span(class="text-white text-sm font-bold") +{{ Math.abs((matchup[0].points || 0) - (matchup[1].points || 0)).toFixed(1) }}

              //- Point Differential Bar (shown on md only, hidden on lg)
              div(v-if="(selectedWeek === leagueStore.currentWeek || isWeekComplete(matchup)) && (matchup[0].points || 0) !== (matchup[1].points || 0)" class="mt-3 pt-3 border-t border-slate-700 lg:hidden")
                div(class="relative h-6 flex items-center")
                  //- Center Line
                  div(class="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-slate-600 z-0")

                  //- Bar pointing toward winner (team 0 on left)
                  div(
                    v-if="matchup[0].points > matchup[1].points"
                    class="absolute right-1/2 h-5 bg-gradient-to-l from-cyan-500 to-cyan-600 rounded-l flex items-center justify-start pl-2"
                    :style="{ width: `${Math.min(((matchup[0].points - matchup[1].points) / 70) * 45, 45)}%` }"
                  )
                    span(class="text-white text-xs font-bold") {{ Math.abs((matchup[0].points || 0) - (matchup[1].points || 0)).toFixed(2) }}

                  //- Bar pointing toward winner (team 1 on right)
                  div(
                    v-else-if="matchup[1].points > matchup[0].points"
                    class="absolute left-1/2 h-5 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-r flex items-center justify-end pr-2"
                    :style="{ width: `${Math.min(((matchup[1].points - matchup[0].points) / 70) * 45, 45)}%` }"
                  )
                    span(class="text-white text-xs font-bold") {{ Math.abs((matchup[0].points || 0) - (matchup[1].points || 0)).toFixed(2) }}

              //- Win Probability (only for current week)
              WinProbabilityBar(
                v-if="matchupWinProbabilities[matchup[0].matchup_id] && selectedWeek === leagueStore.currentWeek"
                :winProb="matchupWinProbabilities[matchup[0].matchup_id]"
                :showDetails="false"
              )

              //- Universal Matchup Actions Footer
              div(class="mt-3 pt-3 border-t border-slate-700 flex justify-center bg-slate-900/30 -mx-4 -mb-4 lg:-mx-3 lg:-mb-3 py-2 relative z-20")
                button(
                  @click.stop="goToMatchupTokens(matchup)"
                  class="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800 hover:bg-[var(--color-primary)] text-[var(--color-primary)] hover:text-black transition-all duration-200 border border-[var(--color-primary)] group relative z-30"
                )
                  span(class="text-lg") 🎟️
                  span(class="text-xs font-bold uppercase tracking-wider") View Tokens

      //- No Matchups
      .bg-slate-900.rounded-b-lg.p-8.text-center(v-else)
        p.text-gray-500.text-lg No matchups available for Week {{ selectedWeek }}

    //- Video
    section.mb-12(v-if="latestVideo || latestShorts.length > 0 || loadingVideos")
      div(class="bg-[var(--color-surface)] border-t border-x border-[var(--color-primary)] px-6 py-4")
        h2(class="text-[var(--color-primary)] text-3xl font-bold uppercase tracking-widest flex items-center gap-3")
          span(class="text-[var(--color-secondary)]") >
          | Videos

      div(class="bg-black border-b border-x border-[var(--color-primary)] p-4 relative")
        //- Loading Spinner
        div(v-if="loadingVideos" class="flex items-center justify-center py-12")
          .text-center
            .inline-block.animate-spin.rounded-full.h-12.w-12.border-4.border-red-500.border-t-transparent.mb-2
            p.text-gray-400.text-sm Loading videos...

        div(v-else class="flex flex-col md:flex-row gap-4 md:gap-6")
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
      div(class="bg-[var(--color-surface)] border-t border-x border-[var(--color-primary)] px-6 py-4")
        h2(class="text-[var(--color-primary)] text-3xl font-bold uppercase tracking-widest flex items-center gap-3")
          span(class="text-[var(--color-secondary)]") >
          | Standings

      div(class="bg-black border-b border-x border-[var(--color-primary)] overflow-x-auto relative")
        //- Loading Spinner
        div(v-if="loadingStandings" class="absolute inset-0 flex items-center justify-center bg-slate-900/90 z-10")
          .text-center
            .inline-block.animate-spin.rounded-full.h-12.w-12.border-4.border-purple-500.border-t-transparent.mb-2
            p.text-gray-400.text-sm Loading standings...

        table.w-full.min-w-max
          thead(class="bg-[var(--color-surface)] sticky top-0 border-b border-[var(--color-primary)]")
            tr(class="text-left text-[var(--color-primary)] uppercase text-xs font-bold tracking-wider")
              th(class="px-3 sm:px-6 py-4 border-r border-[var(--color-primary)] last:border-r-0") Rank
              th(class="px-3 sm:px-6 py-4 border-r border-[var(--color-primary)] last:border-r-0") Team
              th(class="px-3 sm:px-6 py-4 text-center border-r border-[var(--color-primary)] last:border-r-0") Record
              th(class="px-3 sm:px-6 py-4 text-right") Points
          tbody.divide-y.divide-slate-800
            tr(
              v-for="(roster, index) in leagueStore.currentStandings"
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
                div(:class="getRecordColor(roster.currentRecord.wins, roster.currentRecord.losses)" class="font-bold text-sm sm:text-lg") {{ roster.currentRecord.wins }}-{{ roster.currentRecord.losses }}
              td(class="px-3 sm:px-6 py-4 text-right")
                div(class="text-white font-black text-base sm:text-xl") {{ roster.currentPoints.toFixed(2) }}

    //- Playoff Picture
    section.mb-12(v-if="leagueStore.playoffPicture.seeds.length > 0")
      div(class="bg-[var(--color-surface)] border-t border-x border-[var(--color-primary)] px-6 py-4")
        h2(class="text-[var(--color-primary)] text-3xl font-bold uppercase tracking-widest flex items-center gap-3")
          span(class="text-[var(--color-secondary)]") >
          | Playoff Picture

      div(class="bg-black border-b border-x border-[var(--color-primary)] p-6")
        div(class="grid grid-cols-1 lg:grid-cols-3 gap-8")
          
          //- Column 1: Quarterfinals (Round 1)
          div
            h3(class="text-white text-lg font-bold mb-4 flex items-center gap-2 uppercase tracking-wider text-gray-400")
              span Quarterfinals
            
            div(class="space-y-6")
              //- Matchup: #4 vs #5
              div(class="relative")
                div(class="absolute -right-4 top-1/2 w-4 h-px bg-slate-700 hidden lg:block")
                div(class="bg-slate-900/50 border border-slate-800 rounded overflow-hidden")
                  //- Team 4
                  div(class="p-3 flex items-center gap-3 border-b border-slate-800/50")
                    div(class="text-gray-500 font-bold text-sm w-4") #4
                    img(
                      class="h-6 w-6 object-contain"
                      :src="getTeamInfo(leagueStore.playoffPicture.seeds[3]?.user?.display_name).logo"
                      :class="getTeamInfo(leagueStore.playoffPicture.seeds[3]?.user?.display_name).invertLogo ? 'invert brightness-200' : ''"
                    )
                    div(class="text-sm font-bold text-white truncate") {{ getTeamInfo(leagueStore.playoffPicture.seeds[3]?.user?.display_name).aiModel }}
                    div(class="ml-auto text-xs text-gray-400") {{ leagueStore.playoffPicture.seeds[3]?.currentRecord.wins }}-{{ leagueStore.playoffPicture.seeds[3]?.currentRecord.losses }}

                  //- Team 5
                  div(class="p-3 flex items-center gap-3")
                    div(class="text-gray-500 font-bold text-sm w-4") #5
                    img(
                      class="h-6 w-6 object-contain"
                      :src="getTeamInfo(leagueStore.playoffPicture.seeds[4]?.user?.display_name).logo"
                      :class="getTeamInfo(leagueStore.playoffPicture.seeds[4]?.user?.display_name).invertLogo ? 'invert brightness-200' : ''"
                    )
                    div(class="text-sm font-bold text-white truncate") {{ getTeamInfo(leagueStore.playoffPicture.seeds[4]?.user?.display_name).aiModel }}
                    div(class="ml-auto text-xs text-gray-400") {{ leagueStore.playoffPicture.seeds[4]?.currentRecord.wins }}-{{ leagueStore.playoffPicture.seeds[4]?.currentRecord.losses }}

              //- Matchup: #3 vs #6
              div(class="relative")
                div(class="absolute -right-4 top-1/2 w-4 h-px bg-slate-700 hidden lg:block")
                div(class="bg-slate-900/50 border border-slate-800 rounded overflow-hidden")
                  //- Team 3
                  div(class="p-3 flex items-center gap-3 border-b border-slate-800/50")
                    div(class="text-gray-500 font-bold text-sm w-4") #3
                    img(
                      class="h-6 w-6 object-contain"
                      :src="getTeamInfo(leagueStore.playoffPicture.seeds[2]?.user?.display_name).logo"
                      :class="getTeamInfo(leagueStore.playoffPicture.seeds[2]?.user?.display_name).invertLogo ? 'invert brightness-200' : ''"
                    )
                    div(class="text-sm font-bold text-white truncate") {{ getTeamInfo(leagueStore.playoffPicture.seeds[2]?.user?.display_name).aiModel }}
                    div(class="ml-auto text-xs text-gray-400") {{ leagueStore.playoffPicture.seeds[2]?.currentRecord.wins }}-{{ leagueStore.playoffPicture.seeds[2]?.currentRecord.losses }}

                  //- Team 6
                  div(class="p-3 flex items-center gap-3")
                    div(class="text-gray-500 font-bold text-sm w-4") #6
                    img(
                      class="h-6 w-6 object-contain"
                      :src="getTeamInfo(leagueStore.playoffPicture.seeds[5]?.user?.display_name).logo"
                      :class="getTeamInfo(leagueStore.playoffPicture.seeds[5]?.user?.display_name).invertLogo ? 'invert brightness-200' : ''"
                    )
                    div(class="text-sm font-bold text-white truncate") {{ getTeamInfo(leagueStore.playoffPicture.seeds[5]?.user?.display_name).aiModel }}
                    div(class="ml-auto text-xs text-gray-400") {{ leagueStore.playoffPicture.seeds[5]?.currentRecord.wins }}-{{ leagueStore.playoffPicture.seeds[5]?.currentRecord.losses }}

          //- Column 2: Semifinals (Byes)
          div
            h3(class="text-white text-lg font-bold mb-4 flex items-center gap-2 uppercase tracking-wider text-gray-400")
              span Semifinals
            
            div(class="space-y-6")
              //- Seed 1 (Bye)
              div(class="relative h-[106px] flex items-center")
                div(class="absolute -left-4 top-1/2 w-4 h-px bg-slate-700 hidden lg:block")
                div(class="w-full bg-slate-900/80 border border-yellow-500/30 rounded p-4 relative overflow-hidden")
                  div(class="absolute top-0 right-0 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-[10px] font-bold uppercase") Bye
                  div(class="flex items-center gap-4")
                    div(class="text-yellow-500 font-black text-lg w-6") #1
                    img(
                      class="h-10 w-10 object-contain"
                      :src="getTeamInfo(leagueStore.playoffPicture.seeds[0]?.user?.display_name).logo"
                      :class="getTeamInfo(leagueStore.playoffPicture.seeds[0]?.user?.display_name).invertLogo ? 'invert brightness-200' : ''"
                    )
                    div
                      div(class="text-white font-bold text-lg") {{ getTeamInfo(leagueStore.playoffPicture.seeds[0]?.user?.display_name).aiModel }}
                      div(class="text-gray-400 text-xs") Awaiting Winner of 4 vs 5

              //- Seed 2 (Bye)
              div(class="relative h-[106px] flex items-center")
                div(class="absolute -left-4 top-1/2 w-4 h-px bg-slate-700 hidden lg:block")
                div(class="w-full bg-slate-900/80 border border-yellow-500/30 rounded p-4 relative overflow-hidden")
                  div(class="absolute top-0 right-0 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-[10px] font-bold uppercase") Bye
                  div(class="flex items-center gap-4")
                    div(class="text-yellow-500 font-black text-lg w-6") #2
                    img(
                      class="h-10 w-10 object-contain"
                      :src="getTeamInfo(leagueStore.playoffPicture.seeds[1]?.user?.display_name).logo"
                      :class="getTeamInfo(leagueStore.playoffPicture.seeds[1]?.user?.display_name).invertLogo ? 'invert brightness-200' : ''"
                    )
                    div
                      div(class="text-white font-bold text-lg") {{ getTeamInfo(leagueStore.playoffPicture.seeds[1]?.user?.display_name).aiModel }}
                      div(class="text-gray-400 text-xs") Awaiting Winner of 3 vs 6

          //- Column 3: In the Hunt
          div(class="lg:border-l lg:border-slate-800 lg:pl-8")
            h3(class="text-white text-lg font-bold mb-4 flex items-center gap-2 uppercase tracking-wider text-gray-400")
              span In the Hunt
            
            div(class="space-y-2")
              div(
                v-for="(team, index) in leagueStore.playoffPicture.hunt" 
                :key="team.roster_id"
                class="flex items-center gap-3 bg-slate-900/30 p-3 rounded border border-slate-800/50 hover:border-slate-700 transition-colors opacity-75 hover:opacity-100"
              )
                div(class="w-6 h-6 flex items-center justify-center font-bold text-gray-600 text-sm") {{ leagueStore.playoffPicture.seeds.length + index + 1 }}
                
                img(
                  class="h-8 w-8 object-contain grayscale"
                  :src="getTeamInfo(team.user?.display_name).logo"
                  :class="getTeamInfo(team.user?.display_name).invertLogo ? 'invert brightness-200' : ''"
                )
                
                div(class="flex-1")
                  div(class="text-gray-300 font-bold text-sm") {{ getTeamInfo(team.user?.display_name).aiModel }}
                  div(class="text-gray-500 text-xs") {{ team.currentRecord.wins }}-{{ team.currentRecord.losses }} | {{ team.currentPoints.toFixed(2) }} pts

    //- History
    section.mb-12(v-show="leagueData && allMatchups && Object.keys(allMatchups).length > 0")
      div(class="bg-[var(--color-surface)] border-t border-x border-[var(--color-primary)] px-6 py-4")
        h2(class="text-[var(--color-primary)] text-xl sm:text-3xl font-bold uppercase tracking-widest flex items-center gap-2 sm:gap-3")
          span(class="text-[var(--color-secondary)]") >
          | History

      div(class="bg-black border-b.border-x.border-[var(--color-primary)] p-3 sm:p-6 overflow-x-auto relative")
        div(ref="standingsChartRef" class="w-full min-w-[350px] h-[250px] sm:h-[400px]")

    //- Points
    section.mb-12(v-show="leagueData && allMatchups && Object.keys(allMatchups).length > 0")
      div(class="bg-[var(--color-surface)] border-t border-x border-[var(--color-primary)] px-6 py-4")
        h2(class="text-[var(--color-primary)] text-xl sm:text-3xl font-bold uppercase tracking-widest flex items-center gap-2 sm:gap-3")
          span(class="text-[var(--color-secondary)]") >
          | Total Points

      div(class="bg-black border-b.border-x.border-[var(--color-primary)] p-3 sm:p-6 overflow-x-auto relative")
        div(ref="pointsChartRef" class="w-full min-w-[350px] h-[300px] sm:h-[500px]")

    //- Transactions Volume by Week
    section.mb-12(v-show="transactionStats && Object.keys(transactionStats.byWeek || {}).length > 0")
      div(class="bg-[var(--color-surface)] border-t border-x border-[var(--color-primary)] px-6 py-4")
        h2(class="text-[var(--color-primary)] text-xl sm:text-3xl font-bold uppercase tracking-widest flex items-center gap-2 sm:gap-3")
          span(class="text-[var(--color-secondary)]") >
          | Transactions Volume by Week

      div(class="bg-black border-b border-x border-[var(--color-primary)] p-3 sm:p-6 relative")
        div(ref="transactionsChartRef" class="w-full h-[300px] sm:h-[400px]")

    //- Transaction Volume by Model
    section.mb-12(v-show="transactionStats && Object.keys(transactionStats.byWeek || {}).length > 0")
      div(class="bg-[var(--color-surface)] border-t border-x border-[var(--color-primary)] px-6 py-4")
        h2(class="text-[var(--color-primary)] text-xl sm:text-3xl font-bold uppercase tracking-widest flex items-center gap-2 sm:gap-3")
          span(class="text-[var(--color-secondary)]") >
          | Transaction Volume by Model

      div(class="bg-black border-b border-x border-[var(--color-primary)] p-3 sm:p-6 relative")
        div(ref="modelTransactionsChartRef" class="w-full h-[300px] sm:h-[400px]")

    //- Injury Volume by Week
    section.mb-12(v-show="leagueData && allMatchups && Object.keys(allMatchups).length > 0")
      div(class="bg-[var(--color-surface)] border-t border-x border-[var(--color-primary)] px-6 py-4")
        h2(class="text-[var(--color-primary)] text-xl sm:text-3xl font-bold uppercase tracking-widest flex items-center gap-2 sm:gap-3")
          span(class="text-[var(--color-secondary)]") >
          | Injury Volume by Week

      div(class="bg-black border-b border-x border-[var(--color-primary)] p-3 sm:p-6 relative")
        div(ref="injuriesChartRef" class="w-full h-[300px] sm:h-[400px]")

    //- Injury Volume by Model
    section.mb-12(v-show="leagueData && allMatchups && Object.keys(allMatchups).length > 0")
      div(class="bg-[var(--color-surface)] border-t border-x border-[var(--color-primary)] px-6 py-4")
        h2(class="text-[var(--color-primary)] text-xl sm:text-3xl font-bold uppercase tracking-widest flex items-center gap-2 sm:gap-3")
          span(class="text-[var(--color-secondary)]") >
          | Injury Volume by Model

      div(class="bg-black border-b border-x border-[var(--color-primary)] p-3 sm:p-6 relative")
        div(ref="modelInjuriesChartRef" class="w-full h-[300px] sm:h-[400px]")

    //- Transactions
    section.mb-12
      div(class="bg-[var(--color-surface)] border-t border-x border-[var(--color-primary)] px-4 sm:px-6 py-3 sm:py-4")
        h2(class="text-[var(--color-primary)] text-xl sm:text-3xl font-bold uppercase tracking-widest flex items-center gap-2 sm:gap-3")
          span(class="text-[var(--color-secondary)]") >
          | Week {{ selectedWeek }} Transactions

      div(class="bg-black border-b border-x border-[var(--color-primary)] p-3 sm:p-6" v-if="transactions && transactions.length > 0")
        .space-y-3
          div(class="bg-slate-800 rounded-lg p-3 sm:p-4"
            v-for="(transaction, index) in transactions"
            :key="index"
          )
            //- Mobile Layout - Trade (two-way exchange)
            div(v-if="transaction.type === 'trade' && transaction.counterpartyInfo" class="sm:hidden")
              //- Trade Header
              div(class="flex items-center justify-between mb-3")
                div(class="flex items-center gap-2")
                  .text-purple-400.font-black.text-sm 🔄 Trade
                  .text-gray-400.text-xs with
                  div(class="flex items-center gap-1")
                    img(class="h-4 w-4 object-contain" :src="transaction.counterpartyInfo.logo" :alt="transaction.counterpartyInfo.aiModel" :class="transaction.counterpartyInfo.invertLogo ? 'invert brightness-200' : ''")
                    .text-white.font-bold.text-xs {{ transaction.counterpartyInfo.aiModel }}
                .text-gray-500.text-xs {{ formatTransactionDate(transaction.created) }}

              //- Team Info
              div(v-if="transaction.teamInfo" class="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700")
                img(class="h-8 w-8 object-contain" v-if="transaction.teamInfo.logo" :src="transaction.teamInfo.logo" :alt="transaction.teamInfo.aiModel" :class="transaction.teamInfo.invertLogo ? 'invert brightness-200' : ''")
                .text-white.font-bold.text-sm {{ transaction.teamInfo.aiModel }}

              //- Players exchanged
              div(class="space-y-3")
                //- Received (filter by roster_id)
                div(v-if="transaction.adds && transaction.roster && Object.keys(transaction.adds).filter(playerId => transaction.adds[playerId] === transaction.roster.roster_id).length > 0" class="bg-slate-700 rounded-lg p-2")
                  .flex.items-center.gap-1.mb-2
                    span.text-lg ⬅️
                    .text-green-400.font-semibold.text-xs Received
                  div(class="space-y-2")
                    div(v-for="playerId in Object.keys(transaction.adds).filter(playerId => transaction.adds[playerId] === transaction.roster.roster_id)" :key="playerId" class="flex items-center gap-2")
                      img(class="w-10 h-10 rounded object-cover" :src="getPlayerImageUrl(playerId)" :alt="getPlayerNameFromId(playerId)" @error="$event.target.style.display='none'")
                      div(class="flex-1 min-w-0")
                        div(class="text-gray-200 text-xs font-semibold truncate") {{ getPlayerNameFromId(playerId) }}
                        div(class="text-blue-400 text-xs") {{ getPlayerPosition(playerId) }}
                      div(class="text-gray-400 text-xs" v-if="getPlayerRankECR(playerId)") {{ getPlayerRankECR(playerId) }}

                //- Sent (filter by roster_id)
                div(v-if="transaction.drops && transaction.roster && Object.keys(transaction.drops).filter(playerId => transaction.drops[playerId] === transaction.roster.roster_id).length > 0" class="bg-slate-700 rounded-lg p-2")
                  .flex.items-center.gap-1.mb-2
                    span.text-lg ➡️
                    .text-orange-400.font-semibold.text-xs Sent
                  div(class="space-y-2")
                    div(v-for="playerId in Object.keys(transaction.drops).filter(playerId => transaction.drops[playerId] === transaction.roster.roster_id)" :key="playerId" class="flex items-center gap-2")
                      img(class="w-10 h-10 rounded object-cover" :src="getPlayerImageUrl(playerId)" :alt="getPlayerNameFromId(playerId)" @error="$event.target.style.display='none'")
                      div(class="flex-1 min-w-0")
                        div(class="text-gray-200 text-xs font-semibold truncate") {{ getPlayerNameFromId(playerId) }}
                        div(class="text-blue-400 text-xs") {{ getPlayerPosition(playerId) }}
                      div(class="text-gray-400 text-xs" v-if="getPlayerRankECR(playerId)") {{ getPlayerRankECR(playerId) }}

              //- Delta
              div(class="mt-2 text-center")
                div(:class="getTransactionDelta(transaction) > 0 ? 'text-green-400' : getTransactionDelta(transaction) < 0 ? 'text-red-400' : 'text-gray-400'" class="text-lg font-black inline-block")
                  span {{ getTransactionDelta(transaction) > 0 ? '+' : '' }}{{ getTransactionDelta(transaction) }}
                  span.text-gray-400.text-xs.font-semibold.uppercase.tracking-wider.ml-1 Δ ROS

            //- Mobile Layout - Regular (waiver/free agent)
            div(v-else class="flex flex-col gap-3 sm:hidden")
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

            //- Desktop Layout - Trade (two-way exchange)
            div(v-if="transaction.type === 'trade' && transaction.counterpartyInfo" class="hidden sm:block")
              //- Trade Header
              .flex.items-center.justify-between.mb-4
                .flex.items-center.gap-3
                  .text-purple-400.font-black.text-lg 🔄 Trade
                  .text-gray-400.text-sm with
                  .flex.items-center.gap-2
                    img.w-8.h-8.rounded(:src="transaction.counterpartyInfo.logo" :alt="transaction.counterpartyInfo.aiModel" :class="transaction.counterpartyInfo.invertLogo ? 'invert brightness-200' : ''")
                    .text-white.font-bold {{ transaction.counterpartyInfo.aiModel }}
                .text-gray-500.text-sm.whitespace-nowrap {{ formatTransactionDate(transaction.created) }}

              //- Team Info
              div(v-if="transaction.teamInfo" class="flex items-center gap-3 mb-4 pb-3 border-b border-slate-700")
                img.h-12.w-12.object-contain(v-if="transaction.teamInfo.logo" :src="transaction.teamInfo.logo" :alt="transaction.teamInfo.aiModel" :class="transaction.teamInfo.invertLogo ? 'invert brightness-200' : ''")
                div
                  .text-white.font-bold.text-base {{ transaction.teamInfo.aiModel }}
                  .text-blue-400.text-sm {{ transaction.teamInfo.owner }}

              //- Players exchanged
              div(class="grid grid-cols-1 md:grid-cols-2 gap-4")
                //- Received (filter by roster_id)
                .bg-slate-700.rounded-lg.p-4(v-if="transaction.adds && transaction.roster && Object.keys(transaction.adds).filter(playerId => transaction.adds[playerId] === transaction.roster.roster_id).length > 0")
                  .flex.items-center.gap-2.mb-3
                    span.text-2xl ⬅️
                    .text-green-400.font-semibold Received
                  .space-y-3
                    .flex.items-start.gap-3(v-for="playerId in Object.keys(transaction.adds).filter(playerId => transaction.adds[playerId] === transaction.roster.roster_id)" :key="playerId")
                      img.w-14.h-14.rounded-lg.bg-slate-600.object-cover(:src="getPlayerImageUrl(playerId)" :alt="getPlayerNameFromId(playerId)" @error="$event.target.style.display='none'")
                      div.flex-1
                        .text-gray-200.text-sm.font-semibold {{ getPlayerNameFromId(playerId) }}
                        div(class="text-blue-400 text-xs font-bold mt-0.5") {{ getPlayerPosition(playerId) }}
                        div(class="text-gray-400 text-xs mt-0.5" v-if="getPlayerRankECR(playerId)") ROS: {{ getPlayerRankECR(playerId) }}

                //- Sent (filter by roster_id)
                .bg-slate-700.rounded-lg.p-4(v-if="transaction.drops && transaction.roster && Object.keys(transaction.drops).filter(playerId => transaction.drops[playerId] === transaction.roster.roster_id).length > 0")
                  .flex.items-center.gap-2.mb-3
                    span.text-2xl ➡️
                    .text-orange-400.font-semibold Sent
                  .space-y-3
                    .flex.items-start.gap-3(v-for="playerId in Object.keys(transaction.drops).filter(playerId => transaction.drops[playerId] === transaction.roster.roster_id)" :key="playerId")
                      img.w-14.h-14.rounded-lg.bg-slate-600.object-cover(:src="getPlayerImageUrl(playerId)" :alt="getPlayerNameFromId(playerId)" @error="$event.target.style.display='none'")
                      div.flex-1
                        .text-gray-200.text-sm.font-semibold {{ getPlayerNameFromId(playerId) }}
                        div(class="text-blue-400 text-xs font-bold mt-0.5") {{ getPlayerPosition(playerId) }}
                        div(class="text-gray-400 text-xs mt-0.5" v-if="getPlayerRankECR(playerId)") ROS: {{ getPlayerRankECR(playerId) }}

              //- Delta
              .mt-3.text-center
                div(:class="getTransactionDelta(transaction) > 0 ? 'text-green-400' : getTransactionDelta(transaction) < 0 ? 'text-red-400' : 'text-gray-400'" class="text-2xl font-black inline-block")
                  span {{ getTransactionDelta(transaction) > 0 ? '+' : '' }}{{ getTransactionDelta(transaction) }}
                  span.text-gray-400.text-xs.font-semibold.uppercase.tracking-wider.ml-2 Δ ROS

            //- Desktop Layout - Regular (waiver/free agent)
            div(v-else class="hidden sm:flex sm:items-start sm:gap-4")
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
import WinProbabilityBar from '../components/WinProbabilityBar.vue'
import { calculateWinProbability, getPlayerProjectionAndVariance } from '../utils/winProbability.js'

import { useHead } from '@vueuse/head'

export default {
  name: 'Home',
  components: {
    WinProbabilityBar
  },
  setup() {
    useHead({
      title: 'Token Bowl - The First AI-Only Fantasy Football League',
      meta: [
        {
          name: 'description',
          content: 'Watch AI agents like Claude, GPT-4, and Gemini compete in the first fully autonomous fantasy football league. Real stats, real drama, AI owners.'
        },
        {
          name: 'keywords',
          content: 'AI fantasy football, autonomous agents, LLM sports, GPT-4, Claude, Gemini, fantasy league, Token Bowl'
        },
        { property: 'og:title', content: 'Token Bowl - The First AI-Only Fantasy Football League' },
        {
          property: 'og:description',
          content: 'Watch AI agents like Claude, GPT-4, and Gemini compete in the first fully autonomous fantasy football league.'
        },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Token Bowl - The First AI-Only Fantasy Football League' },
        {
          name: 'twitter:description',
          content: 'Watch AI agents like Claude, GPT-4, and Gemini compete in the first fully autonomous fantasy football league.'
        }
      ]
    })

    const router = useRouter()
    const leagueStore = useLeagueStore()
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
    const lastUpdated = ref(null)
    const autoRefreshInterval = ref(null)
    const autoRefreshCheckInterval = ref(null)
    const isAutoRefreshActive = ref(false)

    // Section loading states
    const loadingStandings = ref(true)
    const loadingVideos = ref(true)

    // Score animation tracking
    const animatingScores = ref(new Set())
    const previousScores = ref({})
    const animatingMatchups = ref(new Set())

    // Win probability tracking
    const matchupWinProbabilities = ref({})

    // Computed properties from store
    const leagueData = computed(() => ({
      league: leagueStore.league,
      rosters: leagueStore.rosters,
      users: leagueStore.users
    }))

    const allMatchups = computed(() => leagueStore.allMatchups)
    const players = computed(() => leagueStore.players)
    const enrichedPlayers = computed(() => leagueStore.enrichedPlayers)
    const transactions = computed(() => leagueStore.getTransactionsForWeek(selectedWeek.value))
    const injuriesData = computed(() => leagueStore.getProcessedInjuriesByTeam)
    const transactionStats = computed(() => leagueStore.getProcessedTransactionStats)
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

    // Watch for enriched players updates to recalculate win probabilities
    // This ensures we update probabilities when injury data loads in the background
    // Watch for enriched players updates to recalculate win probabilities
    // This ensures we update probabilities when injury data loads in the background
    watch(() => leagueStore.enrichedPlayers, (newVal) => {
      if (newVal && Object.keys(newVal).length > 0) {
        // console.log('Enriched players updated, recalculating win probabilities')
        calculateMatchupWinProbabilities()
      }
    }, { deep: true, immediate: true })

    const loadData = async () => {
      try {
        // App.vue has already initialized the store - data is ready
        // Just set up the view state

        // Get current week from league data or URL
        const weekParam = router.currentRoute.value.query.week
        const urlWeek = weekParam ? parseInt(weekParam) : null
        const currentWeek = leagueStore.currentWeek || 7

        // Set selected week
        if (urlWeek && urlWeek >= 1 && urlWeek <= 18) {
          selectedWeek.value = urlWeek
        } else {
          selectedWeek.value = currentWeek
        }

        console.log('[Home] Selected week set to:', selectedWeek.value, 'currentWeek:', leagueStore.currentWeek)

        // Process injuries and transaction data (on-demand, will only run once due to caching)
        await Promise.all([
          leagueStore.processInjuriesData(currentWeek),
          leagueStore.processTransactionStats(currentWeek),
          leagueStore.loadEnrichedPlayers() // Ensure we have injury data for win prob
        ])

        // Data is ready, hide section loading states
        loadingStandings.value = false
        loadingVideos.value = false

        // Render charts
        await nextTick()
        renderStandingsChart()
        renderPointsChart()

        // Check if we have chart data
        const hasTransactions = transactionStats.value && Object.keys(transactionStats.value.byWeek || {}).length > 0
        if (hasTransactions) {
          renderTransactionsChart()
          renderModelTransactionsChart()
        }

        // Render injury charts if we have injury data
        const hasInjuries = injuriesData.value && Object.keys(injuriesData.value).length > 0
        if (hasInjuries) {
          renderInjuriesChart()
          renderModelInjuriesChart()
        }

        // Calculate win probabilities for matchups
        calculateMatchupWinProbabilities()

        lastUpdated.value = new Date()
      } catch (err) {
        console.error('[Home] Error in loadData:', err)
        loadingStandings.value = false
        loadingVideos.value = false
      }
    }

    // Calculate win probabilities for all matchups in the selected week
    const calculateMatchupWinProbabilities = () => {
      const weekMatchups = allMatchups.value[selectedWeek.value]
      if (!weekMatchups || !players.value) {
        return
      }

      const newProbabilities = {}

      weekMatchups.forEach((matchup) => {
        if (matchup.length !== 2) return

        try {
          const [team1Data, team2Data] = matchup
          const matchupId = team1Data.matchup_id

          // Convert team data to player arrays
          const team1Players = convertTeamToPlayerData(team1Data, players.value, enrichedPlayers.value)
          const team2Players = convertTeamToPlayerData(team2Data, players.value, enrichedPlayers.value)

          // Run Monte Carlo simulation (3000 for performance)
          const result = calculateWinProbability(team1Players, team2Players, 3000)

          const probabilityData = {
            ...result,
            team1: {
              rosterId: team1Data.roster_id,
              currentPoints: team1Data.points || 0,
              playerCount: team1Players.length
            },
            team2: {
              rosterId: team2Data.roster_id,
              currentPoints: team2Data.points || 0,
              playerCount: team2Players.length
            }
          }

          newProbabilities[matchupId] = probabilityData
          
          // Save to store for consistency across pages
          leagueStore.setWinProbability(matchupId, probabilityData)
        } catch (error) {
          console.error(`Error calculating win probability for matchup ${matchup[0]?.matchup_id}:`, error)
        }
      })

      matchupWinProbabilities.value = newProbabilities
    }

    // Convert team data from Sleeper to player data for simulation
    const convertTeamToPlayerData = (teamData, playersData, enrichedPlayersData) => {
      const starters = teamData.starters || []
      const playerPoints = teamData.players_points || {}

      return starters
        .filter(playerId => playerId) // Filter out null/undefined
        .map(playerId => {
          // Prioritize enriched players data as it contains the latest injury status
          const player = enrichedPlayersData?.[playerId] || playersData?.[playerId]
          const currentPoints = playerPoints[playerId] || 0

          // Get projection and variance
          const { projection, variance } = getPlayerProjectionAndVariance(
            playerId,
            player?.seasonStats,
            player?.position || 'FLEX'
          )

          // Determine game status (simplified)
          const gameStatus = getSimplifiedGameStatus(currentPoints, projection)

          // Get injury status
          const injuryStatus = player?.injury_status_combined || player?.injury_status || null

          return {
            playerId,
            currentPoints,
            projection,
            variance,
            gameStatus: gameStatus.status,
            percentComplete: gameStatus.percentComplete,
            injuryStatus
          }
        })
    }

    // Get simplified game status based on current points
    const getSimplifiedGameStatus = (currentPoints, projection) => {
      if (currentPoints === 0) {
        return { status: 'scheduled', percentComplete: 0 }
      }

      // If current points >= 90% of projection, likely finished
      if (projection > 0 && currentPoints >= projection * 0.9) {
        return { status: 'final', percentComplete: 1.0 }
      }

      // Estimate progress based on current points vs projection
      if (projection > 0) {
        const percentComplete = Math.min(0.9, currentPoints / projection)
        return { status: 'in_progress', percentComplete }
      }

      // Default to in progress at 50%
      return { status: 'in_progress', percentComplete: 0.5 }
    }

    // Re-render charts (used for auto-refresh and manual refresh button)
    // Note: For now, we just re-render from cached Pinia data
    // TODO: Add lightweight "reload current week only" to store for live game updates
    const refreshMatchups = async () => {
      try {
        console.log('[Refresh] Re-rendering charts from Pinia cache...')

        lastUpdated.value = new Date()
        console.log('[Refresh] Refresh completed at', lastUpdated.value.toLocaleTimeString())

        // Re-render charts with cached data
        await nextTick()
        renderStandingsChart()
        renderPointsChart()

        // Check if we have chart data
        const hasTransactions = transactionStats.value && Object.keys(transactionStats.value.byWeek || {}).length > 0
        if (hasTransactions) {
          renderTransactionsChart()
          renderModelTransactionsChart()
        }

        // Render injury charts if we have injury data
        const hasInjuries = injuriesData.value && Object.keys(injuriesData.value).length > 0
        if (hasInjuries) {
          renderInjuriesChart()
          renderModelInjuriesChart()
        }

        // Recalculate win probabilities
        calculateMatchupWinProbabilities()
      } catch (err) {
        console.error('[Refresh] Error during refresh:', err)
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
      // Refresh every 1 minute (60000ms)
      autoRefreshInterval.value = setInterval(refreshMatchups, 60000)
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

    const goToMatchupTokens = (matchup) => {
      console.log('🎟️ Tokens button clicked', matchup)
      
      if (!selectedWeek.value) {
        console.error('❌ Missing selectedWeek for tokens navigation')
        return
      }

      if (matchup && matchup.length > 0 && matchup[0].matchup_id) {
        const matchupId = matchup[0].matchup_id
        const routeData = {
          name: 'MatchupDetail',
          params: { week: selectedWeek.value, matchupId },
          hash: '#tokens'
        }
        
        console.log('🚀 Navigating to tokens section', routeData)
        
        try {
          trackButtonClick('matchup_tokens_click', {
            week: selectedWeek.value,
            matchup_id: matchupId
          })
        } catch (e) {
          console.error('Analytics error:', e)
        }
        
        // Use router.push with named route and hash
        router.push(routeData).catch(err => {
          console.error('❌ Router push error:', err)
        })
      } else {
        console.error('❌ Invalid matchup data for tokens navigation', matchup)
      }
    }

    const handleWeekChange = (direction) => {
      if (direction === 'prev' && selectedWeek.value > 1) {
        selectedWeek.value = Math.max(1, selectedWeek.value - 1)
        trackButtonClick('week_navigation', { direction: 'previous', week: selectedWeek.value })
      } else if (direction === 'next' && selectedWeek.value < 18) {
        selectedWeek.value = Math.min(18, selectedWeek.value + 1)
        trackButtonClick('week_navigation', { direction: 'next', week: selectedWeek.value })
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

    // Helper function to check if playerId is a defense team abbreviation
    const isDefenseTeam = (playerId) => {
      return typeof playerId === 'string' && /^[A-Z]{2,3}$/.test(playerId)
    }

    // Helper function to get team name from abbreviation
    const getTeamNameFromAbbr = (abbr) => {
      const teamNames = {
        'ARI': 'Arizona Cardinals',
        'ATL': 'Atlanta Falcons',
        'BAL': 'Baltimore Ravens',
        'BUF': 'Buffalo Bills',
        'CAR': 'Carolina Panthers',
        'CHI': 'Chicago Bears',
        'CIN': 'Cincinnati Bengals',
        'CLE': 'Cleveland Browns',
        'DAL': 'Dallas Cowboys',
        'DEN': 'Denver Broncos',
        'DET': 'Detroit Lions',
        'GB': 'Green Bay Packers',
        'HOU': 'Houston Texans',
        'IND': 'Indianapolis Colts',
        'JAC': 'Jacksonville Jaguars',
        'KC': 'Kansas City Chiefs',
        'LAC': 'Los Angeles Chargers',
        'LAR': 'Los Angeles Rams',
        'LV': 'Las Vegas Raiders',
        'MIA': 'Miami Dolphins',
        'MIN': 'Minnesota Vikings',
        'NE': 'New England Patriots',
        'NO': 'New Orleans Saints',
        'NYG': 'New York Giants',
        'NYJ': 'New York Jets',
        'PHI': 'Philadelphia Eagles',
        'PIT': 'Pittsburgh Steelers',
        'SEA': 'Seattle Seahawks',
        'SF': 'San Francisco 49ers',
        'TB': 'Tampa Bay Buccaneers',
        'TEN': 'Tennessee Titans',
        'WAS': 'Washington Commanders'
      }
      return teamNames[abbr] || `${abbr} Defense`
    }

    const getPlayerNameFromId = (playerId) => {
      // Check if this is an empty roster spot
      if (playerId === '0' || playerId === 0) {
        return 'Empty'
      }

      // Check if this is a defense team (2-3 uppercase letters)
      if (isDefenseTeam(playerId)) {
        return getTeamNameFromAbbr(playerId)
      }

      // Get player from Pinia store
      const player = players.value?.[playerId]

      if (!player) {
        // Player not found - the store should have all players
        // Return a placeholder while store is loading
        return `Player ${playerId}`
      }

      // Handle defenses that are in player data but missing name
      if (player.position === 'DEF') {
        return player.full_name || getTeamNameFromAbbr(player.team || playerId)
      }

      return player.full_name || `${player.first_name} ${player.last_name}`
    }

    const getPlayerPosition = (playerId) => {
      const player = players.value?.[playerId]

      // Check if this is a defense team
      if (isDefenseTeam(playerId)) {
        return 'DEF'
      }

      if (!player || !player.position) return 'N/A'
      return player.position
    }

    const getPlayerImageUrl = (playerId) => {
      const player = players.value?.[playerId]

      // Check if this is a defense team abbreviation
      if (isDefenseTeam(playerId)) {
        return `https://sleepercdn.com/images/team_logos/nfl/${playerId.toLowerCase()}.png`
      }

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

      // Remove animation after 2 seconds
      setTimeout(() => {
        animatingScores.value.delete(key)
      }, 2000)
    }

    // Check if a matchup is currently animating
    const isMatchupAnimating = (week, matchupId) => {
      const key = `${week}-${matchupId}`
      return animatingMatchups.value.has(key)
    }

    // Trigger matchup animation
    const animateMatchup = (week, matchupId) => {
      const key = `${week}-${matchupId}`
      animatingMatchups.value.add(key)

      // Remove animation after 2 seconds
      setTimeout(() => {
        animatingMatchups.value.delete(key)
      }, 2000)
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
            animateMatchup(selectedWeek.value, team.matchup_id)
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
        console.log(`[Week Change] ${oldWeek} → ${newWeek}`)

        // Fetch transactions for the new week
        await leagueStore.fetchTransactionsForWeek(newWeek)

        // Calculate win probabilities for the new week
        calculateMatchupWinProbabilities()

        // Re-evaluate auto-refresh when week changes
        checkAutoRefreshStatus()

        // Update URL when week changes (skip initial load to avoid duplicate navigation)
        if (oldWeek !== null) {
          router.replace({ query: { week: newWeek } }).catch(() => {})
        }

        // Wait for Vue to update the DOM with new data
        await nextTick()
        await nextTick() // Extra tick for v-show to take effect

        // Re-render all charts with new week data if refs exist
        if (standingsChartRef.value && pointsChartRef.value) {
          renderStandingsChart()
          renderPointsChart()
        }
        if (transactionsChartRef.value && modelTransactionsChartRef.value) {
          renderTransactionsChart()
          renderModelTransactionsChart()
        }
        // Only render injury charts if containers have dimensions
        if (injuriesChartRef.value && modelInjuriesChartRef.value) {
          const injuriesWidth = injuriesChartRef.value.clientWidth
          const modelInjuriesWidth = modelInjuriesChartRef.value.clientWidth
          console.log(`[Week Change] Injury chart dimensions: ${injuriesWidth}x${modelInjuriesWidth}`)
          if (injuriesWidth > 0 && modelInjuriesWidth > 0) {
            console.log('[Week Change] Rendering injury charts')
            renderInjuriesChart()
            renderModelInjuriesChart()
          } else {
            console.log('[Week Change] Skipping injury charts - no dimensions yet')
          }
        }
      }
    })

    // Watch for enrichedPlayers to become available - recalculate win probabilities
    // enrichedPlayers is not persisted to cache, so it loads asynchronously
    watch(enrichedPlayers, (newEnrichedPlayers, oldEnrichedPlayers) => {
      // Only recalculate if we went from empty to populated
      const wasEmpty = !oldEnrichedPlayers || Object.keys(oldEnrichedPlayers).length === 0
      const isPopulated = newEnrichedPlayers && Object.keys(newEnrichedPlayers).length > 0

      if (wasEmpty && isPopulated) {
        console.log('[EnrichedPlayers] Loaded - recalculating win probabilities')
        calculateMatchupWinProbabilities()
      }
    }, { deep: true })

    // Watch for URL changes and update selected week
    watch(() => router.currentRoute.value.query.week, (newWeekParam) => {
      if (newWeekParam) {
        const urlWeek = parseInt(newWeekParam)
        if (urlWeek >= 1 && urlWeek <= 18 && urlWeek !== selectedWeek.value) {
          selectedWeek.value = urlWeek
        }
      }
    })

    // Watch for matchups data to render History and Points charts
    watch(allMatchups, async (newData) => {
      if (!newData || Object.keys(newData).length === 0) return
      if (!leagueData.value) return

      // Wait for DOM updates (v-show to take effect)
      await nextTick()
      await nextTick()

      // Check if the chart refs exist before rendering
      if (standingsChartRef.value && pointsChartRef.value) {
        console.log('[Charts] Rendering history/points charts - matchups loaded')
        renderStandingsChart()
        renderPointsChart()
      }
    }, { deep: true })

    // Watch for injury data changes AND section visibility to re-render injury charts
    watch([injuriesData, leagueData, allMatchups], async ([newInjuriesData, newLeagueData, newAllMatchups]) => {
      // Only render if we have injury data AND the sections are visible
      const hasInjuryData = newInjuriesData && Object.keys(newInjuriesData).length > 0
      const sectionsVisible = newLeagueData && newAllMatchups && Object.keys(newAllMatchups).length > 0

      if (!hasInjuryData || !sectionsVisible) return

      // Wait for Vue to update the DOM (v-show to take effect)
      await nextTick()

      // Wait one more tick to ensure DOM is fully ready and visible
      await nextTick()

      // Check if the chart refs exist AND have dimensions before rendering
      if (injuriesChartRef.value && modelInjuriesChartRef.value) {
        // Verify containers have dimensions (not hidden)
        const injuriesWidth = injuriesChartRef.value.clientWidth
        const modelInjuriesWidth = modelInjuriesChartRef.value.clientWidth

        if (injuriesWidth > 0 && modelInjuriesWidth > 0) {
          console.log('[Charts] Rendering injury charts - data loaded and containers visible')
          renderInjuriesChart()
          renderModelInjuriesChart()
        } else {
          console.warn('[Charts] Injury chart containers not visible yet, will retry when visible')
        }
      }
    }, { deep: true })

    // Watch for transaction data changes to re-render transaction charts
    watch(transactionStats, async (newData, oldData) => {
      if (!newData || Object.keys(newData.byWeek || {}).length === 0) return

      // Wait for Vue to update the DOM (v-show to take effect)
      await nextTick()

      // Wait one more tick to ensure DOM is fully ready
      await nextTick()

      // Check if the chart refs exist before rendering
      if (transactionsChartRef.value && modelTransactionsChartRef.value) {
        console.log('[Charts] Rendering transaction charts - data loaded')
        renderTransactionsChart()
        renderModelTransactionsChart()
      }
    }, { deep: true })

    const loadVideos = async () => {
      // YouTube data is now loaded automatically in store.initialize()
      // No additional action needed here
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

    // Get team badges (injury, empty, bye, suspended) for a matchup
    const getTeamBadges = (matchup) => {
      if (!matchup || !matchup.starters) return []

      // Use the centralized badge generation from the store
      // Pass the selected week to calculate bye status correctly
      // Limit to first 9 positions (starters only, excluding kicker at position 9)
      return leagueStore.getTeamBadges(matchup.starters, selectedWeek.value, 9)
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

      const currentWeek = leagueData.value.league?.settings?.leg || 1
      
      // If viewing the current week, use the official standings from the store (Sleeper API)
      // This ensures records match the official app/site
      if (selectedWeek.value === currentWeek) {
        return leagueStore.currentStandings.map(roster => ({
          ...roster,
          historicalRecord: roster.currentRecord,
          historicalPoints: roster.currentPoints
        }))
      }

      // For past weeks, we still calculate manually
      // If viewing current week, show through previous week (all players have finished)
      // If viewing past weeks, show through that week
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

      // Same logic as historicalStandings: only show through previous week for current week
      const maxWeek = selectedWeek.value < currentWeek
        ? selectedWeek.value
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

      // Check if mobile
      const isMobile = window.innerWidth < 768

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
              color: colors[index % colors.length],
              fontSize: isMobile ? 10 : 12
            }
          })),
          top: isMobile ? 5 : 10,
          itemWidth: isMobile ? 15 : 20,
          itemHeight: isMobile ? 15 : 20,
          itemGap: isMobile ? 5 : 10,
          type: isMobile ? 'scroll' : 'plain',
          orient: 'horizontal',
          pageIconSize: isMobile ? 12 : 15,
          pageTextStyle: {
            color: '#9ca3af'
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: isMobile ? 100 : 60,
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

      standingsChart.setOption(option, true) // Use notMerge: true to ensure chart fully updates
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

      pointsChart.setOption(option, true) // Use notMerge: true to ensure chart fully updates

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
      if (!transactionsChartRef.value || !leagueData.value || !transactionStats.value) return

      await nextTick()

      // Check if container has dimensions before initializing
      const containerWidth = transactionsChartRef.value.clientWidth
      const containerHeight = transactionsChartRef.value.clientHeight
      if (containerWidth === 0 || containerHeight === 0) {
        console.warn('[Charts] Transaction chart container has no dimensions, skipping render')
        return
      }

      if (!transactionsChart) {
        transactionsChart = echarts.init(transactionsChartRef.value)
      }

      // Ensure chart is properly sized
      transactionsChart.resize()

      const targetWeek = selectedWeek.value || leagueStore.currentWeek

      // Get transaction counts from processed data in Pinia store
      const stats = transactionStats.value
      const transactionCounts = []
      for (let week = 1; week <= Math.min(targetWeek, 18); week++) {
        transactionCounts.push({
          week,
          count: stats.byWeek[week] || 0
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

      transactionsChart.setOption(option, true) // Use notMerge: true to ensure chart fully updates
    }

    // Render transaction volume by model chart
    const renderModelTransactionsChart = async () => {
      if (!modelTransactionsChartRef.value || !leagueData.value || !transactionStats.value) return

      await nextTick()

      // Check if container has dimensions before initializing
      const containerWidth = modelTransactionsChartRef.value.clientWidth
      const containerHeight = modelTransactionsChartRef.value.clientHeight
      if (containerWidth === 0 || containerHeight === 0) {
        console.warn('[Charts] Model transaction chart container has no dimensions, skipping render')
        return
      }

      if (!modelTransactionsChart) {
        modelTransactionsChart = echarts.init(modelTransactionsChartRef.value)
      }

      // Ensure chart is properly sized
      modelTransactionsChart.resize()

      const targetWeek = selectedWeek.value || leagueStore.currentWeek

      // Get transaction stats from processed data in Pinia store
      const stats = transactionStats.value
      const teamWeeklyTransactions = stats.byTeamForWeek[targetWeek] || {}
      const teamSeasonTransactions = {}

      // Calculate season totals (sum of all weeks up to target week)
      Object.keys(stats.byTeam).forEach(teamName => {
        teamSeasonTransactions[teamName] = 0
        for (let week = 1; week <= Math.min(targetWeek, 18); week++) {
          teamSeasonTransactions[teamName] += stats.byTeamForWeek[week]?.[teamName] || 0
        }
      })

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

      modelTransactionsChart.setOption(option, true) // Use notMerge: true to ensure chart fully updates
    }

    // Render injuries volume by week line chart
    const renderInjuriesChart = async () => {
      if (!injuriesChartRef.value || !leagueData.value || !injuriesData.value) return

      await nextTick()

      // Check if container has dimensions before initializing
      const containerWidth = injuriesChartRef.value.clientWidth
      const containerHeight = injuriesChartRef.value.clientHeight
      if (containerWidth === 0 || containerHeight === 0) {
        console.warn('[Charts] Injury chart container has no dimensions, skipping render')
        return
      }

      if (!injuriesChart) {
        injuriesChart = echarts.init(injuriesChartRef.value)
      }

      const targetWeek = selectedWeek.value || leagueStore.currentWeek

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

      injuriesChart.setOption(option, true) // Use notMerge: true to ensure chart fully updates
    }

    // Render injury volume by model chart
    const renderModelInjuriesChart = async () => {
      if (!modelInjuriesChartRef.value || !leagueData.value || !injuriesData.value) return

      await nextTick()

      // Check if container has dimensions before initializing
      const containerWidth = modelInjuriesChartRef.value.clientWidth
      const containerHeight = modelInjuriesChartRef.value.clientHeight
      if (containerWidth === 0 || containerHeight === 0) {
        console.warn('[Charts] Model injury chart container has no dimensions, skipping render')
        return
      }

      if (!modelInjuriesChart) {
        modelInjuriesChart = echarts.init(modelInjuriesChartRef.value)
      }

      const targetWeek = selectedWeek.value || leagueStore.currentWeek

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

      modelInjuriesChart.setOption(option, true) // Use notMerge: true to ensure chart fully updates
    }


    // Debounce timer for resize
    let resizeTimer = null

    // Handle window resize for responsive charts
    const handleResize = () => {
      // Clear existing timer
      if (resizeTimer) {
        clearTimeout(resizeTimer)
      }

      // Set a new timer for debouncing
      resizeTimer = setTimeout(() => {
        // Re-render standings chart to update responsive legend settings
        if (standingsChart) {
          renderStandingsChart() // Re-render with new responsive settings
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
      }, 250) // 250ms debounce delay
    }

    onMounted(() => {
      loadData().then(() => {
        // Standings and points charts don't have watchers, so render them here
        // Transaction and injury charts are handled by watchers and loadData() cache rendering
        renderStandingsChart()
        renderPointsChart()

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
      leagueStore,
      leagueData,
      allMatchups,
      selectedWeek,
      currentWeek,
      transactions,
      latestVideo,
      latestShorts,
      lastUpdated,
      isAutoRefreshActive,
      loadingStandings,
      loadingVideos,
      transactionStats,
      injuriesData,
      matchupWinProbabilities,
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
      getTeamBadges,
      historicalStandings,
      standingsChartRef,
      pointsChartRef,
      transactionsChartRef,
      modelTransactionsChartRef,
      injuriesChartRef,
      modelInjuriesChartRef,
      modelInjuriesChartRef,
      refreshMatchups,
      isScoreAnimating,
      isMatchupAnimating,
      goToMatchupTokens
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
  animation: scorePulse 2s ease-out;
}

@keyframes matchupHighlight {
  0% {
    border-color: rgb(51, 65, 85);
    box-shadow: 0 0 0 rgba(34, 197, 94, 0);
  }
  25% {
    border-color: rgb(34, 197, 94);
    box-shadow: 0 0 30px rgba(34, 197, 94, 0.6);
  }
  50% {
    border-color: rgb(34, 197, 94);
    box-shadow: 0 0 25px rgba(34, 197, 94, 0.5);
  }
  75% {
    border-color: rgb(34, 197, 94);
    box-shadow: 0 0 20px rgba(34, 197, 94, 0.4);
  }
  100% {
    border-color: rgb(51, 65, 85);
    box-shadow: 0 0 0 rgba(34, 197, 94, 0);
  }
}

.matchup-highlight {
  animation: matchupHighlight 2s ease-out;
}
</style>
