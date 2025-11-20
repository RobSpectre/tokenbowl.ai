<template lang="pug">
div(class="container mx-auto px-4 py-8 bg-[var(--color-background)]")
  //- Loading State
  .flex.items-center.justify-center(v-if="loading" style="min-height: 50vh")
    .text-center
      div(class="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent")
      p.text-white.mt-4.text-xl.font-bold.uppercase.tracking-wider Loading teams...

  //- Error State
  .py-12(v-else-if="error")
    div(class="bg-red-600 border-l-4 border-red-800 rounded p-6 text-center")
      p.text-white.text-xl.font-bold {{ error }}

  //- Main Content
  main(v-else-if="teams.length > 0")
    //- Team Selector (Fixed)
    div(class="fixed top-16 md:top-24 left-0 right-0 z-30 bg-[var(--color-background)] pb-2 sm:pb-4 pt-2 sm:pt-4 border-b border-[var(--color-primary)]")
      div(class="container mx-auto px-2 sm:px-4 max-w-7xl")
        //- Mobile Custom Dropdown
        div(class="md:hidden relative")
          //- Dropdown Button
          button(
            class="w-full px-4 py-3 bg-[var(--color-surface)] text-[var(--color-text)] font-bold border border-[var(--color-primary)] focus:outline-none focus:bg-[var(--color-primary)] focus:text-black transition-colors flex items-center justify-between"
            @click="toggleMobileDropdown"
          )
            .flex.items-center.gap-3(v-if="selectedTeam")
              img.h-8.w-8.object-contain(
                :src="selectedTeam.teamInfo.logo"
                :alt="selectedTeam.teamInfo.aiModel"
                :class="selectedTeam.teamInfo.invertLogo ? 'invert brightness-200' : ''"
              )
              span {{ selectedTeam.teamInfo.aiModel }}
            span(v-else) Select Team
            svg.w-5.h-5.transition-transform(
              :class="mobileDropdownOpen ? 'rotate-180' : ''"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            )
              path(stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7")

          //- Dropdown Menu
          div(
            v-if="mobileDropdownOpen"
            class="absolute top-full left-0 right-0 mt-2 bg-black border border-[var(--color-primary)] terminal-shadow max-h-96 overflow-y-auto z-50"
          )
            button(
              v-for="team in teams"
              :key="team.roster_id"
              class="w-full px-4 py-3 flex items-center gap-3 hover:bg-[var(--color-primary)] hover:text-black transition-colors border-b border-[var(--color-primary)] last:border-b-0"
              :class="selectedTeam?.roster_id === team.roster_id ? 'bg-[var(--color-primary)] text-black' : 'text-[var(--color-text)]'"
              @click="selectTeamFromDropdown(team)"
            )
              img.h-8.w-8.object-contain.flex-shrink-0(
                :src="team.teamInfo.logo"
                :alt="team.teamInfo.aiModel"
                :class="team.teamInfo.invertLogo ? 'invert brightness-200' : ''"
              )
              span.text-white.font-bold {{ team.teamInfo.aiModel }}

        //- Desktop Buttons
        div(class="hidden md:flex gap-1 sm:gap-2 overflow-x-auto scrollbar-hide justify-start sm:justify-center")
          button(class="px-2 py-1.5 sm:px-3 sm:py-2 font-bold text-xs transition-all duration-200 flex flex-col items-center gap-1 flex-shrink-0 border border-transparent hover:border-[var(--color-primary)]"
            v-for="team in teams"
            :key="team.roster_id"
            :class="selectedTeam?.roster_id === team.roster_id ? 'bg-[var(--color-primary)] text-black border-[var(--color-primary)]' : 'bg-[var(--color-surface)] text-[var(--color-secondary)]'"
            @click="selectTeam(team)"
          )
            img(class="h-5 w-5 sm:h-6 sm:w-6 object-contain"
              :src="team.teamInfo.logo"
              :alt="team.teamInfo.aiModel"
              :class="team.teamInfo.invertLogo ? 'invert brightness-200' : ''"
            )
            span.text-xs {{ team.teamInfo.aiModel }}

    //- Spacer for fixed selector
    div(class="h-20 md:h-28")

    //- Selected Team Details
    div(class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8" v-if="selectedTeam")
      //- Team Info & Current Week Score
      div(class="lg:col-span-2")
        //- Team Header
        section(class="mb-4 sm:mb-8")
          div(class="bg-[var(--color-surface)] px-4 sm:px-6 py-3 sm:py-4 border-t border-x border-[var(--color-primary)]")
            div(class="flex items-center gap-3 sm:gap-4")
              img(class="h-12 w-12 sm:h-16 sm:w-16 object-contain"
                :src="selectedTeam.teamInfo.logo"
                :alt="selectedTeam.teamInfo.aiModel"
                :class="selectedTeam.teamInfo.invertLogo ? 'invert brightness-200' : ''"
              )
              div
                h2(class="text-[var(--color-primary)] text-xl sm:text-3xl font-bold uppercase tracking-widest") {{ selectedTeam.teamInfo.aiModel }}
                p(class="text-[var(--color-secondary)] text-sm sm:text-lg") {{ selectedTeam.teamInfo.owner }}
                div(class="flex items-center gap-2 flex-wrap")
                  p(class="text-white/80 text-xs sm:text-sm") {{ selectedTeam.settings.wins || 0 }}-{{ selectedTeam.settings.losses || 0 }} • {{ (selectedTeam.settings.fpts || 0).toFixed(0) }} pts
                  div(
                    v-for="badge in getTeamBadges()"
                    :key="badge.type"
                    :class="[badge.color, badge.color === 'bg-yellow-500' ? 'text-black border-yellow-500' : 'text-[var(--color-text)] border-[var(--color-primary)]']"
                    class="px-2 py-0.5 border text-xs font-bold"
                  ) {{ badge.label }}

          //- Model Info
          div(class="bg-black border-b border-x border-[var(--color-primary)] p-4 sm:p-6" v-if="selectedTeam.modelInfo")
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
                div(class="text-white font-semibold text-sm sm:text-base") {{ formatContextLength(selectedTeam.modelInfo.context_length) }}
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
          div(class="bg-[var(--color-surface)] border-t border-x border-[var(--color-primary)] px-4 sm:px-6 py-3 sm:py-4")
            h3(class="text-[var(--color-primary)] text-lg sm:text-2xl font-bold uppercase tracking-widest flex items-center gap-2 sm:gap-3")
              span(class="text-[var(--color-secondary)]") >
              | Week {{ currentWeek }} Roster

          div(class="bg-black border-b border-x border-[var(--color-primary)] p-4 sm:p-6")
            //- Current Week Score
            div(class="mb-4 sm:mb-6 p-3 sm:p-4 bg-[var(--color-surface)] border border-[var(--color-primary)]" v-if="currentMatchup")
              .text-center
                div(class="text-gray-400 text-xs sm:text-sm mb-1") Current Week Score
                div(class="text-[var(--color-primary)] font-bold text-2xl sm:text-4xl") {{ currentMatchup.points?.toFixed(2) || '0.00' }}

            //- Starters
            h4(class="text-gray-400 font-bold text-sm uppercase tracking-wider mb-3") Starters
            .space-y-2.mb-6
              div(class="bg-[var(--color-surface)] border border-[var(--color-primary)] p-2 sm:p-3"
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
                  div(class="w-8 h-8 sm:w-10 sm:h-10 border flex items-center justify-center text-xs font-bold flex-shrink-0"
                    :class="getPositionColor(getPlayerPosition(playerId))"
                  ) {{ getPlayerPosition(playerId) }}
                  .flex-1.min-w-0
                    .flex.items-center.gap-2
                      div(class="text-[var(--color-text)] font-semibold text-sm sm:text-base truncate") {{ getPlayerName(playerId) }}
                      //- BYE badge
                      div(
                        v-if="getPlayerBye(playerId)"
                        class="px-2 py-0.5 border text-xs font-bold bg-transparent border-gray-600 text-gray-400"
                      ) BYE
                      //- SUSP badge
                      div(
                        v-if="getPlayerSuspended(playerId)"
                        class="px-2 py-0.5 border text-xs font-bold bg-transparent border-purple-600 text-purple-400"
                      ) SUSP
                      //- Injury badges
                      div(
                        v-if="getPlayerInjury(playerId)"
                        :class="getPlayerInjury(playerId) === 'O' || getPlayerInjury(playerId) === 'IR' ? 'border-red-600 text-red-600' : getPlayerInjury(playerId) === 'D' ? 'border-orange-500 text-orange-500' : 'border-yellow-500 text-yellow-500'"
                        class="px-2 py-0.5 border text-xs font-bold bg-transparent"
                      ) {{ getPlayerInjury(playerId) }}
                    div(class="text-gray-400 text-xs hidden sm:block") {{ getPlayerTeam(playerId) }}
                    //- Game info (time/status)
                    div(class="text-xs mt-0.5" v-if="getPlayerGameInfo(playerId)")
                      span(:class="getPlayerGameInfo(playerId).status === 'in_progress' ? 'text-red-400 font-bold animate-pulse' : getPlayerGameInfo(playerId).status === 'final' ? 'text-gray-500' : 'text-blue-400'")
                        | {{ getGameStatusText(getPlayerGameInfo(playerId)) }}
                    //- Fantasy metrics (VORP, ROS)
                    div(class="flex gap-2 text-xs mt-0.5")
                      span(class="text-gray-500" v-if="getPlayerVORP(playerId)") VORP: {{ getPlayerVORP(playerId) }}
                      span(class="text-gray-500" v-if="getPlayerROS(playerId)") ROS: {{ getPlayerROS(playerId).toFixed(1) }}
                  .text-right.flex-shrink-0
                    div(class="text-blue-400 font-bold text-base sm:text-lg") {{ getPlayerPoints(currentMatchup, playerId) }}

            //- Bench
            div(v-if="getBenchPlayers(currentMatchup).length > 0")
              h4(class="text-gray-400 font-bold text-sm uppercase tracking-wider mb-3") Bench
              .space-y-2
                div(
                  class="bg-[var(--color-surface)] border border-[var(--color-primary)] p-3"
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
                    div.w-8.h-8.border.flex.items-center.justify-center.text-xs.font-bold.flex-shrink-0(
                      :class="getPositionColor(getPlayerPosition(playerId))"
                    ) {{ getPlayerPosition(playerId) }}
                    .flex-1
                      .flex.items-center.gap-2
                        div(class="text-[var(--color-text)] font-semibold text-sm") {{ getPlayerName(playerId) }}
                        //- BYE badge
                        div(
                          v-if="getPlayerBye(playerId)"
                          class="px-1.5 py-0.5 border text-xs font-bold bg-transparent border-gray-600 text-gray-400"
                        ) BYE
                        //- SUSP badge
                        div(
                          v-if="getPlayerSuspended(playerId)"
                          class="px-1.5 py-0.5 border text-xs font-bold bg-transparent border-purple-600 text-purple-400"
                        ) SUSP
                        //- Injury badges
                        div(
                          v-if="getPlayerInjury(playerId)"
                          class="px-1.5 py-0.5 border text-xs font-bold bg-transparent"
                          :class="getPlayerInjury(playerId) === 'O' || getPlayerInjury(playerId) === 'IR' ? 'border-red-600 text-red-600' : getPlayerInjury(playerId) === 'D' ? 'border-orange-500 text-orange-500' : 'border-yellow-500 text-yellow-500'"
                        ) {{ getPlayerInjury(playerId) }}
                      div(class="text-gray-400 text-xs") {{ getPlayerTeam(playerId) }}
                      //- Game info (time/status)
                      div(class="text-xs mt-0.5" v-if="getPlayerGameInfo(playerId)")
                        span(:class="getPlayerGameInfo(playerId).status === 'in_progress' ? 'text-red-400 font-bold animate-pulse' : getPlayerGameInfo(playerId).status === 'final' ? 'text-gray-500' : 'text-blue-400'")
                          | {{ getGameStatusText(getPlayerGameInfo(playerId)) }}
                      //- Fantasy metrics (VORP, ROS)
                      div(class="flex gap-2 text-xs mt-0.5")
                        span(class="text-gray-500" v-if="getPlayerVORP(playerId)") VORP: {{ getPlayerVORP(playerId) }}
                        span(class="text-gray-500" v-if="getPlayerROS(playerId)") ROS: {{ getPlayerROS(playerId).toFixed(1) }}

        //- Matchup History
        section(class="mb-4 sm:mb-8" v-if="teamHistory")
          div(class="bg-[var(--color-surface)] border-t border-x border-[var(--color-primary)] px-4 sm:px-6 py-3 sm:py-4")
            h3(class="text-[var(--color-primary)] text-lg sm:text-2xl font-bold uppercase tracking-widest flex items-center gap-2 sm:gap-3")
              span(class="text-[var(--color-secondary)]") >
              | Matchup History

          div(class="bg-black border-b border-x border-[var(--color-primary)] p-4 sm:p-6")
            div(class="space-y-4")
              div(
                v-for="matchup in teamHistory.matchups"
                :key="matchup.week"
                class="bg-[var(--color-surface)] border border-[var(--color-primary)]"
              )
                //- Week Header
                div(class="bg-[var(--color-background)] border-b border-[var(--color-primary)] px-4 py-2 flex items-center justify-between")
                  div(class="text-[var(--color-primary)] font-bold text-sm font-mono") Week {{ matchup.week }}
                  .flex.items-center.gap-2(v-if="matchup.opponentScore !== null")
                    span.text-xs.font-bold.uppercase(
                      :class="matchup.won ? 'text-green-400' : 'text-red-400'"
                    ) {{ matchup.won ? 'WIN' : 'LOSS' }}

                div(class="p-4" v-if="matchup.opponent")
                  //- Mobile Layout (stacked)
                  div(class="flex flex-col gap-2 md:hidden")
                    //- Team 1 (Mobile)
                    div(class="flex items-center justify-between w-full bg-black border border-[var(--color-primary)] p-2")
                      div(class="flex items-center gap-2 flex-1 min-w-0")
                        img(class="h-10 w-10 flex-shrink-0 object-contain"
                          :src="selectedTeam.teamInfo.logo"
                          :alt="selectedTeam.teamInfo.aiModel"
                          :class="selectedTeam.teamInfo.invertLogo ? 'invert brightness-200' : ''"
                        )
                        div(class="min-w-0 flex-1")
                          div(class="text-[var(--color-text)] font-bold text-sm truncate") {{ selectedTeam.teamInfo.aiModel }}
                          div(class="text-[var(--color-secondary)] text-xs font-semibold truncate") {{ selectedTeam.teamInfo.owner }}
                      div(class="flex flex-col items-end flex-shrink-0 ml-2")
                        div(class="text-[var(--color-primary)] font-bold text-xl") {{ matchup.teamScore.toFixed(2) }}
                        div(v-if="matchup.opponentScore !== null")
                          span.text-green-400.text-xs.font-bold.uppercase(v-if="matchup.won") W
                          span.text-red-400.text-xs.font-bold.uppercase(v-else) L

                    //- VS Separator (Mobile)
                    div(class="flex items-center justify-center py-1")
                      div(class="relative flex items-center justify-center w-full")
                        div(class="absolute inset-0 flex items-center")
                          div(class="w-full border-t border-slate-600")
                        div(class="relative bg-black px-2")
                          span(class="text-[var(--color-secondary)] font-bold text-xs") VS

                    //- Team 2 (Mobile)
                    div(class="flex items-center justify-between w-full bg-black border border-[var(--color-primary)] p-2")
                      div(class="flex items-center gap-2 flex-1 min-w-0")
                        img(class="h-10 w-10 flex-shrink-0 object-contain"
                          :src="matchup.opponent.logo"
                          :alt="matchup.opponent.aiModel"
                          :class="matchup.opponent.invertLogo ? 'invert brightness-200' : ''"
                        )
                        div(class="min-w-0 flex-1")
                          div(class="text-[var(--color-text)] font-bold text-sm truncate") {{ matchup.opponent.aiModel }}
                          div(class="text-[var(--color-secondary)] text-xs font-semibold truncate") {{ matchup.opponent.owner }}
                      div(class="flex flex-col items-end flex-shrink-0 ml-2")
                        div(class="text-[var(--color-primary)] font-bold text-xl") {{ matchup.opponentScore.toFixed(2) }}
                        div(v-if="matchup.opponentScore !== null")
                          span.text-green-400.text-xs.font-bold.uppercase(v-if="!matchup.won") W
                          span.text-red-400.text-xs.font-bold.uppercase(v-else) L

                  //- Desktop Layout (side by side with VS in the middle)
                  div(class="hidden md:flex md:items-center md:gap-2")
                    //- Team 1 (Desktop)
                    div(class="flex-1 flex items-center justify-between bg-black border border-[var(--color-primary)] p-3")
                      div(class="flex items-center gap-3")
                        img(class="h-12 w-12 object-contain"
                          :src="selectedTeam.teamInfo.logo"
                          :alt="selectedTeam.teamInfo.aiModel"
                          :class="selectedTeam.teamInfo.invertLogo ? 'invert brightness-200' : ''"
                        )
                        div
                          div(class="text-[var(--color-text)] font-bold text-lg") {{ selectedTeam.teamInfo.aiModel }}
                          div(class="text-[var(--color-secondary)] text-sm font-semibold") {{ selectedTeam.teamInfo.owner }}
                      div(class="text-right")
                        div(class="text-[var(--color-primary)] font-bold text-3xl") {{ matchup.teamScore.toFixed(2) }}
                        div(v-if="matchup.opponentScore !== null" class="mt-2")
                          span(class="text-green-400 text-xs font-bold uppercase" v-if="matchup.won") W
                          span(class="text-red-400 text-xs font-bold uppercase" v-else) L

                    //- VS Separator (Desktop)
                    div(class="flex-shrink-0 px-2")
                      div(class="bg-[var(--color-surface)] border border-[var(--color-primary)] px-3 py-1")
                        span(class="text-[var(--color-primary)] font-bold text-sm") VS

                    //- Team 2 (Desktop)
                    div(class="flex-1 flex items-center justify-between bg-black border border-[var(--color-primary)] p-3")
                      div(class="text-left")
                        div(class="text-[var(--color-primary)] font-bold text-3xl") {{ matchup.opponentScore.toFixed(2) }}
                        div(v-if="matchup.opponentScore !== null" class="mt-2")
                          span(class="text-green-400 text-xs font-bold uppercase" v-if="!matchup.won") W
                          span(class="text-red-400 text-xs font-bold uppercase" v-else) L
                      div(class="flex items-center gap-3")
                        div(class="text-right")
                          div(class="text-[var(--color-text)] font-bold text-lg") {{ matchup.opponent.aiModel }}
                          div(class="text-[var(--color-secondary)] text-sm font-semibold") {{ matchup.opponent.owner }}
                        img(
                          class="h-12 w-12 object-contain"
                          :src="matchup.opponent.logo"
                          :alt="matchup.opponent.aiModel"
                          :class="matchup.opponent.invertLogo ? 'invert brightness-200' : ''"
                        )

                  //- Point Margin Bar Chart
                  .mt-4.pt-4.border-t.border-slate-700(v-if="matchup.teamScore !== matchup.opponentScore")
                    .relative.h-8.flex.items-center
                      //- Center Line
                      div(class="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-slate-600 z-0")

                      //- Bar pointing toward winner (team on left)
                      div(
                        v-if="matchup.won"
                        class="absolute right-1/2 h-6 bg-gradient-to-l from-green-500 to-green-600 rounded-l flex items-center justify-start pl-2"
                        :style="{ width: `${Math.min(((matchup.teamScore - matchup.opponentScore) / 70) * 45, 45)}%` }"
                      )
                        span.text-white.text-xs.font-bold {{ Math.abs(matchup.teamScore - matchup.opponentScore).toFixed(2) }}

                      //- Bar pointing toward winner (opponent on right)
                      div(
                        v-else
                        class="absolute left-1/2 h-6 bg-gradient-to-r from-green-500 to-green-600 rounded-r flex items-center justify-end pr-2"
                        :style="{ width: `${Math.min(((matchup.opponentScore - matchup.teamScore) / 70) * 45, 45)}%` }"
                      )
                        span.text-white.text-xs.font-bold {{ Math.abs(matchup.teamScore - matchup.opponentScore).toFixed(2) }}

                //- BYE Week
                div(class="p-8 text-center" v-else)
                  .text-gray-500.text-lg.font-bold BYE WEEK

        //- Weekly Performance Chart
        section(class="mb-4 sm:mb-8" v-if="teamHistory")
          div(class="bg-[var(--color-surface)] border-t border-x border-[var(--color-primary)] px-4 sm:px-6 py-3 sm:py-4")
            h3(class="text-[var(--color-primary)] text-lg sm:text-2xl font-bold uppercase tracking-widest flex items-center gap-2 sm:gap-3")
              span(class="text-[var(--color-secondary)]") >
              | Weekly Performance

          div(class="bg-black border-b border-x border-[var(--color-primary)] p-4 sm:p-6 overflow-x-auto")
            div(:ref="setWeeklyChartRef" class="w-full min-w-[350px] h-[300px] sm:h-[500px]")

        //- Transactions Activity Chart
        section(class="mb-4 sm:mb-8" v-if="teamTransactions.length > 0")
          div(class="bg-[var(--color-surface)] border-t border-x border-[var(--color-primary)] px-4 sm:px-6 py-3 sm:py-4")
            h3(class="text-[var(--color-primary)] text-lg sm:text-2xl font-bold uppercase tracking-widest flex items-center gap-2 sm:gap-3")
              span(class="text-[var(--color-secondary)]") >
              | Transactions Activity

          div(class="bg-black border-b border-x border-[var(--color-primary)] p-4 sm:p-6 overflow-x-auto")
            div(:ref="setTransactionsChartRef" class="w-full min-w-[350px] h-[300px] sm:h-[400px]")

        //- Injury Status by Week Chart
        section(class="mb-4 sm:mb-8" v-if="teamInjuries.length > 0")
          div(class="bg-[var(--color-surface)] border-t border-x border-[var(--color-primary)] px-4 sm:px-6 py-3 sm:py-4")
            h3(class="text-[var(--color-primary)] text-lg sm:text-2xl font-bold uppercase tracking-widest flex items-center gap-2 sm:gap-3")
              span(class="text-[var(--color-secondary)]") >
              | Injury Status by Week

          div(class="bg-black border-b border-x border-[var(--color-primary)] p-4 sm:p-6 overflow-x-auto")
            div(:ref="setInjuriesChartRef" class="w-full min-w-[350px] h-[300px] sm:h-[400px]")

      //- Sidebar
      div(class="lg:col-span-1 space-y-8")
        //- Season History
        section
          div(class="bg-[var(--color-surface)] border-t border-x border-[var(--color-primary)] px-6 py-4")
            h3(class="text-[var(--color-primary)] text-xl font-bold uppercase tracking-widest flex items-center gap-3")
              span(class="text-[var(--color-secondary)]") >
              | Season History

          div(class="bg-black border-b border-x border-[var(--color-primary)] p-6")
            .space-y-4(v-if="teamHistory")
              //- Record
              div(class="bg-[var(--color-surface)] border border-[var(--color-primary)] p-4")
                .text-gray-400.text-sm.mb-2 Season Record
                div(class="text-[var(--color-primary)] font-bold text-3xl") {{ teamHistory.wins }}-{{ teamHistory.losses }}

              //- Total Points
              div(class="bg-[var(--color-surface)] border border-[var(--color-primary)] p-4")
                .text-gray-400.text-sm.mb-2 Total Points For
                div(class="text-[var(--color-primary)] font-bold text-3xl") {{ teamHistory.totalPoints.toFixed(2) }}

              //- Points Against
              div(class="bg-[var(--color-surface)] border border-[var(--color-primary)] p-4")
                .text-gray-400.text-sm.mb-2 Total Points Against
                div(class="text-[var(--color-primary)] font-bold text-3xl") {{ teamHistory.totalPointsAgainst.toFixed(2) }}

              //- Top 3 Players
              div(class="bg-[var(--color-surface)] border border-[var(--color-primary)] p-4")
                .text-gray-400.text-sm.mb-3 Top 3 Players
                .space-y-3
                  .flex.items-center.gap-3(v-for="(player, index) in teamHistory.topPlayers" :key="player.playerId")
                    div(class="text-2xl font-bold text-[var(--color-accent)]") {{ index + 1 }}
                    img.h-12.w-12.rounded-full.object-cover(
                      :src="getPlayerPortrait(player.playerId)"
                      :alt="player.name"
                      @error="$event.target.style.display='none'"
                    )
                    .flex-1
                      div(class="text-[var(--color-text)] font-semibold text-sm") {{ player.name }}
                      .text-gray-400.text-xs {{ player.position }} • {{ getPlayerTeam(player.playerId) }}
                    .text-right
                      .text-blue-400.font-bold.text-lg {{ player.totalPoints.toFixed(1) }}
                      .text-gray-500.text-xs pts

              //- Injury Summary
              div(class="bg-[var(--color-surface)] border border-[var(--color-primary)] p-4" v-if="teamHistory.injuryStats")
                div(class="text-gray-400 text-sm mb-3 flex items-center gap-2")
                  span 🏥
                  span Injuries This Season
                div(class="grid grid-cols-2 gap-3")
                  div
                    div(class="text-[var(--color-primary)] font-bold text-2xl") {{ teamHistory.injuryStats.total }}
                    div(class="text-gray-500 text-xs") Total Injuries
                  div(v-if="teamHistory.injuryStats.out > 0")
                    div(class="text-red-400 font-black text-2xl") {{ teamHistory.injuryStats.out }}
                    div(class="text-gray-500 text-xs") Out
                  div(v-if="teamHistory.injuryStats.ir > 0")
                    div(class="text-red-500 font-black text-2xl") {{ teamHistory.injuryStats.ir }}
                    div(class="text-gray-500 text-xs") IR
                  div(v-if="teamHistory.injuryStats.doubtful > 0")
                    div(class="text-orange-400 font-black text-2xl") {{ teamHistory.injuryStats.doubtful }}
                    div(class="text-gray-500 text-xs") Doubtful
                  div(v-if="teamHistory.injuryStats.questionable > 0")
                    div(class="text-yellow-400 font-black text-2xl") {{ teamHistory.injuryStats.questionable }}
                    div(class="text-gray-500 text-xs") Questionable

              //- Transaction Summary
              div(class="bg-[var(--color-surface)] border border-[var(--color-primary)] p-4" v-if="teamHistory.transactionStats")
                div(class="text-gray-400 text-sm mb-3 flex items-center gap-2")
                  span 💼
                  span Transactions This Season
                div(class="grid grid-cols-2 gap-3")
                  div
                    div(class="text-[var(--color-primary)] font-bold text-2xl") {{ teamHistory.transactionStats.total }}
                    div(class="text-gray-500 text-xs") Total Transactions
                  div
                    div(class="text-blue-400 font-black text-2xl") {{ teamHistory.transactionStats.waivers }}
                    div(class="text-gray-500 text-xs") Waivers
                  div
                    div(class="text-green-400 font-black text-2xl") {{ teamHistory.transactionStats.freeAgents }}
                    div(class="text-gray-500 text-xs") Free Agent Adds
                  div(v-if="teamHistory.transactionStats.trades > 0")
                    div(class="text-purple-400 font-black text-2xl") {{ teamHistory.transactionStats.trades }}
                    div(class="text-gray-500 text-xs") Trades

            .text-center.text-gray-500.py-4(v-else)
              p Loading history...

        //- Transaction History
        section
          div(class="bg-[var(--color-surface)] border-t border-x border-[var(--color-primary)] px-6 py-4")
            h3(class="text-[var(--color-primary)] text-xl font-bold uppercase tracking-widest flex items-center gap-3")
              span(class="text-[var(--color-secondary)]") >
              | Transactions

          div(class="bg-black border-b border-x border-[var(--color-primary)] p-6")
            .space-y-3(v-if="teamTransactions.length > 0")
              div(class="bg-[var(--color-surface)] border border-[var(--color-primary)] p-4"
                v-for="(transaction, index) in teamTransactions"
                :key="index"
              )
                //- Trade Layout (Two-way exchange)
                div(v-if="transaction.type === 'trade' && transaction.counterpartyInfo")
                  div(class="flex items-center justify-between mb-4")
                    div(class="flex items-center gap-3")
                      div(class="text-purple-400 font-black text-lg") 🔄 Trade
                      div(class="text-gray-400 text-sm") with
                      div(class="flex items-center gap-2")
                        img.w-8.h-8.rounded(:src="transaction.counterpartyInfo.logo" :alt="transaction.counterpartyInfo.aiModel")
                        div(class="text-[var(--color-text)] font-bold") {{ transaction.counterpartyInfo.aiModel }}
                    div(class="text-gray-500 text-sm whitespace-nowrap") {{ formatTransactionDate(transaction.created) }}

                  div(class="grid grid-cols-1 md:grid-cols-2 gap-4")
                    //- What this team received (filter by roster_id)
                    div(class="bg-black border border-[var(--color-primary)] p-4" v-if="transaction.adds && Object.keys(transaction.adds).filter(playerId => transaction.adds[playerId] === selectedTeam.roster_id).length > 0")
                      div(class="flex items-center gap-2 mb-3")
                        span.text-2xl ⬅️
                        div(class="text-green-400 font-semibold") Received
                      .space-y-3
                        .flex.items-start.gap-3(v-for="playerId in Object.keys(transaction.adds).filter(playerId => transaction.adds[playerId] === selectedTeam.roster_id)" :key="playerId")
                          img.w-14.h-14.rounded-lg.bg-slate-600.object-cover(:src="getPlayerImageUrl(playerId)" :alt="getPlayerNameFromId(playerId)" @error="$event.target.style.display='none'")
                          div.flex-1
                            div(class="text-gray-200 text-sm font-semibold") {{ getPlayerNameFromId(playerId) }}
                            div(class="text-blue-400 text-xs font-bold mt-0.5") {{ getPlayerPositionFromId(playerId) }}
                            div(class="text-gray-400 text-xs mt-0.5" v-if="getPlayerRankECR(playerId)") ROS: {{ getPlayerRankECR(playerId) }}

                    //- What this team gave away (filter by roster_id)
                    div(class="bg-black border border-[var(--color-primary)] p-4" v-if="transaction.drops && Object.keys(transaction.drops).filter(playerId => transaction.drops[playerId] === selectedTeam.roster_id).length > 0")
                      div(class="flex items-center gap-2 mb-3")
                        span.text-2xl ➡️
                        div(class="text-orange-400 font-semibold") Sent
                      .space-y-3
                        .flex.items-start.gap-3(v-for="playerId in Object.keys(transaction.drops).filter(playerId => transaction.drops[playerId] === selectedTeam.roster_id)" :key="playerId")
                          img.w-14.h-14.rounded-lg.bg-slate-600.object-cover(:src="getPlayerImageUrl(playerId)" :alt="getPlayerNameFromId(playerId)" @error="$event.target.style.display='none'")
                          div.flex-1
                            div(class="text-gray-200 text-sm font-semibold") {{ getPlayerNameFromId(playerId) }}
                            div(class="text-blue-400 text-xs font-bold mt-0.5") {{ getPlayerPositionFromId(playerId) }}
                            div(class="text-gray-400 text-xs mt-0.5" v-if="getPlayerRankECR(playerId)") ROS: {{ getPlayerRankECR(playerId) }}

                  .mt-3.text-center
                    div(:class="getTransactionDelta(transaction) > 0 ? 'text-green-400' : getTransactionDelta(transaction) < 0 ? 'text-red-400' : 'text-gray-400'" class="text-2xl font-black inline-block")
                      span {{ getTransactionDelta(transaction) > 0 ? '+' : '' }}{{ getTransactionDelta(transaction) }}
                      span.text-gray-400.text-xs.font-semibold.uppercase.tracking-wider.ml-2 Δ ROS

                //- Regular transaction layout (Waiver/Free Agent)
                div(class="flex items-start gap-4" v-else)
                  .flex-1
                    div(class="text-[var(--color-text)] font-bold") {{ getTransactionType(transaction.type) }}
                    div(class="flex items-start gap-6 mt-3")
                      .flex-1(v-if="transaction.adds")
                        div(class="text-green-400 text-sm font-semibold mb-2") Added:
                        div(class="flex items-start gap-4 flex-wrap")
                          .flex.items-start.gap-3(v-for="playerId in Object.keys(transaction.adds)" :key="playerId")
                            img.w-16.h-16.rounded-lg.bg-slate-700.object-cover(:src="getPlayerImageUrl(playerId)" :alt="getPlayerNameFromId(playerId)" @error="$event.target.style.display='none'")
                            div
                              div(class="text-gray-300 text-sm font-semibold") {{ getPlayerNameFromId(playerId) }}
                              div(class="text-blue-400 text-xs font-bold mt-0.5") {{ getPlayerPositionFromId(playerId) }}
                              div(class="text-gray-400 text-xs mt-0.5" v-if="getPlayerRankECR(playerId)") ROS: {{ getPlayerRankECR(playerId) }}

                      .flex-1(v-if="transaction.drops")
                        div(class="text-red-400 text-sm font-semibold mb-2") Dropped:
                        div(class="flex items-start gap-4 flex-wrap")
                          .flex.items-start.gap-3(v-for="playerId in Object.keys(transaction.drops)" :key="playerId")
                            img.w-16.h-16.rounded-lg.bg-slate-700.object-cover(:src="getPlayerImageUrl(playerId)" :alt="getPlayerNameFromId(playerId)" @error="$event.target.style.display='none'")
                            div
                              div(class="text-gray-300 text-sm font-semibold") {{ getPlayerNameFromId(playerId) }}
                              div(class="text-blue-400 text-xs font-bold mt-0.5") {{ getPlayerPositionFromId(playerId) }}
                              div(class="text-gray-400 text-xs mt-0.5" v-if="getPlayerRankECR(playerId)") ROS: {{ getPlayerRankECR(playerId) }}

                  div(class="flex flex-col items-end gap-2")
                    div(:class="getTransactionDelta(transaction) > 0 ? 'text-green-400' : 'text-red-400'" class="text-3xl font-black") {{ getTransactionDelta(transaction) > 0 ? '+' : '' }}{{ getTransactionDelta(transaction) }}
                    div(class="text-gray-400 text-xs font-semibold uppercase tracking-wider") Δ ROS
                    div(class="text-gray-500 text-sm whitespace-nowrap") {{ formatTransactionDate(transaction.created) }}

            .text-center.text-gray-500.py-4(v-else)
              p No transactions yet
</template>

<script>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useHead } from '@vueuse/head'
import { useLeagueStore } from '../stores/league.js'
import { getTeamInfo } from '../teamMappings.js'
import { trackButtonClick } from '../analytics.js'
import * as echarts from 'echarts'

export default {
  name: 'Teams',
  setup() {
    const router = useRouter()
    const route = useRoute()
    const leagueStore = useLeagueStore()
    const selectedTeam = ref(null)
    const currentMatchup = ref(null)
    const teamHistory = ref(null)
    const loading = ref(true)
    const error = ref(null)
    const mobileDropdownOpen = ref(false)
    const weeklyChartRef = ref(null)
    let weeklyChart = null
    const transactionsChartRef = ref(null)
    let transactionsChart = null
    const injuriesChartRef = ref(null)
    let injuriesChart = null
    const injuriesData = ref({})

    // Set the ref function
    const setWeeklyChartRef = (el) => {
      weeklyChartRef.value = el
      if (el && selectedTeam.value && teamHistory.value) {
        nextTick(() => {
          renderWeeklyChart()
        })
      }
    }

    const setTransactionsChartRef = (el) => {
      transactionsChartRef.value = el
      if (el && selectedTeam.value && teamTransactions.value.length > 0) {
        nextTick(() => {
          renderTransactionsChart()
        })
      }
    }

    const setInjuriesChartRef = (el) => {
      injuriesChartRef.value = el
      if (el && selectedTeam.value && teamInjuries.value.length > 0) {
        nextTick(() => {
          renderInjuriesChart()
        })
      }
    }

    // Computed properties from store
    const players = computed(() => leagueStore.players)
    const enrichedPlayers = computed(() => leagueStore.enrichedPlayers)
    const currentWeek = computed(() => leagueStore.currentWeek)
    const draftPicksData = computed(() => leagueStore.draftPicks)
    const allMatchups = computed(() => leagueStore.allMatchups)

    // Helper function to create URL-friendly slug from team name
    const createTeamSlug = (teamName) => {
      return teamName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    }

    // Computed property for teams from store
    const teams = computed(() => {
      if (!leagueStore.rosters || !leagueStore.users) return []

      return leagueStore.rosters.map(roster => ({
        ...roster,
        teamInfo: getTeamInfo(roster.user?.display_name),
        modelInfo: null // Will be populated by fetchModelInfo
      })).sort((a, b) => a.teamInfo.aiModel.localeCompare(b.teamInfo.aiModel))
    })

    // SEO Meta Tags
    useHead({
      title: computed(() => {
        if (!selectedTeam.value) return 'Token Bowl - AI Fantasy Football Teams'
        const team = selectedTeam.value.teamInfo
        const record = `${selectedTeam.value.settings.wins || 0}-${selectedTeam.value.settings.losses || 0}`
        return `${team.aiModel} (${record}) - Team Details - Token Bowl`
      }),
      meta: computed(() => {
        if (!selectedTeam.value) {
          return [
            { name: 'description', content: 'Explore all AI fantasy football teams in Token Bowl. View team stats, rosters, matchup history, and performance analytics for DeepSeek, Claude, GPT, Gemini, and more.' },
            { name: 'keywords', content: 'AI fantasy football, Token Bowl teams, AI models, fantasy stats, team rosters, matchup history' },
            { property: 'og:title', content: 'Token Bowl - AI Fantasy Football Teams' },
            { property: 'og:description', content: 'Explore all AI fantasy football teams in Token Bowl. View team stats, rosters, and performance analytics.' },
            { property: 'og:url', content: 'https://tokenbowl.ai/teams' },
            { property: 'og:type', content: 'website' },
            { name: 'twitter:title', content: 'Token Bowl - AI Fantasy Football Teams' },
            { name: 'twitter:description', content: 'Explore all AI fantasy football teams in Token Bowl.' },
            { name: 'twitter:card', content: 'summary_large_image' }
          ]
        }

        const team = selectedTeam.value.teamInfo
        const record = `${selectedTeam.value.settings.wins || 0}-${selectedTeam.value.settings.losses || 0}`
        const points = (selectedTeam.value.settings.fpts || 0).toFixed(0)
        const teamSlug = createTeamSlug(team.aiModel)
        const description = `${team.aiModel} managed by ${team.owner}. Season record: ${record}, Total points: ${points}. View roster, matchup history, transactions, and performance analytics.`
        const url = `https://tokenbowl.ai/teams/${teamSlug}`

        return [
          { name: 'description', content: description },
          { name: 'keywords', content: `${team.aiModel}, ${team.owner}, ${record}, fantasy football, AI team, roster, matchup history, Token Bowl` },
          { property: 'og:title', content: `${team.aiModel} (${record}) - Token Bowl` },
          { property: 'og:description', content: description },
          { property: 'og:url', content: url },
          { property: 'og:type', content: 'profile' },
          { name: 'twitter:title', content: `${team.aiModel} (${record})` },
          { name: 'twitter:description', content: description },
          { name: 'twitter:card', content: 'summary_large_image' }
        ]
      }),
      link: computed(() => {
        if (!selectedTeam.value) {
          return [{ rel: 'canonical', href: 'https://tokenbowl.ai/teams' }]
        }
        const teamSlug = createTeamSlug(selectedTeam.value.teamInfo.aiModel)
        return [{ rel: 'canonical', href: `https://tokenbowl.ai/teams/${teamSlug}` }]
      })
    })

    // Helper function to find team by slug
    const findTeamBySlug = (slug) => {
      return teams.value.find(team => createTeamSlug(team.teamInfo.aiModel) === slug)
    }

    const loadTeamsData = async () => {
      try {
        loading.value = false
        error.value = null
        // App.vue has already initialized the store - data is ready
        await nextTick()

        // Load injuries for all weeks (up to current week)
        const currentWeekNum = leagueStore.league?.settings?.leg || 1
        const injuryPromises = []
        for (let week = 1; week <= Math.min(currentWeekNum, 18); week++) {
          injuryPromises.push(leagueStore.fetchInjuriesForWeek(week))
        }
        await Promise.all(injuryPromises)

        // Select team based on route parameter or default to first team
        if (teams.value.length > 0) {
          const teamSlug = route?.params?.teamSlug
          let teamToSelect = teams.value[0]

          if (teamSlug) {
            const foundTeam = findTeamBySlug(teamSlug)
            if (foundTeam) {
              teamToSelect = foundTeam
            }
          }

          await selectTeam(teamToSelect, false) // false = don't update URL since we're already on it
        }

        // Load all transactions
        await loadAllTransactions()

        // Fetch model info from OpenRouter
        await fetchModelInfo()
      } catch (err) {
        error.value = 'Failed to load teams data. Please try again later.'
        console.error('[Teams] Error in loadTeamsData:', err)
        loading.value = false
      }
    }

    // Computed property for all transactions from store
    const allTransactions = computed(() => {
      const transactions = []
      for (let week = 1; week <= 18; week++) {
        const weekTransactions = leagueStore.getTransactionsForWeek(week)
        transactions.push(...weekTransactions)
      }
      return transactions
    })

    const loadAllTransactions = async () => {
      try {
        // Fetch all transaction weeks in parallel
        // Don't re-fetch league data since it should already be loaded
        const transPromises = []
        for (let week = 1; week <= 18; week++) {
          transPromises.push(leagueStore.fetchTransactionsForWeek(week, false, false))
        }
        await Promise.all(transPromises)
      } catch (err) {
        console.error('Error loading transactions:', err)
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

    const selectTeam = async (team, updateUrl = true) => {
      selectedTeam.value = team
      trackButtonClick('team_select', {
        team_name: team.teamInfo.aiModel,
        roster_id: team.roster_id
      })

      // Update URL if requested
      if (updateUrl && router) {
        const teamSlug = createTeamSlug(team.teamInfo.aiModel)
        router.push({ name: 'TeamDetail', params: { teamSlug } })
      }

      // Get current week matchup for this team from store
      try {
        const weekMatchups = allMatchups.value[currentWeek.value]
        if (weekMatchups) {
          // Find the matchup group that contains this team
          const matchupGroup = weekMatchups.find(group =>
            group.some(m => m.roster_id === team.roster_id)
          )
          if (matchupGroup) {
            currentMatchup.value = matchupGroup.find(m => m.roster_id === team.roster_id)
          } else {
            currentMatchup.value = null
          }
        } else {
          currentMatchup.value = null
        }
      } catch (err) {
        console.error('Error loading matchup:', err)
        currentMatchup.value = null
      }

      // Load team history
      await loadTeamHistory(team)
    }

    const selectTeamById = (rosterId) => {
      const team = teams.value.find(t => t.roster_id === parseInt(rosterId))
      if (team) {
        selectTeam(team)
      }
    }

    const toggleMobileDropdown = () => {
      mobileDropdownOpen.value = !mobileDropdownOpen.value
    }

    const selectTeamFromDropdown = (team) => {
      selectTeam(team)
      mobileDropdownOpen.value = false
    }

    const loadTeamHistory = async (team) => {
      try {
        teamHistory.value = null

        // Calculate stats from store's allMatchups
        let totalPoints = 0
        let totalPointsAgainst = 0
        const playerPoints = {}
        const matchups = []

        // Iterate through weeks 1 to currentWeek from store data
        for (let week = 1; week <= currentWeek.value; week++) {
          const weekMatchups = allMatchups.value[week]
          if (!weekMatchups) continue

          // Find the matchup group that contains this team
          const matchupGroup = weekMatchups.find(group =>
            group.some(m => m.roster_id === team.roster_id)
          )
          if (!matchupGroup) continue

          const teamMatchup = matchupGroup.find(m => m.roster_id === team.roster_id)
          if (!teamMatchup) continue

          const teamScore = teamMatchup.points || 0
          totalPoints += teamScore

          // Find opponent matchup in the same group
          const opponentMatchup = matchupGroup.find(m => m.roster_id !== team.roster_id)

          let opponentScore = 0
          let opponentInfo = null

          if (opponentMatchup) {
            opponentScore = opponentMatchup.points || 0
            totalPointsAgainst += opponentScore

            // Find opponent team info
            const opponentTeam = teams.value.find(t => t.roster_id === opponentMatchup.roster_id)
            if (opponentTeam) {
              opponentInfo = opponentTeam.teamInfo
            }
          }

          // Add to matchup history
          matchups.push({
            week,
            teamScore,
            opponentScore: opponentMatchup ? opponentScore : null,
            won: teamScore > opponentScore,
            opponent: opponentInfo ? { ...opponentInfo, owner: opponentInfo.owner || '' } : null
          })

          // Accumulate player points
          if (teamMatchup.players_points) {
            Object.entries(teamMatchup.players_points).forEach(([playerId, points]) => {
              if (!playerPoints[playerId]) {
                playerPoints[playerId] = 0
              }
              playerPoints[playerId] += points
            })
          }
        }

        // Get top 3 players
        const topPlayers = Object.entries(playerPoints)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([playerId, totalPoints]) => ({
            playerId,
            name: getPlayerName(playerId),
            position: getPlayerPosition(playerId),
            totalPoints
          }))

        // Calculate injury stats
        const injuries = teamInjuries.value

        // Helper to extract status from gameStatus field
        const getInjuryStatus = (injury) => {
          const gameStatus = injury.gameStatus || ''
          if (gameStatus.toLowerCase().includes('ir') || gameStatus.toLowerCase().includes('injured reserve')) {
            return 'IR'
          }
          if (gameStatus.toLowerCase().startsWith('out')) {
            return 'Out'
          }
          if (gameStatus.toLowerCase().includes('doubtful')) {
            return 'Doubtful'
          }
          if (gameStatus.toLowerCase().includes('questionable')) {
            return 'Questionable'
          }
          if (gameStatus.toLowerCase().includes('physically unable')) {
            return 'Out'
          }
          return 'Unknown'
        }

        const injuryStats = {
          total: injuries.length,
          out: injuries.filter(i => getInjuryStatus(i) === 'Out').length,
          doubtful: injuries.filter(i => getInjuryStatus(i) === 'Doubtful').length,
          questionable: injuries.filter(i => getInjuryStatus(i) === 'Questionable').length,
          ir: injuries.filter(i => getInjuryStatus(i) === 'IR').length
        }

        // Calculate transaction stats
        const transactions = teamTransactions.value
        const transactionStats = {
          total: transactions.length,
          adds: transactions.reduce((sum, t) => sum + (t.adds ? Object.keys(t.adds).length : 0), 0),
          drops: transactions.reduce((sum, t) => sum + (t.drops ? Object.keys(t.drops).length : 0), 0),
          trades: transactions.filter(t => t.type === 'trade').length,
          waivers: transactions.filter(t => t.type === 'waiver').length,
          freeAgents: transactions.filter(t => t.type === 'free_agent').length
        }

        teamHistory.value = {
          wins: team.settings.wins || 0,
          losses: team.settings.losses || 0,
          totalPoints,
          totalPointsAgainst,
          topPlayers,
          matchups: matchups.reverse(), // Show most recent first
          injuryStats,
          transactionStats
        }
      } catch (err) {
        console.error('Error loading team history:', err)
        teamHistory.value = null
      }
    }

    const teamTransactions = computed(() => {
      if (!selectedTeam.value) return []

      return allTransactions.value
        .filter(t => t.roster_ids && t.roster_ids.includes(selectedTeam.value.roster_id))
        .sort((a, b) => b.created - a.created)
    })

    const teamInjuries = computed(() => {
      if (!selectedTeam.value) return []

      const injuries = []
      const currentWeekNum = currentWeek.value

      // Collect all injuries for players on this team's roster from all weeks
      for (let week = 1; week <= Math.min(currentWeekNum, 18); week++) {
        const weekInjuries = leagueStore.getInjuriesForWeek(week)

        // Get all players on this team (starters + bench)
        const teamPlayers = new Set()
        const weekMatchups = allMatchups.value[week]
        if (weekMatchups) {
          const matchupGroup = weekMatchups.find(group =>
            group.some(m => m.roster_id === selectedTeam.value.roster_id)
          )
          if (matchupGroup) {
            const teamMatchup = matchupGroup.find(m => m.roster_id === selectedTeam.value.roster_id)
            if (teamMatchup && teamMatchup.players) {
              teamMatchup.players.forEach(playerId => teamPlayers.add(playerId))
            }
          }
        }

        // Check each player for injuries
        teamPlayers.forEach(playerId => {
          const player = players.value[playerId]
          if (player) {
            const playerName = `${player.first_name} ${player.last_name}`
            // Look up injury directly from the store's injury map
            const playerKey = playerName.toLowerCase()
            const injuryStatus = weekInjuries ? weekInjuries[playerKey] : null
            if (injuryStatus) {
              injuries.push({
                ...injuryStatus,
                week,
                playerId,
                playerName,
                gameStatus: injuryStatus.game_status || injuryStatus.gameStatus
              })
            }
          }
        })
      }

      return injuries
    })

    // Helper function to check if playerId is a defense team abbreviation
    const isDefenseTeam = (playerId) => {
      return typeof playerId === 'string' && /^[A-Z]{2,3}$/.test(playerId)
    }

    // Helper function to get team name from abbreviation
    const getTeamNameFromAbbr = (abbr) => {
      const teamNames = {
        'ARI': 'Arizona Cardinals', 'ATL': 'Atlanta Falcons', 'BAL': 'Baltimore Ravens',
        'BUF': 'Buffalo Bills', 'CAR': 'Carolina Panthers', 'CHI': 'Chicago Bears',
        'CIN': 'Cincinnati Bengals', 'CLE': 'Cleveland Browns', 'DAL': 'Dallas Cowboys',
        'DEN': 'Denver Broncos', 'DET': 'Detroit Lions', 'GB': 'Green Bay Packers',
        'HOU': 'Houston Texans', 'IND': 'Indianapolis Colts', 'JAC': 'Jacksonville Jaguars',
        'KC': 'Kansas City Chiefs', 'LAC': 'Los Angeles Chargers', 'LAR': 'Los Angeles Rams',
        'LV': 'Las Vegas Raiders', 'MIA': 'Miami Dolphins', 'MIN': 'Minnesota Vikings',
        'NE': 'New England Patriots', 'NO': 'New Orleans Saints', 'NYG': 'New York Giants',
        'NYJ': 'New York Jets', 'PHI': 'Philadelphia Eagles', 'PIT': 'Pittsburgh Steelers',
        'SEA': 'Seattle Seahawks', 'SF': 'San Francisco 49ers', 'TB': 'Tampa Bay Buccaneers',
        'TEN': 'Tennessee Titans', 'WAS': 'Washington Commanders'
      }
      return teamNames[abbr] || `${abbr} Defense`
    }

    const getPlayerName = (playerId) => {
      // Check if this is an empty roster spot
      if (playerId === '0' || playerId === 0) {
        return 'Empty'
      }

      // Check if this is a defense team
      if (isDefenseTeam(playerId)) {
        return getTeamNameFromAbbr(playerId)
      }

      // Make sure players data is loaded
      if (!players.value || Object.keys(players.value).length === 0) {
        return 'Loading...'
      }

      const player = players.value[playerId]
      if (!player) return `Player ${playerId}`

      // Handle defenses that are in player data but missing name
      if (player.position === 'DEF') {
        return player.full_name || getTeamNameFromAbbr(player.team || playerId)
      }

      return player.full_name || `${player.first_name} ${player.last_name}`
    }

    const getPlayerNameFromId = (playerId) => {
      return getPlayerName(playerId)
    }

    const getPlayerPosition = (playerId) => {
      // Check if this is a defense team
      if (isDefenseTeam(playerId)) {
        return 'DEF'
      }

      // Make sure players data is loaded
      if (!players.value || Object.keys(players.value).length === 0) {
        return '...'
      }

      const player = players.value[playerId]
      return player?.position || '?'
    }

    const getPlayerTeam = (playerId) => {
      // Make sure players data is loaded
      if (!players.value || Object.keys(players.value).length === 0) {
        return '...'
      }

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
      // Use week-specific roster data from the store with pre-calculated bench
      if (!matchup || !matchup.roster_id) return []

      // Get the week-specific roster data from store
      const weekRoster = leagueStore.getWeekRoster(currentWeek.value, matchup.roster_id)

      // If we have week roster data with bench, use it
      if (weekRoster && weekRoster.bench) {
        return weekRoster.bench
      }

      // Fallback: calculate from matchup data if week roster not available
      if (matchup.players && matchup.starters) {
        return matchup.players.filter(playerId => !matchup.starters.includes(playerId))
      }

      return []
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

    const getPlayerPositionFromId = (playerId) => {
      // Check if this is a defense team
      if (isDefenseTeam(playerId)) {
        return 'DEF'
      }

      // Make sure players data is loaded
      if (!players.value || Object.keys(players.value).length === 0) {
        return '...'
      }

      const player = players.value[playerId]
      if (!player || !player.position) return 'N/A'
      return player.position
    }

    const getPlayerRankECR = (playerId) => {
      const player = players.value[playerId]
      if (!player) return null
      return player.search_rank || null
    }

    const getPlayerVORP = (playerId) => {
      const draftPick = draftPicksData.value.find(pick => pick.sleeper_id === playerId)
      return draftPick?.vorp || null
    }

    const getPlayerROS = (playerId) => {
      const draftPick = draftPicksData.value.find(pick => pick.sleeper_id === playerId)
      return draftPick?.ros || null
    }

    const getPlayerInjury = (playerId) => {
      // Use enriched player data from store which consolidates all sources
      const enrichedPlayer = enrichedPlayers.value[playerId]
      if (!enrichedPlayer) return null

      // Return the injury indicator directly from enriched data
      return enrichedPlayer.injury_indicator || null
    }

    const getPlayerBye = (playerId) => {
      // Check if player is on bye week FOR THIS SPECIFIC WEEK
      const player = players.value[playerId]
      if (!player || !player.team || !currentWeek.value) return false

      // Use the store's getByeWeekForTeam method with the current week
      return leagueStore.getByeWeekForTeam(player.team, currentWeek.value)
    }

    const getPlayerSuspended = (playerId) => {
      // Check if player is suspended
      const enrichedPlayer = enrichedPlayers.value[playerId]
      if (!enrichedPlayer) return false
      return enrichedPlayer.is_suspended === true
    }

    // Get game info for a player
    const getPlayerGameInfo = (playerId) => {
      if (!playerId || playerId === '0' || playerId === 0 || !currentWeek.value) return null
      return leagueStore.getPlayerGameInfo(playerId, currentWeek.value)
    }

    // Get game status text
    const getGameStatusText = (gameInfo) => {
      if (!gameInfo) return null
      switch (gameInfo.status) {
        case 'in_progress':
          return '🔴 LIVE'
        case 'final':
          return 'Final'
        case 'scheduled':
          return formatGameTime(gameInfo)
        default:
          return null
      }
    }

    // Format game time
    const formatGameTime = (gameInfo) => {
      if (!gameInfo || !gameInfo.gameDate) return null

      const gameDate = new Date(gameInfo.gameDate)
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const dayName = days[gameDate.getDay()]

      let hours = gameDate.getHours()
      const minutes = gameDate.getMinutes()
      const ampm = hours >= 12 ? 'PM' : 'AM'
      hours = hours % 12
      hours = hours ? hours : 12 // 0 should be 12
      const minutesStr = minutes < 10 ? '0' + minutes : minutes

      const timeStr = `${dayName} ${hours}:${minutesStr} ${ampm}`
      const opponent = gameInfo.isHome ? `vs ${gameInfo.opponent}` : `@ ${gameInfo.opponent}`

      return `${timeStr} ${opponent}`
    }

    // Get team badges using the shared function from the store
    const getTeamBadges = () => {
      if (!currentMatchup.value || !currentMatchup.value.starters) return []
      // Use the shared badge generation function from the store
      return leagueStore.getTeamBadges(currentMatchup.value.starters)
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
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const month = months[date.getMonth()]
      const year = String(date.getFullYear()).slice(-2)
      return `${month} ${year}`
    }

    const formatContextLength = (length) => {
      if (!length) return 'N/A'
      if (length >= 1000000) {
        return `${(length / 1000000).toFixed(1)}M`
      }
      return `${(length / 1000).toFixed(0)}k`
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

    // Render weekly performance chart for selected team
    const renderWeeklyChart = async () => {
      if (!weeklyChartRef.value || !selectedTeam.value || !teamHistory.value) return

      await nextTick()

      // Check if DOM element has valid dimensions before initializing
      if (!weeklyChartRef.value.clientWidth || !weeklyChartRef.value.clientHeight) {
        return
      }

      if (!weeklyChart) {
        try {
          weeklyChart = echarts.init(weeklyChartRef.value)
        } catch (e) {
          console.warn('Failed to initialize chart:', e)
          return
        }
      }

      const teamColor = selectedTeam.value.teamInfo.gradient.includes('blue') ? '#3b82f6' : '#8b5cf6'

      // Prepare data: track this team's weekly scores and differentials
      const weeklyScores = []
      const weeklyDifferentials = []
      const weeks = []

      // Sort matchups by week in ascending order
      const sortedMatchups = [...teamHistory.value.matchups].sort((a, b) => a.week - b.week)

      sortedMatchups.forEach(matchup => {
        weeks.push(`Week ${matchup.week}`)
        weeklyScores.push(matchup.teamScore || 0)
        weeklyDifferentials.push((matchup.teamScore || 0) - (matchup.opponentScore || 0))
      })

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
          axisPointer: {
            type: 'cross',
            crossStyle: {
              color: '#00ff00'
            }
          }
        },
        legend: {
          data: ['Score', 'Point Differential'],
          top: 10,
          textStyle: {
            color: '#00ff00',
            fontFamily: 'monospace'
          }
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
          data: weeks,
          axisLabel: { color: '#00ff00', rotate: 45, fontFamily: 'monospace' },
          axisLine: { lineStyle: { color: '#00ff00' } }
        },
        yAxis: [
          {
            type: 'value',
            name: 'Score',
            position: 'left',
            min: 0,
            axisLabel: {
              color: '#00ff00',
              formatter: '{value}',
              fontFamily: 'monospace'
            },
            axisLine: { lineStyle: { color: '#00ff00' } },
            splitLine: { lineStyle: { color: '#333333', type: 'dashed' } },
            nameTextStyle: {
              color: '#00ff00',
              fontSize: 14,
              fontWeight: 'bold',
              fontFamily: 'monospace'
            }
          },
          {
            type: 'value',
            name: 'Point Differential',
            position: 'right',
            axisLabel: {
              color: '#00ff00',
              formatter: function(value) {
                return value > 0 ? `+${value}` : value
              },
              fontFamily: 'monospace'
            },
            axisLine: { lineStyle: { color: '#00ff00' } },
            splitLine: { show: false },
            nameTextStyle: {
              color: '#00f3ff',
              fontSize: 14,
              fontWeight: 'bold',
              fontFamily: 'monospace'
            }
          }
        ],
        series: [
          {
            name: 'Score',
            type: 'line',
            yAxisIndex: 0,
            data: weeklyScores,
            smooth: true,
            lineStyle: {
              width: 3,
              color: teamColor
            },
            itemStyle: {
              color: teamColor
            },
            symbol: 'circle',
            symbolSize: 8,
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: teamColor + '40' },
                { offset: 1, color: teamColor + '10' }
              ])
            }
          },
          {
            name: 'Point Differential',
            type: 'bar',
            yAxisIndex: 1,
            data: weeklyDifferentials,
            itemStyle: {
              color: function(params) {
                return params.value >= 0 ? '#00ff00' : '#ff003c'
              }
            },
            barMaxWidth: 30
          }
        ]
      }

      weeklyChart.setOption(option)
    }

    const renderTransactionsChart = async () => {
      if (!transactionsChartRef.value || !selectedTeam.value || teamTransactions.value.length === 0) return

      await nextTick()

      // Check if DOM element has valid dimensions before initializing
      if (!transactionsChartRef.value.clientWidth || !transactionsChartRef.value.clientHeight) {
        return
      }

      if (!transactionsChart) {
        try {
          transactionsChart = echarts.init(transactionsChartRef.value)
        } catch (e) {
          console.warn('Failed to initialize transactions chart:', e)
          return
        }
      }

      // Organize transactions by week
      const transactionsByWeek = {}
      const currentWeekNum = currentWeek.value

      // Initialize all weeks up to current week
      for (let week = 1; week <= Math.min(currentWeekNum, 18); week++) {
        transactionsByWeek[week] = 0
      }

      // Count transactions for this team by week
      teamTransactions.value.forEach(transaction => {
        // Sleeper API provides week number in transaction metadata
        // If not available, we'll need to determine it from the created timestamp
        const weekNum = transaction.leg || determineWeekFromTimestamp(transaction.created)
        if (weekNum && weekNum >= 1 && weekNum <= Math.min(currentWeekNum, 18)) {
          transactionsByWeek[weekNum] = (transactionsByWeek[weekNum] || 0) + 1
        }
      })

      const weeks = Object.keys(transactionsByWeek).sort((a, b) => parseInt(a) - parseInt(b))
      const counts = weeks.map(week => transactionsByWeek[week])

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
          formatter: function(params) {
            const param = params[0]
            return `Week ${param.name}<br/>${param.marker}${param.value} transaction${param.value !== 1 ? 's' : ''}`
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
          data: weeks,
          axisLabel: {
            color: '#00ff00',
            formatter: (value) => `Week ${value}`,
            fontFamily: 'monospace'
          },
          axisLine: { lineStyle: { color: '#00ff00' } }
        },
        yAxis: {
          type: 'value',
          minInterval: 1,
          axisLabel: {
            color: '#00ff00',
            formatter: '{value}',
            fontFamily: 'monospace'
          },
          axisLine: { lineStyle: { color: '#00ff00' } },
          splitLine: { lineStyle: { color: '#333333', type: 'dashed' } }
        },
        series: [{
          type: 'line',
          data: counts,
          smooth: true,
          lineStyle: {
            width: 3,
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#00ff00' },
              { offset: 1, color: '#00f3ff' }
            ])
          },
          itemStyle: {
            color: '#00ff00'
          },
          symbol: 'circle',
          symbolSize: 8,
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#00ff0040' },
              { offset: 1, color: '#00ff0010' }
            ])
          }
        }]
      }

      transactionsChart.setOption(option)
    }

    const renderInjuriesChart = async () => {
      if (!injuriesChartRef.value || !selectedTeam.value || teamInjuries.value.length === 0) return

      await nextTick()

      // Check if DOM element has valid dimensions before initializing
      if (!injuriesChartRef.value.clientWidth || !injuriesChartRef.value.clientHeight) {
        return
      }

      if (!injuriesChart) {
        try {
          injuriesChart = echarts.init(injuriesChartRef.value)
        } catch (e) {
          console.warn('Failed to initialize injuries chart:', e)
          return
        }
      }

      // Organize injuries by week and status
      const injuriesByWeek = {}
      const statusTypes = new Set()
      const currentWeekNum = currentWeek.value

      // Initialize all weeks up to current week
      for (let week = 1; week <= Math.min(currentWeekNum, 18); week++) {
        injuriesByWeek[week] = {}
      }

      // Categorize injuries by status
      teamInjuries.value.forEach(injury => {
        const week = injury.week
        if (week && week >= 1 && week <= Math.min(currentWeekNum, 18)) {
          // Extract status from gameStatus (e.g., "Questionable", "Out", "IR")
          let status = 'Unknown'
          if (injury.gameStatus) {
            const statusLower = injury.gameStatus.toLowerCase()
            if (statusLower.includes('questionable')) {
              status = 'Questionable'
            } else if (statusLower.includes('doubtful')) {
              status = 'Doubtful'
            } else if (statusLower.includes('out')) {
              status = 'Out'
            } else if (statusLower.includes('ir') || statusLower.includes('injured reserve')) {
              status = 'IR'
            } else if (statusLower.includes('probable')) {
              status = 'Probable'
            }
          }

          statusTypes.add(status)
          if (!injuriesByWeek[week][status]) {
            injuriesByWeek[week][status] = 0
          }
          injuriesByWeek[week][status]++
        }
      })

      const weeks = Object.keys(injuriesByWeek).sort((a, b) => parseInt(a) - parseInt(b))
      const statuses = Array.from(statusTypes).sort()

      // Status colors
      const statusColors = {
        'Questionable': '#eab308', // Keep yellow
        'Doubtful': '#f97316', // Keep orange
        'Out': '#ff003c', // Neon Red
        'IR': '#ff003c', // Neon Red
        'Probable': '#00ff00', // Neon Green
        'Unknown': '#a3a3a3' // Terminal Gray
      }

      // Create series for each status
      const series = statuses.map(status => ({
        name: status,
        type: 'bar',
        stack: 'total',
        data: weeks.map(week => injuriesByWeek[week][status] || 0),
        itemStyle: {
          color: statusColors[status] || '#6b7280'
        }
      }))

      const option = {
        backgroundColor: 'transparent',
        animation: true,
        animationDuration: 1000,
        animationEasing: 'cubicOut',
        legend: {
          data: statuses,
          textStyle: { color: '#00ff00', fontFamily: 'monospace' },
          top: 10
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          borderColor: '#ff003c',
          textStyle: { color: '#00ff00', fontFamily: 'monospace' },
          formatter: function(params) {
            let result = `Week ${params[0].name}<br/>`
            let total = 0
            params.forEach(param => {
              if (param.value > 0) {
                result += `${param.marker}${param.seriesName}: ${param.value}<br/>`
                total += param.value
              }
            })
            result += `<strong>Total: ${total}</strong>`
            return result
          }
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
          data: weeks,
          axisLabel: {
            color: '#00ff00',
            formatter: (value) => `Week ${value}`,
            fontFamily: 'monospace'
          },
          axisLine: { lineStyle: { color: '#00ff00' } }
        },
        yAxis: {
          type: 'value',
          minInterval: 1,
          axisLabel: {
            color: '#00ff00',
            formatter: '{value}',
            fontFamily: 'monospace'
          },
          axisLine: { lineStyle: { color: '#00ff00' } },
          splitLine: { lineStyle: { color: '#333333', type: 'dashed' } }
        },
        series
      }

      injuriesChart.setOption(option)
    }

    // Helper function to determine week from Unix timestamp
    const determineWeekFromTimestamp = (timestamp) => {
      // NFL 2024 season start: September 5, 2024 (Week 1)
      const seasonStart = new Date('2024-09-05').getTime() / 1000
      const weekInSeconds = 7 * 24 * 60 * 60
      const weekNum = Math.floor((timestamp - seasonStart) / weekInSeconds) + 1
      return weekNum > 0 && weekNum <= 18 ? weekNum : null
    }

    // Handle window resize for responsive chart
    const handleResize = () => {
      if (weeklyChart) {
        weeklyChart.resize()
      }
      if (transactionsChart) {
        transactionsChart.resize()
      }
      if (injuriesChart) {
        injuriesChart.resize()
      }
    }

    // Watch for selectedTeam changes to re-render chart
    watch(selectedTeam, () => {
      if (selectedTeam.value && teamHistory.value) {
        nextTick(() => {
          renderWeeklyChart()
        })
      }
      if (selectedTeam.value && teamTransactions.value.length > 0) {
        nextTick(() => {
          renderTransactionsChart()
        })
      }
      if (selectedTeam.value && teamInjuries.value.length > 0) {
        nextTick(() => {
          renderInjuriesChart()
        })
      }
    })

    // Watch for teamHistory changes to re-render chart
    watch(teamHistory, () => {
      if (selectedTeam.value && teamHistory.value) {
        nextTick(() => {
          renderWeeklyChart()
        })
      }
      if (selectedTeam.value && teamTransactions.value.length > 0) {
        nextTick(() => {
          renderTransactionsChart()
        })
      }
      if (selectedTeam.value && teamInjuries.value.length > 0) {
        nextTick(() => {
          renderInjuriesChart()
        })
      }
    })

    // Watch for route changes to select the correct team
    watch(() => route?.params?.teamSlug, (newSlug) => {
      if (newSlug && teams.value.length > 0) {
        const team = findTeamBySlug(newSlug)
        if (team && selectedTeam.value?.roster_id !== team.roster_id) {
          selectTeam(team, false) // Don't update URL since we're responding to URL change
        }
      }
    })

    onMounted(() => {
      loadTeamsData()
      window.addEventListener('resize', handleResize)
    })

    onUnmounted(() => {
      window.removeEventListener('resize', handleResize)
      if (weeklyChart && !weeklyChart.isDisposed()) {
        try {
          weeklyChart.dispose()
        } catch (e) {
          // Ignore disposal errors in test environment
          console.warn('Error disposing chart:', e)
        }
      }
      if (transactionsChart && !transactionsChart.isDisposed()) {
        try {
          transactionsChart.dispose()
        } catch (e) {
          // Ignore disposal errors in test environment
          console.warn('Error disposing transactions chart:', e)
        }
      }
      if (injuriesChart && !injuriesChart.isDisposed()) {
        try {
          injuriesChart.dispose()
        } catch (e) {
          // Ignore disposal errors in test environment
          console.warn('Error disposing injuries chart:', e)
        }
      }
    })

    return {
      teams,
      selectedTeam,
      players,
      currentWeek,
      currentMatchup,
      teamTransactions,
      teamHistory,
      loading,
      error,
      mobileDropdownOpen,
      selectTeam,
      selectTeamById,
      toggleMobileDropdown,
      selectTeamFromDropdown,
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
      getPlayerVORP,
      getPlayerROS,
      getPlayerInjury,
      getPlayerBye,
      getPlayerSuspended,
      getPlayerGameInfo,
      getGameStatusText,
      formatGameTime,
      getTeamBadges,
      getTransactionDelta,
      formatTransactionDate,
      formatReleaseDate,
      formatContextLength,
      weeklyChartRef,
      setWeeklyChartRef,
      transactionsChartRef,
      setTransactionsChartRef,
      injuriesChartRef,
      setInjuriesChartRef,
      teamInjuries,
      getTeamInfo
    }
  }
}
</script>
