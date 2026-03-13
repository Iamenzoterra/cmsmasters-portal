// ─── Status / Enum Unions ────────────────────────────────────────────────────

export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done' | 'blocked';
export type PhaseStatus = 'todo' | 'in-progress' | 'done';
export type Owner = 'orchestrator' | 'claude-code' | 'human' | 'ai-content';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type App =
  | 'portal'
  | 'dashboard'
  | 'support'
  | 'studio'
  | 'admin'
  | 'command-center'
  | 'ui'
  | 'infra'
  | 'content';

// ─── phases.json schemas ─────────────────────────────────────────────────────

export interface Task {
  id: string;
  title: string;
  description: string;
  owner: Owner;
  app: App;
  status: TaskStatus;
  priority: Priority;
  dependencies: string[];
  estimatedHours: number;
  actualHours?: number;
  acceptanceCriteria: string[];
  notes?: string;
  createdAt: string;
  completedAt?: string;
}

export interface Phase {
  id: string;
  title: string;
  description: string;
  status: PhaseStatus;
  tasks: Task[];
}

export interface Project {
  id: string;
  title: string;
  description: string;
  phases: Phase[];
}

// ─── components.json schemas ──────────────────────────────────────────────────

export type ComponentStatus = 'planned' | 'in-progress' | 'done' | 'blocked';

export interface Component {
  id: string;
  name: string;
  description: string;
  app: App;
  status: ComponentStatus;
  phase: string;
  dependencies?: string[];
}

// ─── content-status.json schemas ──────────────────────────────────────────────

export type ContentStatusValue = 'empty' | 'draft' | 'review' | 'approved' | 'published';

export interface Theme {
  id: string;
  name: string;
  app: App;
  pagesTotal: number;
  pagesDone: number;
}

export interface ContentStatus {
  themeId: string;
  pageId: string;
  status: ContentStatusValue;
  updatedAt: string;
  type?: 'blog' | 'doc';
}

// ─── progress.json schema ─────────────────────────────────────────────────────

export interface Progress {
  phaseId: string;
  tasksTotal: number;
  tasksDone: number;
  tasksInProgress: number;
  tasksBlocked: number;
  estimatedHours: number;
  actualHours: number;
  percentComplete: number;
}

// ─── ADR frontmatter schema ───────────────────────────────────────────────────

export interface ADRMeta {
  id: string;
  title: string;
  version?: number;
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded' | 'active';
  date: string;
  deciders?: string[];
  tags?: string[];
  category?: string;
  relatedADRs?: string[];
}

export type ADRMetaWithBody = ADRMeta & { body: string };

// ─── Aliases / wrappers ───────────────────────────────────────────────────────

/** Single entry in components.json */
export type ComponentSummary = Component;

/** Shape of progress.json */
export interface ProgressData {
  phases: Progress[];
}
