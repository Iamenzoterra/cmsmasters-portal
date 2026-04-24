// P7a-2 — empirical proof that `prefers-reduced-motion: reduce` activates
// the P7 global override rule. Two measurements:
//   (a) baseline — no emulation, transition-duration = 0.12s (120ms)
//   (b) with emulation — transition-duration must drop to 0.01ms
// If (b) does not drop, the CSS rule exists but is not reached.
//
// Run: node tools/layout-maker/scripts/p7a-2-reduced-motion.mjs

import { chromium } from 'playwright-core'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto('http://localhost:7700/?layout=theme-page-layout', { waitUntil: 'domcontentloaded', timeout: 10000 })
  await page.waitForTimeout(1500)

  // Click theme-page-layout sidebar item
  await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'))
    const t = all.find(el =>
      el.textContent?.trim().startsWith('theme-page-layout') &&
      el.children.length <= 3 &&
      getComputedStyle(el).cursor === 'pointer'
    )
    t?.click()
  })
  await page.waitForTimeout(300)
  // Expand References so .lm-utility-zone__chevron rotates at the P7 transition
  await page.evaluate(() => {
    document.querySelector('.lm-utility-zone__header')?.click()
  })
  await page.waitForTimeout(200)

  const measure = async (label) => {
    const r = await page.evaluate(() => {
      const el = document.querySelector('.lm-utility-zone__chevron') ||
                 document.querySelector('.lm-banner') ||
                 document.querySelector('.lm-btn')
      if (!el) return { error: 'no target element' }
      const s = getComputedStyle(el)
      return {
        tag: el.className,
        transitionDuration: s.transitionDuration,
        animationDuration: s.animationDuration,
        mediaMatches: matchMedia('(prefers-reduced-motion: reduce)').matches,
      }
    })
    console.log(`[${label}]`, r)
    return r
  }

  // (a) baseline: no emulation
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const baseline = await measure('baseline no-preference')

  // (b) with emulation
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const reduced = await measure('reduced')

  // Also measure a .lm-btn element (different transition property set)
  const btnMeasure = await page.evaluate(() => {
    const btn = document.querySelector('.lm-btn')
    if (!btn) return null
    const s = getComputedStyle(btn)
    return {
      transitionDuration: s.transitionDuration,
      mediaMatches: matchMedia('(prefers-reduced-motion: reduce)').matches,
    }
  })
  console.log('[reduced .lm-btn]', btnMeasure)

  await browser.close()

  // Verdict
  const parseMs = (v) => {
    if (!v) return null
    const s = v.toString().trim()
    if (s.endsWith('ms')) return parseFloat(s)
    if (s.endsWith('s')) return parseFloat(s) * 1000
    return parseFloat(s)
  }
  const baseMs = parseMs(baseline.transitionDuration)
  const reducedMs = parseMs(reduced.transitionDuration)
  console.log('\n=== VERDICT ===')
  console.log(`baseline transition-duration = ${baseMs} ms`)
  console.log(`reduced transition-duration  = ${reducedMs} ms`)
  if (reducedMs != null && reducedMs <= 1) {
    console.log('✅ PASS: reduced-motion override is active')
    process.exit(0)
  } else {
    console.log('❌ FAIL: reduced-motion override did not apply')
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(2)
})
