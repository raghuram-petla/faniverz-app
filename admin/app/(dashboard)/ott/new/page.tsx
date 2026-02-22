'use client';

import { useRouter } from 'next/navigation';
import { useCreateOttRelease } from '@/hooks/useAdminOtt';
import OttReleaseForm from '@/components/forms/OttReleaseForm';

export default function NewOttReleasePage() {
  const router = useRouter();
  const createRelease = useCreateOttRelease();

  const handleSubmit = (data: Record<string, unknown>) => {
    createRelease.mutate(data, { onSuccess: () => router.push('/ott') });
  };

  return (
    <div data-testid="ott-new-page">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add OTT Release</h1>
      <OttReleaseForm onSubmit={handleSubmit} isPending={createRelease.isPending} />
    </div>
  );
}
