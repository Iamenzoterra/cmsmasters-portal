#!/usr/bin/env node
import * as fs from 'node:fs';
import path from 'node:path';

// ─── Raw types ────────────────────────────────────────────────────────────────

interface RawTask {
  id: string;
  title: string;
  status?: string;
  app?: string;
  group?: string;
  layer?: string;
  dependencies?: string[];
  blockedBy?: string[];
  [key: string]: unknown;
}

interface RawPhase {
  id: string | number;
  title?: string;
  tasks?: RawTask[];
}

interface RawProject {
  name?: string;
  currentPhase?: number;
  phases?: RawPhase[];
}

interface ProgressEntry {
  phaseId: string;
  tasksTotal: number;
  tasksDone: number;
  tasksInProgress: number;
  tasksBlocked: number;
  percentComplete: number;
}

interface ProgressData {
  lastUpdated?: string;
  phases: ProgressEntry[];
}

interface ComponentEntry {
  id: string;
  name: string;
  app?: string;
  layer?: string;
  group?: string;
  status?: string;
  phase?: string;
}

interface ComponentsData {
  components: ComponentEntry[];
}

interface ContentEntry {
  themeId: string;
  pageId: string;
  status: string;
  type?: 'blog' | 'doc';
}

interface ContentData {
  entries: ContentEntry[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function progressBar(percent: number, width: number = 10): string {
  const filled = Math.floor(percent / (100 / width));
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

function pad(str: string, len: number): string {
  return str.length >= len ? str : str + ' '.repeat(len - str.length);
}

function tryReadJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch {
    return null;
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function safePct(done: number, total: number): number {
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

// ─── Classification ────────────────────────────────────────────────────────────

const PRIMITIVE_GROUPS = new Set(['atoms', 'atom', 'primitive', 'primitives', 'tokens', 'design-tokens']);
const DOMAIN_GROUPS = new Set(['domain', 'molecules', 'molecule', 'components', 'organisms', 'organism', 'features', 'feature']);
const LAYOUT_GROUPS = new Set(['layouts', 'layout', 'templates', 'template', 'pages', 'page']);

function classifyLayer(component: ComponentEntry): 'primitives' | 'domain' | 'layouts' | null {
  const layer = component.layer?.toLowerCase();
  const group = component.group?.toLowerCase();

  if (layer === 'primitive' || layer === 'primitives') return 'primitives';
  if (layer === 'domain') return 'domain';
  if (layer === 'layout' || layer === 'layouts') return 'layouts';

  if (group !== undefined) {
    if (PRIMITIVE_GROUPS.has(group)) return 'primitives';
    if (DOMAIN_GROUPS.has(group)) return 'domain';
    if (LAYOUT_GROUPS.has(group)) return 'layouts';
  }

  return null;
}

// ─── Report section builders ─────────────────────────────────────────────────

function collectTotals(
  phases: RawPhase[],
  progressData: ProgressData | null,
): { totalDone: number; totalTasks: number } {
  let totalDone = 0;
  let totalTasks = 0;

  if (progressData) {
    for (const p of progressData.phases) {
      totalDone += p.tasksDone;
      totalTasks += p.tasksTotal;
    }
  } else {
    for (const phase of phases) {
      for (const task of phase.tasks ?? []) {
        totalTasks++;
        if (task.status === 'done') totalDone++;
      }
    }
  }

  return { totalDone, totalTasks };
}

function resolveCurrentPhase(
  phases: RawPhase[],
  currentPhaseId: number,
  progressData: ProgressData | null,
): { title: string; pct: number } {
  const currentPhase = phases.find(p => String(p.id) === String(currentPhaseId)) ?? phases[0];
  const title = currentPhase?.title ?? `Phase ${currentPhaseId}`;

  if (progressData) {
    const pEntry = progressData.phases.find(p => p.phaseId === String(currentPhaseId));
    return { title, pct: pEntry ? Math.round(pEntry.percentComplete) : 0 };
  }

  if (currentPhase) {
    const tasks = currentPhase.tasks ?? [];
    const done = tasks.filter(t => t.status === 'done').length;
    return { title, pct: safePct(done, tasks.length) };
  }

  return { title, pct: 0 };
}

function buildPhaseLines(
  phases: RawPhase[],
  progressData: ProgressData | null,
): string[] {
  const maxTitleLen = Math.max(...phases.map(p => `Phase ${p.id} — ${p.title ?? ''}`.length), 0);

  return phases.map(phase => {
    const phaseLabel = `Phase ${phase.id} — ${phase.title ?? ''}`;
    const { done, total, pct } = getPhaseStats(phase, progressData);
    const bar = progressBar(pct);
    const label = pad(phaseLabel, maxTitleLen + 2);
    return `  ${label}  ${bar}  ${done}/${total}  (${pct}%)`;
  });
}

function getPhaseStats(
  phase: RawPhase,
  progressData: ProgressData | null,
): { done: number; total: number; pct: number } {
  if (progressData) {
    const pEntry = progressData.phases.find(p => p.phaseId === String(phase.id));
    if (pEntry) {
      return { done: pEntry.tasksDone, total: pEntry.tasksTotal, pct: Math.round(pEntry.percentComplete) };
    }
    return { done: 0, total: 0, pct: 0 };
  }

  const tasks = phase.tasks ?? [];
  const done = tasks.filter(t => t.status === 'done').length;
  return { done, total: tasks.length, pct: safePct(done, tasks.length) };
}

function buildContentSection(contentData: ContentData | null): { themes: number; docs: number; blog: number } {
  if (!contentData) return { themes: 0, docs: 0, blog: 0 };

  const uniqueThemes = new Set(contentData.entries.map(e => e.themeId));
  return {
    themes: uniqueThemes.size,
    blog: contentData.entries.filter(e => e.type === 'blog').length,
    docs: contentData.entries.filter(e => e.type !== 'blog' && e.status === 'approved').length,
  };
}

function buildComponentCounts(componentsData: ComponentsData | null): { primitives: number; domain: number; layouts: number } {
  if (!componentsData) return { primitives: 0, domain: 0, layouts: 0 };

  let primitives = 0;
  let domain = 0;
  let layouts = 0;

  for (const comp of componentsData.components) {
    switch (classifyLayer(comp)) {
      case 'primitives': { primitives++; break; }
      case 'domain':     { domain++;     break; }
      case 'layouts':    { layouts++;    break; }
      default:           { break; }
    }
  }

  return { primitives, domain, layouts };
}

function buildBlockedSection(phases: RawPhase[]): string {
  const allTasks = phases.flatMap(phase => phase.tasks ?? []);
  const taskById = new Map<string, RawTask>(allTasks.map(t => [t.id, t]));
  const blockedTasks = allTasks.filter(t => t.status === 'blocked');

  if (blockedTasks.length === 0) return '  (none)';

  return blockedTasks.map(task => {
    const depIds = task.dependencies ?? task.blockedBy ?? [];
    if (depIds.length === 0) return `  🔴 ${task.title}`;

    const depNames = depIds.map(depId => taskById.get(depId)?.title ?? depId);
    return `  🔴 ${task.title} — blocked by: ${depNames.join(', ')}`;
  }).join('\n');
}

// ─── Report builder ───────────────────────────────────────────────────────────

function buildReport(workplanDir: string): string {
  const project = tryReadJson<RawProject>(path.join(workplanDir, 'phases.json'));
  if (!project) {
    return 'Error: workplan/phases.json not found. Run cc:scan first.\n';
  }

  const progressData = tryReadJson<ProgressData>(path.join(workplanDir, 'progress.json'));
  const componentsData = tryReadJson<ComponentsData>(path.join(workplanDir, 'components.json'));
  const contentData = tryReadJson<ContentData>(path.join(workplanDir, 'content-status.json'));

  const phases = project.phases ?? [];
  const projectName = project.name ?? 'CMSMasters Portal';
  const today = formatDate(new Date().toISOString());
  const currentPhaseId = project.currentPhase ?? 0;

  const { totalDone, totalTasks } = collectTotals(phases, progressData);
  const overallPct = safePct(totalDone, totalTasks);
  const currentPhase = resolveCurrentPhase(phases, currentPhaseId, progressData);
  const phaseLines = buildPhaseLines(phases, progressData);
  const content = buildContentSection(contentData);
  const comps = buildComponentCounts(componentsData);
  const blockedSection = buildBlockedSection(phases);

  return [
    `📊 ${projectName} — Progress Report`,
    today,
    '',
    `OVERALL: ${totalDone}/${totalTasks} done (${overallPct}%)`,
    '',
    `CURRENT PHASE: Phase ${currentPhaseId} — ${currentPhase.title} (${currentPhase.pct}%)`,
    '',
    'BY PHASE:',
    ...phaseLines,
    '',
    'CONTENT:',
    `  themes:     ${content.themes}`,
    `  docs:       ${content.docs}`,
    `  blog posts: ${content.blog}`,
    '',
    `COMPONENTS: ${comps.primitives} primitives | ${comps.domain} domain | ${comps.layouts} layouts`,
    '',
    'BLOCKED:',
    blockedSection,
    '',
  ].join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

await (async () => {
  const monorepoRoot = process.cwd();
  const workplanDir = path.join(monorepoRoot, 'workplan');

  try {
    const report = buildReport(workplanDir);
    process.stdout.write(report);
  } catch (error) {
    process.stderr.write((error as Error).message + '\n');
    process.exitCode = 1;
  }
})();
