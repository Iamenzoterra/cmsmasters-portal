'use client';

import { useState } from 'react';
import { Card } from './Card';
import { StatusBadge, type Status } from './StatusBadge';
import { ProgressBar } from './ProgressBar';
import { DonutChart } from './DonutChart';
import { Modal } from './Modal';
import { Checkbox } from './Checkbox';
import { Input } from './Input';
import { Select, type SelectOption } from './Select';

const ALL_STATUSES: Status[] = ['todo', 'in-progress', 'review', 'done', 'blocked'];

const PROGRESS_VALUES = [10, 40, 70, 100] as const;

const PRIORITY_OPTIONS: SelectOption[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export function AtomsShowcase(): React.ReactElement {
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  return (
    <div className="space-y-10 p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Atom Showcase</h1>
        <p className="mt-1 text-sm text-text-secondary">All 8 CC Design System atoms wired together</p>
      </div>

      {/* StatusBadge row */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-text-secondary">StatusBadge</h2>
        <div className="flex flex-wrap gap-2">
          {ALL_STATUSES.map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
          {/* Unknown fallback */}
          <StatusBadge />
        </div>
      </section>

      {/* ProgressBar column */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-text-secondary">ProgressBar</h2>
        <div className="flex flex-col gap-3 max-w-sm">
          {PROGRESS_VALUES.map((v) => (
            <ProgressBar key={v} value={v} showLabel />
          ))}
        </div>
      </section>

      {/* DonutChart row */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-text-secondary">DonutChart</h2>
        <div className="flex flex-wrap gap-6">
          <DonutChart value={37} label="Coverage" color="#3b82f6" />
          <DonutChart value={82} label="Progress" color="#22c55e" />
        </div>
      </section>

      {/* Card grid */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-text-secondary">Card</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: StatusBadge + ProgressBar */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-text-primary">Auth Module</span>
              <StatusBadge status="in-progress" />
            </div>
            <ProgressBar value={55} showLabel />
          </Card>

          {/* Card 2: DonutChart */}
          <Card className="flex items-center justify-center">
            <DonutChart value={68} label="Done" color="#a78bfa" />
          </Card>

          {/* Card 3: Input + Select + Checkbox */}
          <Card>
            <div className="flex flex-col gap-3">
              <Input placeholder="Search tasks…" />
              <Select label="Priority" options={PRIORITY_OPTIONS} />
              <Checkbox label="Show blocked only" />
            </div>
          </Card>
        </div>
      </section>

      {/* Modal trigger */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-text-secondary">Modal</h2>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-sm text-text-primary hover:bg-zinc-700 transition-colors"
        >
          Open Modal
        </button>
      </section>

      {/* Modal */}
      <Modal
        open={modalOpen}
        title="Component Preview"
        onClose={() => setModalOpen(false)}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <StatusBadge status="review" />
            <span className="text-sm text-text-secondary">Awaiting review</span>
          </div>
          <ProgressBar value={72} showLabel />
        </div>
      </Modal>
    </div>
  );
}
