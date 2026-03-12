'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ListChecks,
  Blocks,
  FileText,
  Package,
  RefreshCw,
} from 'lucide-react';
import { cn } from '../theme/utils';

interface SidebarProps {
  lastScanText?: string;
  onRescan?: () => void;
}

const NAV_ITEMS: Array<{
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  { label: 'Mission Control', href: '/', icon: LayoutDashboard },
  { label: 'Phase Tracker', href: '/phases', icon: ListChecks },
  { label: 'Components', href: '/components', icon: Blocks },
  { label: 'ADRs', href: '/architecture', icon: FileText },
  { label: 'Dependencies', href: '/dependencies', icon: Package },
];

export function Sidebar({ lastScanText, onRescan }: SidebarProps): React.JSX.Element {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === '/') return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <nav className="flex h-screen w-16 flex-col border-r border-border-subtle bg-surface-card transition-all xl:w-[210px]">
      {/* Logo */}
      <div className="flex items-center px-3 py-4 xl:px-4">
        <LayoutDashboard size={20} className="shrink-0 text-accent xl:hidden" />
        <span className="hidden text-sm font-bold text-text-primary xl:block">
          <span className="text-accent">CMSMasters Portal</span>
          <br />
          <span className="text-xs font-normal text-text-secondary">Command Center</span>
        </span>
      </div>

      {/* Nav items */}
      <ul className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-2">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-2 py-2 transition-colors',
                isActive(href)
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
              )}
            >
              <Icon size={18} className="shrink-0" />
              <span className="hidden text-sm xl:inline">{label}</span>
            </Link>
          </li>
        ))}
      </ul>

      {/* Bottom section */}
      <div className="flex flex-col gap-2 border-t border-border-subtle px-2 py-3 xl:px-4">
        <p className="hidden font-mono text-xs text-text-muted xl:block">
          {lastScanText ?? 'Last scan: —'}
        </p>
        <button
          onClick={onRescan}
          disabled={!onRescan}
          className={cn(
            'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-text-secondary transition-colors',
            onRescan
              ? 'hover:bg-surface-hover hover:text-text-primary'
              : 'cursor-not-allowed opacity-50',
          )}
        >
          <RefreshCw size={16} className="shrink-0" />
          <span className="hidden xl:inline">Rescan</span>
        </button>
      </div>
    </nav>
  );
}
