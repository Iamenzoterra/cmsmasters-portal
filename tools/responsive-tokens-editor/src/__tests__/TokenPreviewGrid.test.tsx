// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { TokenPreviewGrid, valueAtViewport } from '../components/TokenPreviewGrid'
import { conservativeDefaults } from '../lib/defaults'
import { generateTokensCss } from '../lib/generator'
import type { GeneratedToken } from '../types'

describe('TokenPreviewGrid', () => {
  // Re-derive `result.tokens` once per test via Phase 2 generator (not mocked —
  // protects against drift between grid expectations and engine output).
  const buildBaseline = () => {
    const result = generateTokensCss(conservativeDefaults)
    return result.tokens
  }

  it('renders 3 section headers (Typography 10 + Spacing 11 + Section rhythm 1) on V1 baseline', () => {
    const tokens = buildBaseline()
    render(
      <TokenPreviewGrid
        tokens={tokens}
        violations={[]}
        config={conservativeDefaults}
        onChange={() => {}}
      />
    )
    expect(screen.getByText(/Typography · 10/)).toBeInTheDocument()
    expect(screen.getByText(/Spacing · 11/)).toBeInTheDocument()
    expect(screen.getByText(/Section rhythm · 1/)).toBeInTheDocument()
  })

  it('renders 22 token rows total on V1 baseline', () => {
    const tokens = buildBaseline()
    const { container } = render(
      <TokenPreviewGrid
        tokens={tokens}
        violations={[]}
        config={conservativeDefaults}
        onChange={() => {}}
      />
    )
    // Token-name <td>s have font-mono class (only token cells); count = 22.
    const tokenCells = container.querySelectorAll('td.font-mono')
    expect(tokenCells).toHaveLength(22)
  })

  it('--h1-font-size row shows 44 px @375 and 54 px @1440', () => {
    const tokens = buildBaseline()
    render(
      <TokenPreviewGrid
        tokens={tokens}
        violations={[]}
        config={conservativeDefaults}
        onChange={() => {}}
      />
    )
    const h1Cell = screen.getByText('--h1-font-size')
    const row = h1Cell.closest('tr')
    expect(row).not.toBeNull()
    const cells = within(row as HTMLElement).getAllByRole('cell')
    // Layout: [token, @375, @768, @1440, WCAG, Action]
    expect(cells[1]).toHaveTextContent('44 px')
    expect(cells[3]).toHaveTextContent('54 px')
  })

  it('every row shows OVERRIDDEN badge on V1 baseline (all 22 tokens are in overrides)', () => {
    const tokens = buildBaseline()
    render(
      <TokenPreviewGrid
        tokens={tokens}
        violations={[]}
        config={conservativeDefaults}
        onChange={() => {}}
      />
    )
    const badges = screen.getAllByText('OVERRIDDEN')
    expect(badges).toHaveLength(22)
  })

  it('clicking "Edit override" expands editor row; clicking "Done" collapses it', () => {
    const tokens = buildBaseline()
    const { container } = render(
      <TokenPreviewGrid
        tokens={tokens}
        violations={[]}
        config={conservativeDefaults}
        onChange={() => {}}
      />
    )
    // Click Edit override on the first row
    const editButtons = screen.getAllByRole('button', { name: 'Edit override' })
    expect(editButtons.length).toBe(22)
    fireEvent.click(editButtons[0])
    // Now there should be ONE "Done" button (the expanded row's toggle)
    const doneButtons = screen.getAllByRole('button', { name: 'Done' })
    expect(doneButtons).toHaveLength(1)
    // And there should be an "Apply" button from TokenOverrideEditor
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument()
    // Collapse
    fireEvent.click(doneButtons[0])
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument()
    void container
  })

  it('WCAG cell empty for all 22 rows when violations is []', () => {
    const tokens = buildBaseline()
    render(
      <TokenPreviewGrid
        tokens={tokens}
        violations={[]}
        config={conservativeDefaults}
        onChange={() => {}}
      />
    )
    // No "!" badge anywhere on V1 baseline.
    expect(screen.queryByLabelText(/WCAG 1\.4\.4 violation/)).not.toBeInTheDocument()
  })

  it('WCAG cell renders ! badge for tokens listed in violations[]', () => {
    const tokens = buildBaseline()
    render(
      <TokenPreviewGrid
        tokens={tokens}
        violations={[
          {
            token: '--h1-font-size',
            minPx: 44,
            maxPx: 200,
            reason: 'WCAG 1.4.4 violation; ratio > 2.5×',
          },
        ]}
        config={conservativeDefaults}
        onChange={() => {}}
      />
    )
    const badge = screen.getByLabelText(/WCAG 1\.4\.4 violation/)
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('!')
  })

  describe('valueAtViewport pure-fn', () => {
    const sampleToken: GeneratedToken = {
      name: '--text-display',
      minPx: 28,
      maxPx: 64,
      clampCss: '',
      source: 'override',
    }
    it('returns minPx when viewport ≤ minViewport', () => {
      expect(valueAtViewport(sampleToken, 100, conservativeDefaults)).toBe(28)
      expect(valueAtViewport(sampleToken, 375, conservativeDefaults)).toBe(28)
    })
    it('returns maxPx when viewport ≥ maxViewport', () => {
      expect(valueAtViewport(sampleToken, 1440, conservativeDefaults)).toBe(64)
      expect(valueAtViewport(sampleToken, 2000, conservativeDefaults)).toBe(64)
    })
    it('linear-interps for in-range viewport — @768 ≈ 41.28', () => {
      const result = valueAtViewport(sampleToken, 768, conservativeDefaults)
      // (768-375)/(1440-375) = 393/1065 ≈ 0.3690; 28 + 0.3690 × 36 ≈ 41.285
      expect(result).toBeGreaterThan(41.2)
      expect(result).toBeLessThan(41.4)
    })
  })
})
