# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Token Bowl is a fantasy football league website showcasing the first AI-only fantasy football league. Each team is managed by a different AI model (DeepSeek, Gemini, Mistral, Qwen, Claude, GPT-OSS, Gemma, GPT, Kimi K2, and Grok).

## Tech Stack

- **Vue 3** (Composition API with `<script>` setup, not `<script setup>`)
- **Vite** - Build tool and dev server
- **Tailwind CSS 4** - Utility-first CSS with `@import "tailwindcss"` syntax
- **@vueuse/motion** - Animation library for Vue
- **Sleeper API** - Fantasy football data source

## Development Commands

```bash
npm install        # Install dependencies
npm run dev        # Start dev server (usually http://localhost:5173 or 5174)
npm run build      # Build for production
npm run preview    # Preview production build
```

## Architecture

### Core Files

- **`src/App.vue`** - Main component containing:
  - Header with Token Bowl logo
  - Current week matchups section
  - League standings table
  - All animations using `v-motion` directives

- **`src/sleeperApi.js`** - Sleeper API integration module with:
  - League ID: `1266471057523490816`
  - Functions: `getLeague()`, `getLeagueUsers()`, `getRosters()`, `getMatchups(week)`, `getLeagueData()`, `getCurrentMatchups()`
  - Data enrichment: Combines rosters with user data, sorts by wins/points

- **`src/teamMappings.js`** - Team configuration mapping Sleeper usernames to:
  - Owner names
  - AI model names
  - Color schemes (gradients)
  - Logo paths (`/public/images/logos/*.svg`)
  - Exports `getTeamInfo(username)` helper function

- **`src/style.css`** - Tailwind CSS 4 with custom theme variables using `@theme` directive

### Data Flow

1. `App.vue` mounts and calls `loadData()`
2. Parallel API calls fetch league data and current matchups
3. Sleeper API returns roster data with Sleeper usernames (e.g., "718Rob", "rickyrobinett")
4. `getTeamInfo(username)` maps Sleeper usernames to AI model branding
5. Vue renders matchups and standings with logos, colors, and animations

### Static Assets

- **`/public/images/transparent_logo.png`** - Token Bowl logo
- **`/public/images/logos/`** - AI model logos (deepseek-color.svg, gemini-color.svg, etc.)

## Key Design Patterns

- **Glassmorphism UI**: `bg-white/5 backdrop-blur-lg` for cards
- **Gradient backgrounds**: Dark purple/slate gradients for main background
- **Motion animations**: Staggered entry animations with delays (e.g., `delay: 300 + index * 100`)
- **Responsive grid**: `grid-cols-1 md:grid-cols-2` for matchups

## Important Notes

- Use Composition API with regular `<script>`, not `<script setup>`
- Tailwind 4 uses `@import "tailwindcss"` instead of separate utility imports
- All data is fetched client-side from Sleeper API (no backend)
- Team branding is critical - always use `getTeamInfo()` to map usernames to AI models
