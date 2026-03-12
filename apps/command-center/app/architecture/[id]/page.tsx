import type React from 'react';
import Link from 'next/link';
import { getADRContent } from '@/lib/data';
import { formatDate } from '@/lib/utils';
import { Card } from '@/ui/Card';

interface ADRDetailPageProps {
  params: Promise<{ id: string }>;
}

function inlineBold(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(<strong key={key++} className="font-bold text-text-primary">{match[1]}</strong>);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : [text];
}

function renderMarkdown(body: string): React.ReactElement[] {
  return body.split('\n').map((line, i) => {
    if (line.startsWith('### ')) {
      return <h3 key={i} className="mt-6 mb-2 text-sm font-bold text-text-primary">{inlineBold(line.slice(4))}</h3>;
    }
    if (line.startsWith('## ')) {
      return <h2 key={i} className="mt-8 mb-3 text-lg font-bold text-text-primary">{inlineBold(line.slice(3))}</h2>;
    }
    if (line.startsWith('# ')) {
      return <h1 key={i} className="mt-8 mb-3 text-xl font-bold text-text-primary">{inlineBold(line.slice(2))}</h1>;
    }
    if (line.startsWith('- ')) {
      return <li key={i} className="ml-4 text-sm text-text-secondary list-disc">{inlineBold(line.slice(2))}</li>;
    }
    if (line.trim() === '') {
      return <div key={i} className="h-2" />;
    }
    return <p key={i} className="text-sm leading-relaxed text-text-secondary">{inlineBold(line)}</p>;
  });
}

export default async function ADRDetail({ params }: ADRDetailPageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const adr = await getADRContent(id);

  if (!adr) {
    return (
      <div>
        <Link href="/architecture" className="text-sm text-blue-400 hover:underline">&larr; Back to ADRs</Link>
        <h1 className="mt-4 text-2xl font-bold text-text-primary">ADR not found</h1>
      </div>
    );
  }

  return (
    <div>
      <Link href="/architecture" className="text-sm text-blue-400 hover:underline">&larr; Back to ADRs</Link>

      <div className="mt-4 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-text-muted">ADR-{String(adr.id).padStart(3, '0')}</span>
          <span className="rounded-md bg-blue-900 px-1.5 py-0.5 text-[10px] font-bold text-blue-400">
            v{adr.version ?? '?'}
          </span>
          <span className="rounded-md bg-green-900 px-1.5 py-0.5 text-[10px] font-bold text-green-400">
            {adr.status}
          </span>
          {adr.category && (
            <span className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-[10px] text-text-muted">
              {adr.category}
            </span>
          )}
          <span className="font-mono text-[10px] text-text-muted">{formatDate(adr.date)}</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold text-text-primary">{adr.title}</h1>
      </div>

      <Card className="max-w-3xl">
        <div className="prose-invert">
          {renderMarkdown(adr.body)}
        </div>
      </Card>
    </div>
  );
}
