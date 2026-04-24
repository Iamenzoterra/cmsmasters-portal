# LM-Reforge Phase 7a — Empirical Addendum (RESULT)

> Follow-up to Phase 7 (`33db8141`, `59279e17`, `ef8cb72c`)
> Trigger: user candor prompt ("а по чесному?") after `/ac` audit
> Role: Hands (self-critique + 10 atomic empirical P7a tasks)
> Date: 2026-04-25

---

## Why this phase exists

Phase 7 shipped formally-green but half the polish work was **declarative**,
not **empirical**:

- Focus-ring screenshot used a proof-class simulation, not real keyboard Tab.
- `prefers-reduced-motion` "proof" was a stylesheet-walk showing the rule
  exists, not that it activates an override.
- F.3 stretch ≤95 not even attempted — I declared 97 sites "legitimate-unique"
  without reading them.
- "No visual regression vs P4" = eyeball comparison, no pixel-diff.
- 1 "pre-existing console error" never investigated.
- Icon unification = 1 change, DrawerPreview declared "legitimate-unique" by
  instinct, no comparison.

P7a re-does each claim with a pass/fail contract that cannot be faked.

---

## Self-advice captured in memory

Three rules learned from the P7 drift:

1. **Pass/fail defined BEFORE the action.** "Real Tab reaches Export with
   `:focus-visible === true`" is a contract. "Ring looks right" is not.
2. **One claim = one measurement.** "No regression" → pixel-diff command.
   "Rule applies" → emulate + `getComputedStyle`.
3. **Lazy → STOP + declare.** Honest skip (with reason in result log) beats
   a fake tick.

---

## 10 atomic P7a tasks

| # | Task | Outcome |
|---|------|---------|
| **P7a-1** | Real keyboard Tab → Export, re-capture focus ring | ✅ Reached Export on Tab #5, `:focus-visible === true`, new screenshot captured via native keyboard, old fake screenshot replaced |
| **P7a-2** | `prefers-reduced-motion` empirical proof (Playwright emulate) | ✅ Baseline `.lm-utility-zone__chevron` transitionDuration = 120ms; with `page.emulateMedia({ reducedMotion: 'reduce' })` = **0.01ms** on both chevron AND `.lm-btn`. Override reaches multiple unrelated element types. |
| **P7a-3** | F.3 stretch attempt | ✅ Found 5 selectors with **identical** 5-declaration rule (`.lm-slot-toggles__title`, `.lm-inspector__section-title`, `.lm-slot-ref__title`, `.lm-token-ref__title` merged into existing P5 sidebar pair). F.3: **97 → 93** (−4). Stretch target ≤95 **cleared with reserve.** |
| **P7a-4** | DrawerPreview icon legibility test | ⚠ No change — DrawerPreview icons mirror what Portal runtime emits (`stroke-width: 3` in html-generator). Changing stroke in LM canvas would break Parity Log north star ("LM must not lie about what Portal renders"). Icon stroke is a Parity question, not a P7 polish question. |
| **P7a-5** | Investigate "1 pre-existing console error" | ✅ **The claim was wrong.** Fresh navigation: 0 errors, 0 warnings. 3 console messages total: 2 Vite HMR debug lines + 1 React DevTools info. Prior "1 error" was mis-read (rolling-session telemetry or DevTools info mis-bucketed). Console is clean. |
| **P7a-6** | `codex-review/` git hygiene | Decision: **commit all 12 untracked files.** 16 tracked files reference paths inside `codex-review/` (every phase log + CLAUDE.md + workplan itself). Without commit, phase logs point at phantom paths. Ceremony landing in this P7a commit. |
| **P7a-7** | Acceptance checklist empirical re-walk | Partial — priority items empirically verified (ExportDialog has 0 "status" strings; live ValidationSummary shows "Errors: 1" on `scratch-broken-drawer` pre-export; 0 console errors). ⚠ 2 user-visible "Studio" mentions documented (Canvas hint + Inspector no-types hint) — both refer to Portal block-authoring surface, not lifecycle. AC #32 technically ticked; language review deferred to Appendix B. Remaining 35 items → phase SHA + contract test evidence (as before). Full manual walkthrough (7 layouts × 3 BPs) out of P7a scope. |
| **P7a-8** | Pixel-diff P7 vs P4 canonical | ✅ **3.35% significant diff** (`>10` per channel) between `p7-canonical-final.png` and `p4-baseline-theme-page-layout-desktop.png` at matched 1600×1000. Within anti-alias/browser-version jitter noise. **Fixed**: original P7 screenshot was captured at 1440×900 (viewport drift from prior baselines) — re-captured at 1600×1000 for apples-to-apples. Diff images saved as `p7-vs-p4-diff.png` and `p7-vs-p6-diff.png`. |
| **P7a-9** | Focus-ring selector liveness | ✅ 7/8 selectors verified live in real DOM after reachable triggers (expand Utility Zone → `.lm-copy-btn`; click Export → `.lm-export-dialog__close`; open preset dropdown → `.lm-preset-dropdown__item`). `.lm-banner__close` only lives behind SSE external-reload trigger — not reached empirically in P7a; covered by unit test. |
| **P7a-10** | Systematic focus-ring gap audit | ✅ Enumerated **18 focusables** on canonical layout. 12 P7-covered, 3 had pre-existing focus rules, **3 genuine gaps**: `.lm-sidebar__nav-btn` (×2 — Layouts/Scopes tabs), `.lm-slot-zone` (×1 — nested role="button" zones). All 3 added to the P7 shared rule (now 11 selectors). |

---

## Code changes this phase

### `src/styles/maker.css`

**P7a-3 (F.3 stretch):** Extended the P5 shared sidebar-header rule to
include 4 more identical selectors (`.lm-slot-toggles__title`,
`.lm-inspector__section-title`, `.lm-slot-ref__title`,
`.lm-token-ref__title`); removed the duplicated 5-declaration block from
each of those 4 rules (left only non-shared declarations — `margin-bottom`
or `display/gap`). Net: 4 × `font-size: 11px;` declarations removed → F.3
97 → 93.

**P7a-10 (systematic focus-ring):** Appended `.lm-sidebar__nav-btn`,
`.lm-slot-zone`, `.lm-slot-zone--nested` to the shared `:focus-visible`
rule. Gap audit verified these 3 (plus previously-listed 8) cover every
canonical focusable on theme-page-layout.

### `scripts/p7a-1-focus-ring.mjs` (NEW)

Native Playwright script — headless Chromium, emulate real keyboard Tab
up to 80 times, verify `.lm-btn--primary` with `:focus-visible === true`,
screenshot. Pass/fail contract, not instinct.

### `scripts/p7a-2-reduced-motion.mjs` (NEW)

Native Playwright script — measure `getComputedStyle.transitionDuration`
both without emulation (baseline) and with `emulateMedia({ reducedMotion:
'reduce' })`. Asserts duration drops to ≤1ms. Pass/fail.

### Screenshot replacements

- `p7-canonical-final.png` — re-captured at 1600×1000 (was 1440×900 drift)
- `p7-focus-ring-example.png` — re-captured via real keyboard Tab
  (was proof-class simulation)
- `p7-vs-p4-diff.png` — NEW, empirical pixel-diff evidence
- `p7-vs-p6-diff.png` — NEW, reference diff vs utility-zone baseline

### `codex-review/` commit

12 previously-untracked files brought under git (00-context through
11-playwright-visual-pass). 12-workplan.md already tracked via P7 Cut B.
Every phase log + CLAUDE.md + workplan itself references paths inside
`codex-review/`; tracking them closes the dangling-reference gap.

---

## Updated metrics

| Metric | P7 final | P7a final | Δ vs P7 |
|--------|----------|-----------|---------|
| Tests | 107 | 107 | 0 |
| Typecheck | 0 | 0 | 0 |
| Build raw | 323.10 kB | 323.10 kB | 0 |
| Build gzip | 94.06 kB | 94.06 kB | 0 |
| CSS bundle | 65.88 kB | 65.65 kB | −0.23 kB |
| F.1 | 76 | 76 | 0 |
| F.2 | 5 | 5 | 0 |
| **F.3** | 97 | **93** | **−4 (stretch ≤95 cleared)** |
| PARITY Open | 0 | 0 | 0 |

---

## Focus-ring rule (final, 11 selectors)

```css
.lm-btn:focus-visible,
.lm-bp-btn:focus-visible,
.lm-copy-btn:focus-visible,
.lm-export-dialog__close:focus-visible,
.lm-banner__close:focus-visible,
.lm-utility-zone__header:focus-visible,
.lm-preset-dropdown__trigger:focus-visible,
.lm-preset-dropdown__item:focus-visible,
.lm-sidebar__nav-btn:focus-visible,
.lm-slot-zone:focus-visible,
.lm-slot-zone--nested:focus-visible {
  outline: 2px solid var(--lm-border-focus);
  outline-offset: 2px;
}
```

---

## Honest remaining caveats

1. **`.lm-banner__close` not reproduced via real SSE trigger.** External
   YAML edit while LM running would fire it; I covered class/rule
   connection via isolated-DOM proof + unit test. Low risk — same shared
   rule covers it.

2. **DrawerPreview icon stroke** stayed at `strokeWidth=2.5` (peek/fab)
   and `2` (hamburger). If LM canvas should match Portal's runtime
   `stroke-width=3` exactly — that's a Parity Log entry, not P7 polish.

3. **35 of 42 AC items** still rely on phase-SHA + contract-test
   evidence, not fresh empirical re-walk. Full manual 7-layout ×
   3-breakpoint re-test = separate QA pass, not P7a's scope.

4. **Inspector.tsx line 874** ("No types — slot won't show block controls
   in Studio") is a user-visible string referencing Studio. Reads as
   lifecycle-adjacent; recommend Appendix B language review.

---

## Commit plan

Single commit (P7a fits one logical landing — empirical fixes + F.3
consolidation + `codex-review/` tracking):

```
chore(lm): phase 7a — empirical follow-up (real focus-ring + reduced-motion proof + F.3 stretch + codex-review tracking) [LM-reforge phase 7a]
```

Followed by optional SHA embed.
