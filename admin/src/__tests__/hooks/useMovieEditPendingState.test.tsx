import { renderHook, act } from '@testing-library/react';
import { useMovieEditPendingState } from '@/hooks/useMovieEditPendingState';

describe('useMovieEditPendingState', () => {
  it('returns empty initial state', () => {
    const { result } = renderHook(() => useMovieEditPendingState());

    expect(result.current.pendingCastAdds).toEqual([]);
    expect(result.current.pendingCastRemoveIds).toEqual(new Set());
    expect(result.current.localCastOrder).toBeNull();
    expect(result.current.pendingVideoAdds).toEqual([]);
    expect(result.current.pendingVideoRemoveIds).toEqual(new Set());
    expect(result.current.pendingPosterAdds).toEqual([]);
    expect(result.current.pendingPosterRemoveIds).toEqual(new Set());
    expect(result.current.pendingMainPosterId).toBeNull();
    expect(result.current.pendingPlatformAdds).toEqual([]);
    expect(result.current.pendingPlatformRemoveIds).toEqual(new Set());
    expect(result.current.pendingPHAdds).toEqual([]);
    expect(result.current.pendingPHRemoveIds).toEqual(new Set());
    expect(result.current.pendingRunAdds).toEqual([]);
    expect(result.current.pendingRunRemoveIds).toEqual(new Set());
    expect(result.current.pendingRunEndIds).toEqual(new Map());
  });

  it('updates pending cast state', () => {
    const { result } = renderHook(() => useMovieEditPendingState());

    act(() => {
      result.current.setPendingCastAdds([
        {
          _id: 'pc1',
          actor_id: 'a1',
          credit_type: 'cast' as const,
          role_name: 'Hero',
          role_order: null,
          display_order: 0,
        },
      ]);
      result.current.setPendingCastRemoveIds(new Set(['r1']));
      result.current.setLocalCastOrder(['a1', 'a2']);
    });

    expect(result.current.pendingCastAdds).toHaveLength(1);
    expect(result.current.pendingCastRemoveIds.has('r1')).toBe(true);
    expect(result.current.localCastOrder).toEqual(['a1', 'a2']);
  });

  it('updates pending video state', () => {
    const { result } = renderHook(() => useMovieEditPendingState());

    act(() => {
      result.current.setPendingVideoAdds([
        {
          _id: 'pv1',
          youtube_id: 'yt1',
          title: 'Trailer',
          video_type: 'trailer' as const,
          description: null,
          video_date: null,
          display_order: 0,
        },
      ]);
      result.current.setPendingVideoRemoveIds(new Set(['v1']));
    });

    expect(result.current.pendingVideoAdds).toHaveLength(1);
    expect(result.current.pendingVideoRemoveIds.has('v1')).toBe(true);
  });

  it('updates pending poster state', () => {
    const { result } = renderHook(() => useMovieEditPendingState());

    act(() => {
      result.current.setPendingPosterAdds([
        {
          _id: 'pending-poster-test-1',
          image_url: 'url',
          title: 'Poster',
          description: null,
          poster_date: null,
          is_main_poster: false,
          is_main_backdrop: false,
          image_type: 'poster',
          display_order: 0,
        },
      ]);
      result.current.setPendingPosterRemoveIds(new Set(['p1']));
      result.current.setPendingMainPosterId('p2');
    });

    expect(result.current.pendingPosterAdds).toHaveLength(1);
    expect(result.current.pendingPosterRemoveIds.has('p1')).toBe(true);
    expect(result.current.pendingMainPosterId).toBe('p2');
  });

  it('updates pending platform state', () => {
    const { result } = renderHook(() => useMovieEditPendingState());

    act(() => {
      result.current.setPendingPlatformAdds([
        { platform_id: 'pl1', available_from: '2025-01-01', streaming_url: null },
      ]);
      result.current.setPendingPlatformRemoveIds(new Set(['pl2']));
    });

    expect(result.current.pendingPlatformAdds).toHaveLength(1);
    expect(result.current.pendingPlatformRemoveIds.has('pl2')).toBe(true);
  });

  it('updates pending production house state', () => {
    const { result } = renderHook(() => useMovieEditPendingState());

    act(() => {
      result.current.setPendingPHAdds([{ production_house_id: 'ph1' }]);
      result.current.setPendingPHRemoveIds(new Set(['ph2']));
    });

    expect(result.current.pendingPHAdds).toHaveLength(1);
    expect(result.current.pendingPHRemoveIds.has('ph2')).toBe(true);
  });

  it('updates pending theatrical run state', () => {
    const { result } = renderHook(() => useMovieEditPendingState());

    act(() => {
      result.current.setPendingRunAdds([
        { _id: 'run-uuid-1', release_date: '2025-06-01', label: 'Re-release' },
      ]);
      result.current.setPendingRunRemoveIds(new Set(['r1']));
    });

    expect(result.current.pendingRunAdds).toHaveLength(1);
    expect(result.current.pendingRunRemoveIds.has('r1')).toBe(true);
  });

  it('resetPendingState clears all pending state', () => {
    const { result } = renderHook(() => useMovieEditPendingState());

    // Set some state first
    act(() => {
      result.current.setPendingCastAdds([
        {
          _id: 'pc1',
          actor_id: 'a1',
          credit_type: 'cast' as const,
          role_name: 'Hero',
          role_order: null,
          display_order: 0,
        },
      ]);
      result.current.setPendingCastRemoveIds(new Set(['r1']));
      result.current.setLocalCastOrder(['a1']);
      result.current.setPendingVideoAdds([
        {
          _id: 'pv1',
          youtube_id: 'yt1',
          title: 'T',
          video_type: 'trailer' as const,
          description: null,
          video_date: null,
          display_order: 0,
        },
      ]);
      result.current.setPendingPosterRemoveIds(new Set(['p1']));
      result.current.setPendingMainPosterId('p2');
      result.current.setPendingPlatformAdds([
        { platform_id: 'pl1', available_from: null, streaming_url: null },
      ]);
      result.current.setPendingPHAdds([{ production_house_id: 'ph1' }]);
      result.current.setPendingRunAdds([
        { _id: 'run-uuid-2', release_date: '2025-01-01', label: null },
      ]);
    });

    // Reset
    act(() => {
      result.current.resetPendingState();
    });

    expect(result.current.pendingCastAdds).toEqual([]);
    expect(result.current.pendingCastRemoveIds).toEqual(new Set());
    expect(result.current.localCastOrder).toBeNull();
    expect(result.current.pendingVideoAdds).toEqual([]);
    expect(result.current.pendingVideoRemoveIds).toEqual(new Set());
    expect(result.current.pendingPosterAdds).toEqual([]);
    expect(result.current.pendingPosterRemoveIds).toEqual(new Set());
    expect(result.current.pendingMainPosterId).toBeNull();
    expect(result.current.pendingPlatformAdds).toEqual([]);
    expect(result.current.pendingPlatformRemoveIds).toEqual(new Set());
    expect(result.current.pendingPHAdds).toEqual([]);
    expect(result.current.pendingPHRemoveIds).toEqual(new Set());
    expect(result.current.pendingRunAdds).toEqual([]);
    expect(result.current.pendingRunRemoveIds).toEqual(new Set());
    expect(result.current.pendingRunEndIds).toEqual(new Map());
  });
});
