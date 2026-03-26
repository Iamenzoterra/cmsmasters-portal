#!/usr/bin/env node
import * as fs from 'node:fs';
import path from 'node:path';
import { syncPhaseStatuses } from '../lib/phase-sync';
import type {
  ComponentSummary,
  ComponentStatus,
  ComponentLayer,
  ContentStatus,
  ContentStatusValue,
  Progress,
  ProgressData,
  TaskStatus,
} from '../lib/types';

// ─── Types for raw phases.json ────────────────────────────────────────────────

interface RawTask {
  id: string;
  title: string;
  description?: string;
  app?: string;
  group?: string;
  status?: string;
  estimatedHours?: number;
  actualHours?: number;
  [key: string]: unknown;
}

interface RawPhase {
  id: string | number;
  title?: string;
  tasks?: RawTask[];
  [key: string]: unknown;
}

interface RawProject {
  phases?: RawPhase[];
  [key: string]: unknown;
}

// ─── Scanignore ──────────────────────────────────────────────────────────────

interface ScanIgnore {
  apps: Set<string>;
  groups: Set<string>;
  ids: Set<string>;
}

function parseScanIgnore(workplanDir: string): ScanIgnore {
  const ignore: ScanIgnore = { apps: new Set(), groups: new Set(), ids: new Set() };
  const filePath = path.join(workplanDir, '.scanignore');
  if (!fs.existsSync(filePath)) return ignore;

  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('app:')) ignore.apps.add(line.slice(4).trim());
    else if (line.startsWith('group:')) ignore.groups.add(line.slice(6).trim());
    else ignore.ids.add(line);
  }
  return ignore;
}

function isIgnored(task: RawTask, ignore: ScanIgnore): boolean {
  if (ignore.ids.has(task.id)) return true;
  if (ignore.apps.has(task.app ?? 'infra')) return true;
  if (task.group && ignore.groups.has(task.group)) return true;
  return false;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function taskStatusToComponentStatus(status: string | undefined): ComponentStatus {
  switch (status as TaskStatus) {
    case 'done': { return 'done'; }
    case 'blocked': { return 'blocked'; }
    case 'in-progress':
    case 'review': { return 'in-progress'; }
    default: { return 'planned'; }
  }
}

function deriveContentStatus(tasks: RawTask[]): ContentStatusValue {
  if (tasks.some(t => t.status === 'done')) return 'approved';
  if (tasks.some(t => t.status === 'in-progress' || t.status === 'review')) return 'review';
  return 'draft';
}

function readPhasesJson(workplanDir: string): RawProject {
  const phasesPath = path.join(workplanDir, 'phases.json');
  const raw = fs.readFileSync(phasesPath, 'utf8');
  return JSON.parse(raw) as RawProject;
}

// ─── UI package scanner helpers ──────────────────────────────────────────────

const LAYER_DIRS: { dir: string; layer: ComponentLayer }[] = [
  { dir: 'primitives', layer: 'primitives' },
  { dir: 'domain',     layer: 'domain' },
  { dir: 'layouts',    layer: 'layouts' },
];

function kebabToPascal(kebab: string): string {
  return kebab.replace(/(^|-)([a-z])/g, (_, __, c: string) => c.toUpperCase());
}

function countLines(filePath: string): number {
  return fs.readFileSync(filePath, 'utf8').split('\n').length;
}

function extractPropsInterface(filePath: string): string | null {
  const content = fs.readFileSync(filePath, 'utf8');

  // Try interface first: interface ButtonProps { ... }
  const ifaceMatch = content.match(/(?:export\s+)?interface\s+\w+Props\s*\{[^}]*\}/);
  if (ifaceMatch) return ifaceMatch[0];

  // Try type alias: type ButtonProps = ... & { ... };
  // Use \}; to match closing brace+semicolon (skips inner prop semicolons)
  const typeMatch = content.match(/(?:export\s+)?type\s+(\w+Props)\s*=\s*([\s\S]*?\});/);
  if (typeMatch) return `type ${typeMatch[1]} = ${typeMatch[2].trim()}`;

  return null;
}

function hasImportOf(dir: string, componentName: string): boolean {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (hasImportOf(fullPath, componentName)) return true;
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('@cmsmasters/ui') && content.includes(componentName)) {
        return true;
      }
    }
  }
  return false;
}

function detectUsedBy(componentName: string, monorepoRoot: string): string[] {
  const appsDir = path.join(monorepoRoot, 'apps');
  const usedBy: string[] = [];
  if (!fs.existsSync(appsDir)) return usedBy;
  const appDirs = fs.readdirSync(appsDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name !== 'command-center');
  for (const appDir of appDirs) {
    if (hasImportOf(path.join(appsDir, appDir.name), componentName)) {
      usedBy.push(appDir.name);
    }
  }
  return usedBy;
}

// ─── UI component filesystem scanner ────────────────────────────────────────

function scanUIComponents(monorepoRoot: string): ComponentSummary[] {
  const uiPkgSrc = path.join(monorepoRoot, 'packages', 'ui', 'src');
  const components: ComponentSummary[] = [];

  for (const { dir, layer } of LAYER_DIRS) {
    const layerDir = path.join(uiPkgSrc, dir);
    if (!fs.existsSync(layerDir)) continue;

    const files = fs.readdirSync(layerDir).filter(f =>
      f.endsWith('.tsx') &&
      !f.endsWith('.stories.tsx') &&
      !f.endsWith('.test.tsx') &&
      !f.startsWith('_')
    );

    for (const file of files) {
      const filePath = path.join(layerDir, file);
      const baseName = file.replace(/\.tsx$/, '');
      const componentName = kebabToPascal(baseName);
      const relativePath = path.relative(monorepoRoot, filePath).replace(/\\/g, '/');

      const hasStory = fs.existsSync(path.join(layerDir, `${baseName}.stories.tsx`));
      const hasTests = fs.existsSync(path.join(layerDir, `${baseName}.test.tsx`))
                    || fs.existsSync(path.join(layerDir, '__tests__', `${baseName}.test.tsx`));

      components.push({
        id: `ui-${dir}-${baseName}`,
        name: componentName,
        description: `${layer} component`,
        app: 'ui' as ComponentSummary['app'],
        status: 'done' as ComponentStatus,
        phase: 'C',
        source: 'filesystem',
        layer,
        hasStory,
        hasTests,
        usedBy: detectUsedBy(componentName, monorepoRoot),
        loc: countLines(filePath),
        filePath: relativePath,
        propsInterface: extractPropsInterface(filePath),
      });
    }
  }

  return components;
}

// ─── Legacy phases.json scanner ─────────────────────────────────────────────

function scanLegacyTasks(workplanDir: string, ignore: ScanIgnore): ComponentSummary[] {
  const project = readPhasesJson(workplanDir);
  const phases = project.phases ?? [];
  const components: ComponentSummary[] = [];

  for (const phase of phases) {
    const phaseId = String(phase.id);
    for (const task of phase.tasks ?? []) {
      if (isIgnored(task, ignore)) continue;
      components.push({
        id: task.id,
        name: task.title,
        description: task.description ?? '',
        app: (task.app ?? 'infra') as ComponentSummary['app'],
        status: taskStatusToComponentStatus(task.status),
        phase: phaseId,
        source: 'phases-json',
      });
    }
  }

  return components;
}

// ─── Combined scanner ───────────────────────────────────────────────────────

function scanComponents(monorepoRoot: string, workplanDir: string, ignore: ScanIgnore): ComponentSummary[] {
  const uiComponents = scanUIComponents(monorepoRoot);
  const legacyTasks = scanLegacyTasks(workplanDir, ignore);
  return [...uiComponents, ...legacyTasks];
}

function scanContent(workplanDir: string, ignore: ScanIgnore): ContentStatus[] {
  const project = readPhasesJson(workplanDir);
  const phases = project.phases ?? [];
  const now = new Date().toISOString();
  const entries: ContentStatus[] = [];

  for (const phase of phases) {
    const phaseId = String(phase.id);
    const tasks = (phase.tasks ?? []).filter(t => !isIgnored(t, ignore));

    const appMap = new Map<string, RawTask[]>();
    for (const task of tasks) {
      const app = task.app ?? 'infra';
      const existing = appMap.get(app);
      if (existing) {
        existing.push(task);
      } else {
        appMap.set(app, [task]);
      }
    }

    for (const [app, appTasks] of appMap) {
      const isBlog = app === 'blog' || appTasks.some(t => t.group?.toLowerCase() === 'blog');
      entries.push({
        themeId: app,
        pageId: phaseId,
        status: deriveContentStatus(appTasks),
        source: 'placeholder' as const,
        updatedAt: now,
        type: isBlog ? 'blog' : 'doc',
      });
    }
  }

  return entries;
}

function calculateProgress(workplanDir: string): ProgressData {
  const project = readPhasesJson(workplanDir);
  const phases = project.phases ?? [];
  const progressPhases: Progress[] = [];

  for (const phase of phases) {
    const tasks = phase.tasks ?? [];
    let tasksDone = 0;
    let tasksInProgress = 0;
    let tasksBlocked = 0;
    let estimatedHours = 0;
    let actualHours = 0;

    for (const task of tasks) {
      const s = task.status;
      switch (s) {
        case 'done': { tasksDone++; break; }
        case 'in-progress':
        case 'review': { tasksInProgress++; break; }
        case 'blocked': { tasksBlocked++; break; }
        default: { break; }
      }
      estimatedHours += task.estimatedHours ?? 0;
      actualHours += task.actualHours ?? 0;
    }

    const tasksTotal = tasks.length;
    const percentComplete = tasksTotal > 0 ? (tasksDone / tasksTotal) * 100 : 0;

    progressPhases.push({
      phaseId: String(phase.id),
      tasksTotal,
      tasksDone,
      tasksInProgress,
      tasksBlocked,
      estimatedHours,
      actualHours,
      percentComplete,
    });
  }

  return { phases: progressPhases };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

{
  const monorepoRoot = process.cwd();
  const workplanDir = path.join(monorepoRoot, 'workplan');
  fs.mkdirSync(workplanDir, { recursive: true });

  const startTime = Date.now();

  try {
    console.log('→ Syncing phase statuses...');
    const t0 = Date.now();
    syncPhaseStatuses(monorepoRoot, workplanDir);
    console.log(`✓ phase sync done (${Date.now() - t0}ms)`);

    const ignore = parseScanIgnore(workplanDir);

    console.log('→ Scanning components...');
    const t1 = Date.now();
    const components = scanComponents(monorepoRoot, workplanDir, ignore);
    console.log(`✓ components done (${Date.now() - t1}ms)`);
    const uiCount = components.filter(c => c.source === 'filesystem').length;
    const legacyCount = components.filter(c => c.source === 'phases-json').length;
    console.log(`  → ${uiCount} UI components (filesystem), ${legacyCount} legacy tasks (phases.json)`);
    fs.writeFileSync(
      path.join(workplanDir, 'components.json'),
      JSON.stringify({ lastScanned: new Date().toISOString(), components }, null, 2),
    );

    console.log('→ Scanning content...');
    const t2 = Date.now();
    const entries = scanContent(workplanDir, ignore);
    console.log(`✓ content done (${Date.now() - t2}ms)`);
    fs.writeFileSync(
      path.join(workplanDir, 'content-status.json'),
      JSON.stringify({ lastScanned: new Date().toISOString(), entries }, null, 2),
    );

    console.log('→ Calculating progress...');
    const t3 = Date.now();
    const progressData = calculateProgress(workplanDir);
    console.log(`✓ progress done (${Date.now() - t3}ms)`);
    fs.writeFileSync(
      path.join(workplanDir, 'progress.json'),
      JSON.stringify({ lastUpdated: new Date().toISOString(), phases: progressData.phases }, null, 2),
    );

    console.log(`Scan complete in ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
  } catch (error) {
    console.error((error as Error).message);
    process.exitCode = 1;
  }
}
