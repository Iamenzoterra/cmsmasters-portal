import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  analyzeBlock,
  generateSuggestions,
  applySuggestions,
  renderForPreview,
} from '../index'

const FIXTURE_DIR = join(__dirname, 'fixtures')

function loadFixture(name: string) {
  return {
    slug: name,
    html: readFileSync(join(FIXTURE_DIR, `${name}.html`), 'utf-8'),
    css: readFileSync(join(FIXTURE_DIR, `${name}.css`), 'utf-8'),
  }
}

describe('snapshot — end-to-end pipeline', () => {
  for (const name of ['block-spacing-font', 'block-plain-copy', 'block-nested-row']) {
    it(`produces stable pipeline output for ${name}`, () => {
      const input = loadFixture(name)
      const analysis = analyzeBlock(input)
      const suggestions = generateSuggestions(analysis)
      const applied = applySuggestions(input, suggestions)
      const rendered = renderForPreview(applied)

      if (name === 'block-nested-row') {
        expect(
          suggestions.filter(s => s.heuristic === 'flex-wrap').length,
        ).toBe(0)
      }

      expect({
        fixture: name,
        suggestionCount: suggestions.length,
        suggestionHeuristics: [...suggestions.map(s => s.heuristic)].sort(),
        warnings: analysis.warnings,
        renderedHtml: rendered.html,
        renderedCss: rendered.css,
      }).toMatchSnapshot()
    })
  }
})
