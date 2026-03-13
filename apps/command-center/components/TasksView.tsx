'use client';

import { type JSX, useState } from 'react';
import { TaskFilters, type TaskFilterState } from './TaskFilters';
import { TaskTable, type Task as TableTask } from './TaskTable';
import type { Phase } from '../lib/types';

export interface TasksViewProps {
  phases: Phase[];
}

const INITIAL_FILTERS: TaskFilterState = {
  phase: 'all',
  status: 'all',
  owner: 'all',
  app: 'all',
  search: '',
};

export function TasksView({ phases }: TasksViewProps): JSX.Element {
  const [filters, setFilters] = useState<TaskFilterState>(INITIAL_FILTERS);

  const phaseOptions = phases.map((p) => String(p.id));

  const flatTasks = phases.flatMap((phase) =>
    phase.tasks.map((t) => ({ ...t, phaseId: String(phase.id) })),
  );

  const filtered = flatTasks.filter((t) => {
    if (filters.phase !== 'all' && t.phaseId !== filters.phase) return false;
    if (filters.status !== 'all' && t.status !== filters.status) return false;
    if (filters.owner !== 'all' && t.owner !== filters.owner) return false;
    if (filters.app !== 'all' && t.app !== filters.app) return false;
    if (
      filters.search !== '' &&
      !t.title.toLowerCase().includes(filters.search.toLowerCase())
    )
      return false;
    return true;
  });

  const tableTasks: TableTask[] = filtered.map((t) => ({
    id: t.id,
    title: t.title,
    owner: t.owner ?? 'human',
    app: t.app,
    priority: t.priority === 'critical' ? 'high' : (t.priority ?? 'low'),
    dependencies: t.dependencies ?? [],
    estimatedHours: t.estimatedHours ?? 0,
    actualHours: t.actualHours ?? 0,
    status: t.status,
  }));

  return (
    <div className="space-y-3">
      <TaskFilters
        filters={filters}
        onChange={setFilters}
        phaseOptions={phaseOptions}
      />
      <TaskTable tasks={tableTasks} onSelect={() => {}} />
    </div>
  );
}
