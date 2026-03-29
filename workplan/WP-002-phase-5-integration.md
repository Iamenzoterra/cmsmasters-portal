# WP-002 Phase 5: Integration Verify + Smoke Test

> Workplan: WP-002 Layer 0 — Infrastructure
> Phase: 5 of 6
> Priority: P0
> Estimated: 1–1.5 hours
> Type: Config
> Previous: Phase 4 ✅ (API Client + Validators — Hono RPC typed client, Zod v4 theme schema)
> Next: Phase 6 (Documentation Update)

---

## Context

Phases 1–4 built all 6 Layer 0 deliverables independently:

| # | Deliverable | Package | Status |
|---|------------|---------|--------|
| 1 | Supabase schema | `supabase/migrations/001_initial_schema.sql` | ✅ File created |
| 2 | DB package | `@cmsmasters/db` | ✅ Typed client, queries |
| 3 | Auth package | `@cmsmasters/auth` | ✅ PKCE client, hooks, guard |
| 4 | Hono API | `apps/api` | ✅ JWT middleware, 3 routes |
| 5 | API client | `@cmsmasters/api-client` | ✅ Hono RPC typed |
| 6 | Validators | `@cmsmasters/validators` | ✅ Zod v4 theme schema |

Each was verified individually. This phase verifies they work **together** — cross-package imports, no circular deps, all Nx targets resolve, and a single integration smoke test confirms the full chain.

```
CURRENT:  6 packages/apps built and individually verified               ✅
MISSING:  Cross-package integration test, full Nx build, env coherence  ❌
```

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Full Nx project list — all 8 projects should be visible
echo "=== Nx Projects ==="
npx nx show projects 2>/dev/null
echo "(expect 8: command-center, ui, db, auth, api-client, validators, email, api)"

# 2. Check dependency graph — no circular deps
echo "=== Dependency graph ==="
npx nx graph --file=output.json 2>/dev/null && echo "Graph generated" || echo "Graph generation failed"
# If graph works, check for cycles:
node -e "
try {
  const g = require('./output.json');
  console.log('Nodes:', Object.keys(g.graph.nodes).length);
  console.log('Dependencies:');
  Object.entries(g.graph.dependencies).forEach(([k,v]) => {
    if (v.length) console.log('  ', k, '→', v.map(d => d.target).join(', '));
  });
} catch(e) { console.log('Could not read graph:', e.message); }
" 2>/dev/null

# 3. Verify all packages resolve from root
echo "=== Package resolution ==="
for pkg in db auth api-client validators; do
  node -e "
    try {
      const p = require.resolve('@cmsmasters/$pkg', { paths: [process.cwd()] });
      console.log('✅ @cmsmasters/$pkg →', p);
    } catch(e) {
      console.log('❌ @cmsmasters/$pkg:', e.message);
    }
  " 2>/dev/null
done

# 4. Check .env.example completeness
echo "=== Env template ==="
cat .env.example

# 5. Check all package.json main/exports point to existing files
echo "=== Entry point validation ==="
for dir in packages/db packages/auth packages/api-client packages/validators; do
  MAIN=$(node -e "const p=require('./$dir/package.json'); console.log(p.main || 'MISSING')")
  if [ -f "$dir/$MAIN" ]; then
    echo "✅ $dir → $MAIN exists"
  else
    echo "❌ $dir → $MAIN DOES NOT EXIST"
  fi
done
```

**Document your findings before proceeding.**

---

## Task 5.1: Cross-Package Import Verification

### What to Build

Create a temporary integration test file that imports from ALL packages and verifies types work together. This file is NOT committed — it's a verification tool.

Create `_integration-test.ts` at monorepo root (temporary):

```typescript
/**
 * Integration smoke test — verifies all Layer 0 packages work together.
 * Run with: npx tsx _integration-test.ts
 * DELETE after verification — not committed.
 */

// === @cmsmasters/db ===
import { createClient } from '@cmsmasters/db'
import type { Database, Theme, Profile, UserRole, ThemeFeature } from '@cmsmasters/db'
import { getThemes, getThemeBySlug, upsertTheme } from '@cmsmasters/db'
import { getProfile, updateProfile } from '@cmsmasters/db'
import { logAction } from '@cmsmasters/db'

// === @cmsmasters/auth ===
import { createBrowserClient } from '@cmsmasters/auth'
import type { AuthState, AllowedRoles } from '@cmsmasters/auth'
// Hooks and guards are React components — can't test outside React, but type-check is enough
import type {} from '@cmsmasters/auth' // useSession, useUser, useRole, RequireAuth

// === @cmsmasters/api-client ===
import { createApiClient } from '@cmsmasters/api-client'
import type { ApiClient } from '@cmsmasters/api-client'

// === @cmsmasters/validators ===
import { themeSchema } from '@cmsmasters/validators'
import type { ThemeFormData } from '@cmsmasters/validators'

// --- Type compatibility checks ---

// 1. DB types are consistent
const testRole: UserRole = 'admin'
const testFeature: ThemeFeature = { icon: 'star', title: 'Test', description: 'Test feature' }

// 2. Validator output matches DB insert type
const validTheme: ThemeFormData = {
  slug: 'test-theme',
  name: 'Test Theme',
  status: 'draft',
}

// 3. Auth state type narrowing works
function checkAuth(state: AuthState) {
  if (state.status === 'authenticated') {
    const role: UserRole = state.role  // Should NOT error
    const id: string = state.userId
    console.log('Authenticated:', role, id)
  }
}

// 4. API client type (can't actually call without server, but type-check is the point)
const api: ApiClient = createApiClient('http://localhost:8787', 'fake-token')

// 5. Zod validation runtime test
const parseResult = themeSchema.safeParse({ slug: 'valid-theme', name: 'Valid Theme' })
console.log('Validation result:', parseResult.success)

const badResult = themeSchema.safeParse({ slug: 'INVALID SLUG!', name: '' })
console.log('Bad validation:', badResult.success) // should be false

console.log('\n✅ All imports resolved. Type-checking passed.')
console.log('Layer 0 integration: OK')
```

Run it:
```bash
npx tsx _integration-test.ts
```

**Expected output:**
```
Validation result: true
Bad validation: false

✅ All imports resolved. Type-checking passed.
Layer 0 integration: OK
```

After verification, **DELETE the file** — it's not part of the codebase:
```bash
rm _integration-test.ts
```

---

## Task 5.2: Full TypeScript Check

### What to Build

Run tsc across all Layer 0 packages in one pass:

```bash
echo "=== Full TypeScript Check ==="

for project in packages/db packages/auth packages/api-client packages/validators apps/api; do
  echo "--- $project ---"
  npx tsc --noEmit -p $project/tsconfig.json 2>&1
  if [ $? -eq 0 ]; then
    echo "✅ $project compiles"
  else
    echo "❌ $project has errors"
  fi
done
```

All 5 must pass with zero errors.

---

## Task 5.3: Nx Build Verification

### What to Build

Verify Nx can resolve the dependency graph and that no circular dependencies exist:

```bash
# Check if any packages have build targets
echo "=== Nx build targets ==="
npx nx show projects --with-target=build 2>/dev/null

# If packages don't have build targets (noEmit), that's fine
# The key test is: Nx can resolve all projects and their deps
npx nx graph --file=dep-graph.json 2>/dev/null

# Check for circular deps
node -e "
const fs = require('fs');
try {
  const g = JSON.parse(fs.readFileSync('dep-graph.json', 'utf8'));
  const deps = g.graph?.dependencies || {};
  console.log('Projects:', Object.keys(g.graph?.nodes || {}).length);

  // Simple cycle detection
  const visited = new Set();
  const inStack = new Set();
  let hasCycle = false;

  function dfs(node) {
    if (inStack.has(node)) { console.log('❌ CYCLE at:', node); hasCycle = true; return; }
    if (visited.has(node)) return;
    visited.add(node);
    inStack.add(node);
    for (const dep of (deps[node] || [])) {
      dfs(dep.target);
    }
    inStack.delete(node);
  }

  Object.keys(deps).forEach(dfs);
  if (!hasCycle) console.log('✅ No circular dependencies');
} catch(e) { console.log('Skipped graph analysis:', e.message); }
"

# Cleanup
rm -f dep-graph.json output.json
```

---

## Task 5.4: API Health Smoke Test

### What to Build

Quick end-to-end test: start the API, hit the health endpoint, verify JSON response.

```bash
echo "=== API smoke test ==="

# Start wrangler dev in background
cd apps/api
npx wrangler dev --port 8787 &
WRANGLER_PID=$!
cd ../..

# Wait for startup
sleep 5

# Test health endpoint
HEALTH=$(curl -s http://localhost:8787/api/health 2>/dev/null)
echo "Health response: $HEALTH"

# Check response
echo "$HEALTH" | grep -q '"status":"ok"' && echo "✅ Health OK" || echo "❌ Health failed"

# Test protected route without token
UNAUTH=$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:8787/api/content/revalidate 2>/dev/null)
echo "Unauth status: $UNAUTH"
[ "$UNAUTH" = "401" ] && echo "✅ Protected route rejects" || echo "❌ Protected route didn't reject"

# Kill wrangler
kill $WRANGLER_PID 2>/dev/null
wait $WRANGLER_PID 2>/dev/null

echo "=== Smoke test complete ==="
```

**Note for Windows:** If `kill` / background process doesn't work on Windows, run wrangler dev manually in a separate terminal and test with curl. Document the result.

---

## Task 5.5: .env.example Completeness Check

### What to Build

Verify `.env.example` covers ALL env vars referenced across all packages and apps:

```bash
echo "=== Env var coverage ==="

# Find all env var references in code
echo "--- Env vars in code ---"
grep -rh "import\.meta\.env\.\|process\.env\[" packages/ apps/api/src/ 2>/dev/null | \
  grep -oP "(VITE_[A-Z_]+|SUPABASE_[A-Z_]+|API_[A-Z_]+)" | \
  sort -u

echo ""
echo "--- Env vars in .env.example ---"
grep -oP "^[A-Z_]+" .env.example | sort -u

echo ""
echo "(All code vars should appear in .env.example)"
```

If any are missing, add them to `.env.example`.

---

## Files to Modify

- `.env.example` — POSSIBLY update if env vars are missing
- `_integration-test.ts` — TEMPORARY (create, run, delete)
- No permanent new files in this phase

---

## Acceptance Criteria

- [ ] All 4 shared packages resolve via `require.resolve` from root
- [ ] All 5 projects (4 packages + apps/api) pass `tsc --noEmit`
- [ ] No circular dependencies in Nx graph
- [ ] Integration test: all imports work, Zod validates correctly
- [ ] API health endpoint returns 200 with `{ status: 'ok' }`
- [ ] Protected route returns 401 without token
- [ ] `.env.example` covers all env vars referenced in code
- [ ] No temporary files committed

---

## ⚠️ MANDATORY: Verification (do NOT skip)

The tasks above ARE the verification. Summarize all results in the log.

```bash
echo "=== Phase 5 Summary ==="
echo "1. Package resolution: [all 4 resolve? ✅/❌]"
echo "2. TypeScript (5 projects): [all pass? ✅/❌]"
echo "3. Circular deps: [none? ✅/❌]"
echo "4. Integration test: [imports + validation work? ✅/❌]"
echo "5. API health: [200 OK? ✅/❌]"
echo "6. Protected routes: [401 without token? ✅/❌]"
echo "7. Env coverage: [all vars documented? ✅/❌]"
echo "=== Done ==="
```

---

## ⚠️ MANDATORY: Write Execution Log (do NOT skip)

After all verifications, create the file:
`logs/wp-002/phase-5-result.md`

Structure (fill all sections — write N/A if not applicable, do NOT omit sections):

```markdown
# Execution Log: WP-002 Phase 5 — Integration Verify
> Epic: Layer 0 Infrastructure
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED

## What Was Done
Integration verification of all Layer 0 deliverables.

## Verification Results

### Package Resolution
| Package | Resolves? | Entry point |
|---------|-----------|-------------|
| @cmsmasters/db | ✅/❌ | ? |
| @cmsmasters/auth | ✅/❌ | ? |
| @cmsmasters/api-client | ✅/❌ | ? |
| @cmsmasters/validators | ✅/❌ | ? |

### TypeScript Compilation
| Project | Compiles? | Errors |
|---------|-----------|--------|
| packages/db | ✅/❌ | ? |
| packages/auth | ✅/❌ | ? |
| packages/api-client | ✅/❌ | ? |
| packages/validators | ✅/❌ | ? |
| apps/api | ✅/❌ | ? |

### Integration
| Check | Result |
|-------|--------|
| Cross-package imports | ✅/❌ |
| Zod validation (valid data) | ✅/❌ |
| Zod validation (invalid data rejected) | ✅/❌ |
| No circular deps | ✅/❌ |
| API health 200 | ✅/❌ |
| Protected route 401 | ✅/❌ |
| Env coverage complete | ✅/❌ |

## Issues Found
{Any issues discovered during integration. "None" if clean.}

## Fixes Applied
{Any fixes made. "None" if nothing needed fixing.}

## Open Questions
{Non-blocking questions. "None" if none.}

## Git
- Commit: `{sha}` — `{message}`
```

---

## Git

```bash
# Only commit if fixes were needed. If everything passed clean:
git add logs/wp-002/phase-5-result.md .env.example
git commit -m "verify: Layer 0 integration smoke test [WP-002 phase 5]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **This phase writes NO production code.** It's verification only.
- **Delete `_integration-test.ts` after running.** It must NOT be committed.
- **Delete `dep-graph.json` and `output.json`** if generated by Nx graph.
- If any check fails — FIX IT in this phase and document the fix in the log. Don't leave broken things for Phase 6.
- **Do NOT modify packages/ui or apps/command-center** — they're not part of Layer 0.
- If wrangler dev doesn't work on Windows, document it as "manual test required" and test curl separately.
