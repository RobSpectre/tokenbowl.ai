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
        .flex.items-center.justify-between.flex-wrap.gap-3
          .flex.items-center.gap-3
            h1(class="text-white text-xl sm:text-3xl font-black uppercase tracking-wide")
              | Week {{ week }} Matchup
            //- Game Status Badge
            div(
              class="px-3 py-1 rounded-full text-xs font-bold uppercase"
              :class="gameStatus === 'Final' ? 'bg-gray-600 text-white' : gameStatus === 'In Progress' ? 'bg-green-500 text-white animate-pulse' : 'bg-blue-500 text-white'"
            ) {{ gameStatus }}
          //- Auto-refresh indicator
          div(v-if="isAutoRefreshActive" class="flex items-center gap-2 text-xs")
            div(class="w-2 h-2 rounded-full bg-green-500 animate-pulse")
            span(class="text-green-400") Live
            span(class="text-gray-300") • {{ lastUpdated?.toLocaleTimeString() || 'Updating...' }}

        //- Positions Yet to Start
        div(v-if="gameStatus !== 'Final' && getPositionsYetToStart().length > 0" class="bg-slate-800 px-4 sm:px-6 py-3 border-t border-slate-700")
          .flex.items-center.justify-center.gap-2.flex-wrap
            span.text-blue-400.text-sm.font-semibold.uppercase Yet to play: {{ getPlayersYetToPlayCount() }} {{ getPlayersYetToPlayCount() === 1 ? 'player' : 'players' }}
            span.text-blue-400.text-sm.font-semibold.uppercase •
            .flex.items-center.gap-2.flex-wrap
              span.px-2.py-1.rounded.text-xs.font-bold.bg-blue-600.text-white(
                v-for="position in getPositionsYetToStart()"
                :key="position"
              ) {{ position }}

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
            div(class="flex items-center justify-center gap-2 flex-wrap mt-2")
              div(
                v-for="badge in getTeamBadges(matchup[0])"
                :key="badge.type"
                :class="[badge.color, badge.color === 'bg-yellow-500' ? 'text-black' : 'text-white']"
                class="px-2 py-0.5 rounded text-xs font-bold"
              ) {{ badge.label }}
            div(
              class="text-white font-black text-5xl mt-4 transition-all duration-300"
              :class="{ 'score-pulse': isScoreAnimating(matchup[0].roster_id) }"
            ) {{ matchup[0].points?.toFixed(2) || '0.00' }}

          //- VS Separator
          div(class="flex-shrink-0 px-4")
            div(class="bg-slate-700 rounded-full px-4 py-2")
              span(class="text-white font-black text-lg") VS

          //- Team 2 (inverted layout - score on left, team info on right)
          div(class="flex-1 text-center bg-slate-800 rounded-lg p-6")
            div(
              class="text-white font-black text-5xl mb-4 transition-all duration-300"
              :class="{ 'score-pulse': isScoreAnimating(matchup[1].roster_id) }"
            ) {{ matchup[1].points?.toFixed(2) || '0.00' }}
            img(
              class="h-24 w-24 object-contain mx-auto mb-4"
              :src="getTeamInfo(matchup[1].roster?.user?.display_name).logo"
              :alt="getTeamInfo(matchup[1].roster?.user?.display_name).aiModel"
              :class="getTeamInfo(matchup[1].roster?.user?.display_name).invertLogo ? 'invert brightness-200' : ''"
            )
            div(class="text-white font-bold text-2xl") {{ getTeamInfo(matchup[1].roster?.user?.display_name).aiModel }}
            div(class="text-blue-400 text-lg font-semibold") {{ getTeamInfo(matchup[1].roster?.user?.display_name).owner }}
            div(class="flex items-center justify-center gap-2 flex-wrap mt-2")
              div(
                v-for="badge in getTeamBadges(matchup[1])"
                :key="badge.type"
                :class="[badge.color, badge.color === 'bg-yellow-500' ? 'text-black' : 'text-white']"
                class="px-2 py-0.5 rounded text-xs font-bold"
              ) {{ badge.label }}

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
                  div(class="flex items-center gap-1 flex-wrap mt-1")
                    div(
                      v-for="badge in getTeamBadges(matchup[0])"
                      :key="badge.type"
                      :class="[badge.color, badge.color === 'bg-yellow-500' ? 'text-black' : 'text-white']"
                      class="px-1.5 py-0.5 rounded text-[10px] font-bold"
                    ) {{ badge.label }}
              div(
                class="text-white font-black text-2xl transition-all duration-300"
                :class="{ 'score-pulse': isScoreAnimating(matchup[0].roster_id) }"
              ) {{ matchup[0].points?.toFixed(2) || '0.00' }}

          //- VS
          div(class="text-center")
            span(class="text-gray-400 font-semibold text-xs uppercase") vs

          //- Team 2 (inverted layout - score on left)
          .bg-slate-800.rounded-lg.p-4
            .flex.items-center.justify-between
              div(
                class="text-white font-black text-2xl transition-all duration-300"
                :class="{ 'score-pulse': isScoreAnimating(matchup[1].roster_id) }"
              ) {{ matchup[1].points?.toFixed(2) || '0.00' }}
              div(class="flex items-center gap-3")
                div(class="text-right")
                  div(class="text-white font-bold text-base") {{ getTeamInfo(matchup[1].roster?.user?.display_name).aiModel }}
                  div(class="text-blue-400 text-sm font-semibold") {{ getTeamInfo(matchup[1].roster?.user?.display_name).owner }}
                  div(class="flex items-center gap-1 flex-wrap justify-end mt-1")
                    div(
                      v-for="badge in getTeamBadges(matchup[1])"
                      :key="badge.type"
                      :class="[badge.color, badge.color === 'bg-yellow-500' ? 'text-black' : 'text-white']"
                      class="px-1.5 py-0.5 rounded text-[10px] font-bold"
                    ) {{ badge.label }}
                img(
                  class="h-14 w-14 object-contain"
                  :src="getTeamInfo(matchup[1].roster?.user?.display_name).logo"
                  :alt="getTeamInfo(matchup[1].roster?.user?.display_name).aiModel"
                  :class="getTeamInfo(matchup[1].roster?.user?.display_name).invertLogo ? 'invert brightness-200' : ''"
                )

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

      div(class="bg-slate-900 rounded-b-lg p-4 sm:p-6 space-y-4")
        //- Roster Slots (specific positions with colors)
        div(v-for="(slot, index) in getRosterSlots()" :key="slot.name")
          div(class="space-y-2")
            div(class="grid grid-cols-1 md:grid-cols-2 gap-2")
              //- Team 1 Player
              div(v-if="slot.team1Player")
                .bg-slate-800.rounded(:class="{ 'matchup-highlight': isPlayerScoreAnimating(slot.team1Player) }")
                  .p-3
                    .flex.items-center.gap-3
                      //- Position Label with Color
                      div(class="w-16 h-16 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                        :class="getSlotColor(slot.name)"
                      )
                        div(class="text-center")
                          div {{ slot.name }}
                      img.h-12.w-12.rounded-full.object-cover(
                        v-if="getPlayerPortrait(slot.team1Player)"
                        :src="getPlayerPortrait(slot.team1Player)"
                        :alt="getPlayerName(slot.team1Player)"
                        @error="$event.target.style.display='none'"
                      )
                      .flex-1
                        .flex.items-center.gap-2
                          .text-white.font-semibold.text-sm {{ getPlayerName(slot.team1Player) }}
                          //- EMPTY badge for player ID 0
                          div(
                            v-if="slot.team1Player === '0' || slot.team1Player === 0"
                            class="px-2 py-0.5 rounded text-xs font-bold bg-red-600 text-white"
                          ) EMPTY
                          //- BYE badge
                          div(
                            v-if="getPlayerBye(slot.team1Player)"
                            class="px-2 py-0.5 rounded text-xs font-bold bg-gray-600 text-white"
                          ) BYE
                          //- SUSP badge
                          div(
                            v-if="getPlayerSuspended(slot.team1Player)"
                            class="px-2 py-0.5 rounded text-xs font-bold bg-purple-600 text-white"
                          ) SUSP
                          //- Injury badges
                          div(
                            v-if="getPlayerInjury(slot.team1Player)"
                            class="px-2 py-0.5 rounded text-xs font-bold"
                            :class="getPlayerInjury(slot.team1Player) === 'O' || getPlayerInjury(slot.team1Player) === 'IR' ? 'bg-red-600 text-white' : getPlayerInjury(slot.team1Player) === 'D' ? 'bg-orange-500 text-white' : 'bg-yellow-500 text-black'"
                          ) {{ getPlayerInjury(slot.team1Player) }}
                        .text-gray-500.text-xs {{ getPlayerTeam(slot.team1Player) }} • {{ getPlayerPosition(slot.team1Player) }}
                        //- Game info (day/time)
                        div(class="text-xs mt-0.5" v-if="!isEmpty(slot.team1Player) && getPlayerGameInfo(slot.team1Player)")
                          span(:class="getPlayerGameInfo(slot.team1Player).status === 'in_progress' ? 'text-green-400 font-bold animate-pulse' : getPlayerGameInfo(slot.team1Player).status === 'final' ? 'text-gray-400' : 'text-blue-400'")
                            | {{ getGameStatusText(getPlayerGameInfo(slot.team1Player)) }}
                            span(v-if="getPlayerGameInfo(slot.team1Player).status === 'scheduled'" class="text-gray-400 ml-1")
                              | {{ getPlayerGameInfo(slot.team1Player).isHome ? 'vs' : '@' }} {{ getPlayerGameInfo(slot.team1Player).opponent }}
                      .text-right.flex-shrink-0
                        //- Score colored by game status
                        div(
                          class="font-bold text-lg transition-all duration-300"
                          :class="[{ 'score-pulse': isPlayerScoreAnimating(slot.team1Player) }, getScoreColorClass(slot.team1Player)]"
                        ) {{ getPlayerPoints(matchup[0], slot.team1Player) }}
                        //- Projected score underneath
                        div(class="text-xs text-gray-400 mt-0.5" v-if="!isEmpty(slot.team1Player) && getPlayerProjectedPoints(slot.team1Player) && getPlayerProjectedPoints(slot.team1Player) !== '-'")
                          | Proj: {{ getPlayerProjectedPoints(slot.team1Player) }}
                        //- Delta (actual vs projected) for final games
                        div(class="text-xs font-bold mt-0.5" v-if="getPlayerDelta(matchup[0], slot.team1Player)" :class="getPlayerDelta(matchup[0], slot.team1Player).colorClass")
                          | {{ getPlayerDelta(matchup[0], slot.team1Player).display }}
              div(v-else)
                .bg-slate-800.rounded.p-3.opacity-30
                  .flex.items-center.gap-3
                    div(class="w-16 h-16 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 bg-gray-700 text-gray-500")
                      div(class="text-center")
                        div {{ slot.name }}
                    .text-center.text-gray-600.flex-1 Empty

              //- Team 2 Player
              div(v-if="slot.team2Player")
                .bg-slate-800.rounded(:class="{ 'matchup-highlight': isPlayerScoreAnimating(slot.team2Player) }")
                  .p-3
                    .flex.items-center.gap-3.flex-row-reverse
                      //- Position Label with Color
                      div(class="w-16 h-16 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                        :class="getSlotColor(slot.name)"
                      )
                        div(class="text-center")
                          div {{ slot.name }}
                      img.h-12.w-12.rounded-full.object-cover(
                        v-if="getPlayerPortrait(slot.team2Player)"
                        :src="getPlayerPortrait(slot.team2Player)"
                        :alt="getPlayerName(slot.team2Player)"
                        @error="$event.target.style.display='none'"
                      )
                      .flex-1.text-right
                        .flex.items-center.gap-2.justify-end
                          //- Injury badges
                          div(
                            v-if="getPlayerInjury(slot.team2Player)"
                            class="px-2 py-0.5 rounded text-xs font-bold"
                            :class="getPlayerInjury(slot.team2Player) === 'O' || getPlayerInjury(slot.team2Player) === 'IR' ? 'bg-red-600 text-white' : getPlayerInjury(slot.team2Player) === 'D' ? 'bg-orange-500 text-white' : 'bg-yellow-500 text-black'"
                          ) {{ getPlayerInjury(slot.team2Player) }}
                          //- SUSP badge
                          div(
                            v-if="getPlayerSuspended(slot.team2Player)"
                            class="px-2 py-0.5 rounded text-xs font-bold bg-purple-600 text-white"
                          ) SUSP
                          //- BYE badge
                          div(
                            v-if="getPlayerBye(slot.team2Player)"
                            class="px-2 py-0.5 rounded text-xs font-bold bg-gray-600 text-white"
                          ) BYE
                          //- EMPTY badge for player ID 0
                          div(
                            v-if="slot.team2Player === '0' || slot.team2Player === 0"
                            class="px-2 py-0.5 rounded text-xs font-bold bg-red-600 text-white"
                          ) EMPTY
                          .text-white.font-semibold.text-sm {{ getPlayerName(slot.team2Player) }}
                        .text-gray-500.text-xs {{ getPlayerTeam(slot.team2Player) }} • {{ getPlayerPosition(slot.team2Player) }}
                        //- Game info (day/time)
                        div(class="text-xs mt-0.5 text-right" v-if="!isEmpty(slot.team2Player) && getPlayerGameInfo(slot.team2Player)")
                          span(:class="getPlayerGameInfo(slot.team2Player).status === 'in_progress' ? 'text-green-400 font-bold animate-pulse' : getPlayerGameInfo(slot.team2Player).status === 'final' ? 'text-gray-400' : 'text-blue-400'")
                            span(v-if="getPlayerGameInfo(slot.team2Player).status === 'scheduled'" class="text-gray-400 mr-1")
                              | {{ getPlayerGameInfo(slot.team2Player).isHome ? 'vs' : '@' }} {{ getPlayerGameInfo(slot.team2Player).opponent }}
                            | {{ getGameStatusText(getPlayerGameInfo(slot.team2Player)) }}
                      .text-left.flex-shrink-0
                        //- Score colored by game status
                        div(
                          class="font-bold text-lg transition-all duration-300"
                          :class="[{ 'score-pulse': isPlayerScoreAnimating(slot.team2Player) }, getScoreColorClass(slot.team2Player)]"
                        ) {{ getPlayerPoints(matchup[1], slot.team2Player) }}
                        //- Projected score underneath
                        div(class="text-xs text-gray-400 mt-0.5" v-if="!isEmpty(slot.team2Player) && getPlayerProjectedPoints(slot.team2Player) && getPlayerProjectedPoints(slot.team2Player) !== '-'")
                          | Proj: {{ getPlayerProjectedPoints(slot.team2Player) }}
                        //- Delta (actual vs projected) for final games
                        div(class="text-xs font-bold mt-0.5" v-if="getPlayerDelta(matchup[1], slot.team2Player)" :class="getPlayerDelta(matchup[1], slot.team2Player).colorClass")
                          | {{ getPlayerDelta(matchup[1], slot.team2Player).display }}
              div(v-else)
                .bg-slate-800.rounded.p-3.opacity-30
                  .flex.items-center.gap-3.flex-row-reverse
                    div(class="w-16 h-16 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 bg-gray-700 text-gray-500")
                      div(class="text-center")
                        div {{ slot.name }}
                    .text-center.text-gray-600.flex-1 Empty

            //- Position Differential Bar (only show if both players exist and scores differ)
            .relative.h-8.flex.items-center.bg-slate-800.rounded.overflow-hidden(
              v-if="slot.team1Player && slot.team2Player && getPositionDifferential(slot).team1Points !== getPositionDifferential(slot).team2Points"
            )
              //- Center Line
              div(class="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-slate-600 z-10")

              //- Team 1 winning bar (left side)
              div(
                v-if="getPositionDifferential(slot).team1Points > getPositionDifferential(slot).team2Points"
                class="absolute right-1/2 h-6 bg-gradient-to-l from-blue-500 to-blue-600 flex items-center justify-start pl-2 transition-all duration-500"
                :style="{ width: `${Math.min((getPositionDifferential(slot).differential / 25) * 45, 45)}%` }"
              )
                span.text-white.text-xs.font-bold +{{ getPositionDifferential(slot).differential.toFixed(1) }}

              //- Team 2 winning bar (right side)
              div(
                v-else-if="getPositionDifferential(slot).team2Points > getPositionDifferential(slot).team1Points"
                class="absolute left-1/2 h-6 bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-end pr-2 transition-all duration-500"
                :style="{ width: `${Math.min((getPositionDifferential(slot).differential / 25) * 45, 45)}%` }"
              )
                span.text-white.text-xs.font-bold +{{ getPositionDifferential(slot).differential.toFixed(1) }}

    //- Bench Players
    section.mb-8
      .bg-gradient-to-r.from-gray-600.to-gray-800.rounded-t-lg.px-6.py-4.border-b-4.border-yellow-400
        h2.text-white.text-2xl.font-black.uppercase.tracking-wide Bench

      div(class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900 rounded-b-lg p-6")
        //- Team 1 Bench
        div
          h3.text-white.font-bold.text-xl.mb-4 {{ getTeamInfo(matchup[0].roster?.user?.display_name).aiModel }}
          .space-y-2(v-if="getBenchPlayers(matchup[0]).length > 0")
            div(v-for="playerId in getBenchPlayers(matchup[0])" :key="playerId")
              .bg-slate-800.rounded(:class="{ 'matchup-highlight': isPlayerScoreAnimating(playerId) }")
                .p-3
                  .flex.items-center.gap-3
                    //- Position Label with Color
                    div(class="w-16 h-16 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                      :class="getPositionColor(getPlayerPosition(playerId))"
                    )
                      div(class="text-center")
                        div {{ getPlayerPosition(playerId) }}
                    img.h-12.w-12.rounded-full.object-cover(
                      v-if="getPlayerPortrait(playerId)"
                      :src="getPlayerPortrait(playerId)"
                      :alt="getPlayerName(playerId)"
                      @error="$event.target.style.display='none'"
                    )
                    .flex-1
                      .flex.items-center.gap-2
                        .text-white.font-semibold.text-sm {{ getPlayerName(playerId) }}
                        //- BYE badge
                        div(
                          v-if="getPlayerBye(playerId)"
                          class="px-2 py-0.5 rounded text-xs font-bold bg-gray-600 text-white"
                        ) BYE
                        //- SUSP badge
                        div(
                          v-if="getPlayerSuspended(playerId)"
                          class="px-2 py-0.5 rounded text-xs font-bold bg-purple-600 text-white"
                        ) SUSP
                        //- Injury badges
                        div(
                          v-if="getPlayerInjury(playerId)"
                          class="px-2 py-0.5 rounded text-xs font-bold"
                          :class="getPlayerInjury(playerId) === 'O' || getPlayerInjury(playerId) === 'IR' ? 'bg-red-600 text-white' : getPlayerInjury(playerId) === 'D' ? 'bg-orange-500 text-white' : 'bg-yellow-500 text-black'"
                        ) {{ getPlayerInjury(playerId) }}
                      .text-gray-500.text-xs {{ getPlayerTeam(playerId) }} • {{ getPlayerPosition(playerId) }}
                      //- Game info (day/time)
                      div(class="text-xs mt-0.5" v-if="!isEmpty(playerId) && getPlayerGameInfo(playerId)")
                        span(:class="getPlayerGameInfo(playerId).status === 'in_progress' ? 'text-green-400 font-bold animate-pulse' : getPlayerGameInfo(playerId).status === 'final' ? 'text-gray-400' : 'text-blue-400'")
                          | {{ getGameStatusText(getPlayerGameInfo(playerId)) }}
                          span(v-if="getPlayerGameInfo(playerId).status === 'scheduled'" class="text-gray-400 ml-1")
                            | {{ getPlayerGameInfo(playerId).isHome ? 'vs' : '@' }} {{ getPlayerGameInfo(playerId).opponent }}
                    .text-right.flex-shrink-0
                      //- Score colored by game status
                      div(
                        class="font-bold text-lg transition-all duration-300"
                        :class="[{ 'score-pulse': isPlayerScoreAnimating(playerId) }, getScoreColorClass(playerId)]"
                      ) {{ getPlayerPoints(matchup[0], playerId) }}
                      //- Projected score underneath
                      div(class="text-xs text-gray-400 mt-0.5" v-if="!isEmpty(playerId) && getPlayerProjectedPoints(playerId) && getPlayerProjectedPoints(playerId) !== '-'")
                        | Proj: {{ getPlayerProjectedPoints(playerId) }}
                      //- Delta (actual vs projected) for final games
                      div(class="text-xs font-bold mt-0.5" v-if="getPlayerDelta(matchup[0], playerId)" :class="getPlayerDelta(matchup[0], playerId).colorClass")
                        | {{ getPlayerDelta(matchup[0], playerId).display }}
          div(v-else)
            .text-gray-500.text-sm No bench players

        //- Team 2 Bench
        div
          h3.text-white.font-bold.text-xl.mb-4 {{ getTeamInfo(matchup[1].roster?.user?.display_name).aiModel }}
          .space-y-2(v-if="getBenchPlayers(matchup[1]).length > 0")
            div(v-for="playerId in getBenchPlayers(matchup[1])" :key="playerId")
              .bg-slate-800.rounded(:class="{ 'matchup-highlight': isPlayerScoreAnimating(playerId) }")
                .p-3
                  .flex.items-center.gap-3
                    //- Position Label with Color
                    div(class="w-16 h-16 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                      :class="getPositionColor(getPlayerPosition(playerId))"
                    )
                      div(class="text-center")
                        div {{ getPlayerPosition(playerId) }}
                    img.h-12.w-12.rounded-full.object-cover(
                      v-if="getPlayerPortrait(playerId)"
                      :src="getPlayerPortrait(playerId)"
                      :alt="getPlayerName(playerId)"
                      @error="$event.target.style.display='none'"
                    )
                    .flex-1
                      .flex.items-center.gap-2
                        .text-white.font-semibold.text-sm {{ getPlayerName(playerId) }}
                        //- BYE badge
                        div(
                          v-if="getPlayerBye(playerId)"
                          class="px-2 py-0.5 rounded text-xs font-bold bg-gray-600 text-white"
                        ) BYE
                        //- SUSP badge
                        div(
                          v-if="getPlayerSuspended(playerId)"
                          class="px-2 py-0.5 rounded text-xs font-bold bg-purple-600 text-white"
                        ) SUSP
                        //- Injury badges
                        div(
                          v-if="getPlayerInjury(playerId)"
                          class="px-2 py-0.5 rounded text-xs font-bold"
                          :class="getPlayerInjury(playerId) === 'O' || getPlayerInjury(playerId) === 'IR' ? 'bg-red-600 text-white' : getPlayerInjury(playerId) === 'D' ? 'bg-orange-500 text-white' : 'bg-yellow-500 text-black'"
                        ) {{ getPlayerInjury(playerId) }}
                      .text-gray-500.text-xs {{ getPlayerTeam(playerId) }} • {{ getPlayerPosition(playerId) }}
                      //- Game info (day/time)
                      div(class="text-xs mt-0.5" v-if="!isEmpty(playerId) && getPlayerGameInfo(playerId)")
                        span(:class="getPlayerGameInfo(playerId).status === 'in_progress' ? 'text-green-400 font-bold animate-pulse' : getPlayerGameInfo(playerId).status === 'final' ? 'text-gray-400' : 'text-blue-400'")
                          | {{ getGameStatusText(getPlayerGameInfo(playerId)) }}
                          span(v-if="getPlayerGameInfo(playerId).status === 'scheduled'" class="text-gray-400 ml-1")
                            | {{ getPlayerGameInfo(playerId).isHome ? 'vs' : '@' }} {{ getPlayerGameInfo(playerId).opponent }}
                    .text-right.flex-shrink-0
                      //- Score colored by game status
                      div(
                        class="font-bold text-lg transition-all duration-300"
                        :class="[{ 'score-pulse': isPlayerScoreAnimating(playerId) }, getScoreColorClass(playerId)]"
                      ) {{ getPlayerPoints(matchup[1], playerId) }}
                      //- Projected score underneath
                      div(class="text-xs text-gray-400 mt-0.5" v-if="!isEmpty(playerId) && getPlayerProjectedPoints(playerId) && getPlayerProjectedPoints(playerId) !== '-'")
                        | Proj: {{ getPlayerProjectedPoints(playerId) }}
                      //- Delta (actual vs projected) for final games
                      div(class="text-xs font-bold mt-0.5" v-if="getPlayerDelta(matchup[1], playerId)" :class="getPlayerDelta(matchup[1], playerId).colorClass")
                        | {{ getPlayerDelta(matchup[1], playerId).display }}
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
import { useHead } from '@vueuse/head'
import { getTeamInfo } from '../teamMappings.js'
// Removed: import { getPlayerInjuryStatus, getInjuryIndicator } from '../fantasyNerdsApi.js' - Now using enriched players from store
import { getMultiplePlayerStats } from '../sleeperApi.js'
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
    const playerStats = ref({}) // Player stats from undocumented Sleeper API
    const expandedPlayers = ref(new Set()) // Track which players have expanded stats
    const currentSeason = ref(2025)

    // Score animation tracking
    const animatingScores = ref(new Set())
    const animatingPlayerScores = ref(new Set())
    const previousScores = ref({})
    const previousPlayerScores = ref({})

    // Use computed property to access players from store
    const players = computed(() => leagueStore.players)
    const enrichedPlayers = computed(() => leagueStore.enrichedPlayers)

    // Use computed property to access fresh rosters from store
    const rosters = computed(() => leagueStore.rosters)

    // Compute game status
    const gameStatus = computed(() => {
      if (!matchup.value || !leagueStore.league) return 'Unknown'

      const currentWeek = leagueStore.league.settings?.leg || 0
      const matchupWeek = week.value

      // If matchup week is in the future
      if (matchupWeek > currentWeek) {
        return 'Not Started'
      }

      // If matchup week is in the past
      if (matchupWeek < currentWeek) {
        return 'Final'
      }

      // Current week - check if games are still being played
      // During NFL game hours (Thu 8PM - Mon 11:59PM EST), show "In Progress"
      if (isNFLGameTime()) {
        return 'In Progress'
      }

      // After game hours on current week, show "Final"
      return 'Final'
    })

    // SEO Meta Tags
    useHead({
      title: computed(() => {
        if (!matchup.value) return 'Token Bowl - Week Matchup'
        const team1 = getTeamInfo(matchup.value[0].roster?.user?.display_name)
        const team2 = getTeamInfo(matchup.value[1].roster?.user?.display_name)
        const score1 = matchup.value[0].points?.toFixed(2) || '0.00'
        const score2 = matchup.value[1].points?.toFixed(2) || '0.00'
        return `Week ${week.value}: ${team1.aiModel} ${score1} vs ${team2.aiModel} ${score2} - Token Bowl`
      }),
      meta: computed(() => {
        if (!matchup.value) return []
        const team1 = getTeamInfo(matchup.value[0].roster?.user?.display_name)
        const team2 = getTeamInfo(matchup.value[1].roster?.user?.display_name)
        const score1 = matchup.value[0].points?.toFixed(2) || '0.00'
        const score2 = matchup.value[1].points?.toFixed(2) || '0.00'
        const description = `Week ${week.value} matchup: ${team1.aiModel} (${score1}) vs ${team2.aiModel} (${score2}). Watch AI models compete in fantasy football with live stats, injury updates, and detailed player breakdowns.`
        const url = `https://tokenbowl.ai/matchup/${week.value}/${matchupId.value}`

        return [
          { name: 'description', content: description },
          { name: 'keywords', content: `${team1.aiModel}, ${team2.aiModel}, week ${week.value}, fantasy football, AI matchup, ${gameStatus.value}` },
          { property: 'og:title', content: `Week ${week.value}: ${team1.aiModel} vs ${team2.aiModel} - Token Bowl` },
          { property: 'og:description', content: description },
          { property: 'og:url', content: url },
          { property: 'og:type', content: 'article' },
          { name: 'twitter:title', content: `Week ${week.value}: ${team1.aiModel} vs ${team2.aiModel}` },
          { name: 'twitter:description', content: description },
          { name: 'twitter:card', content: 'summary_large_image' }
        ]
      }),
      link: computed(() => [
        { rel: 'canonical', href: `https://tokenbowl.ai/matchup/${week.value}/${matchupId.value}` }
      ])
    })

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
        console.log('🔊 Playing hit sound for score change')
        const audio = new Audio('/sounds/hit.wav')
        audio.volume = 0.3
        audio.play()
          .then(() => console.log('✅ Hit sound played successfully'))
          .catch(err => console.error('❌ Error playing sound:', err))
      } catch (err) {
        console.error('❌ Error creating audio:', err)
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
        // App.vue has already initialized the store - data is ready
        week.value = parseInt(route.params.week)
        matchupId.value = parseInt(route.params.matchupId)

        // Get matchup data and draft data from store
        const matchupsData = leagueStore.getMatchupsForWeek(week.value)
        draftData.value = leagueStore.draftPicks

        // Check if matchups data exists
        if (!matchupsData || !Array.isArray(matchupsData)) {
          throw new Error('No matchup data available for this week')
        }

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

        // Load injury data, weekly projections, and NFL schedule for this week
        injuries.value = await leagueStore.fetchInjuriesForWeek(week.value)
        await leagueStore.fetchWeeklyProjectionsForWeek(week.value)
        await leagueStore.loadNFLSchedule()

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
        console.log('🔄 Refreshing matchup data at', new Date().toLocaleTimeString())

        // Refresh current week data in the background
        await leagueStore.refreshCurrentWeek()

        // Get fresh matchup data from store
        const matchupsData = leagueStore.getMatchupsForWeek(week.value)

        // Check if matchups data exists
        if (!matchupsData || !Array.isArray(matchupsData)) {
          console.error('❌ No matchup data available for refresh')
          return
        }

        // Find the specific matchup from the week's matchups
        const matchupGroups = {}
        matchupsData.forEach(matchupGroup => {
          const matchupIdKey = matchupGroup[0].matchup_id
          matchupGroups[matchupIdKey] = matchupGroup
        })

        const newMatchup = matchupGroups[matchupId.value]
        if (newMatchup) {
          // Log score changes for debugging
          if (matchup.value) {
            const oldScore1 = matchup.value[0].points
            const oldScore2 = matchup.value[1].points
            const newScore1 = newMatchup[0].points
            const newScore2 = newMatchup[1].points

            if (oldScore1 !== newScore1 || oldScore2 !== newScore2) {
              console.log(`📊 Score update: Team 1: ${oldScore1} → ${newScore1}, Team 2: ${oldScore2} → ${newScore2}`)
            }
          }

          matchup.value = newMatchup
        }

        // Update injury data
        injuries.value = await leagueStore.fetchInjuriesForWeek(week.value)

        lastUpdated.value = new Date()
        console.log('✅ Refresh complete at', lastUpdated.value.toLocaleTimeString())
      } catch (err) {
        console.error('❌ Error refreshing matchup:', err)
      }
    }

    // Start auto-refresh
    const startAutoRefresh = () => {
      if (autoRefreshInterval.value) {
        console.log('⚠️ Auto-refresh already running')
        return
      }

      console.log('🎯 Starting auto-refresh for matchup detail at', new Date().toLocaleTimeString())
      isAutoRefreshActive.value = true

      // Do an immediate refresh
      refreshMatchupData()

      // Then refresh every 1 minute
      autoRefreshInterval.value = setInterval(refreshMatchupData, 60000)
      console.log('⏱️ Auto-refresh scheduled every 60 seconds')
    }

    // Stop auto-refresh
    const stopAutoRefresh = () => {
      if (autoRefreshInterval.value) {
        clearInterval(autoRefreshInterval.value)
        autoRefreshInterval.value = null
      }
      isAutoRefreshActive.value = false
      console.log('🛑 Stopped auto-refresh for matchup detail')
    }

    // Check if auto-refresh should be active
    const checkAutoRefreshStatus = () => {
      const now = new Date()
      const day = now.getDay()
      const hour = now.getHours()
      const shouldRefresh = isNFLGameTime()

      console.log(`🏈 NFL game time check: Day=${day}, Hour=${hour}, Should refresh=${shouldRefresh}`)

      if (shouldRefresh && !autoRefreshInterval.value) {
        console.log('✅ NFL game time detected, starting auto-refresh')
        startAutoRefresh()
      } else if (!shouldRefresh && autoRefreshInterval.value) {
        console.log('⏸️ Not NFL game time, stopping auto-refresh')
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
      if (playerId === '0' || playerId === 0) return 'Empty'
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

    const getPlayerProjectedPoints = (playerId) => {
      if (!playerId || !week.value) return '-'

      const projection = leagueStore.getPlayerWeeklyProjection(playerId, week.value)
      if (!projection || !projection.projectedPoints) return '-'

      return projection.projectedPoints.toFixed(1)
    }

    const getPlayerGameInfo = (playerId) => {
      if (!playerId || isEmpty(playerId) || !week.value) return null
      return leagueStore.getPlayerGameInfo(playerId, week.value)
    }

    const formatGameTime = (gameInfo) => {
      if (!gameInfo) return null

      const date = gameInfo.gameDate
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
      const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

      return `${dayName} ${time}`
    }

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

    const isEmpty = (playerId) => {
      return playerId === '0' || playerId === 0
    }

    const getBenchPlayers = (team) => {
      // Use week-specific roster data from the store with pre-calculated bench
      if (!team || !team.roster_id || !week.value) return []

      // Get the week-specific roster data from store
      const weekRoster = leagueStore.getWeekRoster(week.value, team.roster_id)

      // If we have week roster data with bench, use it
      if (weekRoster && weekRoster.bench) {
        return weekRoster.bench
      }

      // Fallback: calculate from matchup data if week roster not available
      if (team.players && team.starters) {
        return team.players.filter(playerId => !team.starters.includes(playerId))
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

    const getPlayerInjury = (playerId) => {
      // FIRST: Check current week injury data (most accurate)
      if (injuries.value && Object.keys(injuries.value).length > 0) {
        const player = players.value[playerId]
        if (player && player.full_name) {
          const playerName = player.full_name.toLowerCase()

          // Look for player in current week injuries
          const injuryKey = Object.keys(injuries.value).find(k => k.toLowerCase() === playerName)

          if (injuryKey) {
            // Player IS in injury report - use current data
            const injuryData = injuries.value[injuryKey]
            const statusToCheck = injuryData.game_status?.toUpperCase()

            if (statusToCheck) {
              // Check for Doubtful BEFORE Out (since "DOUBTFUL" contains "OUT")
              if (statusToCheck.includes('DOUBTFUL') || ((statusToCheck.includes('D ') || statusToCheck === 'D') && !statusToCheck.includes('SUSPENDED'))) {
                return 'D'
              }
              // Check for IR first, then Out (to separate them)
              if (statusToCheck.includes('INJURED RESERVE') || statusToCheck.includes('IR')) {
                return 'IR'
              }
              if (statusToCheck.includes('OUT')) {
                return 'O'
              }
              // Check for Questionable/PUP
              if (statusToCheck.includes('QUESTIONABLE') || statusToCheck.includes('Q ') || statusToCheck === 'Q' || statusToCheck.includes('PUP') || statusToCheck.includes('PHYSICALLY UNABLE')) {
                return 'Q'
              }
            }
          }
          // Player NOT in injury report = healthy, return null
          // Don't fall back to stale enrichedPlayer data
          return null
        }
      }

      // FALLBACK: Only use enriched/base player data if we don't have current week injury data
      const enrichedPlayer = enrichedPlayers.value[playerId]
      if (enrichedPlayer) {
        // Check injury_status_combined first (primary source)
        const statusToCheck = enrichedPlayer.injury_status_combined?.toUpperCase()

        if (statusToCheck) {
          // Check for Doubtful BEFORE Out (since "DOUBTFUL" contains "OUT")
          if (statusToCheck.includes('DOUBTFUL') || ((statusToCheck.includes('D ') || statusToCheck === 'D') && !statusToCheck.includes('SUSPENDED'))) {
            return 'D'
          }
          // Check for IR first, then Out (to separate them)
          if (statusToCheck.includes('INJURED RESERVE') || statusToCheck.includes('IR')) {
            return 'IR'
          }
          if (statusToCheck.includes('OUT')) {
            return 'O'
          }
          // Check for Questionable/PUP
          if (statusToCheck.includes('QUESTIONABLE') || statusToCheck.includes('Q ') || statusToCheck === 'Q' || statusToCheck.includes('PUP') || statusToCheck.includes('PHYSICALLY UNABLE')) {
            return 'Q'
          }
        }

        // Fallback to injury_indicator
        if (enrichedPlayer.injury_indicator) {
          return enrichedPlayer.injury_indicator
        }
      }

      // Final fallback: Check base Sleeper player injury status
      const player = players.value[playerId]
      if (player) {
        const sleeperStatus = player.injury_status?.toUpperCase()
        if (sleeperStatus) {
          if (sleeperStatus.includes('IR') || sleeperStatus.includes('INJURED RESERVE')) {
            return 'IR'
          }
          if (sleeperStatus.includes('OUT')) {
            return 'O'
          }
          if (sleeperStatus.includes('DOUBTFUL') || sleeperStatus === 'D') {
            return 'D'
          }
          if (sleeperStatus.includes('QUESTIONABLE') || sleeperStatus === 'Q' || sleeperStatus.includes('PUP')) {
            return 'Q'
          }
        }
      }

      return null
    }

    const getPlayerBye = (playerId) => {
      // Check if player is on bye week FOR THIS SPECIFIC MATCHUP WEEK
      const player = players.value[playerId]
      if (!player || !player.team || !week.value) return false

      // Use the store's getByeWeekForTeam method with the current matchup week
      return leagueStore.getByeWeekForTeam(player.team, week.value)
    }

    const getPlayerSuspended = (playerId) => {
      // Check if player is suspended
      const enrichedPlayer = enrichedPlayers.value[playerId]
      if (!enrichedPlayer) return false
      return enrichedPlayer.is_suspended === true
    }

    // Get score color class based on game status
    const getScoreColorClass = (playerId) => {
      if (!playerId || isEmpty(playerId) || !week.value) return 'text-white'

      const gameInfo = leagueStore.getPlayerGameInfo(playerId, week.value)
      if (!gameInfo) return 'text-white'

      switch (gameInfo.status) {
        case 'scheduled':
          return 'text-blue-400'
        case 'in_progress':
          return 'text-green-400'
        case 'final':
          return 'text-white'
        default:
          return 'text-white'
      }
    }

    // Calculate delta between actual and projected points
    const getPlayerDelta = (team, playerId) => {
      if (!playerId || isEmpty(playerId) || !week.value) return null

      const gameInfo = leagueStore.getPlayerGameInfo(playerId, week.value)
      // Only show delta for final games
      if (!gameInfo || gameInfo.status !== 'final') return null

      const actualPoints = parseFloat(getPlayerPoints(team, playerId)) || 0
      const projectedPointsStr = getPlayerProjectedPoints(playerId)
      if (projectedPointsStr === '-') return null

      const projectedPoints = parseFloat(projectedPointsStr) || 0
      const delta = actualPoints - projectedPoints

      return {
        value: delta,
        colorClass: delta >= 0 ? 'text-green-400' : 'text-red-400',
        display: delta >= 0 ? `Δ +${delta.toFixed(1)}` : `Δ ${delta.toFixed(1)}`
      }
    }

    // Get team badges using the shared function from the store
    const getTeamBadges = (team) => {
      if (!team || !team.starters) return []
      // Use the shared badge generation function from the store
      // Pass the current matchup week to calculate bye status correctly
      return leagueStore.getTeamBadges(team.starters, week.value)
    }

    // Map starters to specific roster slots with position-specific colors
    const getRosterSlots = () => {
      if (!matchup.value) return []

      const team1Starters = matchup.value[0].starters
      const team2Starters = matchup.value[1].starters

      // Define roster slots - Sleeper uses specific ordering in starters array
      const slots = [
        { name: 'QB', index: 0 },
        { name: 'RB1', index: 1 },
        { name: 'RB2', index: 2 },
        { name: 'WR1', index: 3 },
        { name: 'WR2', index: 4 },
        { name: 'TE', index: 5 },
        { name: 'FLEX1', index: 6 },
        { name: 'FLEX2', index: 7 },
        { name: 'K', index: 8 },
        { name: 'DEF', index: 9 }
      ]

      return slots.map(slot => ({
        name: slot.name,
        team1Player: team1Starters[slot.index],
        team2Player: team2Starters[slot.index]
      }))
    }

    // Get color class for specific roster slot
    const getSlotColor = (slotName) => {
      const colors = {
        'QB': 'bg-red-500 text-white',
        'RB1': 'bg-green-500 text-white',
        'RB2': 'bg-green-700 text-white',
        'WR1': 'bg-blue-500 text-white',
        'WR2': 'bg-blue-700 text-white',
        'TE': 'bg-yellow-500 text-black',
        'FLEX1': 'bg-teal-500 text-white',
        'FLEX2': 'bg-cyan-500 text-white',
        'K': 'bg-purple-500 text-white',
        'DEF': 'bg-orange-500 text-white'
      }
      return colors[slotName] || 'bg-gray-500 text-white'
    }

    // Calculate point differential for a specific position matchup
    const getPositionDifferential = (slot) => {
      const team1Points = parseFloat(getPlayerPoints(matchup.value[0], slot.team1Player)) || 0
      const team2Points = parseFloat(getPlayerPoints(matchup.value[1], slot.team2Player)) || 0
      const differential = Math.abs(team1Points - team2Points)

      return {
        team1Points,
        team2Points,
        differential
      }
    }

    // Get positions that have yet to start play for both teams
    const getPositionsYetToStart = () => {
      if (!matchup.value || !week.value) return []

      const positions = new Set()
      const slots = getRosterSlots()

      slots.forEach(slot => {
        // Check team 1 player
        if (slot.team1Player && slot.team1Player !== '0' && slot.team1Player !== 0) {
          const gameInfo = leagueStore.getPlayerGameInfo(slot.team1Player, week.value)
          if (gameInfo && gameInfo.status === 'scheduled') {
            positions.add(slot.name)
          }
        }

        // Check team 2 player
        if (slot.team2Player && slot.team2Player !== '0' && slot.team2Player !== 0) {
          const gameInfo = leagueStore.getPlayerGameInfo(slot.team2Player, week.value)
          if (gameInfo && gameInfo.status === 'scheduled') {
            positions.add(slot.name)
          }
        }
      })

      return Array.from(positions)
    }

    // Get count of players yet to play for both teams
    const getPlayersYetToPlayCount = () => {
      if (!matchup.value || !week.value) return 0

      let count = 0
      const slots = getRosterSlots()

      slots.forEach(slot => {
        // Check team 1 player
        if (slot.team1Player && slot.team1Player !== '0' && slot.team1Player !== 0) {
          const gameInfo = leagueStore.getPlayerGameInfo(slot.team1Player, week.value)
          if (gameInfo && gameInfo.status === 'scheduled') {
            count++
          }
        }

        // Check team 2 player
        if (slot.team2Player && slot.team2Player !== '0' && slot.team2Player !== 0) {
          const gameInfo = leagueStore.getPlayerGameInfo(slot.team2Player, week.value)
          if (gameInfo && gameInfo.status === 'scheduled') {
            count++
          }
        }
      })

      return count
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
      gameStatus,
      getTeamInfo,
      getPlayerName,
      getPlayerPoints,
      getPlayerPortrait,
      getPlayerPosition,
      getPlayerTeam,
      getPlayerVORP,
      getPlayerROS,
      getPlayerProjectedPoints,
      getPlayerGameInfo,
      getGameStatusText,
      getScoreColorClass,
      getPlayerDelta,
      isEmpty,
      getBenchPlayers,
      getPositionColor,
      getPlayerInjury,
      getPlayerBye,
      getPlayerSuspended,
      getTeamBadges,
      getRosterSlots,
      getSlotColor,
      getPositionDifferential,
      getPositionsYetToStart,
      getPlayersYetToPlayCount,
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