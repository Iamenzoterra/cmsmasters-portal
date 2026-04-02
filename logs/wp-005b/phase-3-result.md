# Execution Log: WP-005B Phase 3 — Hono API Routes
> Epic: WP-005B DB Foundation + API
> Executed: 2026-03-31T14:00Z
> Duration: ~15 minutes
> Status: COMPLETE

## What Was Done

Created 10 Hono API endpoints (5 blocks, 5 templates) with Zod validation, auth/role middleware, dependency checks on delete, and consistent error mapping. Added `@cmsmasters/validators` as API dependency. Added tsconfig paths for workspace resolution (same fix as Studio in Phase 1).

## Files Changed

| File | Change | Description |
|------|--------|-------------|
| `apps/api/package.json` | MODIFIED | Added `@cmsmasters/validators: "*"` dep |
| `apps/api/tsconfig.json` | MODIFIED | Added paths for @cmsmasters/db and @cmsmasters/validators |
| `apps/api/src/routes/blocks.ts` | CREATED | 5 handlers: GET list, GET :id, POST, PUT :id, DELETE :id with dep check |
| `apps/api/src/routes/templates.ts` | CREATED | 5 handlers: same pattern with template queries |
| `apps/api/src/index.ts` | MODIFIED | Import + mount blocks + templates routes |
| `package-lock.json` | AUTO | Updated by npm install (M1 cut) |

## API Endpoints

| Method | Path | Auth | Role | Notes |
|--------|------|------|------|-------|
| GET | /api/blocks | JWT | any authenticated | List all blocks |
| GET | /api/blocks/:id | JWT | any authenticated | Get by ID, 404 if missing |
| POST | /api/blocks | JWT | content_manager, admin | Zod validate, created_by from context, 409 on dup slug |
| PUT | /api/blocks/:id | JWT | content_manager, admin | Zod validate, 404 if missing |
| DELETE | /api/blocks/:id | JWT | admin | Dep check via getBlockUsage, 409 if in use |
| GET | /api/templates | JWT | any authenticated | List all templates |
| GET | /api/templates/:id | JWT | any authenticated | Get by ID, 404 if missing |
| POST | /api/templates | JWT | content_manager, admin | Zod validate, created_by from context, 409 on dup slug |
| PUT | /api/templates/:id | JWT | content_manager, admin | Zod validate, 404 if missing |
| DELETE | /api/templates/:id | JWT | admin | Dep check via getTemplateUsage, 409 if in use |

## Error Contract (M4)

Consistent across both route modules:
- `400 { error: 'Validation failed', details: zodIssues }`
- `404 { error: 'Block/Template not found' }`
- `409 { error: 'Slug already exists' | 'Resource in use', templates/themes: [...] }`
- `500 { error: 'Internal server error' }`

## M2 Error Mapping

- `PGRST116` (PostgREST no rows) → 404
- `23505` (unique violation) / duplicate message → 409
- Everything else → 500

## Notes

- Wrangler build (`wrangler deploy --dry-run`) fails due to pre-existing workspace resolution issue with spaces in project path. This is NOT a regression — it was already broken before Phase 3. tsc --noEmit passes clean.
- Added tsconfig paths for API (same approach used for Studio in Phase 1).

## Verification Results

| Check | Result |
|-------|--------|
| blocks.ts exists (5 handlers) | PASS |
| templates.ts exists (5 handlers) | PASS |
| Routes mounted in index.ts | PASS |
| @cmsmasters/validators in API deps | PASS |
| API tsc --noEmit | PASS (0 errors) |
| Dep checks present (getBlockUsage, getTemplateUsage) | PASS |
| Error mappers present (PGRST116, 23505) | PASS |
| package-lock.json updated (M1) | PASS |
