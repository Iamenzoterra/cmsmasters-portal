import type React from 'react';

interface PhaseDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PhaseDetail({ params }: PhaseDetailPageProps): Promise<React.ReactElement> {
  const { id } = await params;

  return (
    <h1 className='text-text-primary'>Phase {id}</h1>
  );
}
