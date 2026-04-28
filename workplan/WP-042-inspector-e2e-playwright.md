# WP-042 — Inspector e2e Playwright Coverage

> **Status:** ✅ DONE (Phase 0 RECON + Phase 1 + Phase 2 Close shipped 2026-04-28)
> **Origin:** WP-033 Phase 5 Ruling 3 DEFER + WP-034 Phase 2 Close `logs/wp-034/phase-2-result.md` §"What's next" item 4
> **Estimated effort:** 1 phase + close (~3–4h) — actual ~2.5h across 2 phases (Option A full path)
> **Layer:** L2 authoring tools (e2e gate — beyond unit + manual smoke)
> **Priority:** P2 — locks token-apply behavior at iframe-rendered-CSS level; triggered when next Inspector regression is felt
> **Prerequisites:** WP-034 ✅ DONE (Path A baseline locked); WP-037 ✅ DONE (typed inputs + tooltip locked)
> **Path chosen:** A — Full Playwright install + spec + new CI workflow (Phase 0 RECON Brain ruling)
> **Completed:** 2026-04-28
> **Phase 1 commit:** `5ef41c27`

---

## TL;DR

Inspector currently has Vitest unit coverage (Studio 300/300, block-forge 363+ tests) + manual visual smoke screenshots in result.md files. No automated e2e — every regression in cascade-override behavior, chip-apply emit, hover-suggestion target, or tooltip rendering requires a human running Playwright manually or eyeballing iframe `getComputedStyle`.

WP-033 Phase 5 Ruling 3 DEFER'd e2e Playwright coverage to a future WP. WP-034 Path A shipped relying on visual smoke alone. WP-042 establishes the e2e gate so future Inspector changes are pinned at the rendered-CSS level.

---

## Problem (from WP-034 phase-2-result.md §What's next)

> **Inspector e2e Playwright coverage** — Future WP per WP-033 Phase 5 Ruling 3 DEFER (carryover from WP-036).

---

## Acceptance criteria

- [x] Playwright spec(s) at `tools/block-forge/e2e/inspector.spec.ts` covering:
  - [x] **Chip-apply at cascade conflict** — pin .heading at MOBILE (chip detection requires token-matching value at active BP); click `--h2-font-size` chip; assert all 3 BPs resolve to token (WP-034 Path A pin). *Combines "happy path" + "cascade-conflict path" — fixture has the @container conflict baked in.*
  - [x] **Typed input path** — pin `.body-text` at MOBILE; change `display` to `flex`; assert mobile iframe shows flex AND tablet/desktop unchanged (WP-037 regression pin). *Pinned at MOBILE because tweaks emit as `@container slot (max-width: <bp>px)` — at bp=375, the rule scopes to mobile alone; at larger bp, it cascades to ALL ≤bp BPs.*
  - [x] **Tooltip render path** — hover the `display` property label trigger; assert Radix portal `[role="tooltip"]` renders with "Layout mode" content (WP-037 regression pin).
  - [x] **Revert ↺ path** — apply tweak via typed input; click `↺` button; assert tweak removed (WP-040 PARITY-locked native title pin).
  - [ ] ~~Hover-suggestion → highlight path~~ — DROPPED in Phase 1: requires deterministic seeded-suggestion harness; vitest preview-assets covers the IIFE round-trip independently. Tracked as WP-042 follow-up.
- [x] Playwright config + CI integration: `.github/workflows/e2e-block-forge.yml` runs on PR with path filter (`tools/block-forge/**`, `packages/block-forge-core/**`, Tooltip primitive, responsive-config).
- [x] Fixture management: `tools/block-forge/e2e/fixtures/cascade-conflict-fixture.json` — does NOT touch real `content/db/blocks/` or `tools/block-forge/blocks/` sandbox (per saved memory `feedback_forge_sandbox_isolation`).
- [x] Smoke time budget: full suite runs in **9.0s local** (<60s CI target).
- [x] PARITY note: §"Inspector e2e coverage (WP-042 — 2026-04-28)" added to both PARITY pair files.
- [x] WP-033 Phase 5 Ruling 3 DEFER marker retired in `logs/wp-033/phase-5-result.md`.

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

- WP-033 Phase 5 Ruling 3 DEFER: `logs/wp-033/phase-5-result.md` — RETIRED 2026-04-28
- WP-034 Phase 2 Close: `logs/wp-034/phase-2-result.md` §What's next item 4
- WP-036 hover-suggestion → highlight target (e2e DROPPED; vitest preview-assets covers it)
- WP-037 typed inputs + Tooltip primitive (e2e PINNED in `tools/block-forge/e2e/inspector.spec.ts`)
- WP-040 PARITY-locked ↺ button (e2e PINNED)
- Saved memory `feedback_forge_sandbox_isolation` (fixture isolation invariant)
- `.context/CONVENTIONS.md` §"E2E test infrastructure (WP-042)"
- `.github/workflows/e2e-block-forge.yml`

---

## Outcome Ladder

| Tier | Outcome | Evidence |
|---|---|---|
| Bronze | Phase 0 RECON empirically caught WP doc's false assumption that Playwright was "already in monorepo"; surfaced 4 viable paths (A/B/C/D) for Brain ruling instead of silently expanding scope | `logs/wp-042/phase-0-audit.md` |
| Silver | Phase 1 shipped 4 regression-pin specs (chip-apply / typed-input / tooltip / revert) covering WP-034/WP-037/WP-040 surfaces; suite runs in 9.0s local | commit `5ef41c27` |
| Gold | All gates GREEN: arch-test 597/597, block-forge unit 363+6 (21 files), block-forge typecheck CLEAN, studio 317/317, e2e 4/4; CI workflow filters PRs touching Inspector-relevant paths | `logs/wp-042/phase-1-result.md` |
| Platinum | Phase 2 Close — CONVENTIONS §"E2E test infrastructure" formalized; PARITY pair (Studio + Forge) adds §"Inspector e2e coverage"; WP-033 Phase 5 Ruling 3 DEFER explicitly retired; status flips through WP doc + ROADMAP | this commit (Phase 2 SHA) |

---

## Commit Ladder

| Phase | Commit message | SHA | Files |
|---|---|---|---|
| 0 | (RECON) | (no commit — shipped with Phase 1) | `logs/wp-042/phase-0-audit.md` |
| 1 | `feat(block-forge): WP-042 phase 1 — Playwright e2e Inspector coverage + CI workflow` | `5ef41c27` | 11 (3 root config + 4 e2e infra + 1 CI workflow + 2 result docs + 1 .gitignore) |
| 2 (Close) | `docs(wp-042): phase 2 close — CONVENTIONS e2e infra + PARITY pair WP-042 cross-refs + WP-033 R3 DEFER retired + status flip` | TBD | 6 (CONVENTIONS + PARITY pair + WP doc + ROADMAP + WP-033 R3 marker + result.md) |

**Total WP-042 footprint: ~700 LOC across 11 files in commit 1 + ~80 LOC docs in commit 2 over ~2.5h.**
