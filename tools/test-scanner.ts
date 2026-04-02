/**
 * Quick verification: run scanner against test-section.html CSS.
 * Usage: npx tsx tools/test-scanner.ts
 */
import { readFileSync } from 'fs'
import { scanCSS, extractImages } from '../apps/studio/src/lib/block-processor'

const html = readFileSync('tools/studio-mockups/test-section.html', 'utf-8')

// Extract CSS from <style> tags
const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/)
const css = styleMatch ? styleMatch[1] : ''

// Extract body HTML
const bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/)
const bodyHtml = bodyMatch ? bodyMatch[1] : ''

console.log('=== TOKEN SUGGESTIONS ===\n')
const suggestions = scanCSS(css)

const byCategory = new Map<string, typeof suggestions>()
for (const s of suggestions) {
  const arr = byCategory.get(s.category) || []
  arr.push(s)
  byCategory.set(s.category, arr)
}

for (const [cat, items] of byCategory) {
  console.log(`── ${cat.toUpperCase()} (${items.length}) ──`)
  for (const s of items) {
    const badge = s.confidence === 'exact' ? '✅' : s.confidence === 'close' ? '🟡' : '🟠'
    console.log(`  ${badge} ${s.original.padEnd(30)} → ${s.token.padEnd(25)} [${s.selector}] ${s.property}`)
  }
  console.log()
}

console.log(`Total: ${suggestions.length} suggestions\n`)

console.log('=== IMAGES ===\n')
const images = extractImages(bodyHtml, css)
for (const img of images) {
  const short = img.original.length > 60 ? img.original.slice(0, 57) + '...' : img.original
  console.log(`  ${img.type.padEnd(10)} ${short}`)
  console.log(`           context: ${img.context}`)
}
console.log(`\nTotal: ${images.length} images`)
