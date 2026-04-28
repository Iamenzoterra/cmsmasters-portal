# WP-042 — Inspector e2e Playwright Coverage

> **Status:** 🟡 BACKLOG (drafted 2026-04-28 as WP-033/WP-036 polish queue carryover)
> **Origin:** WP-033 Phase 5 Ruling 3 DEFER + WP-034 Phase 2 Close `logs/wp-034/phase-2-result.md` §"What's next" item 4
> **Estimated effort:** 1 phase + close (~3–4h)
> **Layer:** L2 authoring tools (e2e gate — beyond unit + manual smoke)
> **Priority:** P2 — locks token-apply behavior at iframe-rendered-CSS level; triggered when next Inspector regression is felt
> **Prerequisites:** WP-034 ✅ DONE (Path A baseline locked); WP-037 ✅ DONE (typed inputs + tooltip locked)

---

## TL;DR

Inspector currently has Vitest unit coverage (Studio 300/300, block-forge 363+ tests) + manual visual smoke screenshots in result.md files. No automated e2e — every regression in cascade-override behavior, chip-apply emit, hover-suggestion target, or tooltip rendering requires a human running Playwright manually or eyeballing iframe `getComputedStyle`.

WP-033 Phase 5 Ruling 3 DEFER'd e2e Playwright coverage to a future WP. WP-034 Path A shipped relying on visual smoke alone. WP-042 establishes the e2e gate so future Inspector changes are pinned at the rendered-CSS level.

---

## Problem (from WP-034 phase-2-result.md §What's next)

> **Inspector e2e Playwright coverage** — Future WP per WP-033 Phase 5 Ruling 3 DEFER (carryover from WP-036).

---

## Acceptance criteria

- [ ] Playwright spec(s) at `tools/block-forge/e2e/inspector.spec.ts` (and/or `apps/studio/e2e/inspector.spec.ts`) covering:
  - **Chip-apply happy path** — open block, click chip, assert iframe `getComputedStyle` resolves to token value at all 3 BPs (375 / 768 / 1440 viewport).
  - **Cascade-conflict path** — open block with pre-existing `@container` conflict, click chip, assert all 3 BPs resolve to token value (WP-034 Path A regression pin).
  - **Typed input path** — change `display` via `<select>`, assert iframe receives the new value at active BP only (WP-037 regression pin).
  - **Tooltip render path** — hover Inspector property label, assert tooltip portal renders with correct content + token-themed styling (WP-037 regression pin).
  - **Hover-suggestion → highlight path** — hover over a suggestion in chip dropdown, assert target iframe element gets highlight overlay (WP-036 regression pin).
- [ ] Playwright config + CI integration: spec runs on PR (or on Inspector-touching PR via path filter).
- [ ] Fixture management: e2e uses dedicated test fixture (`tools/block-forge/e2e/fixtures/cascade-conflict.json`) — does NOT touch real `content/db/blocks/` or `tools/block-forge/blocks/` sandbox.
- [ ] Smoke time budget: full Inspector e2e suite runs in <60s on CI; local dev run <30s.
- [ ] PARITY note: add §"Inspector e2e coverage" to PARITY trio with link to spec files.
- [ ] WP-033 Phase 5 Ruling 3 DEFER marker retired; replaced with §"e2e shipped in WP-042".

---

## Constraints

- ❌ No production code changes — WP-042 is test-infrastructure-only.
- ❌ No fixture writes to `content/db/blocks/` or `tools/block-forge/blocks/` (Forge sandbox isolation per saved memory `feedback_forge_sandbox_isolation`).
- ✅ Playwright already in monorepo (`@playwright/test` used elsewhere — verify in Phase 0 RECON).
- ✅ Spec ergonomics: each test boots its own iframe-rendered block from a JSON fixture; no shared session state.

---

## Implementation sketch

```ts
// tools/block-forge/e2e/inspector.spec.ts
test('chip-apply at cascade conflict applies token at all 3 BPs', async ({ page }) => {
  await page.goto('http://localhost:7702')
  await page.getByRole('button', { name: 'cascade-conflict-fixture' }).click()
  await page.getByRole('button', { name: '.heading' }).click() // pin element
  await page.getByRole('button', { name: 'Use --h2-font-size' }).click()
  await page.getByRole('button', { name: 'Save' }).click()

  // Assert at each BP
  for (const bp of [375, 768, 1440]) {
    await page.setViewportSize({ width: bp, height: 800 })
    const iframe = page.frameLocator('iframe[data-testid="block-preview"]')
    const computed = await iframe.locator('.heading').evaluate((el) =>
      getComputedStyle(el).fontSize
    )
    expect(computed).toMatch(/\\d+(\\.\\d+)?px/)
    expect(computed).not.toBe('42px') // pre-existing conflict value
  }
})
```

---

## Phase budget (estimate)

| Phase | Effort | Scope |
|---|---|---|
| 0 RECON | 30m | Probe Playwright presence in monorepo; surface fixture pattern; surface CI integration shape |
| 1 Impl | 2–3h | Spec authoring (5 paths above); fixture creation; CI wire-up |
| 2 Close | 30m | PARITY note; WP-033 Ruling 3 retirement; status flip |

Total: ~3–4h across 1 phase + close.

---

## Cross-references

- WP-033 Phase 5 Ruling 3 DEFER: `logs/wp-033/phase-5-result.md`
- WP-034 Phase 2 Close: `logs/wp-034/phase-2-result.md` §What's next item 4
- WP-036 hover-suggestion → highlight target (regression pin candidate)
- WP-037 typed inputs + Tooltip primitive (regression pin candidate)
- Saved memory `feedback_forge_sandbox_isolation` (fixture isolation invariant)
