import { revertEntity } from '@/hooks/useMovieEditChangesRevert';
import type { UseMovieEditChangesParams } from '@/hooks/useMovieEditTypes';

function makeParams(overrides: Partial<UseMovieEditChangesParams> = {}): UseMovieEditChangesParams {
  return {
    form: {} as UseMovieEditChangesParams['form'],
    initialForm: null,
    setForm: vi.fn(),
    setInitialForm: vi.fn(),
    pendingCastAdds: [],
    pendingCastRemoveIds: new Set(),
    localCastOrder: null,
    castData: [],
    setPendingCastAdds: vi.fn(),
    setPendingCastRemoveIds: vi.fn(),
    setLocalCastOrder: vi.fn(),
    pendingVideoAdds: [],
    pendingVideoRemoveIds: new Set(),
    videosData: [],
    setPendingVideoAdds: vi.fn(),
    setPendingVideoRemoveIds: vi.fn(),
    pendingPosterAdds: [],
    pendingPosterRemoveIds: new Set(),
    pendingMainPosterId: null,
    savedMainPosterId: null,
    postersData: [],
    setPendingPosterAdds: vi.fn(),
    setPendingPosterRemoveIds: vi.fn(),
    setPendingMainPosterId: vi.fn(),
    pendingPlatformAdds: [],
    pendingPlatformRemoveIds: new Set(),
    moviePlatforms: [],
    setPendingPlatformAdds: vi.fn(),
    setPendingPlatformRemoveIds: vi.fn(),
    pendingPHAdds: [],
    pendingPHRemoveIds: new Set(),
    movieProductionHouses: [],
    setPendingPHAdds: vi.fn(),
    setPendingPHRemoveIds: vi.fn(),
    pendingRunAdds: [],
    pendingRunRemoveIds: new Set(),
    pendingRunEndIds: new Map(),
    theatricalRuns: [],
    setPendingRunAdds: vi.fn(),
    setPendingRunRemoveIds: vi.fn(),
    setPendingRunEndIds: vi.fn(),
    resetPendingState: vi.fn(),
    ...overrides,
  };
}

describe('revertEntity', () => {
  it('reverts a cast add by index', () => {
    const p = makeParams();
    revertEntity('entity:cast-add-0', p);
    expect(p.setPendingCastAdds).toHaveBeenCalled();
  });

  it('reverts a cast remove by id', () => {
    const p = makeParams();
    revertEntity('entity:cast-remove-abc', p);
    expect(p.setPendingCastRemoveIds).toHaveBeenCalled();
  });

  it('reverts cast reorder', () => {
    const p = makeParams();
    revertEntity('entity:cast-reorder', p);
    expect(p.setLocalCastOrder).toHaveBeenCalledWith(null);
  });

  it('reverts a video add', () => {
    const p = makeParams();
    revertEntity('entity:video-add-1', p);
    expect(p.setPendingVideoAdds).toHaveBeenCalled();
  });

  it('reverts a video remove', () => {
    const p = makeParams();
    revertEntity('entity:video-remove-xyz', p);
    expect(p.setPendingVideoRemoveIds).toHaveBeenCalled();
  });

  it('reverts a poster add', () => {
    const p = makeParams();
    revertEntity('entity:poster-add-0', p);
    expect(p.setPendingPosterAdds).toHaveBeenCalled();
  });

  it('reverts a poster remove', () => {
    const p = makeParams();
    revertEntity('entity:poster-remove-xyz', p);
    expect(p.setPendingPosterRemoveIds).toHaveBeenCalled();
  });

  it('reverts main poster change', () => {
    const p = makeParams();
    revertEntity('entity:main-poster', p);
    expect(p.setPendingMainPosterId).toHaveBeenCalledWith(null);
  });

  it('reverts a platform add', () => {
    const p = makeParams();
    revertEntity('entity:platform-add-0', p);
    expect(p.setPendingPlatformAdds).toHaveBeenCalled();
  });

  it('reverts a platform remove', () => {
    const p = makeParams();
    revertEntity('entity:platform-remove-xyz', p);
    expect(p.setPendingPlatformRemoveIds).toHaveBeenCalled();
  });

  it('reverts a production house add', () => {
    const p = makeParams();
    revertEntity('entity:ph-add-0', p);
    expect(p.setPendingPHAdds).toHaveBeenCalled();
  });

  it('reverts a production house remove', () => {
    const p = makeParams();
    revertEntity('entity:ph-remove-xyz', p);
    expect(p.setPendingPHRemoveIds).toHaveBeenCalled();
  });

  it('reverts a run add by stable _id UUID — no index-shift bugs', () => {
    // @sync: regression test — key was 'entity:run-add-{index}' before migration to _id
    const setPendingRunAdds = vi.fn();
    const p = makeParams({ setPendingRunAdds });
    revertEntity('entity:run-add-stable-uuid-2', p);
    expect(setPendingRunAdds).toHaveBeenCalledTimes(1);
    const updater = (setPendingRunAdds as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const items = [
      { _id: 'stable-uuid-1', release_date: '2025-01-01', label: null },
      { _id: 'stable-uuid-2', release_date: '2025-06-01', label: 'Re-release' },
      { _id: 'stable-uuid-3', release_date: '2025-12-01', label: null },
    ];
    const result = updater(items);
    expect(result).toHaveLength(2);
    expect(result.find((r: { _id: string }) => r._id === 'stable-uuid-2')).toBeUndefined();
    expect(result.find((r: { _id: string }) => r._id === 'stable-uuid-1')).toBeDefined();
    expect(result.find((r: { _id: string }) => r._id === 'stable-uuid-3')).toBeDefined();
  });

  it('reverts a run remove', () => {
    const p = makeParams();
    revertEntity('entity:run-remove-xyz', p);
    expect(p.setPendingRunRemoveIds).toHaveBeenCalled();
  });

  it('reverts a run end', () => {
    const p = makeParams();
    revertEntity('entity:run-end-xyz', p);
    expect(p.setPendingRunEndIds).toHaveBeenCalled();
  });
});
