import { createRouter, createWebHistory } from 'vue-router'
import Home from './pages/Home.vue'
import Draft from './pages/Draft.vue'
import Scoring from './pages/Scoring.vue'
import MatchupDetail from './pages/MatchupDetail.vue'
import Videos from './pages/Videos.vue'
import Teams from './pages/Teams.vue'
import Slopup from './pages/Slopup.vue'
import SlopupDetail from './pages/SlopupDetail.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/matchup/:week/:matchupId',
    name: 'MatchupDetail',
    component: MatchupDetail
  },
  {
    path: '/draft',
    name: 'Draft',
    component: Draft
  },
  {
    path: '/scoring',
    name: 'Scoring',
    component: Scoring
  },
  {
    path: '/videos',
    name: 'Videos',
    component: Videos
  },
  {
    path: '/teams',
    name: 'Teams',
    component: Teams
  },
  {
    path: '/teams/:teamSlug',
    name: 'TeamDetail',
    component: Teams
  },
  {
    path: '/slopup',
    name: 'Slopup',
    component: Slopup
  },
  {
    path: '/slopup/:slug',
    name: 'SlopupDetail',
    component: SlopupDetail
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // If there's a hash, wait for the page to render then scroll to that element
    if (to.hash) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            el: to.hash,
            behavior: 'smooth',
            top: 0
          })
        }, 500)
      })
    }
    // If there's a saved position (browser back/forward), use it
    if (savedPosition) {
      return savedPosition
    }
    // If only query params changed on the same path, preserve scroll position
    // EXCEPT for week param changes (handled by component with percentage-based scrolling)
    if (to.path === from.path && from.path) {
      // Check if week param changed - if so, let component handle scroll
      if (to.query.week !== from.query.week) {
        return false // Don't interfere - component handles this
      }
      return false // false means don't scroll
    }
    // Otherwise scroll to top
    return { top: 0 }
  }
})

export default router
