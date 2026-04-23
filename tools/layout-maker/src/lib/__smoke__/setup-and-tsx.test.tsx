/// <reference types="vitest/globals" />
import { render } from '@testing-library/react'

// Proves three things in one render:
//   1. plugin-react transforms TSX → valid JS (vitest.config.ts plugins[])
//   2. jsdom environment exposes document/DOM APIs (vitest.config.ts environment)
//   3. src/test-setup.ts ran and wired @testing-library/jest-dom/vitest
//      matchers into expect (else .toBeInTheDocument would throw at runtime)
// If any of those three is broken, this test fails — loudly and specifically.

describe('test-setup + plugin-react + jsdom wiring', () => {
  it('renders TSX, attaches to jsdom, and matches via jest-dom', () => {
    const { getByText } = render(<span>hello jsdom</span>)
    expect(getByText('hello jsdom')).toBeInTheDocument()
  })
})
