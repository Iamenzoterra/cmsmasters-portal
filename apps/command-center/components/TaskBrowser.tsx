'use client';

import { useState, useMemo } from 'react';
import type { JSX } from 'react';
import { TaskFilters, type TaskFilterState } from './TaskFilters';
import { TaskTable, type Task } from './TaskTable';

export type PhaseTask = Task & { phase: string };

interface TaskBrowserProps {
  tasks: PhaseTask[];
}

const DEFAULT_FILTERS: TaskFilterState = {
  phase: 'all',
  status: 'all',
  owner: 'all',
  app: 'all',
  search: '',
};

export function TaskBrowser({ tasks }: TaskBrowserProps): JSX.Element {
  const [filters, setFilters] = useState<TaskFilterState>(DEFAULT_FILTERS);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filters.phase !== 'all' && task.phase !== filters.phase) return false;
      if (filters.status !== 'all' && task.status !== filters.status) return false;
      if (filters.owner !== 'all' && task.owner !== filters.owner) return false;
      if (filters.app !== 'all' && task.app !== filters.app) return false;
      if (
        filters.search !== '' &&
        !task.title.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [tasks, filters]);

  return (
    <div className="flex flex-col gap-4">
      <TaskFilters filters={filters} onChange={setFilters} />
      <TaskTable tasks={filteredTasks} onSelect={() => {}} />
    </div>
  );
}
