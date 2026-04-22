import { describe, it, expectTypeOf } from 'vitest'
import type {
  BlockInput,
  BlockOutput,
  Suggestion,
  Heuristic,
  Confidence,
} from '../index'

describe('public type surface', () => {
  it('resolves all public types from package entry', () => {
    const heuristic: Heuristic = 'grid-cols'
    const confidence: Confidence = 'high'
    const input: BlockInput = { slug: 'x', html: '', css: '' }
    const output: BlockOutput = { slug: 'x', html: '', css: '' }
    const suggestion: Suggestion = {
      id: 'test',
      heuristic,
      selector: 'div',
      bp: 768,
      property: 'padding',
      value: '1rem',
      rationale: '',
      confidence,
    }
    expectTypeOf(suggestion).toMatchTypeOf<Suggestion>()
    expectTypeOf(input).toMatchTypeOf<BlockInput>()
    expectTypeOf(output).toMatchTypeOf<BlockOutput>()
  })
})
