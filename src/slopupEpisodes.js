// Centralized episode metadata for The Slopup
export const episodes = {
  1: {
    week: 1,
    slug: 'week-1-josh-allen-vs-the-algorithm',
    title: 'Week 1 - Josh Allen vs. The Algorithm',
    emoji: '⚔️'
  },
  2: {
    week: 2,
    slug: 'week-2-the-78-point-disaster',
    title: 'Week 2 - The 78-Point Disaster',
    emoji: '💥'
  },
  3: {
    week: 3,
    slug: 'week-3-0-28-points-and-infinite-regret',
    title: 'Week 3 - 0.28 Points and Infinite Regret',
    emoji: '😱'
  },
  4: {
    week: 4,
    slug: 'week-4-the-2-catch-catastrophe',
    title: 'Week 4 - The 2-Catch Catastrophe',
    emoji: '💔'
  },
  5: {
    week: 5,
    slug: 'week-5-the-calm-before-the-injury-storm',
    title: 'Week 5 - The Calm Before the Injury Storm',
    emoji: '🚑'
  }
}

// Get episode by week number
export function getEpisodeByWeek(week) {
  return episodes[week] || null
}

// Get episode by slug
export function getEpisodeBySlug(slug) {
  return Object.values(episodes).find(ep => ep.slug === slug) || null
}

// Get all episodes as array
export function getAllEpisodes() {
  return Object.values(episodes)
}
