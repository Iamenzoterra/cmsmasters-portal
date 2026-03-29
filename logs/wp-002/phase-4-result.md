# Execution Log: WP-002 Phase 4 — API Client + Validators
> Epic: Layer 0 Infrastructure
> Executed: 2026-03-29T13:15:00+02:00
> Duration: ~15 minutes
> Status: ✅ COMPLETE

## What Was Implemented

`@cmsmasters/api-client` with Hono RPC typed client (`createApiClient(baseUrl, token?)`) importing AppType from apps/api as type-only. `@cmsmasters/validators` with Zod v4 theme schema matching Phase 1 themes.Insert spec. Both packages compile independently and are visible in Nx.

## Key Decisions

| Decision | Chosen | Why |
|----------|--------|-----|
| AppType import path | Relative `../../../apps/api/src/index` (type-only) | Simplest approach, tsc resolves it, no extra tsconfig paths needed |
| zod version | v4 (^4), v3-compatible syntax | Already transitive, Brain decided v4. Only diff: `z.record(z.string(), z.unknown())` requires 2 args |
| token parameter | Optional with conditional headers (M3) | Public routes (health) don't need token; no `Bearer undefined` |
| baseUrl parameter | Explicit, not from import.meta.env (M4) | Package shouldn't access env — consuming app passes baseUrl |

## Files Changed

| File | Change | Description |
|------|--------|-------------|
| `packages/api-client/package.json` | created | hono@^4 dep, main→src/index.ts |
| `packages/api-client/tsconfig.json` | created | noEmit, ES2022, bundler |
| `packages/api-client/src/client.ts` | created | createApiClient with type-only AppType import |
| `packages/api-client/src/index.ts` | created | Barrel export |
| `packages/api-client/.gitkeep` | deleted | Replaced by real content |
| `packages/validators/package.json` | modified | main→src/index.ts, zod@^4 dep |
| `packages/validators/tsconfig.json` | created | noEmit, ES2022, bundler |
| `packages/validators/src/theme.ts` | created | themeSchema + ThemeFormData |
| `packages/validators/src/index.ts` | created | Barrel export |
| `packages/validators/.gitkeep` | deleted | Replaced by real content |
| `package-lock.json` | modified | npm install side-effect |

## Issues & Workarounds

| Issue | Resolution |
|-------|-----------|
| zod v4 `z.record()` requires 2 args (key+value) unlike v3 | Changed to `z.record(z.string(), z.unknown())` |
| `require()` can't load TS/ESM packages at runtime | Used `npx tsx` for runtime validation tests instead of node require |

## Open Questions

None.

## Verification Results

| Check | Result |
|-------|--------|
| api-client tsc --noEmit | ✅ |
| validators tsc --noEmit | ✅ (after z.record fix) |
| Nx: both visible | ✅ |
| M2: type-only AppType import | ✅ `import type { AppType }` |
| M3: conditional headers | ✅ `token ? { Authorization: ... } : {}` |
| Runtime: valid data parses | ✅ `{slug:'test',name:'Test'}` → true |
| Runtime: bad slug rejected | ✅ `{slug:'BAD SLUG',name:''}` → false |
| Runtime: bad url rejected | ✅ `{slug:'ok',name:'Ok',demo_url:'not-a-url'}` → false |
| .gitkeep removed (both) | ✅ |

## Git
- Commit: `1c9e7a36` — `feat: @cmsmasters/api-client + @cmsmasters/validators [WP-002 phase 4]`
