# Cache Fix Implementation Summary

## Problem Statement
Injury badges and other dynamic data were showing stale information for weeks/months because:
1. Dynamic data (injuries, projections, transactions) was being persisted to localStorage
2. The 5-minute refresh cycle didn't include dynamic data updates
3. enrichedPlayers was loaded once at startup and never refreshed
4. No distinction between static and dynamic data in caching strategy

## Changes Implemented

### 1. Cache Version Update (league.js:9)
```javascript
const CACHE_VERSION = 17 // v17: Remove dynamic data from persistence to fix stale injury badges
```
- Bumped from 16 to 17 to force cache clear for all users
- Ensures everyone gets fresh data on next page load

### 2. Removed Double Versioning (league.js:1135)
**Before:**
```javascript
persist: {
  key: 'tokenbowl-league-oct2025-v2',  // Changed key name
```

**After:**
```javascript
persist: {
  key: 'tokenbowl-league-oct2025',  // Keep same key, use CACHE_VERSION for versioning
```

**Why:** We had two versioning mechanisms (key name + version number). Now we only use version number checking, which is cleaner and more maintainable.

### 3. Removed Dynamic Data from Persistence (league.js:1136-1159)
**Removed from localStorage:**
- `enrichedPlayers` - Contains injury data that becomes stale
- `injuriesByWeek` - Dynamic injury data
- `weeklyProjectionsByWeek` - Changes daily
- `transactionsByWeek` - Changes frequently
- `processedInjuriesByTeam` - Derived from injuries
- `processedTransactionStats` - Derived from transactions

**Still Persisted (Static/Semi-Dynamic):**
- `league` - League settings
- `rosters` - Team records (updated on refresh)
- `users` - Team info
- `players` - Base player data
- `allMatchups` - Historical matchup data
- `playerStatsByWeek` - Historical stats
- `weekRosters` - Historical rosters
- `nflSchedule` - Season schedule
- `draftPicks` - Draft data
- `latestVideo`, `latestShorts` - YouTube data

### 4. Added Dynamic Data Refresh Method (league.js:719-754)
```javascript
async refreshDynamicData() {
  // Refreshes:
  // - Injuries for current + next week
  // - Projections for current week
  // - Transactions for current week
  // - Re-enriches players with fresh injury data
}
```

This method runs:
- On initial load (if cached data is > 5 minutes old)
- Every 5 minutes during background refresh
- When user navigates between weeks

### 5. Updated refreshCurrentWeek() (league.js:689-717)
**Added line 708:**
```javascript
await this.refreshDynamicData()
```

Now the 5-minute refresh includes:
1. League data (standings, current week)
2. Current week matchups
3. **NEW:** Dynamic data (injuries, projections, transactions)

### 6. Added Force Refresh to Fetch Methods

**fetchInjuriesForWeek(week, forceRefresh = false)** (league.js:972)
```javascript
// Now supports forcing a refresh even for completed weeks
if (!forceRefresh && this.injuriesByWeek[week] && isWeekCompleted) {
  return this.injuriesByWeek[week]
}
```

**fetchWeeklyProjectionsForWeek(week, forceRefresh = false)** (league.js:997)
```javascript
// Now supports forcing a refresh
if (!forceRefresh && this.weeklyProjectionsByWeek[week]) {
  return this.weeklyProjectionsByWeek[week]
}
```

**fetchTransactionsForWeek(week, forceRefresh = false)** (league.js:912)
```javascript
// Now supports forcing a refresh even for completed weeks
if (!forceRefresh && this.transactionsByWeek[week] && isWeekCompleted) {
  return this.transactionsByWeek[week]
}
```

### 7. Updated loadEnrichedPlayers() (league.js:818)
```javascript
async loadEnrichedPlayers(forceRefresh = false) {
  // Skip cache check if forcing refresh
  if (!forceRefresh && Object.keys(this.enrichedPlayers).length > 0) {
    return
  }
  // Always fetches fresh injury data from API
}
```

## How It Works Now

### First Page Load (New User or Cache Cleared)
1. User visits site
2. `initialize()` runs in App.vue
3. Fetches all static data (league, rosters, players, matchups)
4. Fetches dynamic data (injuries, projections)
5. **Static data cached to localStorage**
6. **Dynamic data stored in memory only**

### Subsequent Page Loads (Within 5 Minutes)
1. User visits site
2. `initialize()` runs
3. **Immediately shows cached static data** (instant load)
4. Checks cache age (< 5 minutes)
5. No background refresh needed
6. Dynamic data fetched fresh from API

### Subsequent Page Loads (After 5 Minutes)
1. User visits site
2. `initialize()` runs
3. **Immediately shows cached static data** (instant load)
4. Checks cache age (> 5 minutes)
5. **Background refresh triggered**:
   - Refreshes league/rosters/matchups
   - **Refreshes injuries, projections, transactions**
   - Re-enriches players with fresh injury data
6. Page updates with fresh data

### Background Refresh (Every 5 Minutes)
If user stays on the site, every 5 minutes:
1. `refreshCurrentWeek()` runs
2. Updates standings, matchups
3. **Refreshes all dynamic data**
4. Badge indicators update automatically

### Week Navigation
When user changes week:
1. Fetches matchups for new week
2. Fetches transactions for new week
3. Fetches injuries for new week (in MatchupDetail)
4. All data is fresh

## Expected Behavior

### ✅ What's Fixed
1. **No more stale injury badges** - Injuries refresh every 5 minutes
2. **Fresh projections** - Weekly projections update regularly
3. **Current transactions** - Transaction data refreshes with current week
4. **Instant page loads** - Static data still cached for performance
5. **Automatic updates** - Users see fresh data without full page reload

### ✅ Performance Maintained
1. **Fast initial load** - Cached static data shows immediately
2. **Background updates** - Fresh data loads without blocking UI
3. **Smart caching** - Completed weeks cached, current week always fresh
4. **Reduced API calls** - Static data only fetched once

### ✅ User Experience
1. **Immediate content** - See standings and matchups instantly
2. **No loading spinners** - Cached data shows while fresh data loads
3. **Always current** - Injury status and badges reflect latest data
4. **No manual refresh** - Site auto-updates every 5 minutes

## Testing Checklist

### Manual Testing Steps
1. **Clear localStorage** - Open DevTools → Application → Local Storage → Clear
2. **Load homepage** - Verify standings and matchups load quickly
3. **Check injury badges** - Compare to Sleeper app, should match
4. **Wait 5 minutes** - Verify background refresh in console logs
5. **Change weeks** - Verify fresh data loads for each week
6. **Check console** - Look for refresh logs:
   ```
   🔄 Refreshing dynamic data (injuries, projections, transactions)...
   🌐 Loading injuries for week 7... (force: true)
   ✅ Dynamic data refreshed
   ```

### Automated Testing
- Tests in `src/tests/stores/league.test.js` need updating for CACHE_VERSION = 17
- Tests in `src/tests/utils/cacheVersion.test.js` need updating

## Rollback Plan

If issues occur, revert to previous version:
```bash
git revert HEAD
```

Or manually:
1. Change `CACHE_VERSION` back to 16
2. Restore removed fields to `persist.paths`
3. Remove `refreshDynamicData()` method
4. Remove `await this.refreshDynamicData()` from `refreshCurrentWeek()`

## Next Steps (Future Improvements)

### Phase 2: Loading States
- Add loading indicators for injury badges
- Show "refreshing..." state during background updates
- Visual feedback when data is stale

### Phase 3: Stale-While-Revalidate
- Show cached data immediately with "stale" indicator
- Fetch fresh data in background
- Update UI when fresh data arrives

### Phase 4: Request Deduplication
- Prevent multiple simultaneous fetches of same data
- Use pending request map

## Files Changed

1. **src/stores/league.js** - Main changes
   - Line 9: CACHE_VERSION = 17
   - Line 719-754: New refreshDynamicData() method
   - Line 708: Call refreshDynamicData() in refreshCurrentWeek()
   - Line 818: forceRefresh parameter for loadEnrichedPlayers()
   - Line 912: forceRefresh parameter for fetchTransactionsForWeek()
   - Line 972: forceRefresh parameter for fetchInjuriesForWeek()
   - Line 997: forceRefresh parameter for fetchWeeklyProjectionsForWeek()
   - Line 1135-1159: Updated persist configuration

2. **PINIA_CACHE_ANALYSIS.md** - Documentation (new file)
3. **CACHE_FIX_IMPLEMENTATION.md** - This file (new file)

## Migration Impact

### User Impact
- **First visit after deploy**: Cache clears, fresh load (2-3 seconds)
- **Subsequent visits**: Instant load with fresh injury data
- **No action required**: Users don't need to do anything

### Data Impact
- **localStorage size reduced**: Dynamic data no longer persisted
- **API calls increased slightly**: Dynamic data fetched more frequently
- **Memory usage unchanged**: Dynamic data was in memory anyway

## Success Metrics

Monitor in production:
1. **No reports of stale injury badges** (primary goal)
2. **Page load times remain < 1 second** (performance maintained)
3. **Background refresh logs show dynamic data updates** (feature working)
4. **No increase in error rates** (stability maintained)

## Conclusion

This implementation fixes the stale data problem while maintaining performance:
- Static data cached for instant loads
- Dynamic data refreshed every 5 minutes
- Clean separation between cached and fresh data
- Simple, maintainable versioning system
- Backward compatible (cache clears gracefully)