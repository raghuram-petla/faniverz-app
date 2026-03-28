import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMovieEditPendingIds } from '@/hooks/useMovieEditPendingIds';
import type { PendingCastAdd } from '@/components/movie-edit/CastSection';
import type { PendingVideoAdd } from '@/hooks/useMovieEditTypes';

const makeCast = (id: string): PendingCastAdd => ({
  _id: id,
  actor_id: `actor-${id}`,
  credit_type: 'cast',
  role_name: null,
  role_order: null,
  display_order: 0,
});

const makeVideo = (id: string): PendingVideoAdd => ({
  _id: id,
  youtube_id: 'yt1',
  title: 'Trailer',
  video_type: 'trailer' as PendingVideoAdd['video_type'],
  description: null,
  video_date: null,
  display_order: 0,
});

describe('useMovieEditPendingIds', () => {
  it('returns empty sets when all arrays are empty', () => {
    const { result } = renderHook(() =>
      useMovieEditPendingIds({
        pendingCastAdds: [],
        pendingVideoAdds: [],
        pendingAvailabilityAdds: [],
        pendingRunAdds: [],
      }),
    );

    expect(result.current.pendingCastIds.size).toBe(0);
    expect(result.current.pendingVideoIds.size).toBe(0);
    expect(result.current.pendingAvailabilityIds.size).toBe(0);
    expect(result.current.pendingRunIds.size).toBe(0);
  });

  it('builds Sets from _id fields of each pending array', () => {
    const { result } = renderHook(() =>
      useMovieEditPendingIds({
        pendingCastAdds: [makeCast('cast-1'), makeCast('cast-2')],
        pendingVideoAdds: [makeVideo('vid-1')],
        pendingAvailabilityAdds: [
          {
            _id: 'avail-1',
            platform_id: 'p1',
            country_code: 'IN',
            availability_type: 'subscription' as never,
            available_from: null,
            streaming_url: null,
          },
        ],
        pendingRunAdds: [{ _id: 'run-1', release_date: '2024-01-01', label: null }],
      }),
    );

    expect(result.current.pendingCastIds).toEqual(new Set(['cast-1', 'cast-2']));
    expect(result.current.pendingVideoIds).toEqual(new Set(['vid-1']));
    expect(result.current.pendingAvailabilityIds).toEqual(new Set(['avail-1']));
    expect(result.current.pendingRunIds).toEqual(new Set(['run-1']));
  });

  it('returns stable references when inputs do not change', () => {
    const input = {
      pendingCastAdds: [makeCast('c1')],
      pendingVideoAdds: [] as PendingVideoAdd[],
      pendingAvailabilityAdds: [],
      pendingRunAdds: [],
    };

    const { result, rerender } = renderHook(() => useMovieEditPendingIds(input));
    const firstCastIds = result.current.pendingCastIds;

    rerender();
    expect(result.current.pendingCastIds).toBe(firstCastIds);
  });
});
