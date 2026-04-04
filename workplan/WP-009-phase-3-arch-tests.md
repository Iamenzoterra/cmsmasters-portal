# WP-009 Phase 3: Arch Tests — Enforcement Layer

> Workplan: WP-009 Living Documentation System
> Phase: 3 of 5
> Priority: P1
> Estimated: 2-3 hours
> Type: Config
> Previous: Phase 2 ✅ (11 Domain Skills written)
> Next: Phase 4 (Smoke Test — break & catch)

---

## Context

Phases 1-2 created the manifest (source of truth) and skills (human knowledge). Without enforcement, both will rot. Phase 3 adds arch tests — vitest tests that **fail when documentation diverges from code**.

```
CURRENT:  src/__arch__/domain-manifest.ts — 11 domains       ✅
CURRENT:  .claude/skills/domains/ — 11 SKILL.md files         ✅
MISSING:  src/__arch__/domain-manifest.test.ts — enforcement   ❌
MISSING:  npm run arch-test script                             ❌
MISSING:  vitest config for src/__arch__/                      ❌
```

The arch tests are the teeth of Living Documentation. If a developer adds a file without updating the manifest, the test fails. If a skill's frontmatter doesn't match the manifest, the test fails.

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Confirm manifest loads
cd "C:/work/cmsmasters portal/app/cmsmasters-portal"
npx tsx -e "import { DOMAINS } from './src/__arch__/domain-manifest'; console.log('✅ ' + Object.keys(DOMAINS).length + ' domains')"

# 2. Confirm all skills exist
for d in pkg-db pkg-auth pkg-ui pkg-validators pkg-api-client app-portal studio-blocks studio-core app-api app-command-center infra-tooling; do
  [ -f ".claude/skills/domains/$d/SKILL.md" ] && echo "✅ $d" || echo "❌ $d"
done

# 3. Check vitest version and existing config
npx vitest --version
find . -name "vitest.config.*" -maxdepth 3 2>/dev/null | head -5
cat tsconfig.json | head -20

# 4. Read Phase 1+2 logs for any deviations
cat logs/wp-009/phase-1-result.md
cat logs/wp-009/phase-2-result.md
```

---

## Task 3.1: Vitest Config for Arch Tests

### What to Build

Create a vitest config scoped to `src/__arch__/`:

**File: `src/__arch__/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/__arch__/**/*.test.ts'],
    globals: true,
  },
})
```

### Integration

Add to root `package.json` scripts:

```json
"arch-test": "vitest run --config src/__arch__/vitest.config.ts --reporter=verbose"
```

---

## Task 3.2: Path Existence Test

### What to Build

Every path in every domain's `owned_files` must exist on disk. This catches:
- Files deleted without manifest update
- Typos in manifest paths
- Renames without manifest update

**File: `src/__arch__/domain-manifest.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { DOMAINS } from './domain-manifest'
import { getOwnedPaths } from './helpers'

const ROOT = path.resolve(__dirname, '../..')

describe('Domain Manifest — Path Existence', () => {
  for (const [slug, domain] of Object.entries(DOMAINS)) {
    // Skip infra-tooling non-code files (markdown, json) — they use different tracking
    if (domain.policy === 'meta') continue

    for (const filePath of getOwnedPaths(domain)) {
      it(`${slug}: file exists → ${filePath}`, () => {
        const abs = path.resolve(ROOT, filePath)
        expect(fs.existsSync(abs), `Missing: ${filePath}`).toBe(true)
      })
    }
  }
})
```

**For `infra-tooling` (policy: 'meta')** — test separately since its files are markdown/json:

```typescript
describe('Infra Tooling — Path Existence', () => {
  const infra = DOMAINS['infra-tooling']
  if (!infra) return

  for (const filePath of getOwnedPaths(infra)) {
    it(`infra-tooling: file exists → ${filePath}`, () => {
      const abs = path.resolve(ROOT, filePath)
      expect(fs.existsSync(abs), `Missing: ${filePath}`).toBe(true)
    })
  }
})
```

---

## Task 3.3: No Dual Ownership Test

### What to Build

No file may be claimed by two domains. This catches copy-paste mistakes in manifest.

```typescript
describe('Domain Manifest — No Dual Ownership', () => {
  it('no file is owned by two domains', () => {
    const seen = new Map<string, string>()
    for (const [slug, domain] of Object.entries(DOMAINS)) {
      for (const filePath of getOwnedPaths(domain)) {
        const existing = seen.get(filePath)
        if (existing) {
          expect.fail(`"${filePath}" owned by both "${existing}" and "${slug}"`)
        }
        seen.set(filePath, slug)
      }
    }
  })
})
```

---

## Task 3.4: Table Ownership Test

### What to Build

Every table in `owned_tables` should have a `.from('table_name')` call somewhere in the domain's owned code. This catches tables claimed by a domain that doesn't actually query them.

```typescript
describe('Domain Manifest — Table Access', () => {
  for (const [slug, domain] of Object.entries(DOMAINS)) {
    for (const table of domain.owned_tables) {
      it(`${slug}: table "${table}" has .from() in owned code`, () => {
        const ownedFiles = getOwnedPaths(domain)
          .map(f => path.resolve(ROOT, f))
          .filter(f => f.endsWith('.ts') || f.endsWith('.tsx'))
          .filter(f => fs.existsSync(f))

        const pattern = new RegExp(`\\.from\\s*\\(\\s*['"\`]${table}['"\`]`)
        const found = ownedFiles.some(f => {
          const content = fs.readFileSync(f, 'utf-8')
          return pattern.test(content)
        })

        expect(found, `No .from('${table}') found in ${slug}'s owned files`).toBe(true)
      })
    }
  }
})
```

---

## Task 3.5: Skill ↔ Manifest Parity Tests

### What to Build

Skills must stay in sync with the manifest. These tests catch drift.

```typescript
import matter from 'gray-matter'

function parseSkillFrontmatter(skillPath: string) {
  const abs = path.resolve(ROOT, skillPath)
  const content = fs.readFileSync(abs, 'utf-8')
  return matter(content)
}

describe('Domain Manifest — Skill Parity', () => {
  for (const [slug, domain] of Object.entries(DOMAINS)) {
    const skillPath = `.claude/skills/domains/${slug}/SKILL.md`

    describe(`${slug}`, () => {
      it('skill file exists', () => {
        const abs = path.resolve(ROOT, skillPath)
        expect(fs.existsSync(abs), `Missing skill: ${skillPath}`).toBe(true)
      })

      it('frontmatter domain matches slug', () => {
        const { data } = parseSkillFrontmatter(skillPath)
        expect(data.domain).toBe(slug)
      })

      it('frontmatter source_of_truth points to manifest', () => {
        const { data } = parseSkillFrontmatter(skillPath)
        expect(data.source_of_truth).toBe('src/__arch__/domain-manifest.ts')
      })

      it('frontmatter status is valid', () => {
        const { data } = parseSkillFrontmatter(skillPath)
        expect(['full', 'skeleton', 'deprecated']).toContain(data.status)
      })
    })
  }
})
```

---

## Task 3.6: Full-Status Skill Sections Test

### What to Build

Skills with `status: full` must have all required sections.

```typescript
const REQUIRED_SECTIONS_FULL = [
  'Start Here',
  'Public API',
  'Invariants',
  'Traps',       // "Traps & Gotchas" or just "Traps"
  'Blast Radius',
  'Recipes',
]

describe('Domain Skills — Required Sections', () => {
  for (const [slug] of Object.entries(DOMAINS)) {
    const skillPath = `.claude/skills/domains/${slug}/SKILL.md`
    const abs = path.resolve(ROOT, skillPath)
    if (!fs.existsSync(abs)) continue

    const { data, content } = parseSkillFrontmatter(skillPath)
    if (data.status !== 'full') continue

    describe(`${slug} (status: full)`, () => {
      for (const section of REQUIRED_SECTIONS_FULL) {
        it(`has required section: "${section}"`, () => {
          // Match "## Traps" or "## Traps & Gotchas" etc.
          const pattern = new RegExp(`^## ${section}`, 'm')
          expect(pattern.test(content), `Missing section "## ${section}" in ${slug}`).toBe(true)
        })
      }
    })
  }
})
```

---

## Task 3.7: Known Gaps Severity Test

### What to Build

Every `known_gaps` entry must have a severity marker.

```typescript
describe('Domain Manifest — Known Gaps Severity', () => {
  const validPrefixes = ['critical:', 'important:', 'note:']

  for (const [slug, domain] of Object.entries(DOMAINS)) {
    for (const gap of domain.known_gaps) {
      it(`${slug}: gap has severity → "${gap.slice(0, 50)}..."`, () => {
        const hasSeverity = validPrefixes.some(p => gap.startsWith(p))
        expect(hasSeverity, `Gap missing severity prefix: "${gap}"`).toBe(true)
      })
    }
  }
})
```

---

## Task 3.8: Package.json Script

### What to Build

Add the arch-test script to root `package.json`:

```json
{
  "scripts": {
    "arch-test": "vitest run --config src/__arch__/vitest.config.ts --reporter=verbose"
  }
}
```

Also ensure `gray-matter` is installed as a dev dependency (needed for frontmatter parsing in tests):

```bash
npm install -D gray-matter
```

---

## Files to Modify

- `src/__arch__/vitest.config.ts` — **NEW** — vitest config scoped to arch tests
- `src/__arch__/domain-manifest.test.ts` — **NEW** — all enforcement tests
- `package.json` — **MODIFY** — add `arch-test` script + `gray-matter` devDep

---

## Acceptance Criteria

- [ ] `src/__arch__/domain-manifest.test.ts` exists with all 7 test groups
- [ ] `npm run arch-test` runs and passes (all green)
- [ ] Path existence tests cover all 11 domains
- [ ] No dual ownership test catches duplicate paths
- [ ] Table ownership test validates `.from()` calls
- [ ] Skill parity tests check frontmatter for all 11 domains
- [ ] Full-status skills have all required sections verified
- [ ] Known gaps all have severity prefixes
- [ ] `gray-matter` added to devDependencies

---

## Verification (do NOT skip)

```bash
echo "=== Phase 3 Verification ==="

# 1. Test file exists
[ -f "src/__arch__/domain-manifest.test.ts" ] && echo "✅ test file" || echo "❌ test file"
[ -f "src/__arch__/vitest.config.ts" ] && echo "✅ vitest config" || echo "❌ vitest config"

# 2. Run arch tests
npm run arch-test
echo "(Expected: all tests pass)"

# 3. Verify test count is reasonable (should be 100+ individual tests)
npm run arch-test -- --reporter=json 2>/dev/null | grep -o '"numPassedTests":[0-9]*' || echo "check test count manually"

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log (do NOT skip)

After verification, create:
`logs/wp-009/phase-3-result.md`

---

## Git

```bash
git add src/__arch__/vitest.config.ts src/__arch__/domain-manifest.test.ts package.json package-lock.json logs/wp-009/phase-3-result.md
git commit -m "feat: arch tests enforce manifest-skill-code parity [WP-009 phase 3]"
```

---

## IMPORTANT Notes for CC

- Install `gray-matter` FIRST before running tests — it's needed for frontmatter parsing
- If path existence tests fail, FIX THE MANIFEST (Phase 1), not the tests
- If skill parity tests fail, FIX THE SKILLS (Phase 2), not the tests
- Tests must work on Windows (use `path.resolve` not hardcoded `/`)
- `__dirname` in vitest requires proper config — use `import.meta.url` if needed
- Do NOT add boundary enforcement (depcruise) in this phase — that's optional/future
