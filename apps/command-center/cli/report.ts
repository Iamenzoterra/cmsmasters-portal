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

  const overallPct = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;

  const currentPhaseId = project.currentPhase ?? 0;
  const currentPhase = phases.find(p => String(p.id) === String(currentPhaseId)) ?? phases[0];
  const currentPhaseTitle = currentPhase?.title ?? `Phase ${currentPhaseId}`;

  let currentPhasePct = 0;
  if (progressData) {
    const pEntry = progressData.phases.find(p => p.phaseId === String(currentPhaseId));
    if (pEntry) currentPhasePct = Math.round(pEntry.percentComplete);
  } else if (currentPhase) {
    const tasks = currentPhase.tasks ?? [];
    const done = tasks.filter(t => t.status === 'done').length;
    currentPhasePct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
  }

  const phaseLines: string[] = [];
  const maxTitleLen = Math.max(...phases.map(p => `Phase ${p.id} — ${p.title ?? ''}`.length), 0);

  for (const phase of phases) {
    const phaseLabel = `Phase ${phase.id} — ${phase.title ?? ''}`;
    let pct = 0;
    let done = 0;
    let total = 0;

    if (progressData) {
      const pEntry = progressData.phases.find(p => p.phaseId === String(phase.id));
      if (pEntry) {
        pct = Math.round(pEntry.percentComplete);
        done = pEntry.tasksDone;
        total = pEntry.tasksTotal;
      }
    } else {
      const tasks = phase.tasks ?? [];
      total = tasks.length;
      done = tasks.filter(t => t.status === 'done').length;
      pct = total > 0 ? Math.round((done / total) * 100) : 0;
    }

    const bar = progressBar(pct);
    const label = pad(phaseLabel, maxTitleLen + 2);
    phaseLines.push(`  ${label}  ${bar}  ${done}/${total}  (${pct}%)`);
  }

  let themesCount = 0;
  let docsCount = 0;
  let blogCount = 0;

  if (contentData) {
    const uniqueThemes = new Set(contentData.entries.map(e => e.themeId));
    themesCount = uniqueThemes.size;
    blogCount = contentData.entries.filter(e => e.type === 'blog').length;
    docsCount = contentData.entries.filter(e => e.type !== 'blog' && e.status === 'approved').length;
  }

  let primitivesCount = 0;
  let domainCount = 0;
  let layoutsCount = 0;

  if (componentsData) {
    for (const comp of componentsData.components) {
      const layer = classifyLayer(comp);
      switch (layer) {
        case 'primitives': { primitivesCount++; break; }
        case 'domain': { domainCount++; break; }
        case 'layouts': { layoutsCount++; break; }
        default: { break; }
      }
    }
  }

  const allTasks: RawTask[] = [];
  for (const phase of phases) {
    for (const task of phase.tasks ?? []) {
      allTasks.push(task);
    }
  }

  const taskById = new Map<string, RawTask>(allTasks.map(t => [t.id, t]));

  const blockedTasks = allTasks.filter(t => t.status === 'blocked');

  const blockedLines: string[] = [];
  for (const task of blockedTasks) {
    const depIds = task.dependencies ?? task.blockedBy ?? [];
    if (depIds.length > 0) {
      const depNames = depIds.map(depId => {
        const dep = taskById.get(depId);
        return dep ? dep.title : depId;
      });
      blockedLines.push(`  🔴 ${task.title} — blocked by: ${depNames.join(', ')}`);
    } else {
      blockedLines.push(`  🔴 ${task.title}`);
    }
  }

  const blockedSection = blockedLines.length > 0
    ? blockedLines.join('\n')
    : '  (none)';

  const lines = [
    `📊 ${projectName} — Progress Report`,
    today,
    '',
    `OVERALL: ${totalDone}/${totalTasks} done (${overallPct}%)`,
    '',
    `CURRENT PHASE: Phase ${currentPhaseId} — ${currentPhaseTitle} (${currentPhasePct}%)`,
    '',
    'BY PHASE:',
    ...phaseLines,
    '',
    'CONTENT:',
    `  themes:     ${themesCount}`,
    `  docs:       ${docsCount}`,
    `  blog posts: ${blogCount}`,
    '',
    `COMPONENTS: ${primitivesCount} primitives | ${domainCount} domain | ${layoutsCount} layouts`,
    '',
    'BLOCKED:',
    blockedSection,
    '',
  ];

  return lines.join('\n');
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
