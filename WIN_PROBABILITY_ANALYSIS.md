# Win Probability Calculation Issues & Solution

## Problem Statement

The win probability calculation is showing highly inaccurate results. For example, Kimi K2 vs GPT shows 75% win probability for Kimi K2 even though GPT has 6 strong players yet to play.

## Root Cause Analysis

### Current Implementation Issues

1. **Historical Average ≠ Weekly Projection**
   - Current code uses 4-week historical average as "projection" (`winProbability.js:220-229`)
   - This is fundamentally wrong because a player's historical average is not the same as their expected points for this week
   - Example: A QB averaging 18 pts/week might be projected for 25 pts against a weak defense, or 12 pts against a strong defense

2. **Flawed Game Status Detection** (`useWinProbability.js:93-113` and `MatchupDetail.vue:846-864`)
   ```javascript
   // Current flawed logic:
   if (currentPoints === 0) return { status: 'scheduled', percentComplete: 0 }
   if (currentPoints >= projection * 0.9) return { status: 'final', percentComplete: 1.0 }
   ```

   **Why this is broken:**
   - A player with 4-week avg of 8 pts who scores 7.2 pts in Q1 gets marked as "final" (7.2/8 = 90%)
   - A defense averaging 7 pts that scores 6.3 pts in Q1 is considered "done" (6.3/7 = 90%)
   - No actual game time data is used - purely based on points vs historical average

3. **Variance Calculation Issues**
   - Variance is calculated from historical data, not from projection uncertainty
   - When a game is marked as "final" early, remaining variance becomes 0
   - This causes the Monte Carlo simulation to think there's no more uncertainty

## Example Scenarios Where Current Algorithm Fails

### Scenario 1: Low-scoring player busts early
- Player historical avg: 8 pts
- Player scores 2 pts in Q1
- Current algorithm: marks as "in_progress" at 25% complete (2/8)
- Reality: Game is only 25% complete but player might not score more
- Impact: Algorithm thinks player has 75% of game left to reach 8 pts, inflating win probability

### Scenario 2: High-scoring player has early success
- Player historical avg: 15 pts
- Player scores 13.5 pts by halftime
- Current algorithm: marks as "final" (13.5/15 = 90%)
- Reality: Player has entire 2nd half to play and could score 20+ pts
- Impact: Win probability freezes with player at 13.5, underestimating their team

### Scenario 3: Player hasn't played yet
- Player historical avg: 10 pts
- Player has 0 pts (game Sunday night)
- Current algorithm: marks as "scheduled" with full 10 pt projection
- Reality: Could be correct, but uses wrong projection source

## Solution Design

### Phase 1: Use Actual Projections (Critical Fix)

Replace historical averages with actual weekly projections:

**Sources available:**
1. Fantasy Nerds API: `getWeeklyProjections(week)` - ✅ Already integrated
2. Sleeper API: Has projection data in player stats - ✅ Available

**Implementation:**
- Modify `getPlayerProjectionAndVariance()` to accept weekly projections
- Use Fantasy Nerds projections as primary source
- Fallback to historical average only if no projection available
- Use projection-based variance (e.g., 30-40% of projection as std dev)

### Phase 2: Use NFL Schedule for Game Status (Critical Fix)

Stop inferring game status from points scored:

**Data available:**
1. NFL Schedule API: `getNFLSchedule()` - ✅ Available in league store
2. Schedule includes game times and current status

**Implementation:**
- Fetch NFL schedule for the week
- Determine actual game status (not started, in progress, final) from schedule
- Use game time to estimate percent complete (quarter-based)
- Only mark games as "final" when they're actually over

### Phase 3: Better Variance Modeling

Current variance is from historical data. Better approach:

**Projection-based variance:**
- High-variance positions (WR/RB): stdDev = projection * 0.45
- Medium-variance (QB): stdDev = projection * 0.35
- Low-variance (K/DST): stdDev = projection * 0.30

### Phase 4: Time-based Game Progress

For games in progress, scale remaining projection by time:

**Quarter-based scaling:**
- Start of game: 100% remaining
- End of Q1: 75% remaining
- Halftime: 50% remaining
- End of Q3: 25% remaining
- Final: 0% remaining

**Better than current point-based scaling because:**
- Doesn't penalize players for early success
- Doesn't over-credit players for slow starts
- Uses actual game state, not inferred from points

## Implementation Plan

1. ✅ Add projections API integration to win probability utils
2. ✅ Add NFL schedule data access to win probability calculation
3. ✅ Modify `getPlayerProjectionAndVariance()` to use actual projections
4. ✅ Create `getActualGameStatus()` function using NFL schedule
5. ✅ Update variance calculation to be projection-based
6. ✅ Test against current week data
7. ✅ Deploy and validate

## Expected Impact

- Win probabilities will be accurate even when players outperform/underperform early
- Games won't be marked as "final" until they actually end
- Projections will reflect matchup quality, not just historical averages
- Monte Carlo simulation will use proper uncertainty bounds
