import * as fs from 'node:fs';
import path from 'node:path';

import type { PhaseStatus } from './types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FileCheck { type: 'file'; path: string }
interface DirCheck { type: 'dir'; path: string }
interface FileCountCheck { type: 'file-count'; path: string; suffix: string; min: number; recursive?: boolean }
type FsCheck = FileCheck | DirCheck | FileCountCheck;

interface RawTask {
  id: string;
  status?: string;
  completedAt?: string;
  [key: string]: unknown;
}

interface RawPhase {
  id: string | number;
  status?: PhaseStatus;
  tasks?: RawTask[];
  [key: string]: unknown;
}

interface RawProject {
  currentPhase?: number;
  phases?: RawPhase[];
  [key: string]: unknown;
}

// ─── FILE_MAP ────────────────────────────────────────────────────────────────

const FILE_MAP: Record<string, FsCheck[]> = {
  // ── Phase 0: Foundation ──────────────────────────────────────────────────
  'P0-T1': [
    { type: 'file', path: 'nx.json' },
    { type: 'file', path: 'package.json' },
  ],
  'P0-T2': [
    { type: 'dir', path: 'apps/portal' },
    { type: 'dir', path: 'apps/dashboard' },
    { type: 'dir', path: 'apps/support' },
    { type: 'dir', path: 'apps/studio' },
    { type: 'dir', path: 'apps/admin' },
    { type: 'dir', path: 'apps/api' },
    { type: 'dir', path: 'packages/ui' },
    { type: 'dir', path: 'packages/db' },
    { type: 'dir', path: 'packages/auth' },
    { type: 'dir', path: 'packages/api-client' },
    { type: 'dir', path: 'packages/validators' },
    { type: 'dir', path: 'packages/email' },
  ],
  'P0-T3': [
    { type: 'file', path: 'apps/command-center/package.json' },
    { type: 'file', path: 'apps/command-center/next.config.js' },
    { type: 'file', path: 'apps/command-center/tailwind.config.ts' },
  ],
  'P0-T4': [
    { type: 'file', path: 'workplan/phases.json' },
  ],
  'P0-T5': [
    { type: 'file-count', path: 'workplan/adr', suffix: '.md', min: 22 },
  ],
  'P0-T6': [
    { type: 'file', path: 'apps/command-center/cli/scan.ts' },
  ],
  'P0-T7': [
    { type: 'file', path: 'apps/command-center/cli/report.ts' },
  ],
  'P0-T8': [
    { type: 'file-count', path: 'apps/command-center/app', suffix: 'page.tsx', min: 6, recursive: true },
  ],

  // ── Phase 1: Design System & Shared Packages ────────────────────────────
  'P1-T1': [{ type: 'file', path: 'packages/ui/src/tokens/colors.ts' }],
  'P1-T2': [{ type: 'file', path: 'packages/ui/src/tokens/typography.ts' }],
  'P1-T3': [
    { type: 'file', path: 'packages/ui/src/tokens/spacing.ts' },
    { type: 'file', path: 'packages/ui/src/tokens/radii.ts' },
  ],
  'P1-T4': [{ type: 'file', path: 'packages/ui/src/tokens/shadows.ts' }],
  'P1-T5': [{ type: 'file', path: 'packages/ui/src/tokens/animation.ts' }],
  'P1-T6': [{ type: 'file', path: 'packages/ui/tailwind.config.ts' }],
  'P1-T7': [{ type: 'file', path: 'packages/ui/src/utils/cn.ts' }],

  // Primitives
  'P1-T8':  [{ type: 'file', path: 'packages/ui/src/primitives/button.tsx' }],
  'P1-T9':  [{ type: 'file', path: 'packages/ui/src/primitives/badge.tsx' }],
  'P1-T10': [{ type: 'file', path: 'packages/ui/src/primitives/dialog.tsx' }],
  'P1-T11': [{ type: 'file', path: 'packages/ui/src/primitives/input.tsx' }],
  'P1-T12': [{ type: 'file', path: 'packages/ui/src/primitives/select.tsx' }],
  'P1-T13': [{ type: 'file', path: 'packages/ui/src/primitives/table.tsx' }],
  'P1-T14': [{ type: 'file', path: 'packages/ui/src/primitives/tabs.tsx' }],
  'P1-T15': [{ type: 'file', path: 'packages/ui/src/primitives/tooltip.tsx' }],
  'P1-T16': [{ type: 'file', path: 'packages/ui/src/primitives/popover.tsx' }],
  'P1-T17': [{ type: 'file', path: 'packages/ui/src/primitives/sheet.tsx' }],
  'P1-T18': [{ type: 'file', path: 'packages/ui/src/primitives/card.tsx' }],
  'P1-T19': [{ type: 'file', path: 'packages/ui/src/primitives/separator.tsx' }],
  'P1-T20': [{ type: 'file', path: 'packages/ui/src/primitives/skeleton.tsx' }],
  'P1-T21': [{ type: 'file', path: 'packages/ui/src/primitives/toast.tsx' }],
  'P1-T22': [{ type: 'file', path: 'packages/ui/src/primitives/progress.tsx' }],

  // Domain components
  'P1-T23': [{ type: 'file', path: 'packages/ui/src/domain/theme-card.tsx' }],
  'P1-T24': [{ type: 'file', path: 'packages/ui/src/domain/plugin-grid.tsx' }],
  'P1-T25': [{ type: 'file', path: 'packages/ui/src/domain/license-lock.tsx' }],
  'P1-T26': [{ type: 'file', path: 'packages/ui/src/domain/pricing-comparison.tsx' }],
  'P1-T27': [{ type: 'file', path: 'packages/ui/src/domain/feature-list.tsx' }],
  'P1-T28': [{ type: 'file', path: 'packages/ui/src/domain/search-panel.tsx' }],
  'P1-T29': [{ type: 'file', path: 'packages/ui/src/domain/resource-sidebar.tsx' }],
  'P1-T30': [{ type: 'file', path: 'packages/ui/src/domain/entitlement-badge.tsx' }],
  'P1-T31': [{ type: 'file', path: 'packages/ui/src/domain/ticket-preview.tsx' }],
  'P1-T32': [{ type: 'file', path: 'packages/ui/src/domain/user-row.tsx' }],
  'P1-T33': [{ type: 'file', path: 'packages/ui/src/domain/stat-card.tsx' }],
  'P1-T34': [{ type: 'file', path: 'packages/ui/src/domain/empty-state.tsx' }],
  'P1-T35': [{ type: 'file', path: 'packages/ui/src/domain/search-suggestion.tsx' }],
  'P1-T36': [{ type: 'file', path: 'packages/ui/src/domain/theme-status-indicator.tsx' }],

  // Shared packages
  'P1-T37': [{ type: 'dir', path: 'packages/db/src' }],
  'P1-T41': [{ type: 'file', path: 'packages/ui/package.json' }, { type: 'dir', path: 'packages/ui/src' }],
  'P1-T42': [{ type: 'file', path: 'packages/db/package.json' }, { type: 'dir', path: 'packages/db/src' }],
  'P1-T43': [{ type: 'file', path: 'packages/auth/package.json' }, { type: 'dir', path: 'packages/auth/src' }],
  'P1-T44': [{ type: 'dir', path: 'packages/api-client' }, { type: 'file', path: 'packages/api-client/package.json' }],
  'P1-T45': [{ type: 'file', path: 'packages/validators/package.json' }, { type: 'dir', path: 'packages/validators/src' }],
  'P1-T46': [{ type: 'file', path: 'packages/email/package.json' }, { type: 'dir', path: 'packages/email/src' }],

  // Infrastructure
  'P1-T50': [{ type: 'file', path: 'nx.json' }],
  'P1-T51': [{ type: 'file', path: '.github/workflows/ci.yml' }],
  'P1-T52': [{ type: 'file', path: 'packages/ui/.storybook/main.ts' }],

  // ── Phase 2: Portal App ─────────────────────────────────────────────────
  'P2-T1': [
    { type: 'file', path: 'apps/portal/package.json' },
    { type: 'dir', path: 'apps/portal/app' },
  ],
  'P2-T2': [{ type: 'dir', path: 'apps/portal/app/themes' }],
  'P2-T3': [{ type: 'dir', path: 'apps/portal/app/plugins' }],
  'P2-T4': [{ type: 'dir', path: 'apps/portal/app/pricing' }],
  'P2-T5': [{ type: 'dir', path: 'apps/portal/app/auth' }],
  'P2-T6': [{ type: 'dir', path: 'apps/portal/app/account' }],
  'P2-T7': [{ type: 'dir', path: 'apps/portal/app/licenses' }],
  'P2-T8': [{ type: 'dir', path: 'apps/portal/app/checkout' }],

  // ── Phase 3: Dashboard App ──────────────────────────────────────────────
  'P3-T1': [
    { type: 'file', path: 'apps/dashboard/package.json' },
    { type: 'dir', path: 'apps/dashboard/src' },
  ],
  'P3-T2': [{ type: 'dir', path: 'apps/dashboard/src/pages/overview' }],
  'P3-T3': [{ type: 'dir', path: 'apps/dashboard/src/pages/themes' }],
  'P3-T4': [{ type: 'dir', path: 'apps/dashboard/src/pages/plugins' }],
  'P3-T5': [{ type: 'dir', path: 'apps/dashboard/src/pages/downloads' }],
  'P3-T6': [{ type: 'dir', path: 'apps/dashboard/src/pages/analytics' }],
  'P3-T7': [{ type: 'dir', path: 'apps/dashboard/src/pages/notifications' }],

  // ── Phase 4: Support App ────────────────────────────────────────────────
  'P4-T1': [
    { type: 'file', path: 'apps/support/package.json' },
    { type: 'dir', path: 'apps/support/src' },
  ],
  'P4-T2': [{ type: 'dir', path: 'apps/support/src/pages/tickets' }],
  'P4-T3': [{ type: 'file', path: 'apps/support/src/pages/tickets/[id].tsx' }],
  'P4-T4': [{ type: 'dir', path: 'apps/support/src/pages/knowledge-base' }],
  'P4-T5': [{ type: 'dir', path: 'apps/support/src/pages/docs' }],
  'P4-T6': [{ type: 'file', path: 'apps/support/src/components/live-chat.tsx' }],

  // ── Phase 5: Studio & Admin Apps ────────────────────────────────────────
  'P5-T1': [
    { type: 'file', path: 'apps/studio/package.json' },
    { type: 'dir', path: 'apps/studio/src' },
  ],
  'P5-T2': [{ type: 'dir', path: 'apps/studio/src/pages/builder' }],
  'P5-T3': [{ type: 'dir', path: 'apps/studio/src/pages/publish' }],
  'P5-T4': [
    { type: 'file', path: 'apps/admin/package.json' },
    { type: 'dir', path: 'apps/admin/src' },
  ],
  'P5-T5': [{ type: 'dir', path: 'apps/admin/src/pages/users' }],
  'P5-T6': [{ type: 'dir', path: 'apps/admin/src/pages/content' }],
  'P5-T7': [{ type: 'dir', path: 'apps/admin/src/pages/support' }],
  'P5-T8': [{ type: 'dir', path: 'apps/admin/src/pages/analytics' }],

  // ── Phase 6: API Service & Launch ───────────────────────────────────────
  'P6-T1': [
    { type: 'file', path: 'apps/api/package.json' },
    { type: 'file', path: 'apps/api/wrangler.toml' },
  ],
  'P6-T2': [{ type: 'dir', path: 'apps/api/src/routes' }],
  'P6-T3': [{ type: 'dir', path: 'apps/api/src/webhooks' }],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface CheckResult { passed: boolean; mtime: number }

function evaluateCheck(root: string, check: FsCheck): CheckResult {
  const fullPath = path.join(root, check.path);
  try {
    if (check.type === 'file') {
      const stat = fs.statSync(fullPath);
      return { passed: stat.isFile(), mtime: stat.mtimeMs };
    }
    if (check.type === 'dir') {
      const stat = fs.statSync(fullPath);
      return { passed: stat.isDirectory(), mtime: stat.mtimeMs };
    }
    if (check.type === 'file-count') {
      const { count, newestMtime } = countFiles(fullPath, check.suffix, check.recursive ?? false);
      return { passed: count >= check.min, mtime: newestMtime };
    }
  } catch {
    // stat failed — file/dir does not exist
  }
  return { passed: false, mtime: 0 };
}

function countFiles(dir: string, suffix: string, recursive: boolean): { count: number; newestMtime: number } {
  let count = 0;
  let newestMtime = 0;

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isFile() && entry.name.endsWith(suffix)) {
        count++;
        try {
          const stat = fs.statSync(entryPath);
          if (stat.mtimeMs > newestMtime) newestMtime = stat.mtimeMs;
        } catch {
          // skip unreadable files
        }
      }
      if (recursive && entry.isDirectory()) {
        const sub = countFiles(entryPath, suffix, true);
        count += sub.count;
        if (sub.newestMtime > newestMtime) newestMtime = sub.newestMtime;
      }
    }
  } catch {
    // dir does not exist or unreadable
  }

  return { count, newestMtime };
}

function derivePhaseStatus(tasks: RawTask[]): PhaseStatus {
  if (tasks.length === 0) return 'todo';
  const allDone = tasks.every(t => t.status === 'done');
  if (allDone) return 'done';
  const anyActive = tasks.some(t =>
    t.status === 'done' || t.status === 'in-progress' || t.status === 'review',
  );
  if (anyActive) return 'in-progress';
  return 'todo';
}

// ─── Core sync ───────────────────────────────────────────────────────────────

export function syncPhaseStatuses(monorepoRoot: string, workplanDir: string): void {
  const phasesPath = path.join(workplanDir, 'phases.json');
  const raw = fs.readFileSync(phasesPath, 'utf8');
  const project = JSON.parse(raw) as RawProject;
  const phases = project.phases ?? [];

  // Update task statuses from filesystem checks
  for (const phase of phases) {
    for (const task of phase.tasks ?? []) {
      const checks = FILE_MAP[task.id];
      if (!checks) continue;

      const results = checks.map(c => evaluateCheck(monorepoRoot, c));
      const passed = results.filter(r => r.passed).length;
      const total = results.length;

      if (passed === total) {
        task.status = 'done';
        const newest = Math.max(...results.map(r => r.mtime));
        task.completedAt = newest > 0 ? new Date(newest).toISOString() : undefined;
      } else if (passed > 0) {
        task.status = 'in-progress';
        task.completedAt = undefined;
      } else {
        task.status = 'todo';
        task.completedAt = undefined;
      }
    }
  }

  // Compute phase-level status
  for (const phase of phases) {
    phase.status = derivePhaseStatus(phase.tasks ?? []);
  }

  // Update currentPhase to first non-done phase
  const firstNonDone = phases.findIndex(p => p.status !== 'done');
  project.currentPhase = firstNonDone === -1 ? phases.length - 1 : firstNonDone;

  // Write back
  fs.writeFileSync(phasesPath, JSON.stringify(project, null, 2) + '\n');
}
