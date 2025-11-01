# Token Bowl Pinia/Cache Architecture Analysis

## Current Problems
1. **Stale injury data** - Shows outdated badges (IR, Q, D, SUSP) for weeks/months
2. **Inconsistent data refresh** - Some data refreshes every 5 min, others never
3. **No loading states** - Users see stale data without knowing it's being refreshed
4. **Overly aggressive caching** - localStorage persists everything including dynamic data
5. **Incomplete refresh logic** - `refreshCurrentWeek()` doesn't update injuries/projections

## Data Architecture Overview

### Store Structure
```
league.js (Main Store)
├── Static Data (changes rarely)
│   ├── league settings
│   ├── users
│   └── draftPicks
├── Semi-Dynamic Data (changes weekly)
│   ├── rosters (wins/losses/points)
│   ├── allMatchups
│   ├── weekRosters
│   └── playerStatsByWeek
└── Dynamic Data (changes daily)
    ├── enrichedPlayers (injury status)
    ├── injuriesByWeek
    ├── weeklyProjectionsByWeek
    └── transactionsByWeek
```

### Current Persistence (localStorage)
**Problem**: EVERYTHING is persisted, including dynamic data that becomes stale
```javascript
persist: {
  key: 'tokenbowl-league-oct2025',
  paths: [
    'enrichedPlayers',        // ⚠️ Contains injury data!
    'injuriesByWeek',         // ⚠️ Injury data!
    'weeklyProjectionsByWeek', // ⚠️ Changes daily!
    'transactionsByWeek',     // ⚠️ Changes frequently!
    // ... plus all other data
  ]
}
```

## Data Requirements by Page

### Home.vue
**Data Needed:**
- `league` - Settings, current week
- `rosters` - Win/loss records
- `users` - Team names
- `allMatchups[selectedWeek]` - Current matchups
- `getTeamBadges()` - Injury badges (uses enrichedPlayers + injuriesByWeek)
- `currentStandings` - Sorted standings
- `fetchTransactionsForWeek()` - When week changes

**Problem**: Shows stale injury badges from cached enrichedPlayers

### MatchupDetail.vue
**Data Needed:**
- All Home.vue data
- `enrichedPlayers` - Player details, injury status
- `injuries` (fetchInjuriesForWeek) - Week-specific injuries
- `weeklyProjections` (fetchWeeklyProjectionsForWeek) - Player projections
- `nflSchedule` - For bye week calculation
- `players` - Base player data

**Problem**: Fetches fresh injuries but enrichedPlayers still stale

### Teams.vue
**Data Needed:**
- `rosters` - Team records
- `users` - Team info
- `enrichedPlayers` - Draft info, portraits

### Draft.vue
**Data Needed:**
- `draftPicks` - Static draft data
- `enrichedPlayers` - Player portraits, stats

### Chat.vue
**Data Needed:**
- External Token Bowl Chat API (no Pinia data)

### Videos.vue
**Data Needed:**
- `latestVideo`, `latestShorts` - YouTube data

## Key Problems in Data Flow

### 1. Initial Load (`initialize()`)
```javascript
// Current flow
1. Check cache version → clear if mismatch
2. If cached data exists → show immediately
3. If data > 5 minutes old → refreshCurrentWeek()
4. Load enrichedPlayers ONCE with injury data
```

**Problems:**
- enrichedPlayers loaded once, never refreshed
- injuriesByWeek loaded once per week, never refreshed
- 5-minute refresh doesn't include injuries

### 2. Background Refresh (`refreshCurrentWeek()`)
```javascript
async refreshCurrentWeek() {
  // ✅ Refreshes:
  - league data
  - rosters
  - users
  - current week matchups

  // ❌ Does NOT refresh:
  - enrichedPlayers (injury status)
  - injuriesByWeek
  - weeklyProjectionsByWeek
  - transactionsByWeek
}
```

### 3. Badge Generation (`getTeamBadges()`)
```javascript
// Priority order for injury status:
1. injuriesByWeek[week] → May be weeks old!
2. enrichedPlayers.injury_status_combined → Loaded once at startup!
3. players.injury_status → From Sleeper, also stale
```

## Action Plan

### Phase 1: Fix Data Freshness (Immediate)

#### 1.1 Stop Persisting Dynamic Data
```javascript
persist: {
  key: 'tokenbowl-league-oct2025-v2',  // Bump version
  paths: [
    // Keep static/semi-dynamic only
    'cacheVersion',
    'league',
    'rosters',
    'users',
    'currentWeek',
    'players',
    'allMatchups',
    'playerStatsByWeek',
    'weekRosters',
    'draftPicks',
    'nflSchedule',
    'lastFullLoad',
    'completedWeeks',
    // REMOVE these dynamic fields:
    // 'enrichedPlayers',
    // 'injuriesByWeek',
    // 'weeklyProjectionsByWeek',
    // 'transactionsByWeek',
  ]
}
```

#### 1.2 Add Proper Refresh for Dynamic Data
```javascript
async refreshDynamicData() {
  const currentWeek = this.currentWeek
  const promises = []

  // Refresh injuries for current and next week
  promises.push(this.fetchInjuriesForWeek(currentWeek))
  promises.push(this.fetchInjuriesForWeek(currentWeek + 1))

  // Refresh projections
  promises.push(this.fetchWeeklyProjectionsForWeek(currentWeek))

  // Refresh enriched players with fresh injury data
  promises.push(this.loadEnrichedPlayers(true)) // Add force param

  await Promise.all(promises)
}

async refreshCurrentWeek() {
  // ... existing code ...

  // Add dynamic data refresh
  await this.refreshDynamicData()
}
```

#### 1.3 Fix EnrichedPlayers to Always Use Fresh Data
```javascript
async loadEnrichedPlayers(forceRefresh = false) {
  // Skip cache check if forcing refresh
  if (!forceRefresh && Object.keys(this.enrichedPlayers).length > 0) {
    return
  }

  // Always fetch fresh injury data
  const currentWeek = this.currentWeek || 1
  const injuryData = await getInjuries(currentWeek)

  // ... rest of enrichment logic
}
```

### Phase 2: Add Loading States (Better UX)

#### 2.1 Add Loading Flags
```javascript
state: () => ({
  // ... existing state

  // Granular loading states
  loadingStates: {
    injuries: false,
    projections: false,
    transactions: false,
    enrichedPlayers: false,
  },

  // Track what's fresh
  dataFreshness: {
    injuries: null,      // timestamp
    projections: null,   // timestamp
    enrichedPlayers: null, // timestamp
  }
})
```

#### 2.2 Show Loading Indicators in UI
```vue
<!-- Home.vue -->
<template>
  <div v-if="badge.type === 'injury'" class="badge">
    <span v-if="!isInjuryDataFresh" class="opacity-50">
      {{ badge.label }}
      <LoadingSpinner size="xs" />
    </span>
    <span v-else>{{ badge.label }}</span>
  </div>
</template>
```

### Phase 3: Smart Caching Strategy

#### 3.1 Categorize Data by Volatility
```javascript
const DATA_REFRESH_INTERVALS = {
  STATIC: null,           // Never refresh (draft picks)
  WEEKLY: 7 * 24 * 60,   // Weekly (completed weeks)
  DAILY: 24 * 60,        // Daily (projections)
  HOURLY: 60,            // Hourly (injuries, transactions)
  REAL_TIME: 5,          // 5 min (current week matchups)
}
```

#### 3.2 Implement Stale-While-Revalidate Pattern
```javascript
async getInjuriesWithSWR(week) {
  const cached = this.injuriesByWeek[week]
  const cacheAge = this.dataFreshness.injuries?.[week]
  const maxAge = 60 * 60 * 1000 // 1 hour

  // Return cached immediately if available
  if (cached) {
    // Refresh in background if stale
    if (!cacheAge || Date.now() - cacheAge > maxAge) {
      this.fetchInjuriesForWeek(week) // Don't await
    }
    return cached
  }

  // No cache, must fetch
  return await this.fetchInjuriesForWeek(week)
}
```

### Phase 4: Performance Optimizations

#### 4.1 Differential Updates
```javascript
async updateMatchupPoints(week, matchupId, newPoints) {
  // Update only specific matchup instead of refetching all
  const matchup = this.allMatchups[week]?.find(m => m.matchup_id === matchupId)
  if (matchup) {
    matchup.points = newPoints
  }
}
```

#### 4.2 Request Deduplication
```javascript
// Prevent multiple simultaneous fetches
pendingRequests: new Map(),

async fetchWithDedup(key, fetcher) {
  if (this.pendingRequests.has(key)) {
    return await this.pendingRequests.get(key)
  }

  const promise = fetcher()
  this.pendingRequests.set(key, promise)

  try {
    const result = await promise
    return result
  } finally {
    this.pendingRequests.delete(key)
  }
}
```

## Implementation Priority

### Immediate (Fix Stale Data)
1. **Remove dynamic data from persistence** - Stop caching injuries/projections
2. **Fix refreshCurrentWeek()** - Include injury data refresh
3. **Force refresh enrichedPlayers** - On every refresh cycle

### Short Term (Better UX)
4. **Add loading states** - Show when data is being refreshed
5. **Implement SWR pattern** - Show cached, fetch fresh in background
6. **Add data freshness indicators** - Visual cues for stale data

### Long Term (Performance)
7. **Differential updates** - Update only changed data
8. **Request deduplication** - Prevent duplicate API calls
9. **Smart prefetching** - Preload next week's data

## Testing Strategy

1. **Clear localStorage** - Force fresh start
2. **Check injury badges** - Verify they match current Sleeper data
3. **Wait 5 minutes** - Ensure refresh includes injuries
4. **Change weeks** - Verify new data loads properly
5. **Network throttle** - Test loading states

## Migration Plan

1. **Bump CACHE_VERSION to 17** - Forces cache clear for all users
2. **Deploy persistence changes** - Stop caching dynamic data
3. **Add refresh logic** - Include injuries in periodic refresh
4. **Monitor for 24 hours** - Check for issues
5. **Add loading states** - Improve UX in follow-up release

## Success Metrics

- Injury badges match Sleeper API data within 5 minutes
- No stale data shown after page refresh
- Loading states visible during data fetches
- Page loads feel instant (cached static data)
- Dynamic data refreshes without full page reload