# Execution Log: WP-005B Phase 2 — Zod Validators + DB Query Layer
> Epic: WP-005B DB Foundation + API
> Executed: 2026-03-31T13:10Z
> Duration: ~10 minutes
> Status: COMPLETE

## What Was Done

Created Zod validators for block and template API payloads. Created DB query functions for blocks and templates CRUD with dependency-check usage helpers. Added smoke test proving barrel exports work and schemas validate correctly.

## Files Changed

| File | Change | Description |
|------|--------|-------------|
| `packages/validators/src/block.ts` | CREATED | createBlockSchema, updateBlockSchema with hooks + metadata |
| `packages/validators/src/template.ts` | CREATED | createTemplateSchema, updateTemplateSchema with positions |
| `packages/validators/src/index.ts` | MODIFIED | Added block + template schema/type exports |
| `packages/db/src/queries/blocks.ts` | CREATED | 7 functions: getBlocks, getBlockById, getBlockBySlug, createBlock, updateBlock, deleteBlock, getBlockUsage |
| `packages/db/src/queries/templates.ts` | CREATED | 6 functions: getTemplates, getTemplateById, createTemplate, updateTemplate, deleteTemplate, getTemplateUsage |
| `packages/db/src/index.ts` | MODIFIED | Added 13 query function exports |
| `packages/db/src/__tests__/phase2-smoke.test.ts` | CREATED | 14 assertions: barrel imports, valid/invalid blocks, templates, partial updates |

## M2 Guard: getBlockUsage

`getBlockUsage` guards against malformed `positions` jsonb:
- Checks `Array.isArray(t.positions)` before iterating
- Each item checked: `p !== null && typeof p === 'object' && 'block_id' in p`
- Never crashes on bad data in DB

## Verification Results

| Check | Result |
|-------|--------|
| block.ts exists | PASS |
| template.ts exists | PASS |
| queries/blocks.ts exists (7 functions) | PASS |
| queries/templates.ts exists (6 functions) | PASS |
| validators barrel exports (4 schemas + 4 types) | PASS |
| db barrel exports (13 query functions) | PASS |
| validators tsc | PASS (0 errors) |
| db tsc | PASS (0 errors) |
| mapper test (45/45) | PASS |
| smoke test (14/14) | PASS |
