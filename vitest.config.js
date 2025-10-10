import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.{js,vue}'],
      exclude: [
        'src/tests/**',
        'src/**/*.test.js',
        'src/**/*.spec.js',
        'src/main.js',
        'src/router.js'
      ],
      all: true,
      thresholds: {
        lines: 30,
        functions: 51,
        branches: 61,
        statements: 30
      }
    }
  }
})
