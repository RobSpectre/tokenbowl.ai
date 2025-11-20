<template>
  <div class="test-status-container">
    <div
      class="test-status-content w-[100px]"
      v-motion
      :initial="{ opacity: 0, scale: 0.9 }"
      :enter="{ opacity: 1, scale: 1, transition: { duration: 600 } }"
    >
      <div v-if="loading" class="loading">
        <div class="loading-spinner"></div>
        <p>Loading test status...</p>
      </div>

      <div v-else-if="error" class="error">
        <div class="error-icon">⚠️</div>
        <p>{{ error }}</p>
      </div>

      <div v-else class="test-status-display">
        <!-- Rate Limit Warning -->
        <div v-if="hasRateLimitError" class="rate-limit-warning">
          ⚠️ GitHub API Rate Limit
        </div>

        <!-- Label Section -->
        <div class="label-section">
          <span class="status-icon">{{ hasFailures ? '❌' : '✅' }}</span>
          <h1 class="status-label">{{ label }}</h1>
        </div>

        <!-- Repos Section -->
        <div class="repos-section">
          <div
            v-for="(repo, index) in repoStatuses"
            :key="index"
            class="repo-item"
            :class="{ 'repo-failed': !repo.passing }"
          >
            <div class="repo-status" :class="{ 'status-failed': !repo.passing }">
              <span class="check-icon">{{ repo.passing ? '✓' : '✗' }}</span>
            </div>
            <span class="repo-name">{{ repo.name }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

export default {
  name: 'TestStatus',
  setup() {
    const route = useRoute()
    const loading = ref(true)
    const error = ref(null)
    const repoList = ref([])
    const repoStatuses = ref([])
    const baseLabel = ref('CI/CD')
    const previousFailureState = ref(false)
    let checkInterval = null

    const hasFailures = computed(() => {
      return repoStatuses.value.some(repo => !repo.passing)
    })

    const hasRateLimitError = computed(() => {
      return repoStatuses.value.some(repo => repo.error === 'rate_limit')
    })

    const label = computed(() => {
      if (hasFailures.value) {
        return 'Build Failures'
      }
      return 'All Builds Green'
    })

    const playErrorSound = () => {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()

        // Create a descending error beep sound
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        // Start with a high frequency and drop down (error beep)
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1)
        oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.2)

        oscillator.type = 'square' // Harsh square wave for error sound

        // Envelope: quick attack, sustained, quick release
        gainNode.gain.setValueAtTime(0, audioContext.currentTime)
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01)
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + 0.2)
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.25)

        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.25)

        console.log('[TEST STATUS] Error sound played')
      } catch (err) {
        console.error('[TEST STATUS] Error playing sound:', err)
      }
    }

    const checkRepoStatus = async (repoName) => {
      try {
        const [owner, repo] = repoName.split('/')
        if (!owner || !repo) {
          console.error(`[TEST STATUS] Invalid repo format: ${repoName}`)
          return { name: repoName, passing: false, error: 'invalid_format' }
        }

        // Build headers with optional GitHub token
        const headers = {
          'Accept': 'application/vnd.github.v3+json'
        }

        // Check for GitHub token in environment variable
        const githubToken = import.meta.env.VITE_GITHUB_ACCESS_TOKEN
        if (githubToken) {
          headers['Authorization'] = `Bearer ${githubToken}`
        }

        // First, get the default branch
        const repoResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}`,
          { headers }
        )

        if (!repoResponse.ok) {
          const errorType = repoResponse.status === 403 ? 'rate_limit' : 'api_error'
          console.error(`[TEST STATUS] GitHub API error getting repo info for ${repoName}:`, repoResponse.status)
          return { name: repoName, passing: false, error: errorType }
        }

        const repoData = await repoResponse.json()
        const defaultBranch = repoData.default_branch || 'main'

        console.log(`[TEST STATUS] ${repoName} default branch: ${defaultBranch}`)

        // Check GitHub Actions workflow status for default branch
        const response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/actions/runs?branch=${defaultBranch}&per_page=5&status=completed`,
          { headers }
        )

        if (!response.ok) {
          const errorType = response.status === 403 ? 'rate_limit' : 'api_error'
          console.error(`[TEST STATUS] GitHub API error for ${repoName}:`, response.status)
          return { name: repoName, passing: false, error: errorType }
        }

        const data = await response.json()

        if (!data.workflow_runs || data.workflow_runs.length === 0) {
          console.log(`[TEST STATUS] No workflow runs found for ${repoName}`)
          return { name: repoName, passing: true } // Assume passing if no runs
        }

        const latestRun = data.workflow_runs[0]
        const conclusion = latestRun.conclusion
        const passing = conclusion === 'success'

        console.log(`[TEST STATUS] ${repoName}: conclusion=${conclusion}, status=${latestRun.status}, passing=${passing}`)
        console.log(`[TEST STATUS] Latest run:`, {
          id: latestRun.id,
          name: latestRun.name,
          created_at: latestRun.created_at,
          conclusion: conclusion,
          status: latestRun.status,
          html_url: latestRun.html_url
        })

        return { name: repoName, passing }
      } catch (err) {
        console.error(`[TEST STATUS] Error checking ${repoName}:`, err)
        return { name: repoName, passing: false, error: 'network_error' }
      }
    }

    const checkAllRepos = async () => {
      console.log('[TEST STATUS] Checking all repos...')

      const statusPromises = repoList.value.map(repo => checkRepoStatus(repo))
      const statuses = await Promise.all(statusPromises)

      repoStatuses.value = statuses

      // Play error sound if we just transitioned to failure state
      const currentHasFailures = statuses.some(repo => !repo.passing)
      if (currentHasFailures && !previousFailureState.value) {
        console.log('[TEST STATUS] Failure detected! Playing error sound.')
        playErrorSound()
      }

      previousFailureState.value = currentHasFailures
    }

    const loadData = async () => {
      try {
        // Get query params
        const repoParam = route.query.repo
        const labelParam = route.query.label

        if (!repoParam) {
          error.value = 'Missing required parameter: repo'
          loading.value = false
          return
        }

        // Handle single repo or array of repos
        if (Array.isArray(repoParam)) {
          repoList.value = repoParam.filter(r => r && r.trim())
        } else {
          repoList.value = [repoParam].filter(r => r && r.trim())
        }

        if (repoList.value.length === 0) {
          error.value = 'No valid repos provided'
          loading.value = false
          return
        }

        // Set base label if provided (currently not used, but kept for future)
        if (labelParam) {
          baseLabel.value = labelParam
        }

        loading.value = false

        // Initial check
        await checkAllRepos()
      } catch (err) {
        console.error('[TEST STATUS] Error loading data:', err)
        error.value = 'Failed to load test status'
        loading.value = false
      }
    }

    onMounted(async () => {
      console.log('[TEST STATUS] Component mounted')
      await loadData()

      // Check every 60 seconds (1 minute)
      checkInterval = setInterval(checkAllRepos, 60000)
    })

    onUnmounted(() => {
      if (checkInterval) {
        clearInterval(checkInterval)
      }
    })

    return {
      loading,
      error,
      repoStatuses,
      label,
      hasFailures,
      hasRateLimitError
    }
  }
}
</script>

<style scoped>
.test-status-container {
  width: 100vw;
  height: 100vh;
  background: var(--color-background);
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
}

.test-status-content {
  min-height: 100px;
  background: #000000;
  border: 1px solid var(--color-primary);
  border-radius: 0;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.loading,
.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--color-text);
  font-size: 8px;
  width: 100%;
  height: 100%;
}

.loading p,
.error p {
  margin: 0;
  text-align: center;
  font-size: 8px;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-primary);
  border-top-color: transparent;
  border-radius: 0;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon {
  font-size: 24px;
}

.test-status-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 100%;
}

.label-section {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 4px;
  padding: 4px 0;
  border-bottom: 2px solid var(--color-primary);
}

.status-icon {
  font-size: 32px;
  line-height: 1;
}

.status-label {
  font-size: 10px;
  font-weight: 900;
  color: var(--color-primary);
  margin: 0;
  line-height: 1.1;
  white-space: nowrap;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.repos-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  align-items: center;
}

.repo-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  transition: all 0.3s ease;
}

.repo-item.repo-failed .repo-status {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.repo-status {
  width: 28px;
  height: 28px;
  border-radius: 0;
  background: #000000;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 2px solid var(--color-primary);
}

.repo-status.status-failed {
  background: #000000;
  border-color: #ff0000;
}

.check-icon {
  color: var(--color-primary);
  font-size: 16px;
  font-weight: 900;
  line-height: 1;
}

.repo-name {
  display: none; /* Hide repo names in compact view */
}

.rate-limit-warning {
  background: #000000;
  color: #ffaa00;
  border: 1px solid #ffaa00;
  font-size: 8px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 0;
  text-align: center;
  margin-bottom: 4px;
  animation: pulse 2s ease-in-out infinite;
}
</style>
