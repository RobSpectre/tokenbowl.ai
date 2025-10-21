/**
 * Sound Effects Utility for Broadcast
 * Generates and plays sound effects for scoring animations
 */

let audioContext = null
let hitSoundBuffer = null

/**
 * Initialize audio context
 */
function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
  }
  return audioContext
}

/**
 * Create a hit sound buffer (synthesized)
 */
function createHitSound() {
  const ctx = getAudioContext()
  const sampleRate = ctx.sampleRate
  const duration = 0.15 // 150ms
  const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate)
  const data = buffer.getChannelData(0)

  // Create a "hit" sound with frequency sweep and envelope
  for (let i = 0; i < buffer.length; i++) {
    const t = i / sampleRate
    const envelope = Math.exp(-t * 20) // Quick decay

    // Frequency sweep from 800Hz to 200Hz
    const frequency = 800 - (t / duration) * 600
    const phase = 2 * Math.PI * frequency * t

    // Add some noise for texture
    const noise = (Math.random() - 0.5) * 0.1

    // Combine sine wave and noise
    data[i] = (Math.sin(phase) * 0.3 + noise) * envelope
  }

  return buffer
}

/**
 * Play hit sound effect
 * @param {number} volume - Volume level (0-1)
 */
export function playHitSound(volume = 0.3) {
  try {
    const ctx = getAudioContext()

    // Create buffer if not exists
    if (!hitSoundBuffer) {
      hitSoundBuffer = createHitSound()
    }

    // Create source and gain nodes
    const source = ctx.createBufferSource()
    const gainNode = ctx.createGain()

    source.buffer = hitSoundBuffer
    gainNode.gain.value = Math.max(0, Math.min(1, volume))

    // Connect and play
    source.connect(gainNode)
    gainNode.connect(ctx.destination)
    source.start()

    console.log('[SOUND] Hit sound played')
  } catch (error) {
    console.warn('[SOUND] Failed to play hit sound:', error)
  }
}

/**
 * Play celebration sound (for large score increases)
 * @param {number} volume - Volume level (0-1)
 */
export function playCelebrationSound(volume = 0.3) {
  try {
    const ctx = getAudioContext()
    const duration = 0.3

    // Create a buffer for celebration sound
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate)
    const data = buffer.getChannelData(0)

    // Create ascending arpeggio
    const notes = [523.25, 659.25, 783.99] // C5, E5, G5
    const noteLength = (ctx.sampleRate * duration) / notes.length

    for (let i = 0; i < buffer.length; i++) {
      const noteIndex = Math.floor(i / noteLength)
      const frequency = notes[Math.min(noteIndex, notes.length - 1)]
      const t = i / ctx.sampleRate
      const envelope = Math.exp(-t * 8)

      data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.2
    }

    // Create source and gain nodes
    const source = ctx.createBufferSource()
    const gainNode = ctx.createGain()

    source.buffer = buffer
    gainNode.gain.value = Math.max(0, Math.min(1, volume))

    // Connect and play
    source.connect(gainNode)
    gainNode.connect(ctx.destination)
    source.start()

    console.log('[SOUND] Celebration sound played')
  } catch (error) {
    console.warn('[SOUND] Failed to play celebration sound:', error)
  }
}

/**
 * Play appropriate sound based on score increase
 * @param {number} scoreIncrease - Amount of points scored
 */
export function playScoreSound(scoreIncrease) {
  if (scoreIncrease >= 10) {
    playCelebrationSound(0.4)
  } else if (scoreIncrease >= 5) {
    playHitSound(0.4)
  } else {
    playHitSound(0.3)
  }
}
