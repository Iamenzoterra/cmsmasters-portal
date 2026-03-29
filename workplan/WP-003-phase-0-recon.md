# WP-003 Phase 0: RECON — Studio Pre-Scaffold Audit

> Workplan: WP-003 Layer 1 — Content Studio
> Phase: 0 of 7
> Priority: P0
> Estimated: 0.5 hours
> Type: Config
> Previous: WP-002 ✅ (Layer 0 — all shared packages built and integration-verified)
> Next: Phase 1 (Vite SPA Scaffold + Auth)

---

## Context

We're about to build the first client app on the stack: Content Studio — a Vite + React Router SPA for managing WordPress themes. Before scaffolding, we need to understand:

1. What exists in `apps/` — Studio dir? Any shell?
2. How `packages/ui` is structured — what primitives are available, how they're imported, how Tailwind is configured
3. How the existing Vite/build tooling works in the monorepo — what patterns to follow
4. Whether Layer 0 packages actually work from a Vite consumer perspective
5. What Supabase state is (migration deployed? test user exists?)

```
CURRENT:  Layer 0 ✅ (db, auth, api-client, validators, apps/api)
          apps/command-center ✅ (Next.js, reference for patterns)
          apps/studio = does NOT exist (confirmed in WP-002 Phase 0)
MISSING:  Everything — full Vite SPA from scratch                       ❌
```

---

## PHASE 0: Audit (do FIRST — CRITICAL)

Run every command below. Document ALL findings. Do NOT write any code.

```bash
# ══════════════════════════════════════════
# 1. CONFIRM STUDIO DOESN'T EXIST
# ══════════════════════════════════════════
ls apps/studio/ 2>/dev/null || echo "apps/studio does not exist — expected"

# ══════════════════════════════════════════
# 2. PACKAGES/UI — WHAT'S AVAILABLE
# ══════════════════════════════════════════
echo "=== packages/ui structure ==="
find packages/ui/src -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" 2>/dev/null | sort

echo "=== packages/ui package.json ==="
cat packages/ui/package.json

echo "=== packages/ui exports ==="
cat packages/ui/src/index.ts 2>/dev/null || echo "No index.ts barrel"
# Check what's actually exported
grep -r "^export" packages/ui/src/ 2>/dev/null | head -30

echo "=== tokens.css location and size ==="
wc -l packages/ui/src/theme/tokens.css 2>/dev/null

echo "=== Tailwind config ==="
cat packages/ui/tailwind.config.ts 2>/dev/null || cat packages/ui/tailwind.config.js 2>/dev/null || echo "No tailwind config in packages/ui"

echo "=== primitives available ==="
ls packages/ui/src/primitives/ 2>/dev/null || echo "No primitives dir"

echo "=== shadcn utils (cn function) ==="
cat packages/ui/src/lib/utils.ts 2>/dev/null || echo "No utils.ts"

# ══════════════════════════════════════════
# 3. COMMAND CENTER — REFERENCE PATTERNS
# ══════════════════════════════════════════
# CC is the only working app. Understand how it configures things.

echo "=== CC project.json targets ==="
cat apps/command-center/project.json 2>/dev/null | head -30

echo "=== CC package.json deps ==="
grep -A30 '"dependencies"' apps/command-center/package.json 2>/dev/null

echo "=== CC tailwind config ==="
cat apps/command-center/tailwind.config.ts 2>/dev/null | head -30

echo "=== CC tsconfig ==="
cat apps/command-center/tsconfig.json 2>/dev/null

echo "=== CC how does it import @cmsmasters/ui? ==="
grep -r "@cmsmasters/ui" apps/command-center/src/ 2>/dev/null | head -10

echo "=== CC CSS entry (globals) ==="
head -20 apps/command-center/app/globals.css 2>/dev/null || head -20 apps/command-center/src/globals.css 2>/dev/null

# ══════════════════════════════════════════
# 4. VITE IN MONOREPO — ANY EXISTING CONFIGS?
# ══════════════════════════════════════════
echo "=== Any vite.config anywhere? ==="
find . -name "vite.config.*" -not -path "*/node_modules/*" 2>/dev/null

echo "=== React Router version ==="
ls node_modules/react-router-dom/package.json 2>/dev/null && grep '"version"' node_modules/react-router-dom/package.json || echo "react-router-dom not installed"

echo "=== react-hook-form ==="
ls node_modules/react-hook-form/package.json 2>/dev/null && grep '"version"' node_modules/react-hook-form/package.json || echo "react-hook-form not installed"

echo "=== @hookform/resolvers ==="
ls node_modules/@hookform/resolvers/package.json 2>/dev/null || echo "@hookform/resolvers not installed"

# ══════════════════════════════════════════
# 5. LAYER 0 PACKAGES — IMPORT PATTERNS
# ══════════════════════════════════════════
echo "=== All @cmsmasters packages ==="
for pkg in db auth api-client validators ui; do
  echo "--- @cmsmasters/$pkg ---"
  node -e "
    try {
      const p = require.resolve('@cmsmasters/$pkg', { paths: [process.cwd()] });
      console.log('resolves:', p);
    } catch(e) { console.log('FAILS:', e.message); }
  " 2>/dev/null
done

echo "=== auth package — what it exports ==="
cat packages/auth/src/index.ts 2>/dev/null

echo "=== auth guards — RequireAuth props ==="
head -30 packages/auth/src/guards.tsx 2>/dev/null

echo "=== auth hooks — useUser signature ==="
grep -A5 "export function useUser" packages/auth/src/hooks.ts 2>/dev/null

echo "=== auth actions — signInWithMagicLink ==="
grep -A5 "export async function signInWithMagicLink" packages/auth/src/actions.ts 2>/dev/null

echo "=== db queries — what's available ==="
cat packages/db/src/index.ts 2>/dev/null

echo "=== validators — themeSchema exports ==="
cat packages/validators/src/index.ts 2>/dev/null

# ══════════════════════════════════════════
# 6. SUPABASE STATE
# ══════════════════════════════════════════
echo "=== .env — Supabase vars present? (keys only, not values) ==="
grep -oP '^[A-Z_]+' .env 2>/dev/null | sort

echo "=== Supabase migration deployed? ==="
echo "(Cannot check from CLI — Dmitry must confirm)"

# ══════════════════════════════════════════
# 7. MONOREPO WORKSPACE CONFIG
# ══════════════════════════════════════════
echo "=== root package.json workspaces ==="
grep -A5 '"workspaces"' package.json

echo "=== Nx config ==="
cat nx.json | head -30

echo "=== .gitignore — Vite specific? ==="
grep -i "vite\|dist" .gitignore 2>/dev/null | head -5
```

**Document your findings before doing anything else.**

---

## Questions to Answer

After running the audit, answer these in the log:

1. **packages/ui:** What primitives are available right now? Is there a Button? A barrel export? How does Tailwind + tokens work?
2. **Tailwind setup:** Is there a shared Tailwind config? How does CC configure Tailwind? Do we need our own Tailwind config or reuse a shared one?
3. **Import patterns:** How does CC import from @cmsmasters/ui? Direct file imports or barrel? Does workspace resolution work?
4. **Auth API surface:** What does RequireAuth expect as props? Is it callback-based (Phase 2 log said router-agnostic) or does it use react-router?
5. **Vite in monorepo:** Any existing Vite config to reference? Any known workspace resolution issues?
6. **Dependencies needed:** Which of these need to be installed? react-router-dom, react-hook-form, @hookform/resolvers, tailwindcss, autoprefixer, postcss
7. **Supabase:** Is the migration deployed? Are SUPABASE_URL and SUPABASE_ANON_KEY in .env?
8. **Surprises:** Anything unexpected that changes the Studio scaffold plan?

---

## Acceptance Criteria

- [ ] All 7 audit sections executed
- [ ] All 8 questions answered in the log
- [ ] Zero code written — this is observation only
- [ ] Findings documented clearly enough for Brain to write Phase 1

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 0 Verification ==="

# Confirm log was written
test -f logs/wp-003/phase-0-result.md && echo "✅ Log exists" || echo "❌ Log missing"

# Confirm no code was written
git status --short | grep -E "^[AM]" | head -20
echo "(Should show only the log file, nothing in apps/studio/)"

echo "=== Verification complete ==="
```

---

## ⚠️ MANDATORY: Write Execution Log (do NOT skip)

After running all audit commands, create the file:
`logs/wp-003/phase-0-result.md`

Structure (fill all sections — write N/A if not applicable, do NOT omit sections):

```markdown
# Execution Log: WP-003 Phase 0 — RECON Studio Pre-Scaffold
> Epic: Layer 1 — Content Studio
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED

## What Was Done
RECON audit of monorepo state before Studio scaffolding.

## Findings

### packages/ui
- Primitives available: {list}
- Barrel export: {yes/no, path}
- Tailwind config: {shared? location? how configured?}
- tokens.css: {location, lines}
- cn() utility: {exists? location?}

### Tailwind Setup
- CC pattern: {how CC configures Tailwind}
- Shared config: {exists? or per-app?}
- PostCSS: {config location}

### Import Patterns
- CC → @cmsmasters/ui: {pattern used}
- Workspace resolution: {works for all packages?}

### Auth Package API Surface
- RequireAuth: {props interface — callback-based or router?}
- useUser: {returns what?}
- signInWithMagicLink: {params?}
- handleAuthCallback: {exists?}

### Vite in Monorepo
- Existing vite.config: {any found?}
- Known issues: {any?}

### Dependencies Status
| Dependency | Installed? | Version |
|------------|-----------|---------|
| react-router-dom | ? | ? |
| react-hook-form | ? | ? |
| @hookform/resolvers | ? | ? |
| tailwindcss | ? | ? |
| postcss | ? | ? |
| autoprefixer | ? | ? |

### Supabase State
- .env vars: {which SUPABASE vars present}
- Migration deployed: {yes/no/unknown}

## Impact on Studio Plan
{What in WP-003 plan needs adjustment based on findings?}

## Surprises
{Anything unexpected}

## Open Questions for Brain
{Questions that need Brain decision}

## Git
- Commit: `{sha}` — `recon: audit monorepo for Studio scaffold [WP-003 phase 0]`
```

---

## Git

```bash
git add logs/wp-003/phase-0-result.md
git commit -m "recon: audit monorepo for Studio scaffold [WP-003 phase 0]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **Do NOT write any code.** RECON is observation only.
- **Do NOT install any packages.** Just check what's there.
- **Do NOT create apps/studio/.** Just confirm it doesn't exist.
- **Pay special attention to packages/ui** — Studio will be the first real consumer of the design system primitives. Understanding what's there now is critical.
- **Pay special attention to the auth package API** — Studio needs login, guards, and hooks. The exact props/signatures determine Phase 1 code.
- **Read `.context/CONVENTIONS.md`** for Layer 0 patterns that Studio must follow (tsconfig, package.json, import resolution).
