/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  envDir: '../..',
  test: {
    css: true,                 // MANDATORY — saved memory feedback_vitest_css_raw.md
    environment: 'jsdom',
    globals: true,
  },
})
