'use client';

import { useForm } from 'react-hook-form';
import { useAdminPlatforms } from '@/hooks/useAdminPlatforms';

interface OttReleaseFormData {
  movie_id: number;
  platform_id: number;
  ott_release_date: string;
  deep_link_url: string;
  is_exclusive: boolean;
  source: string;
}

interface OttReleaseFormProps {
  release?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
  isPending?: boolean;
}

export default function OttReleaseForm({ release, onSubmit, isPending }: OttReleaseFormProps) {
  const { data: platforms = [] } = useAdminPlatforms();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OttReleaseFormData>({
    defaultValues: {
      movie_id: (release?.movie_id as number) ?? 0,
      platform_id: (release?.platform_id as number) ?? 0,
      ott_release_date: (release?.ott_release_date as string) ?? '',
      deep_link_url: (release?.deep_link_url as string) ?? '',
      is_exclusive: (release?.is_exclusive as boolean) ?? false,
      source: (release?.source as string) ?? 'manual',
    },
  });

  const onFormSubmit = (data: OttReleaseFormData) => {
    onSubmit({
      ...data,
      movie_id: Number(data.movie_id),
      platform_id: Number(data.platform_id),
    });
  };

  return (
    <form
      data-testid="ott-release-form"
      onSubmit={handleSubmit(onFormSubmit)}
      className="max-w-2xl space-y-6 bg-white p-6 rounded-xl shadow-sm border border-gray-200"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700">Movie ID *</label>
        <input
          type="number"
          {...register('movie_id', { required: 'Movie ID is required', min: 1 })}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        {errors.movie_id && <p className="text-red-500 text-xs mt-1">{errors.movie_id.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Platform *</label>
        <select
          {...register('platform_id', { required: 'Platform is required', min: 1 })}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value={0}>Select platform</option>
          {platforms.map((p: Record<string, unknown>) => (
            <option key={p.id as number} value={p.id as number}>
              {p.name as string}
            </option>
          ))}
        </select>
        {errors.platform_id && (
          <p className="text-red-500 text-xs mt-1">{errors.platform_id.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">OTT Release Date</label>
        <input
          type="date"
          {...register('ott_release_date')}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Deep Link URL</label>
        <input
          {...register('deep_link_url')}
          placeholder="https://..."
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" {...register('is_exclusive')} id="is_exclusive" />
        <label htmlFor="is_exclusive" className="text-sm text-gray-700">
          Exclusive Release
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
      >
        {isPending ? 'Saving...' : release ? 'Update Release' : 'Create Release'}
      </button>
    </form>
  );
}
