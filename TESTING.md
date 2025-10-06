# Testing Documentation

## Overview

This document describes the test suite for Token Bowl, focusing on preventing Player ID exposure and ensuring robust cache management.

## Running Tests

```bash
# Run tests once
npm run test:run

# Run tests in watch mode
npm test

# Run tests with UI
npm run test:ui
```

## Test Structure

### 1. **League Store Tests** (`src/tests/stores/league.test.js`)

Tests the Pinia store's critical functionality for player data management.

**Player Data Loading:**
- ✅ Fetches players with cache-busting when players object is empty
- ✅ Does NOT use cache-busting when players data exists
- ✅ Forces refresh when `forceRefresh=true`

**Player ID Exposure Prevention:**
- ✅ Never returns raw player IDs as display names
- ✅ Ensures players data is loaded before components render

**Cache Version Management:**
- ✅ Validates consistent cache version between store and main.js
- ✅ Clears cache when players data is missing after timestamp is set

**Cache Freshness:**
- ✅ Considers cache stale after 5 minutes
- ✅ Considers cache fresh within 5 minutes

**Race Condition Prevention:**
- ✅ Handles concurrent fetchPlayers calls without returning empty data
- ✅ Ensures only one fetch happens despite multiple concurrent calls
- ✅ All concurrent calls receive the same player data
- ✅ Does not return empty players when already loading

### 2. **Player Name Display Tests** (`src/tests/integration/playerNames.test.js`)

Critical safety tests to ensure Player IDs are NEVER exposed to users.

**Player Name Format Validation:**
- ✅ Rejects player ID patterns like "Player 1234"
- ✅ Accepts valid player names (e.g., "Josh Allen")
- ✅ Validates player objects have required fields

**Player Display Fallback Logic:**
- ✅ Has safe fallback when player data is missing
- ✅ Never constructs display names using player IDs

**Cache Corruption Detection:**
- ✅ Detects when players object exists but is empty
- ✅ Validates players object contains actual player data

**Team Display Safety:**
- ✅ Handles DEF teams without exposing Player IDs

**Roster Rendering Safety:**
- ✅ Validates all roster player IDs resolve to real names
- ✅ Detects missing player data in roster

### 3. **Cache Version Tests** (`src/tests/utils/cacheVersion.test.js`)

Tests for cache version management to prevent stale data issues.

**Version Mismatch Detection:**
- ✅ Detects when stored cache version is older
- ✅ Accepts when cache versions match
- ✅ Clears localStorage when version mismatches

**Cache Invalidation Scenarios:**
- ✅ Invalidates cache when upgrading from v2 to v3
- ✅ Preserves cache when versions match and data is valid

**Empty Players Detection:**
- ✅ Triggers cache-busting when players is empty object
- ✅ Does NOT trigger cache-busting when players has data
- ✅ Detects corrupted cache state

**Cache Busting Parameters:**
- ✅ Generates unique cache-busting URLs
- ✅ Uses cache reload option when busting

**Migration from Old Cache:**
- ✅ Handles upgrade from v1 (no version field)
- ✅ Handles corrupted JSON in localStorage
- ✅ Handles null or undefined localStorage values

## Test Results

```
 Test Files  4 passed (4)
      Tests  39 passed (39)
```

## Critical Test Coverage

### What We're Preventing

1. **Player ID Exposure Bug**
   - Users seeing "Player 4984" instead of "Josh Allen"
   - Caused by empty players cache + stale HTTP 304 responses
   - Tests validate player names never match `/^Player \d+$/` pattern

2. **Race Condition in Concurrent Data Loading**
   - When `Promise.all([fetchPlayers(), ...])` runs, multiple concurrent calls occur
   - Without fix: Second call returns empty players while first is still loading
   - With fix: All concurrent calls await the same promise and receive data
   - Tests verify only one API call is made and all callers receive player data

3. **Cache Corruption**
   - Empty players object with valid timestamp
   - Stale cache from old versions
   - Tests ensure cache-busting triggers when needed

4. **Version Mismatch**
   - Users stuck on old cache version
   - Tests ensure localStorage clears on version upgrade

5. **Missing Player Data for New Acquisitions**
   - When a player is added via waiver/trade, they must appear immediately
   - Solution: Cache includes top 400 players by rank (covers 99% of pickups)
   - Prevents "Player 4984" bug for newly acquired players
   - Tests verify fallback behavior works correctly

## Adding New Tests

When adding new features that involve player data:

1. Add validation that player names are displayed
2. Add cache freshness checks
3. Add error handling tests
4. Run `npm test` to verify all tests pass

## Continuous Integration

Tests run automatically via GitHub Actions:

### Test Workflow (`.github/workflows/test.yml`)
Runs on:
- Every push to `main` or `develop` branches
- Every pull request to `main` or `develop` branches

### Deploy Workflow (`.github/workflows/deploy.yml`)
- Tests must pass before deployment
- Deploys to GitHub Pages only after successful test run
- Runs on push to `main` branch

### Local Pre-commit Testing
Run tests before committing:
```bash
npm run test:run
```

All tests must pass before code can be deployed to production.

## Coverage Goals

Current coverage focuses on:
- ✅ Player data loading and caching
- ✅ Player name display safety
- ✅ Cache version management
- 🔄 Component rendering (future)
- 🔄 API error handling (future)
