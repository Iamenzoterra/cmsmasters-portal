'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const ROUTE_MAP: Record<string, string> = {
  '1': '/',
  '2': '/phases',
  '3': '/components',
  '4': '/content',
  '5': '/architecture',
  '6': '/dependencies',
};

export function KeyboardShortcuts(): React.JSX.Element {
  const [showToast, setShowToast] = useState<boolean>(false);
  const router = useRouter();
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      const target = event.target as HTMLElement;
      const tag = target.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target.contentEditable === 'true'
      ) {
        return;
      }

      const key = event.key;

      if (ROUTE_MAP[key] !== undefined) {
        router.push(ROUTE_MAP[key] as string);
        return;
      }

      if (key === 'r' || key === 'R') {
        if (toastTimerRef.current !== null) {
          clearTimeout(toastTimerRef.current);
        }
        setShowToast(true);
        toastTimerRef.current = setTimeout(() => {
          setShowToast(false);
          toastTimerRef.current = null;
        }, 2500);
        return;
      }

      if (key === 'Escape') {
        globalThis.dispatchEvent(new CustomEvent('cc:escape'));
      }
    }

    globalThis.addEventListener('keydown', handleKeyDown);
    return () => {
      globalThis.removeEventListener('keydown', handleKeyDown);
      if (toastTimerRef.current !== null) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, [router]);

  return (
    <>
      {showToast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-card bg-surface-card p-card text-sm text-text-primary shadow-lg">
          Rescan triggered — run <span className="font-mono">npm run cc:scan</span> in terminal
        </div>
      )}
    </>
  );
}
