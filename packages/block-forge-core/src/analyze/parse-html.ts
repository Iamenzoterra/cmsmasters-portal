import { parse, NodeType } from 'node-html-parser'
import type { Element as EngineElement } from '../lib/types'

export interface ParseHTMLResult {
  elements: EngineElement[]
  warnings: string[]
}

export function parseHTML(html: string): ParseHTMLResult {
  if (!html || !html.trim()) return { elements: [], warnings: [] }

  const root = parse(html)
  const all = root.querySelectorAll('*')

  const elements: EngineElement[] = all.map(el => {
    const childCount = el.childNodes.filter(n => n.nodeType === NodeType.ELEMENT_NODE).length
    const classes = el.classNames
      ? el.classNames.split(/\s+/).map(c => c.trim()).filter(c => c.length > 0)
      : []
    const parent = el.parentNode
    const parentTagRaw = parent && 'tagName' in parent ? parent.tagName : null
    const parentTag = parentTagRaw ? parentTagRaw.toLowerCase() : null
    return {
      tag: el.tagName ? el.tagName.toLowerCase() : '',
      classes,
      childCount,
      parentTag,
    }
  })

  return { elements, warnings: [] }
}
