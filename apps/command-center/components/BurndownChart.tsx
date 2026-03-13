'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { Task } from '@/lib/types';

interface BurndownChartProps {
  tasks: Task[];
}

interface DataPoint {
  date: string;
  completed: number;
}

function buildCumulativeData(tasks: Task[]): DataPoint[] {
  const completed = tasks.filter(
    (t): t is Task & { completedAt: string } => t.completedAt != null,
  );

  if (completed.length === 0) return [];

  const sorted = completed.toSorted(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime(),
  );

  const byDate: Record<string, number> = {};
  for (const task of sorted) {
    const dateKey = task.completedAt.slice(0, 10);
    byDate[dateKey] = (byDate[dateKey] ?? 0) + 1;
  }

  const dates = Object.keys(byDate).toSorted();
  const points: DataPoint[] = [];
  let cumulative = 0;

  for (const date of dates) {
    cumulative += byDate[date] ?? 0;
    points.push({ date: date.slice(5), completed: cumulative });
  }

  return points;
}

export function BurndownChart({ tasks }: BurndownChartProps): React.JSX.Element {
  const data = buildCumulativeData(tasks);

  if (data.length === 0) {
    return (
      <p className="text-sm italic text-text-muted">
        No completion dates recorded yet — chart will appear as tasks are completed.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="burndownGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: '#71717a', fontFamily: 'monospace' }}
          axisLine={{ stroke: '#27272a' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#71717a', fontFamily: 'monospace' }}
          axisLine={{ stroke: '#27272a' }}
          tickLine={false}
          allowDecimals={false}
          width={32}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#18181b',
            border: '1px solid #27272a',
            borderRadius: 8,
            fontSize: 12,
            fontFamily: 'monospace',
          }}
          labelStyle={{ color: '#a1a1aa' }}
          itemStyle={{ color: '#3b82f6' }}
        />
        <Area
          type="monotone"
          dataKey="completed"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#burndownGradient)"
          animationDuration={800}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
