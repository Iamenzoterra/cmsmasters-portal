/**
 * @vitest-environment jsdom
 *
 * Phase 3 — cross-package contract test.
 *
 * Verifies that the same frozen WP-025 fixtures that core's own tests pin
 * produce the expected suggestion shapes on the UI side. Reads fixtures from
 * `packages/block-forge-core/src/__tests__/fixtures/` directly (not a copy)
 * so no drift risk — if core's fixtures shift, both layers fail together.
 *
 * Why per-file `@vitest-environment jsdom` and not global:
 *   `file-io.test.ts` uses `node:fs` and runs in Node env. Forcing jsdom
 *   globally adds ~50ms per test file and risks breaking Node-only APIs.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, screen, cleanup } from '@testing-library/react'
import type { BlockJson } from '../types'
import { useAnalysis } from '../lib/useAnalysis'
import { SuggestionList } from '../components/SuggestionList'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// From tools/block-forge/src/__tests__/ → repo root via 4x `../`, then down
// into core's fixtures.
const FIXTURES = path.resolve(
  __dirname,
  '../../../../packages/block-forge-core/src/__tests__/fixtures',
)

async function loadFixture(slug: string): Promise<BlockJson> {
  const [html, css] = await Promise.all([
    readFile(path.join(FIXTURES, `${slug}.html`), 'utf8'),
    readFile(path.join(FIXTURES, `${slug}.css`), 'utf8'),
  ])
  return {
    id: `fixture-${slug}`,
    slug,
    name: slug,
    html,
    css,
  }
}

function Harness({ block }: { block: BlockJson | null }) {
  const { suggestions, warnings } = useAnalysis(block)
  return <SuggestionList suggestions={suggestions} warnings={warnings} />
}

function readHeuristics(): string[] {
  const rows = document.querySelectorAll('[data-suggestion-id]')
  return Array.from(rows).map(
    (r) => r.querySelector('[data-role="heuristic"]')?.textContent ?? '',
  )
}

describe('SuggestionList integration with core engine', () => {
  let spacingFont: BlockJson
  let plainCopy: BlockJson
  let nestedRow: BlockJson

  // Testing Library + Vitest doesn't auto-cleanup the way it does with Jest.
  // Without this, each `render` call stacks onto the previous DOM, and queries
  // like `getByText` fail with "multiple elements found". See the library's
  // own caveat: https://testing-library.com/docs/react-testing-library/api/#cleanup
  afterEach(() => {
    cleanup()
  })

  beforeAll(async () => {
    spacingFont = await loadFixture('block-spacing-font')
    plainCopy = await loadFixture('block-plain-copy')
    nestedRow = await loadFixture('block-nested-row')
  })

  it('block-spacing-font: shows ≥ 1 suggestion including font-clamp', () => {
    // Per the frozen WP-025 snapshot in
    // packages/block-forge-core/src/__tests__/__snapshots__/snapshot.test.ts.snap
    // this fixture produces { font-clamp, media-maxwidth, media-maxwidth }.
    // The CSS uses `padding: var(--spacing-5xl, 64px) ...` — spacing-clamp
    // correctly skips `var()` values (see heuristic-spacing-clamp.test.ts
    // "does NOT trigger on var" case). The fixture NAME is spacing-font but
    // only the font-clamp trigger survives after the var-skip rule. Plan
    // Correction noted in result log.
    render(<Harness block={spacingFont} />)
    const rows = document.querySelectorAll('[data-suggestion-id]')
    expect(rows.length).toBeGreaterThanOrEqual(1)
    const heuristics = readHeuristics()
    expect(heuristics).toContain('font-clamp')
  })

  it('block-plain-copy: renders empty-state message (no suggestions)', () => {
    render(<Harness block={plainCopy} />)
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
    // `getByText` throws if not found, so the call itself is the check;
    // wrap in `expect(...).toBeTruthy()` to satisfy no-unused-expression lint
    // and avoid needing `@testing-library/jest-dom` matchers.
    expect(screen.getByText(/no responsive-authoring triggers/i)).toBeTruthy()
  })

  it('block-nested-row: no flex-wrap suggestions (nested-row contract)', () => {
    render(<Harness block={nestedRow} />)
    const heuristics = readHeuristics()
    expect(heuristics.includes('flex-wrap')).toBe(false)
  })

  it('null block: renders empty-state cleanly (no crash)', () => {
    render(<Harness block={null} />)
    // `getByText` throws if not found, so the call itself is the check;
    // wrap in `expect(...).toBeTruthy()` to satisfy no-unused-expression lint
    // and avoid needing `@testing-library/jest-dom` matchers.
    expect(screen.getByText(/no responsive-authoring triggers/i)).toBeTruthy()
  })
})
