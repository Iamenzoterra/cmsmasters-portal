import type React from 'react';
import Link from 'next/link';
import { getADRList } from '@/lib/data';
import { formatDate, groupBy } from '@/lib/utils';
import { Card } from '@/ui/Card';

const CATEGORY_LABELS: Record<string, string> = {
  core: 'Core',
  access: 'Access',
  'tech-stack': 'Tech Stack',
  product: 'Product',
  'roles-security': 'Roles & Security',
  tooling: 'Tooling',
  'data-future': 'Data & Future',
};

export default async function Architecture(): Promise<React.ReactElement> {
  const adrs = await getADRList();

  if (adrs.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Architecture Decision Records</h1>
        <p className="mt-4 text-text-muted">No ADR files found.</p>
      </div>
    );
  }

  const adrsByCategory = groupBy(adrs, 'category' as keyof (typeof adrs)[0]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Architecture Decision Records</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {adrs.length} ADRs across {Object.keys(adrsByCategory).length} categories
        </p>
        <div className="mt-2 flex items-center gap-2">
          {adrs.every((a) => a.version === 2) ? (
            <span className="rounded-md bg-green-900 px-2 py-0.5 text-[11px] font-bold text-green-400">
              All version:2
            </span>
          ) : (
            <span className="rounded-md bg-yellow-900 px-2 py-0.5 text-[11px] font-bold text-yellow-400">
              Mixed versions
            </span>
          )}
          <span className="font-mono text-xs text-text-muted">
            No /content directory &middot; Content in Supabase &middot; Zod schemas in packages/validators
          </span>
        </div>
      </div>

      {Object.entries(adrsByCategory)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([category, categoryAdrs]) => (
          <div key={category} className="mb-8">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-text-muted">
              {CATEGORY_LABELS[category] ?? category}
              <span className="ml-2 font-mono text-xs font-normal">{categoryAdrs.length}</span>
            </h2>

            <div className="grid gap-2">
              {[...categoryAdrs]
                .sort((a, b) => Number(a.id) - Number(b.id))
                .map((adr) => (
                  <Link key={adr.id} href={`/architecture/${adr.id}`}>
                    <Card className="!p-3 group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="shrink-0 font-mono text-xs text-text-muted">
                              ADR-{String(adr.id).padStart(3, '0')}
                            </span>
                            <span className="rounded-md bg-blue-900 px-1.5 py-0.5 text-[10px] font-bold text-blue-400">
                              v{adr.version ?? '?'}
                            </span>
                            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                              adr.status === 'active'
                                ? 'bg-green-900 text-green-400'
                                : adr.status === 'accepted'
                                  ? 'bg-blue-900 text-blue-400'
                                  : 'bg-zinc-700 text-zinc-400'
                            }`}>
                              {adr.status}
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-medium text-text-primary group-hover:text-blue-400 transition-colors">{adr.title}</p>
                        </div>
                        <span className="shrink-0 font-mono text-[10px] text-text-muted">
                          {formatDate(adr.date)}
                        </span>
                      </div>
                    </Card>
                  </Link>
                ))}
            </div>
          </div>
        ))}
    </div>
  );
}
