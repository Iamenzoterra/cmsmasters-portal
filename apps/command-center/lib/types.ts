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
  | 'content'
  | 'api';

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

// ─── packages/validators/src/components.ts schema ────────────────────────────

export type ComponentStatus = 'planned' | 'in-progress' | 'done' | 'blocked';
export type ComponentLayer = 'primitives' | 'domain' | 'layouts';

export interface Component {
  id: string;
  name: string;
  description: string;
  app: App;
  status: ComponentStatus;
  phase: string;
  dependencies?: string[];
}

export interface ComponentEntry {
  id: string;
  name: string;
  description: string;
  app: App;
  status: ComponentStatus;
  layer: ComponentLayer;
  phase: string;
  dependencies?: string[];
}

export interface ComponentSummary {
  primitives: number;
  domain: number;
  layouts: number;
}

// ─── packages/validators/src/content-status.ts schema ────────────────────────

export type ContentStatusValue = 'empty' | 'draft' | 'review' | 'approved' | 'published';

export interface ThemeEntry {
  slug: string;
  name: string;
  status: 'empty' | 'draft' | 'published';
  docsCount: number;
  hasHeroImage: boolean;
  pluginsCount: number;
  featuresCount: number;
  lastUpdated: string;
}

export interface ContentStatus {
  themeId: string;
  pageId: string;
  status: ContentStatusValue;
  source: 'supabase' | 'placeholder';
  updatedAt: string;
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

export interface ProgressData {
  byApp: Record<App, number>;
}

// ─── ADR frontmatter schema ───────────────────────────────────────────────────

export interface ADRMeta {
  id: string;
  title: string;
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded';
  date: string;
  deciders?: string[];
  tags?: string[];
}
