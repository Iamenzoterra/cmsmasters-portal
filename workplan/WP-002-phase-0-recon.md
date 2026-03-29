# WP-002 Phase 0: RECON — Infrastructure Audit

> Workplan: WP-002 Layer 0 — Infrastructure
> Phase: 0 of 6
> Priority: P0
> Estimated: 0.5 hours
> Type: Config
> Previous: WP-001 ✅ (Command Center built, monorepo configured)
> Next: Phase 1 (Supabase Schema + DB Package)

---

## Context

We're about to build Layer 0 infrastructure: Supabase schema, auth package, Hono API, DB package, API client, and validators. Before writing any code, we need to understand what actually exists in the monorepo right now.

The LAYER_0_SPEC (`.context/LAYER_0_SPEC.md`) assumes certain package shells exist and certain configs are in place. We don't know if that's true. This phase audits reality.

```
CURRENT:  Monorepo with Nx, Command Center app, packages/ui with tokens + button   ✅
MISSING:  Actual state of packages/db, auth, api-client, validators, apps/api       ❌
```

---

## PHASE 0: Audit (do FIRST — CRITICAL)

Run every command below. Document ALL findings. Do NOT write any code.

```bash
# 1. Monorepo root — what's configured
cat package.json | head -30
cat nx.json | head -50
ls -la .env* 2>/dev/null || echo "No .env files found"
cat .env.example 2>/dev/null || echo "No .env.example"

# 2. Package shells — what exists in each
echo "=== packages/db ==="
ls -la packages/db/ 2>/dev/null || echo "packages/db does not exist"
cat packages/db/package.json 2>/dev/null || echo "No package.json"
ls -R packages/db/src/ 2>/dev/null || echo "No src/"

echo "=== packages/auth ==="
ls -la packages/auth/ 2>/dev/null || echo "packages/auth does not exist"
cat packages/auth/package.json 2>/dev/null || echo "No package.json"
ls -R packages/auth/src/ 2>/dev/null || echo "No src/"

echo "=== packages/api-client ==="
ls -la packages/api-client/ 2>/dev/null || echo "packages/api-client does not exist"
cat packages/api-client/package.json 2>/dev/null || echo "No package.json"
ls -R packages/api-client/src/ 2>/dev/null || echo "No src/"

echo "=== packages/validators ==="
ls -la packages/validators/ 2>/dev/null || echo "packages/validators does not exist"
cat packages/validators/package.json 2>/dev/null || echo "No package.json"
ls -R packages/validators/src/ 2>/dev/null || echo "No src/"

echo "=== packages/ui (reference — already exists) ==="
ls packages/ui/src/ 2>/dev/null
cat packages/ui/package.json 2>/dev/null | head -20

# 3. Apps — does api exist?
echo "=== apps/api ==="
ls -la apps/api/ 2>/dev/null || echo "apps/api does not exist"
cat apps/api/package.json 2>/dev/null || echo "No package.json"
ls -R apps/api/src/ 2>/dev/null || echo "No src/"

# 4. Supabase — any existing config?
echo "=== Supabase ==="
ls -la supabase/ 2>/dev/null || echo "No supabase/ directory"
cat supabase/config.toml 2>/dev/null || echo "No supabase config"
ls supabase/migrations/ 2>/dev/null || echo "No migrations/"

# 5. Nx workspace — how are packages registered?
echo "=== Nx project registration ==="
cat nx.json | grep -A2 "targetDefaults" 2>/dev/null || echo "No targetDefaults"
# Check if packages have project.json or rely on package.json inference
ls packages/db/project.json 2>/dev/null || echo "packages/db: no project.json (Nx infers from package.json)"
ls packages/auth/project.json 2>/dev/null || echo "packages/auth: no project.json"
ls packages/api-client/project.json 2>/dev/null || echo "packages/api-client: no project.json"
ls packages/validators/project.json 2>/dev/null || echo "packages/validators: no project.json"
ls apps/api/project.json 2>/dev/null || echo "apps/api: no project.json"

# 6. TypeScript — workspace references and path aliases
cat tsconfig.base.json 2>/dev/null || cat tsconfig.json 2>/dev/null | head -40
echo "=== Path aliases ==="
grep -A20 '"paths"' tsconfig.base.json 2>/dev/null || grep -A20 '"paths"' tsconfig.json 2>/dev/null || echo "No path aliases found"

# 7. Installed dependencies — what's already available
echo "=== Relevant installed deps ==="
grep -E "supabase|hono|zod|wrangler" package.json 2>/dev/null || echo "None in root"
ls node_modules/@supabase 2>/dev/null || echo "@supabase not installed"
ls node_modules/hono 2>/dev/null || echo "hono not installed"
ls node_modules/zod 2>/dev/null || echo "zod not installed"

# 8. Existing env patterns — how does command-center or ui handle env?
echo "=== Env patterns in existing apps ==="
grep -r "process.env\|import.meta.env" apps/command-center/src/ 2>/dev/null | head -10
grep -r "VITE_\|NEXT_PUBLIC_" apps/ 2>/dev/null | head -10

# 9. Check LAYER_0_SPEC for reference
echo "=== LAYER_0_SPEC exists? ==="
ls -la .context/LAYER_0_SPEC.md 2>/dev/null
wc -l .context/LAYER_0_SPEC.md 2>/dev/null
```

**Document your findings before doing anything else.**

---

## Questions to Answer

After running the audit, answer these in the log:

1. **Package shells:** Which of the 4 packages (db, auth, api-client, validators) already exist? What's in them — empty shell, partial implementation, or nothing?
2. **Apps/api:** Does it exist? Any Hono setup already?
3. **Nx registration:** Are packages registered via `project.json` or inferred from `package.json`? What pattern does the existing `packages/ui` use?
4. **TypeScript paths:** Are `@cmsmasters/db`, `@cmsmasters/auth`, etc. already aliased in tsconfig? What pattern is used?
5. **Dependencies:** Are `@supabase/supabase-js`, `hono`, `zod` already installed (root or workspace)?
6. **Env setup:** Any existing `.env` or `.env.example`? How do existing apps (command-center) access env vars?
7. **Supabase:** Any existing `supabase/` directory or config?
8. **Surprises:** Anything unexpected that changes the Layer 0 plan?

---

## Acceptance Criteria

- [ ] All 9 audit sections executed
- [ ] All 8 questions answered in the log
- [ ] Zero code written — this is observation only
- [ ] Findings documented clearly enough for Brain to write Phase 1

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 0 Verification ==="

# Confirm log was written
test -f logs/wp-002/phase-0-result.md && echo "✅ Log exists" || echo "❌ Log missing"

# Confirm no code was written (no new files in packages/ or apps/api/)
git status --short | grep -E "^[AM]" | head -20
echo "(Should show only the log file, nothing in packages/ or apps/)"

echo "=== Verification complete ==="
```

---

## ⚠️ MANDATORY: Write Execution Log (do NOT skip)

After running all audit commands, create the file:
`logs/wp-002/phase-0-result.md`

Structure (fill all sections — write N/A if not applicable, do NOT omit sections):

```markdown
# Execution Log: WP-002 Phase 0 — RECON Infrastructure Audit
> Epic: Layer 0 Infrastructure
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED

## What Was Done
RECON audit of monorepo state before Layer 0 implementation.

## Findings

### Package Shells
| Package | Exists? | Has package.json? | Has src/? | Contents |
|---------|---------|-------------------|-----------|----------|
| packages/db | ? | ? | ? | ? |
| packages/auth | ? | ? | ? | ? |
| packages/api-client | ? | ? | ? | ? |
| packages/validators | ? | ? | ? | ? |

### Apps
| App | Exists? | Framework | Contents |
|-----|---------|-----------|----------|
| apps/api | ? | ? | ? |

### Nx & TypeScript
- Registration pattern: {project.json vs package.json inference}
- Path aliases: {what exists, what's missing}
- tsconfig pattern: {base config location and structure}

### Dependencies
| Dependency | Installed? | Location |
|------------|-----------|----------|
| @supabase/supabase-js | ? | ? |
| hono | ? | ? |
| zod | ? | ? |
| wrangler | ? | ? |

### Env Setup
- .env files: {what exists}
- Pattern used: {process.env vs import.meta.env}

### Supabase
- supabase/ directory: {exists/doesn't}
- Config: {exists/doesn't}

## Impact on Layer 0 Plan
{What in the WP-002 plan needs adjustment based on these findings?}

## Surprises
{Anything unexpected}

## Open Questions
{Questions for Brain}

## Git
- Commit: `{sha}` — `recon: audit monorepo for Layer 0 [WP-002 phase 0]`
```

Then include `logs/` in your `git add` before committing.

---

## Git

```bash
git add logs/wp-002/phase-0-result.md
git commit -m "recon: audit monorepo for Layer 0 [WP-002 phase 0]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **Do NOT write any code in this phase.** RECON is observation only.
- **Do NOT install any packages.** Just check what's there.
- **Do NOT create any directories.** Just report what exists.
- **Read `.context/LAYER_0_SPEC.md` first** — it's the reference for what we intend to build. Your job is to compare intent vs reality.
- If a command fails or a directory doesn't exist, that's a valid finding — document it, don't try to fix it.
