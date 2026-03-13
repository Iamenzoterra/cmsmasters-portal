#!/usr/bin/env node
import * as fs from 'node:fs';
import path from 'node:path';
import type {
  ComponentSummary,
  ComponentStatus,
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

// ─── Scanner functions ────────────────────────────────────────────────────────

function scanComponents(workplanDir: string): ComponentSummary[] {
  const project = readPhasesJson(workplanDir);
  const phases = project.phases ?? [];
  const components: ComponentSummary[] = [];

  for (const phase of phases) {
    const phaseId = String(phase.id);
    for (const task of phase.tasks ?? []) {
      components.push({
        id: task.id,
        name: task.title,
        description: task.description ?? '',
        app: (task.app ?? 'infra') as ComponentSummary['app'],
        status: taskStatusToComponentStatus(task.status),
        phase: phaseId,
      });
    }
  }

  return components;
}

function scanContent(workplanDir: string): ContentStatus[] {
  const project = readPhasesJson(workplanDir);
  const phases = project.phases ?? [];
  const now = new Date().toISOString();
  const entries: ContentStatus[] = [];

  for (const phase of phases) {
    const phaseId = String(phase.id);
    const tasks = phase.tasks ?? [];

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

await (async () => {
  const monorepoRoot = process.cwd();
  const workplanDir = path.join(monorepoRoot, 'workplan');
  fs.mkdirSync(workplanDir, { recursive: true });

  const startTime = Date.now();

  try {
    console.log('→ Scanning components...');
    const t1 = Date.now();
    const components = scanComponents(workplanDir);
    console.log(`✓ components done (${Date.now() - t1}ms)`);
    fs.writeFileSync(
      path.join(workplanDir, 'components.json'),
      JSON.stringify({ lastScanned: new Date().toISOString(), components }, null, 2),
    );

    console.log('→ Scanning content...');
    const t2 = Date.now();
    const entries = scanContent(workplanDir);
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
})();
