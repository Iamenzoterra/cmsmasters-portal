// P7a-1 — native keyboard Tab until the Export primary button is focused,
// with :focus-visible active, then take a screenshot.
// Fail: if after 60 Tab presses Export is not reached, document the tab-order gap.

import { chromium } from 'playwright-core'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } })
  const page = await ctx.newPage()
  await page.goto('http://localhost:7700/?layout=theme-page-layout', { waitUntil: 'domcontentloaded', timeout: 10000 })
  await page.waitForTimeout(1500)

  // Select the theme-page-layout row
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

  // Focus body first so Tab starts from predictable position
  await page.evaluate(() => document.body.focus())

  const MAX_TABS = 80
  let found = false
  const path = []
  for (let i = 0; i < MAX_TABS; i++) {
    await page.keyboard.press('Tab')
    const state = await page.evaluate(() => {
      const a = document.activeElement
      return {
        tag: a?.tagName,
        cls: a?.className ?? '',
        text: (a?.textContent ?? '').trim().slice(0, 40),
        isExport: a?.matches?.('.lm-btn--primary') && /export/i.test(a?.textContent ?? ''),
        matchesFV: a?.matches?.(':focus-visible') ?? false,
      }
    })
    path.push(`${i + 1}. ${state.tag}.${state.cls.slice(0, 30)} "${state.text}" fv=${state.matchesFV}`)
    if (state.isExport && state.matchesFV) {
      found = true
      console.log(`✅ Reached Export .lm-btn--primary at Tab #${i + 1}, :focus-visible = true`)
      break
    }
  }

  if (!found) {
    console.log('❌ FAIL: did not reach Export with :focus-visible. Tab path:')
    path.slice(0, 20).forEach((line) => console.log('  ', line))
    console.log(`  ... (${path.length} total)`)
    await browser.close()
    process.exit(1)
  }

  // Screenshot
  const outPath = 'tools/layout-maker/p7-focus-ring-native.png'
  await page.screenshot({ path: outPath, type: 'png' })
  console.log(`Saved: ${outPath}`)

  await browser.close()
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(2)
})
