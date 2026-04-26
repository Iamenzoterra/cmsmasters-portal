// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LivePreviewRow } from '../components/LivePreviewRow'
import { generateTokensCss } from '../lib/generator'
import { conservativeDefaults } from '../lib/defaults'

describe('LivePreviewRow', () => {
  it('renders 3 iframes with width attributes 1440 / 768 / 375 (PreviewTriptych order)', () => {
    const result = generateTokensCss(conservativeDefaults)
    const { container } = render(<LivePreviewRow resultCss={result.css} />)
    const iframes = container.querySelectorAll('iframe')
    expect(iframes).toHaveLength(3)
    expect(iframes[0].getAttribute('width')).toBe('1440')
    expect(iframes[1].getAttribute('width')).toBe('768')
    expect(iframes[2].getAttribute('width')).toBe('375')
  })

  it('each iframe srcDoc contains generator output (--h1-font-size token)', () => {
    const result = generateTokensCss(conservativeDefaults)
    const { container } = render(<LivePreviewRow resultCss={result.css} />)
    const iframes = container.querySelectorAll('iframe')
    for (const iframe of iframes) {
      const srcdoc = iframe.getAttribute('srcdoc') || ''
      expect(srcdoc).toContain('--h1-font-size')
      // Container @media block emit landed via Phase 5 generator extension.
      expect(srcdoc).toContain('@media (min-width: 768px)')
    }
  })

  it('each iframe srcDoc contains the sample HTML container element', () => {
    const result = generateTokensCss(conservativeDefaults)
    const { container } = render(<LivePreviewRow resultCss={result.css} />)
    const iframes = container.querySelectorAll('iframe')
    for (const iframe of iframes) {
      const srcdoc = iframe.getAttribute('srcdoc') || ''
      expect(srcdoc).toContain('class="container"')
      expect(srcdoc).toContain('Heading 1')
      expect(srcdoc).toContain('Heading 2')
    }
  })

  it('iframe key changes when resultCss changes (re-render with mutated CSS triggers remount)', () => {
    const result = generateTokensCss(conservativeDefaults)
    const { container, rerender } = render(<LivePreviewRow resultCss={result.css} />)
    const initialIframes = container.querySelectorAll('iframe')
    const initialSrcdoc = initialIframes[0].getAttribute('srcdoc')
    expect(initialSrcdoc).toContain('--h1-font-size')

    // Simulate a config change → result.css differs (length changes too).
    const altCss = result.css + '\n/* mutation marker */'
    rerender(<LivePreviewRow resultCss={altCss} />)
    const updatedIframes = container.querySelectorAll('iframe')
    expect(updatedIframes).toHaveLength(3)
    const updatedSrcdoc = updatedIframes[0].getAttribute('srcdoc') || ''
    expect(updatedSrcdoc).toContain('mutation marker')
    expect(updatedSrcdoc).not.toBe(initialSrcdoc)
  })

  it('renders Live preview heading + 3 panel labels', () => {
    const result = generateTokensCss(conservativeDefaults)
    render(<LivePreviewRow resultCss={result.css} />)
    expect(screen.getByText('Live preview')).toBeInTheDocument()
    expect(screen.getByText(/Desktop · 1440px/)).toBeInTheDocument()
    expect(screen.getByText(/Tablet · 768px/)).toBeInTheDocument()
    expect(screen.getByText(/Mobile · 375px/)).toBeInTheDocument()
  })
})
