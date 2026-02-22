'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAdminOttDetail, useUpdateOttRelease } from '@/hooks/useAdminOtt';
import OttReleaseForm from '@/components/forms/OttReleaseForm';

export default function OttEditPage() {
  const params = useParams();
  const router = useRouter();
  const releaseId = Number(params.id);
  const { data: release, isLoading } = useAdminOttDetail(releaseId);
  const updateRelease = useUpdateOttRelease();

  const handleSubmit = (data: Record<string, unknown>) => {
    updateRelease.mutate(
      { id: releaseId, updates: data },
      { onSuccess: () => router.push('/ott') }
    );
  };

  if (isLoading) return <p>Loading...</p>;
  if (!release) return <p>OTT release not found</p>;

  return (
    <div data-testid="ott-edit-page">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit OTT Release</h1>
      <OttReleaseForm
        release={release}
        onSubmit={handleSubmit}
        isPending={updateRelease.isPending}
      />
    </div>
  );
}
