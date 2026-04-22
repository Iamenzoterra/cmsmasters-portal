# @cmsmasters/block-forge-core

Framework-agnostic responsive block authoring engine. Parses a block's CSS + HTML, runs the six ADR-025 heuristics, emits tweaks per breakpoint, composes variants, and renders a deterministic preview string pair.

## What it IS

- **Analyzer** — AST-based CSS (postcss) + HTML (node-html-parser) parsing. Replaces the regex-based `apps/studio/src/lib/block-processor.ts` for responsive concerns.
- **Rule engine** — six heuristics: `grid-cols`, `spacing-clamp`, `font-clamp`, `flex-wrap`, `horizontal-overflow`, `media-maxwidth`.
- **Tweak emitter + variant composer** — pure functions that fold accepted suggestions / authored tweaks into `BlockVariants` (ADR-025 / WP-024 shape).
- **Preview renderer** — returns `{ html, css }` strings; zero DOM side effects.

## What it IS NOT

- No UI, no React, no DOM. No `window`, no `document`.
- No DB access, no API calls, no Supabase client.
- No auto-apply: heuristics produce **suggestions** — consumers route them through accept/tweak/reject gates per ADR-025.

## Import

```ts
import type { BlockInput, BlockOutput, Suggestion } from '@cmsmasters/block-forge-core'
```

Public entry only. No deep imports.

## Domain skill

`.claude/skills/domains/pkg-block-forge-core/SKILL.md`

## Status

Phase 1 (scaffold). Analyzer, rules, compose land in Phases 2–4 per [workplan/WP-025-block-forge-core.md](../../workplan/WP-025-block-forge-core.md).
