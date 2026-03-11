import type React from 'react';

export default function CommandCenterPage(): React.ReactElement {
  return (
    <main className="min-h-screen bg-surface-card text-text-primary font-sans p-8">
      <h1 className="text-2xl font-semibold">CMSMasters Command Center</h1>
      <p className="mt-4 text-sm text-text-secondary">
        Internal dashboard for tracking CMSMasters Portal construction.
      </p>
    </main>
  );
}
