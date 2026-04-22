import type { BlockAnalysis } from '../lib/types'
import { parseCSS } from './parse-css'
import { parseHTML } from './parse-html'

export interface AnalyzeBlockInput {
  html: string
  css: string
}

export function analyzeBlock(input: AnalyzeBlockInput): BlockAnalysis {
  const cssResult = parseCSS(input.css)
  const htmlResult = parseHTML(input.html)
  return {
    rules: cssResult.rules,
    elements: htmlResult.elements,
    warnings: [...cssResult.warnings, ...htmlResult.warnings],
  }
}
