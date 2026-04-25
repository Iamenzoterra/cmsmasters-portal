# WP-031 Phase 6 - Visual Rhythm + Inline Style Purge (TASK)

Date: 2026-04-25

## Goal

Kill the 21 remaining inline `style={{}}` overrides in Inspector.tsx that
corrupt the spacing/typography rhythm. Replace with token-driven CSS
modifier classes. Keep ONLY truly dynamic styles (color swatches).
Pixel-identical output for the operator. PARITY contract preserved.

This closes the original UX research finding ("inline overrides + magic
px corrupt visual rhythm") that motivated WP-031.

## Binding Brain Decisions

1. **Single cut.** CSS-additive + TSX className-swaps only. No
   behavior change. Mechanical work.

2. **Strict goal: 21 → ≤2.** The 2 retained inlines are color swatches
   at L146 + L172 (`style={{ background: selected.hex }}`) — truly
   dynamic, must stay inline.

3. **Magic px → tokens.**
   - `'8px'` → `var(--lm-sp-4)` (8px in scale)
   - `'12px'` → `var(--lm-sp-6)` (12px in scale)
   - `'64px'` / `'60px'` → `var(--lm-inspector-field-narrow)` (64px)

4. **New BEM modifier classes:**
   - `.lm-inspector__row--gap-md` — gap: var(--lm-sp-3)
   - `.lm-inspector__row--mt-sm` — margin-top: var(--lm-sp-4) (8px)
   - `.lm-inspector__row--mt-md` — margin-top: var(--lm-sp-6) (12px)
   - `.lm-inspector__row--mt-lg` — margin-top: var(--lm-sp-8) (16px)
   - `.lm-inspector__field--narrow` — width: 64px
   - `.lm-inspector__field--fill` — flex: 1; min-width: 0
   - `.lm-inspector__field-stack` — flex column with gap-2
   - `.lm-inspector__checkbox-label` — flex inline, gap-2, font-size 12px
   - `.lm-inspector__empty--padded` — padding: var(--lm-sp-4) 0
   - `.lm-inspector__convert-btn-row` — margin-top: var(--lm-sp-8) wrapper
   - `.lm-inspector__convert-btn` — flex:none, mt:6, mr:4, padding pill

5. **F.3 hygiene:** any new font-size declaration must add to existing
   shared rule per CLAUDE.md F.3 Shared-Selector Convention. New
   `.lm-inspector__checkbox-label { font-size: 12px }` is value-12,
   not the value-11 of the shared P5/P7 small-caps rule, so it can
   live as a separate rule.

6. **Path budget ≤ 4:** Inspector.tsx + maker.css + Inspector.test.tsx
   (1-2 grep assertions) + 1 screenshot.

7. **Bundle cap ±5 kB.** CSS additions ~25 lines; Inspector.tsx LOC
   delta ≤ 0 (className swaps don't grow the file).

8. **Test floor 152 → ≥154.** Adds:
   - inline-style count assertion (queryAllByCSS-style scan or DOM walk)
   - F.3 grep assertion (≤93 — no growth)

9. **Empirical pass/fail:** `grep -c 'style={{' Inspector.tsx` from
   21 → ≤2. Visual diff against P5 hotfix screenshot: pixel-identical
   (no rhythm regression).

10. **PARITY zero open precondition.** No data path changes — pure
    presentation refactor.

11. **Catch-all stop trigger:**
    - inline count > 5 after migration
    - any test fails after batch
    - F.3 grows above 95
    - Visual screenshot shows unintended rhythm change

## File scope

```
tools/layout-maker/src/components/Inspector.tsx       # M (className swaps, no LOC growth)
tools/layout-maker/src/styles/maker.css               # M (~10 new BEM modifier rules)
tools/layout-maker/src/components/Inspector.test.tsx  # M (+1 inline count assertion)
tools/layout-maker/codex-review/wp031-phase6-rhythm.png  # NEW
```

## Out of scope

- Color swatch dynamic styles (truly dynamic, must stay inline)
- Token migration to `--tag-*`/shadcn (Appendix B)
- New visual treatments (P4 already shipped scope/override clarity)
- Modal extraction (was Phase 4b candidate)
