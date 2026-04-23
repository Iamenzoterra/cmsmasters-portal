import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 7702,
    strictPort: true,
  },
  optimizeDeps: {
    // Defensive: pre-bundle the TS-source entrypoint of the workspace core package
    // so Vite dev server resolves it cleanly on first dev run (Phase 0 carry-over (b)).
    include: ['@cmsmasters/block-forge-core'],
  },
})
