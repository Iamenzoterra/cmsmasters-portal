import type React from 'react';
import { AtomsShowcase } from '../ui/AtomsShowcase';

export default function CommandCenterPage(): React.ReactElement {
  return (
    <main className="min-h-screen bg-surface-app">
      <AtomsShowcase />
    </main>
  );
}
