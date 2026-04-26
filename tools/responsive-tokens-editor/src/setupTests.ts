// Hooks @testing-library/jest-dom matchers (toBeInTheDocument, toHaveTextContent,
// toBeDisabled, etc.) into Vitest's expect. Loaded via vite.config.ts test.setupFiles.
// Per PF.8 (layout-maker precedent — block-forge does not use it).
import '@testing-library/jest-dom/vitest'

// Vitest does NOT auto-cleanup the DOM between tests when `globals: false`
// (current vite.config.ts default). Without this, each render() accumulates DOM
// from prior tests → `screen.getByRole('alert')` finds N copies → test failures.
// (PF.13 — block-forge does not need this because it uses describe-scoped renders;
//  layout-maker does not need it because it uses globals:true. Phase 3 needs it.)
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
