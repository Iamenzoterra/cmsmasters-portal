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

// ─── InfraChecklist ───────────────────────────────────────────────────────────

export interface InfraItem {
  label: string;
  done: boolean;
  taskTitle?: string;
}

// ─── Aliases / wrappers ───────────────────────────────────────────────────────

/** Single entry in components.json */
export type ComponentSummary = Component;

/** Shape of progress.json */
export interface ProgressData {
  phases: Progress[];
}

// ─── AppCard ──────────────────────────────────────────────────────────────────

export type AppStatus = 'not-started' | 'in-progress' | 'beta' | 'live';

export interface AppCardApp {
  id: string;
  name: string;
  description: string;
  status: AppStatus;
  href: string;
}

// ─── DesignSystemProgress ─────────────────────────────────────────────────────

export type LayerName = 'Primitives' | 'Domain' | 'Layouts';

export interface LayerRow {
  layer: LayerName;
  completed: number;
  total: number;
  href: string;
}

// ─── ContentOverview ──────────────────────────────────────────────────────────

export interface ContentMetrics {
  themesPublished: number;
  themesTotal: number;
  docsPublished: number;
  docsTarget: number;
  blogPosts: number;
  blogTarget: number;
}

export interface ThemeItem {
  id: string;
  name: string;
  lastUpdated: string;
}

// ─── DependencyGraph ─────────────────────────────────────────────────────────

export interface PackageNode {
  id: string;
  label: string;
  affectedApps: string[];
}

export interface AppNode {
  id: string;
  label: string;
}

export interface DependencyEdge {
  from: string;
  to: string;
}

export interface DependencyGraphData {
  packages: PackageNode[];
  apps: AppNode[];
  edges: DependencyEdge[];
  foundCount: number;
  totalExpected: number;
  isFallback: boolean;
}
