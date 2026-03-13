import * as fs from 'node:fs';
import path from 'node:path';

import type { PhaseStatus } from './types';

interface RawTask {
  status?: string;
  [key: string]: unknown;
}

interface RawPhase {
  status?: string;
  tasks?: RawTask[];
  [key: string]: unknown;
}

interface RawProject {
  phases?: RawPhase[];
  [key: string]: unknown;
}

function derivePhaseStatus(tasks: RawTask[]): PhaseStatus {
  if (tasks.length === 0) return 'todo';
  const allDone = tasks.every(t => t.status === 'done');
  if (allDone) return 'done';
  const anyActive = tasks.some(t =>
    t.status === 'in-progress' || t.status === 'review' || t.status === 'blocked',
  );
  if (anyActive) return 'in-progress';
  const anyDone = tasks.some(t => t.status === 'done');
  if (anyDone) return 'in-progress';
  return 'todo';
}

export function syncPhaseStatuses(_monorepoRoot: string, workplanDir: string): void {
  const phasesPath = path.join(workplanDir, 'phases.json');
  const raw = fs.readFileSync(phasesPath, 'utf8');
  const project = JSON.parse(raw) as RawProject;

  for (const phase of project.phases ?? []) {
    phase.status = derivePhaseStatus(phase.tasks ?? []);
  }

  fs.writeFileSync(phasesPath, JSON.stringify(project, null, 2));
}
