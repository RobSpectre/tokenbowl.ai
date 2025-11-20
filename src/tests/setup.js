import { vi } from 'vitest'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
global.localStorage = localStorageMock

// Mock fetch globally
global.fetch = vi.fn()

// Mock HTMLCanvasElement and canvas context for ECharts
class MockCanvasRenderingContext2D {
  constructor() {
    this.canvas = null
    this.fillStyle = ''
    this.strokeStyle = ''
    this.lineWidth = 1
    this.lineCap = 'butt'
    this.lineJoin = 'miter'
    this.miterLimit = 10
    this.font = '10px sans-serif'
    this.textAlign = 'start'
    this.textBaseline = 'alphabetic'
    this.globalAlpha = 1
    this.globalCompositeOperation = 'source-over'
    this.imageSmoothingEnabled = true
    this.shadowBlur = 0
    this.shadowColor = 'transparent'
    this.shadowOffsetX = 0
    this.shadowOffsetY = 0
    this.dpr = 1 // Device pixel ratio
  }

  // Drawing methods
  clearRect() {}
  fillRect() {}
  strokeRect() {}
  fillText() {}
  strokeText() {}
  measureText() {
    return { width: 0 }
  }

  // Path methods
  beginPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  arc() {}
  arcTo() {}
  bezierCurveTo() {}
  quadraticCurveTo() {}
  rect() {}
  ellipse() {}
  fill() {}
  stroke() {}
  clip() {}
  isPointInPath() { return false }
  isPointInStroke() { return false }

  // Transform methods
  scale() {}
  rotate() {}
  translate() {}
  transform() {}
  setTransform() {}
  resetTransform() {}

  // Image methods
  drawImage() {}
  createImageData() {
    return { data: [], width: 0, height: 0 }
  }
  getImageData() {
    return { data: [], width: 0, height: 0 }
  }
  putImageData() {}

  // State methods
  save() {}
  restore() {}

  // Gradient/Pattern methods
  createLinearGradient() {
    return {
      addColorStop: () => {}
    }
  }
  createRadialGradient() {
    return {
      addColorStop: () => {}
    }
  }
  createPattern() { return null }
}

// Mock HTMLCanvasElement
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = vi.fn(function(contextType) {
    if (contextType === '2d') {
      const ctx = new MockCanvasRenderingContext2D()
      ctx.canvas = this
      return ctx
    }
    return null
  })

  // Mock canvas toDataURL
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mock')

  // Mock canvas toBlob
  HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
    callback(new Blob())
  })
}
