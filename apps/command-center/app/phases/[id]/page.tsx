import type React from 'react';
import Link from 'next/link';
import { getPhases } from '@/lib/data';
import { calculateProgress, groupBy } from '@/lib/utils';
import type { Task } from '@/lib/types';
import { Card } from '@/ui/Card';
import { StatusBadge } from '@/ui/StatusBadge';
import { ProgressBar } from '@/ui/ProgressBar';
import { cn } from '@/theme/utils';

interface PhaseDetailPageProps {
  params: Promise<{ id: string }>;
}

// SVG color tokens (matches tokens.ts dark theme hex values)
const SVG_BLUE = '#3b82f6';
const SVG_GRID = '#27272a';
const SVG_TEXT = '#71717a';

type TaskWithCompletion = Task & { completedAt: string };

function buildBurndownSVG(tasks: Task[]): string | null {
  const completed = tasks.filter((t): t is TaskWithCompletion => t.completedAt != null);
  if (completed.length === 0) return null;

  const sorted = completed.toSorted(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime(),
  );

  const byDate: Record<string, number> = {};
  for (const task of sorted) {
    const dateKey = task.completedAt.slice(0, 10);
    byDate[dateKey] = (byDate[dateKey] ?? 0) + 1;
  }

  const dates = Object.keys(byDate).toSorted();
  if (dates.length === 0) return null;

  const cumulativeCounts: { date: string; count: number }[] = [];
  let cumulative = 0;
  for (const date of dates) {
    cumulative += byDate[date] ?? 0;
    cumulativeCounts.push({ date, count: cumulative });
  }

  const viewBoxW = 600;
  const viewBoxH = 120;
  const marginLeft = 40;
  const marginBottom = 30;
  const plotW = viewBoxW - marginLeft - 10;
  const plotH = viewBoxH - marginBottom - 10;
  const maxCount = cumulativeCounts.at(-1)?.count ?? 0;
  const n = cumulativeCounts.length;

  const toX = (i: number): number =>
    marginLeft + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const toY = (count: number): number =>
    10 + plotH - (maxCount === 0 ? 0 : (count / maxCount) * plotH);

  const points = cumulativeCounts.map((d, i) => `${toX(i)},${toY(d.count)}`);
  const pathD = `M ${points.join(' L ')}`;

  const firstX = toX(0);
  const lastX = toX(n - 1);
  const bottomY = 10 + plotH;
  const polygonPoints = `${points.join(' ')} ${lastX},${bottomY} ${firstX},${bottomY}`;

  const gridLines = [0.25, 0.5, 0.75]
    .map((frac) => {
      const y = 10 + plotH - frac * plotH;
      return `<line x1="${marginLeft}" y1="${y}" x2="${viewBoxW - 10}" y2="${y}" stroke="${SVG_GRID}" stroke-width="1"/>`;
    })
    .join('');

  const maxLabels = 6;
  const step = Math.max(1, Math.floor(n / maxLabels));
  const labelIndices: number[] = [];
  for (let i = 0; i < n; i += step) labelIndices.push(i);
  if (labelIndices.at(-1) !== n - 1) labelIndices.push(n - 1);

  const xLabels = labelIndices
    .map((i) => {
      const x = toX(i);
      const label = cumulativeCounts[i]?.date.slice(5) ?? '';
      return `<text x="${x}" y="${viewBoxH - 4}" text-anchor="middle" font-size="9" fill="${SVG_TEXT}" font-family="monospace">${label}</text>`;
    })
    .join('');

  const yLabel = `<text x="${marginLeft - 4}" y="14" text-anchor="end" font-size="9" fill="${SVG_TEXT}" font-family="monospace">${maxCount}</text>`;
  const yLabelZero = `<text x="${marginLeft - 4}" y="${bottomY}" text-anchor="end" font-size="9" fill="${SVG_TEXT}" font-family="monospace">0</text>`;
  const axisLines = `<line x1="${marginLeft}" y1="10" x2="${marginLeft}" y2="${bottomY}" stroke="${SVG_GRID}" stroke-width="1"/><line x1="${marginLeft}" y1="${bottomY}" x2="${viewBoxW - 10}" y2="${bottomY}" stroke="${SVG_GRID}" stroke-width="1"/>`;

  return `<svg viewBox="0 0 ${viewBoxW} ${viewBoxH}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;">${axisLines}${gridLines}<polygon points="${polygonPoints}" fill="${SVG_BLUE}" fill-opacity="0.2"/><path d="${pathD}" fill="none" stroke="${SVG_BLUE}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>${xLabels}${yLabel}${yLabelZero}</svg>`;
}

export default async function PhaseDetail({ params }: PhaseDetailPageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const project = await getPhases();
  const phase = project?.phases.find((p) => String(p.id) === id);

  if (!phase) {
    return (
      <div>
        <Link href="/phases" className="text-sm text-blue-400 hover:underline">&larr; Back to phases</Link>
        <Card className="mt-4 flex flex-col gap-2">
          <span className="font-mono text-xs bg-zinc-800 rounded px-2 py-0.5 w-fit text-text-secondary">P{id}</span>
          <p className="text-text-muted">Phase not found.</p>
        </Card>
      </div>
    );
  }

  const done = phase.tasks.filter((t) => t.status === 'done').length;
  const total = phase.tasks.length;
  const progress = calculateProgress(done, total);
  const tasksByApp = groupBy(phase.tasks, 'app');
  const burndownSVG = buildBurndownSVG(phase.tasks);
  const blockedTasks = phase.tasks.filter((t) => t.status === 'blocked');
  const allTasks = project?.phases.flatMap((p) => p.tasks) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/phases" className="text-sm text-blue-400 hover:underline w-fit">&larr; Back to phases</Link>

      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-xs bg-zinc-800 rounded px-2 py-0.5 w-fit text-text-secondary">P{phase.id}</span>
            <h1 className="text-2xl font-bold text-text-primary">{phase.title}</h1>
            <p className="text-sm text-text-secondary">{phase.description}</p>
          </div>
          <span className="shrink-0 font-mono text-5xl font-bold text-text-primary">{progress}%</span>
        </div>
        <div className="mt-3">
          <ProgressBar value={progress} showLabel={false} />
        </div>
      </div>

      {/* Burndown chart */}
      <Card>
        <p className="text-xs uppercase tracking-wider text-text-muted mb-3">Burndown</p>
        {burndownSVG === null ? (
          <p className="text-sm italic text-text-muted">
            No completion dates recorded yet — chart will appear as tasks are completed.
          </p>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: burndownSVG }} />
        )}
      </Card>

      {/* Blocked tasks */}
      <Card>
        <p className="text-xs uppercase tracking-wider text-text-muted mb-3">Blocked Tasks</p>
        {blockedTasks.length === 0 ? (
          <p className="text-sm text-text-muted">No blocked tasks in this phase.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {blockedTasks.map((task) => {
              const deps = task.dependencies
                .map((depId) => allTasks.find((t) => t.id === depId))
                .filter((dep): dep is Task => dep != null);
              return (
                <div key={task.id}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-text-muted">{task.id}</span>
                    <StatusBadge status={task.status} />
                    <span className="text-sm text-text-primary">{task.title}</span>
                  </div>
                  {deps.length > 0 && (
                    <ul className="mt-1 ml-4 flex flex-col gap-1">
                      {deps.map((dep) => (
                        <li key={dep.id} className="flex items-center gap-2">
                          <span className={cn('text-xs', dep.status === 'done' ? 'text-green-500' : 'text-red-500')}>
                            ●
                          </span>
                          <span className="text-xs text-text-secondary">{dep.title}</span>
                          <StatusBadge status={dep.status} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Full task table grouped by app */}
      {Object.entries(tasksByApp)
        .toSorted(([a], [b]) => a.localeCompare(b))
        .map(([app, tasks]) => (
          <div key={app}>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-text-muted">
              <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-xs normal-case text-text-secondary">
                {app}
              </span>
              <span className="font-mono text-xs font-normal text-text-muted">{tasks.length}</span>
            </h2>
            <div className="overflow-x-auto rounded-card border border-zinc-800">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-text-muted">ID</th>
                    <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-text-muted">Status</th>
                    <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-text-muted">Title</th>
                    <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-text-muted">Priority</th>
                    <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-text-muted">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr
                      key={task.id}
                      className="border-b border-zinc-800 last:border-b-0 transition-colors hover:bg-zinc-800/50"
                    >
                      <td className="px-3 py-2 font-mono text-xs text-text-muted whitespace-nowrap">{task.id}</td>
                      <td className="px-3 py-2"><StatusBadge status={task.status} /></td>
                      <td className="px-3 py-2 text-sm text-text-primary">{task.title}</td>
                      <td className="px-3 py-2 font-mono text-[10px] uppercase text-text-muted whitespace-nowrap">{task.priority}</td>
                      <td className="px-3 py-2 font-mono text-xs text-text-muted whitespace-nowrap">{task.estimatedHours}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
    </div>
  );
}
