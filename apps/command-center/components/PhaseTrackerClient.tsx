'use client';

import { useState, useMemo, useCallback } from 'react';
import type { Project, Task, TaskStatus, Owner, App } from '@/lib/types';
import { PhaseCard } from './PhaseCard';
import { TaskDetailSheet } from './TaskDetailSheet';
import { TaskFilters, type TaskFilterState } from './TaskFilters';

interface PhaseTrackerClientProps {
  project: Project;
}

const INITIAL_FILTERS: TaskFilterState = {
  phase: 'all',
  status: 'all',
  owner: 'all',
  app: 'all',
  search: '',
};

export function PhaseTrackerClient({ project }: PhaseTrackerClientProps): React.JSX.Element {
  const [filters, setFilters] = useState<TaskFilterState>(INITIAL_FILTERS);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const allTasks = useMemo(
    () => project.phases.flatMap((p) => p.tasks),
    [project.phases],
  );

  const phaseOptions = useMemo(
    () => project.phases.map((p) => String(p.id)),
    [project.phases],
  );

  const hasActiveFilters =
    filters.phase !== 'all' ||
    filters.status !== 'all' ||
    filters.owner !== 'all' ||
    filters.app !== 'all' ||
    filters.search !== '';

  // Filter tasks per phase based on current filters (except phase filter which controls visibility)
  const filterTasksForPhase = useCallback(
    (tasks: Task[]): Task[] => {
      return tasks.filter((t) => {
        if (filters.status !== 'all' && t.status !== (filters.status as TaskStatus)) return false;
        if (filters.owner !== 'all' && t.owner !== (filters.owner as Owner)) return false;
        if (filters.app !== 'all' && t.app !== (filters.app as App)) return false;
        if (
          filters.search !== '' &&
          !t.title.toLowerCase().includes(filters.search.toLowerCase()) &&
          !t.id.toLowerCase().includes(filters.search.toLowerCase())
        )
          return false;
        return true;
      });
    },
    [filters],
  );

  const handleTaskSelect = useCallback((task: Task) => {
    setSelectedTask(task);
  }, []);

  const handleTaskSelectById = useCallback(
    (taskId: string) => {
      const task = allTasks.find((t) => t.id === taskId) ?? null;
      setSelectedTask(task);
    },
    [allTasks],
  );

  const handleClose = useCallback(() => {
    setSelectedTask(null);
  }, []);

  // Determine which phases to show (phase filter)
  const visiblePhases = useMemo(() => {
    if (filters.phase === 'all') return project.phases;
    return project.phases.filter((p) => String(p.id) === filters.phase);
  }, [project.phases, filters.phase]);

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">
          {project.title ?? 'Phase Tracker'}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">{project.description}</p>
        <p className="mt-1 font-mono text-xs text-text-muted">
          {project.phases.length} phases &middot; {allTasks.length} tasks
        </p>
      </div>

      {/* Filter bar */}
      <div className="mb-6">
        <TaskFilters
          filters={filters}
          onChange={setFilters}
          phaseOptions={phaseOptions}
        />
      </div>

      {/* Phase cards */}
      <div className="grid gap-4">
        {visiblePhases.map((phase) => {
          const filteredTasks = hasActiveFilters
            ? filterTasksForPhase(phase.tasks)
            : phase.tasks;

          // Determine default expanded: phase has in-progress work
          const hasInProgress = phase.tasks.some((t) => t.status === 'in-progress');
          const allDone =
            phase.tasks.length > 0 &&
            phase.tasks.every((t) => t.status === 'done');
          const defaultExpanded = hasInProgress && !allDone;

          return (
            <PhaseCard
              key={String(phase.id)}
              phase={phase}
              tasks={filteredTasks}
              defaultExpanded={defaultExpanded}
              onTaskSelect={handleTaskSelect}
            />
          );
        })}
      </div>

      {/* Task detail sheet */}
      <TaskDetailSheet
        task={selectedTask}
        onClose={handleClose}
        onTaskSelect={handleTaskSelectById}
        allTasks={allTasks}
      />
    </div>
  );
}
