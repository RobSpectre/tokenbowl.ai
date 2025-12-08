<template lang="pug">
div
  div(v-for="section in bracketSections" :key="section.title || 'regular'")
    div(class="bg-black border-b border-x border-[var(--color-primary)] p-6 lg:p-4 mb-8 last:mb-0" v-if="section.matchups && section.matchups.length > 0")
      div(v-if="section.title" class="mb-6")
        h3(:class="section.headerClass" class="text-xl font-bold uppercase tracking-widest flex items-center gap-2")
          span {{ section.icon }}
          | {{ section.title }}
      div(class="grid grid-cols-1 gap-4 lg:gap-3")
        div(
          v-for="(matchup, index) in section.matchups"
          :key="matchup[0].matchup_id"
          @click="$emit('matchup-click', matchup)"
          class="bg-[var(--color-surface)] overflow-hidden hover:bg-[var(--color-background)] transition-all duration-200 cursor-pointer border border-[var(--color-primary)] terminal-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
          :class="{ 'matchup-highlight': matchup.length === 2 && isMatchupAnimating(selectedWeek, matchup[0].matchup_id) }"
        )
          div(class="p-4 lg:p-3" v-if="matchup.length === 2")
            //- Mobile Layout (stacked)
            div(class="flex flex-col gap-2 md:hidden")
              //- Bracket Badge (Mobile)
              div(v-if="getMatchupBracketInfo(matchup)" class="flex justify-center mb-1")
                div(class="px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                  :class="getMatchupBracketInfo(matchup).type === 'winners' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' : 'bg-slate-700/50 text-slate-400 border-slate-600/30'"
                ) {{ getBracketRoundName(getMatchupBracketInfo(matchup).r) }}
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
                      div(:class="getRecordColor(getRecordThroughWeek(allMatchups, matchup[0].roster_id, selectedWeek - 1).wins, getRecordThroughWeek(allMatchups, matchup[0].roster_id, selectedWeek - 1).losses)" class="text-xs font-bold") {{ getRecordThroughWeek(allMatchups, matchup[0].roster_id, selectedWeek - 1).wins }}-{{ getRecordThroughWeek(allMatchups, matchup[0].roster_id, selectedWeek - 1).losses }}
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
                      div(:class="getRecordColor(getRecordThroughWeek(allMatchups, matchup[1].roster_id, selectedWeek - 1).wins, getRecordThroughWeek(allMatchups, matchup[1].roster_id, selectedWeek - 1).losses)" class="text-xs font-bold") {{ getRecordThroughWeek(allMatchups, matchup[1].roster_id, selectedWeek - 1).wins }}-{{ getRecordThroughWeek(allMatchups, matchup[1].roster_id, selectedWeek - 1).losses }}
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
            div(class="hidden md:flex md:flex-col md:gap-2 lg:grid lg:grid-cols-[48px_minmax(200px,1fr)_auto_auto_auto_minmax(200px,1fr)_48px] lg:grid-rows-[auto_auto] lg:gap-x-4 lg:gap-y-3 lg:py-4 lg:px-6 relative")
              //- Bracket Badge (Desktop)
              div(v-if="getMatchupBracketInfo(matchup)" class="absolute top-1 left-1/2 transform -translate-x-1/2 lg:top-0 lg:-translate-y-1/2 z-10")
                div(class="px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm backdrop-blur-sm"
                  :class="getMatchupBracketInfo(matchup).type === 'winners' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' : 'bg-slate-700/50 text-slate-400 border-slate-600/30'"
                ) {{ getBracketRoundName(getMatchupBracketInfo(matchup).r) }}
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
                    span(:class="getRecordColor(getRecordThroughWeek(allMatchups, matchup[0].roster_id, selectedWeek - 1).wins, getRecordThroughWeek(allMatchups, matchup[0].roster_id, selectedWeek - 1).losses)" class="font-bold") {{ getRecordThroughWeek(allMatchups, matchup[0].roster_id, selectedWeek - 1).wins }}-{{ getRecordThroughWeek(allMatchups, matchup[0].roster_id, selectedWeek - 1).losses }}
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
                    span(:class="getRecordColor(getRecordThroughWeek(allMatchups, matchup[1].roster_id, selectedWeek - 1).wins, getRecordThroughWeek(allMatchups, matchup[1].roster_id, selectedWeek - 1).losses)" class="font-bold") {{ getRecordThroughWeek(allMatchups, matchup[1].roster_id, selectedWeek - 1).wins }}-{{ getRecordThroughWeek(allMatchups, matchup[1].roster_id, selectedWeek - 1).losses }}
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
              div(v-if="(selectedWeek === currentWeek || isWeekComplete(matchup)) && (matchup[0].points || 0) !== (matchup[1].points || 0)" class="hidden lg:block lg:col-start-2 lg:col-end-7")
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
            div(v-if="(selectedWeek === currentWeek || isWeekComplete(matchup)) && (matchup[0].points || 0) !== (matchup[1].points || 0)" class="mt-3 pt-3 border-t border-slate-700 lg:hidden")
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
            div(v-if="selectedWeek === currentWeek")
              WinProbabilityBar(
                :winProb="matchupWinProbabilities[String(matchup[0].matchup_id)] || null"
                :showDetails="false"
              )

            //- Universal Matchup Actions Footer
            div(class="mt-3 pt-3 border-t border-slate-700 flex justify-center bg-slate-900/30 -mx-4 -mb-4 lg:-mx-3 lg:-mb-3 py-2 relative z-20")
              button(
                @click.stop="$emit('tokens-click', matchup)"
                class="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800 hover:bg-[var(--color-primary)] text-[var(--color-primary)] hover:text-black transition-all duration-200 border border-[var(--color-primary)] group relative z-30"
              )
                span(class="text-lg") 🎟️
                span(class="text-xs font-bold uppercase tracking-wider") View Tokens
</template>

<script setup>
import { computed } from 'vue'
import { useLeagueStore } from '../stores/league'
import { getTeamInfo } from '../teamMappings.js'
import { getRecordThroughWeek, getRecordColor, getBracketRoundName } from '../utils/leagueHelpers.js'
import WinProbabilityBar from './WinProbabilityBar.vue'

const props = defineProps({
  bracketSections: {
    type: Array,
    required: true
  },
  allMatchups: {
    type: Object,
    required: true
  },
  selectedWeek: {
    type: Number,
    required: true
  },
  matchupWinProbabilities: {
    type: Object,
    default: () => ({})
  },
  animatingScores: {
    type: Set,
    default: () => new Set()
  },
  animatingMatchups: {
    type: Set,
    default: () => new Set()
  }
})

defineEmits(['matchup-click', 'tokens-click'])

const leagueStore = useLeagueStore()



const isWeekComplete = () => {
  if (!leagueStore.league) return false
  const current = leagueStore.league.settings.leg || 1
  return props.selectedWeek < current
}

const getMatchupBracketInfo = (matchup) => {
  if (!matchup || matchup.length !== 2) return null
  return leagueStore.getBracketMatchup(matchup[0].roster_id, matchup[1].roster_id)
}

const getTeamBadges = (matchup) => {
  if (!matchup || !matchup.starters) return []
  return leagueStore.getTeamBadges(matchup.starters, props.selectedWeek, 9)
}

const isScoreAnimating = (week, matchupId, rosterId) => {
  const key = `${week}-${matchupId}-${rosterId}`
  return props.animatingScores.has(key)
}

const isMatchupAnimating = (week, matchupId) => {
  const key = `${week}-${matchupId}`
  return props.animatingMatchups.has(key)
}
</script>

<style scoped>
.matchup-highlight {
  border-color: #22c55e;
  box-shadow: 0 0 15px rgba(34, 197, 94, 0.3);
  transform: scale(1.02);
}

.score-pulse {
  animation: scorePulse 2s ease-out;
}

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
</style>
