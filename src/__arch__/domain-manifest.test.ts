import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { DOMAINS } from './domain-manifest'
import { getOwnedPaths } from './helpers'

const ROOT = path.resolve(__dirname, '../..')

// ── 1. Path Existence ──

describe('Path Existence', () => {
  for (const [slug, domain] of Object.entries(DOMAINS)) {
    if (domain.policy === 'meta') continue

    for (const filePath of getOwnedPaths(domain)) {
      it(`${slug}: ${filePath}`, () => {
        const abs = path.resolve(ROOT, filePath)
        expect(fs.existsSync(abs), `Missing: ${filePath}`).toBe(true)
      })
    }
  }
})

describe('Path Existence — meta domains', () => {
  const infra = DOMAINS['infra-tooling']
  if (!infra) return

  for (const filePath of getOwnedPaths(infra)) {
    it(`infra-tooling: ${filePath}`, () => {
      const abs = path.resolve(ROOT, filePath)
      expect(fs.existsSync(abs), `Missing: ${filePath}`).toBe(true)
    })
  }
})

// ── 2. No Dual Ownership ──

describe('No Dual Ownership', () => {
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

// ── 3. Table Ownership ──

describe('Table Ownership', () => {
  for (const [slug, domain] of Object.entries(DOMAINS)) {
    // Tables noted as "declared but no queries" in known_gaps are skipped
    const unqueriedTables = domain.known_gaps
      .filter(g => g.includes('declared but no queries'))
      .flatMap(g => {
        const match = g.match(/(\w+) table declared but no queries/)
        return match ? [match[1]] : []
      })

    for (const table of domain.owned_tables) {
      if (unqueriedTables.includes(table)) continue

      it(`${slug}: table "${table}" has .from() in owned code`, () => {
        const ownedFiles = getOwnedPaths(domain)
          .map(f => path.resolve(ROOT, f))
          .filter(f => (f.endsWith('.ts') || f.endsWith('.tsx')) && fs.existsSync(f))

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

// ── 4. Skill ↔ Manifest Parity ──

function readSkill(slug: string) {
  const skillPath = path.resolve(ROOT, `.claude/skills/domains/${slug}/SKILL.md`)
  const raw = fs.readFileSync(skillPath, 'utf-8')
  return matter(raw)
}

describe('Skill Parity', () => {
  for (const [slug] of Object.entries(DOMAINS)) {
    const skillPath = `.claude/skills/domains/${slug}/SKILL.md`
    const absPath = path.resolve(ROOT, skillPath)

    describe(slug, () => {
      it('skill file exists', () => {
        expect(fs.existsSync(absPath), `Missing: ${skillPath}`).toBe(true)
      })

      it('frontmatter domain matches slug', () => {
        const { data } = readSkill(slug)
        expect(data.domain).toBe(slug)
      })

      it('source_of_truth points to manifest', () => {
        const { data } = readSkill(slug)
        expect(data.source_of_truth).toBe('src/__arch__/domain-manifest.ts')
      })

      it('status is valid', () => {
        const { data } = readSkill(slug)
        expect(['full', 'skeleton', 'deprecated']).toContain(data.status)
      })
    })
  }
})

// ── 5. Full-Status Required Sections ──

const REQUIRED_SECTIONS = [
  'Start Here',
  'Public API',
  'Invariants',
  'Traps',
  'Blast Radius',
  'Recipes',
]

describe('Full-Status Skill Sections', () => {
  for (const [slug] of Object.entries(DOMAINS)) {
    const absPath = path.resolve(ROOT, `.claude/skills/domains/${slug}/SKILL.md`)
    if (!fs.existsSync(absPath)) continue

    const { data, content } = readSkill(slug)
    if (data.status !== 'full') continue

    describe(`${slug} (full)`, () => {
      for (const section of REQUIRED_SECTIONS) {
        it(`has section: "${section}"`, () => {
          const pattern = new RegExp(`^## ${section}`, 'm')
          expect(pattern.test(content), `Missing "## ${section}" in ${slug}`).toBe(true)
        })
      }
    })
  }
})

// ── 6. Known Gaps Severity ──

describe('Known Gaps Severity', () => {
  const validPrefixes = ['critical:', 'important:', 'note:']

  for (const [slug, domain] of Object.entries(DOMAINS)) {
    for (const gap of domain.known_gaps) {
      it(`${slug}: "${gap.slice(0, 60)}..."`, () => {
        const hasSeverity = validPrefixes.some(p => gap.startsWith(p))
        expect(hasSeverity, `Gap missing severity prefix: "${gap}"`).toBe(true)
      })
    }
  }
})
