<template>
  <span class="odometer-number font-mono">{{ formattedValue }}</span>
</template>

<script>
import { ref, watch, computed, onMounted } from 'vue'

export default {
  name: 'OdometerNumber',
  props: {
    value: {
      type: Number,
      default: 0
    },
    decimals: {
      type: Number,
      default: 0
    },
    playSound: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    const displayValue = ref(props.value)
    const animationFrame = ref(null)
    let audioContext = null
    let soundInterval = null

    const formattedValue = computed(() => {
      const num = displayValue.value.toFixed(props.decimals)
      const parts = num.split('.')
      // Add thousands separators to integer part
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      return parts.join('.')
    })

    // Initialize Web Audio API
    onMounted(() => {
      if (props.playSound && typeof window !== 'undefined') {
        try {
          audioContext = new (window.AudioContext || window.webkitAudioContext)()

          // Resume AudioContext on user interaction (required by browsers)
          const resumeAudio = () => {
            if (audioContext && audioContext.state === 'suspended') {
              audioContext.resume()
            }
          }

          // Try to resume on various user interactions
          document.addEventListener('click', resumeAudio, { once: true })
          document.addEventListener('keydown', resumeAudio, { once: true })
          document.addEventListener('touchstart', resumeAudio, { once: true })
        } catch (e) {
          console.warn('Web Audio API not supported', e)
        }
      }
    })

    // Play subtle cash register "ding" sound
    const playCentSound = () => {
      if (!audioContext || !props.playSound) return

      try {
        const now = audioContext.currentTime

        // Create a subtle "ding" with two frequencies for richness
        const oscillator1 = audioContext.createOscillator()
        const oscillator2 = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator1.connect(gainNode)
        oscillator2.connect(gainNode)
        gainNode.connect(audioContext.destination)

        // Main "ding" frequency (like a small bell)
        oscillator1.frequency.value = 1800
        oscillator1.type = 'sine'

        // Harmonic frequency for richness
        oscillator2.frequency.value = 2400
        oscillator2.type = 'sine'

        // Very subtle volume with quick decay
        gainNode.gain.setValueAtTime(0.04, now)
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.04)

        oscillator1.start(now)
        oscillator2.start(now)
        oscillator1.stop(now + 0.04)
        oscillator2.stop(now + 0.04)
      } catch (e) {
        // Silently fail if audio doesn't work
      }
    }

    const animateValue = (start, end, duration = 1000) => {
      const startTime = performance.now()
      const diff = end - start

      // Clear any existing sound interval
      if (soundInterval) {
        clearInterval(soundInterval)
        soundInterval = null
      }

      // If playSound is enabled and we're dealing with currency (decimals = 2)
      if (props.playSound && props.decimals === 2 && diff > 0) {
        const cents = Math.round(Math.abs(diff) * 100)
        const soundsToPlay = Math.min(cents, 100) // Cap at 100 sounds to avoid chaos

        if (soundsToPlay > 0) {
          const soundInterval = duration / soundsToPlay
          let soundsPlayed = 0

          // Play first sound immediately
          playCentSound()
          soundsPlayed++

          // Play remaining sounds at intervals
          const intervalId = setInterval(() => {
            if (soundsPlayed < soundsToPlay) {
              playCentSound()
              soundsPlayed++
            } else {
              clearInterval(intervalId)
            }
          }, soundInterval)
        }
      }

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)

        // Easing function for smooth animation (ease-out cubic)
        const easeOut = 1 - Math.pow(1 - progress, 3)
        displayValue.value = start + (diff * easeOut)

        if (progress < 1) {
          animationFrame.value = requestAnimationFrame(animate)
        } else {
          displayValue.value = end
        }
      }

      if (animationFrame.value) {
        cancelAnimationFrame(animationFrame.value)
      }
      animationFrame.value = requestAnimationFrame(animate)
    }

    watch(() => props.value, (newValue, oldValue) => {
      if (newValue !== oldValue) {
        animateValue(displayValue.value, newValue)
      }
    })

    return {
      formattedValue
    }
  }
}
</script>

<style scoped>
.odometer-number {
  display: inline-block;
  font-variant-numeric: tabular-nums;
  min-width: 1ch;
  transition: color 0.3s ease;
}
</style>
