// WP-042 Phase 1 — Inspector e2e Playwright coverage.
//
// 4 regression-pin paths, each documented inline:
//   1. Chip-apply at cascade conflict → token resolves at all 3 BPs (WP-034 Path A pin)
//   2. Typed input at smallest BP scoped to mobile only (WP-037 typed inputs pin)
//   3. Tooltip portal renders on property-label hover (WP-037 Tooltip pin)
//   4. Revert ↺ removes the per-BP tweak (PARITY-locked native title — WP-040 pin)
//
// Block-forge tweaks emit as `@container slot (max-width: <bp>px)` (mobile-first
// cascade), so a tweak at bp=1440 cascades to ALL viewports ≤ 1440 (i.e.
// everywhere). To pin "active-BP-only" semantics we must pin at the smallest
// canonical BP (375), where max-width:375 narrows the rule to mobile alone.
//
// WP-036 hover-suggestion → highlight is intentionally NOT pinned at e2e level;
// it depends on the suggestion analyzer surfacing a target whose selector
// matches an element in the fixture. That's brittle without a deterministic
// seeded-suggestion harness. Tracked as WP-042 follow-up; vitest preview-assets
// tests already pin the postMessage round-trip independently.
//
// Fixture: e2e/fixtures/cascade-conflict-fixture.json. Base .heading font-size
// is 34px (matches --h2-font-size at 375 BP); @container slot (min-width:768)
// overrides to 64px (creates the cascade conflict that WP-034 Path A resolves).

import { expect, test, type FrameLocator, type Page } from '@playwright/test'

const SLUG = 'cascade-conflict-fixture'

type Bp = 'desktop' | 'tablet' | 'mobile'
const BP_TO_PX: Record<Bp, number> = { desktop: 1440, tablet: 768, mobile: 375 }

// --- helpers ---

async function pickBlock(page: Page, slug: string) {
  const picker = page.locator('select').first()
  await picker.waitFor({ state: 'visible' })
  await picker.selectOption(slug)
}

async function activateBp(page: Page, bp: Bp) {
  await page.getByTestId(`preview-tab-${bp}`).click()
  // Wait for the iframe at this BP width to mount.
  await page.locator(`iframe[title="${SLUG}-${BP_TO_PX[bp]}"]`).waitFor({ state: 'attached' })
}

function activeFrame(page: Page, bp: Bp): FrameLocator {
  return page.frameLocator(`iframe[title="${SLUG}-${BP_TO_PX[bp]}"]`)
}

async function pinHeadingAt(page: Page, bp: Bp) {
  await activateBp(page, bp)
  // Inspector also has its own BP picker — keep it in sync via the BP buttons
  // it exposes. The Triptych tab click drives App.tsx state which is mirrored.
  const frame = activeFrame(page, bp)
  // Click the heading inside the iframe to fire `block-forge:element-click`.
  // The IIFE preventDefaults the click, then App.tsx requests pin.
  await frame.locator('.heading').click()
  // Wait for InspectorPanel to render with the pinned selector header.
  await expect(page.getByTestId('inspector-panel')).toBeVisible()
}

async function readComputedFontSize(page: Page, bp: Bp): Promise<number> {
  const frame = activeFrame(page, bp)
  // evaluate runs in the iframe context.
  const px = await frame.locator('.heading').evaluate((el) => {
    return parseFloat(getComputedStyle(el as HTMLElement).fontSize)
  })
  return px
}

// --- specs ---

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await pickBlock(page, SLUG)
  // Wait for first iframe to mount on default (desktop) tab.
  await page.locator(`iframe[title="${SLUG}-1440"]`).waitFor({ state: 'attached' })
})

test('chip-apply at cascade conflict resolves token at all 3 BPs (WP-034 Path A pin)', async ({
  page,
}) => {
  // Pin .heading at MOBILE — that's where the cascade conflict is INACTIVE,
  // so the value matches --h2-font-size's 375 BP (34px) and the chip detection
  // surfaces "Use --h2-font-size" in available mode.
  await pinHeadingAt(page, 'mobile')

  // Pre-condition: cascade conflict observable at tablet/desktop (64px from
  // @container) but base 34px at mobile.
  await activateBp(page, 'mobile')
  expect(await readComputedFontSize(page, 'mobile')).toBeCloseTo(34, 0)
  await activateBp(page, 'desktop')
  expect(await readComputedFontSize(page, 'desktop')).toBeCloseTo(64, 0)

  // Re-pin at mobile (BP switch may have un-pinned in some App states).
  await pinHeadingAt(page, 'mobile')
  // Click the available token chip for --h2-font-size.
  const chip = page.locator('[data-testid="token-chip---h2-font-size"][data-mode="available"]')
  await expect(chip).toBeVisible({ timeout: 10_000 })
  await chip.click()

  // Post-condition: WP-034 Path A fan-out applies token at canonical BPs
  // (0/375/768/1440). The @container override at >=768 is dedupe-updated to
  // var(--h2-font-size). All 3 iframe BPs should now resolve the clamp:
  //   375 → 34px (minPx), 1440 → 42px (maxPx). 768 falls in clamp range.
  // Wait for the fan-out emit to settle (debounced 300ms in App.tsx) +
  // composeTweakedCss → preview re-render.
  await page.waitForTimeout(800)

  await activateBp(page, 'mobile')
  expect(await readComputedFontSize(page, 'mobile')).toBeCloseTo(34, 0)

  await activateBp(page, 'desktop')
  // After fan-out: desktop should drop from 64 → 42 (token max).
  // If WP-034 Path A regression: would still be 64 (fan-out missed @container).
  expect(await readComputedFontSize(page, 'desktop')).toBeCloseTo(42, 0)

  await activateBp(page, 'tablet')
  // Token clamp at viewport=768: linear interp between 34 (min@375) and 42
  // (max@1440) → ~38px. Tolerance ±2px to absorb font-metric rounding.
  const tabletPx = await readComputedFontSize(page, 'tablet')
  expect(tabletPx).toBeGreaterThan(34)
  expect(tabletPx).toBeLessThan(42)
})

test('typed input at smallest BP scoped to mobile only (WP-037 typed inputs pin)', async ({
  page,
}) => {
  // Pin .body-text at MOBILE — emit at bp=375 produces
  // `@container slot (max-width:375)` which only matches the mobile iframe.
  // Tablet (slot=768) and desktop (slot=1440) keep base `display: block`.
  await activateBp(page, 'mobile')
  await activeFrame(page, 'mobile').locator('.body-text').click()
  await expect(page.getByTestId('inspector-panel')).toBeVisible()

  // Pre-condition: display = block at all BPs.
  for (const bp of ['mobile', 'tablet', 'desktop'] as const) {
    await activateBp(page, bp)
    const display = await activeFrame(page, bp)
      .locator('.body-text')
      .evaluate((el) => getComputedStyle(el as HTMLElement).display)
    expect(display).toBe('block')
  }

  // Re-pin at mobile (BP switch may rotate iframe / clear pin).
  await activateBp(page, 'mobile')
  await activeFrame(page, 'mobile').locator('.body-text').click()
  const displaySelect = page.locator('[data-testid="property-row-display-select"]').first()
  await expect(displaySelect).toBeVisible({ timeout: 10_000 })
  await displaySelect.selectOption('flex')
  // 300ms debounce in App.tsx + iframe re-render.
  await page.waitForTimeout(800)

  // Post-condition: mobile changed to flex; tablet + desktop untouched
  // (max-width:375 doesn't match larger BPs).
  await activateBp(page, 'mobile')
  expect(
    await activeFrame(page, 'mobile')
      .locator('.body-text')
      .evaluate((el) => getComputedStyle(el as HTMLElement).display),
  ).toBe('flex')

  for (const bp of ['tablet', 'desktop'] as const) {
    await activateBp(page, bp)
    expect(
      await activeFrame(page, bp)
        .locator('.body-text')
        .evaluate((el) => getComputedStyle(el as HTMLElement).display),
    ).toBe('block')
  }
})

test('tooltip portal renders on property-label hover (WP-037 Tooltip pin)', async ({ page }) => {
  await activateBp(page, 'desktop')
  await activeFrame(page, 'desktop').locator('.body-text').click()
  await expect(page.getByTestId('inspector-panel')).toBeVisible()

  // Hover the "display" property label trigger (cursor-help button with
  // dotted underline). Tooltip primitive uses Radix portal → tooltip role
  // appears in a sibling tree.
  const labelTrigger = page.locator('[data-testid="property-row-display-label-trigger"]')
  await expect(labelTrigger).toBeVisible({ timeout: 10_000 })
  await labelTrigger.hover()

  // Radix Tooltip with delayDuration=400ms → portal renders after delay.
  const tooltip = page.locator('[role="tooltip"]')
  await expect(tooltip).toBeVisible({ timeout: 3_000 })
  // Content asserts the meta.tooltip text — partial match on the canonical
  // "Layout mode" prefix from property-meta.ts.
  await expect(tooltip).toContainText('Layout mode')
})

test('revert ↺ removes per-BP tweak after typed-input edit', async ({ page }) => {
  await activateBp(page, 'mobile')
  await activeFrame(page, 'mobile').locator('.body-text').click()

  // Apply a tweak first so the ↺ button gates open.
  const displaySelect = page.locator('[data-testid="property-row-display-select"]').first()
  await expect(displaySelect).toBeVisible({ timeout: 10_000 })
  await displaySelect.selectOption('flex')
  await page.waitForTimeout(800)
  expect(
    await activeFrame(page, 'mobile')
      .locator('.body-text')
      .evaluate((el) => getComputedStyle(el as HTMLElement).display),
  ).toBe('flex')

  // Click ↺ — gated only when tweak exists for active selector + BP + property.
  const revert = page.locator('[data-testid="property-row-display-revert"]').first()
  await expect(revert).toBeVisible({ timeout: 10_000 })
  await revert.click()
  await page.waitForTimeout(800)

  // Tweak removed — back to base block.
  expect(
    await activeFrame(page, 'mobile')
      .locator('.body-text')
      .evaluate((el) => getComputedStyle(el as HTMLElement).display),
  ).toBe('block')
})
