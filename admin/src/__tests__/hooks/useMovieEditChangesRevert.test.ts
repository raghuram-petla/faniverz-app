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
    pendingAvailabilityAdds: [],
    pendingAvailabilityRemoveIds: new Set(),
    availabilityData: [],
    setPendingAvailabilityAdds: vi.fn(),
    setPendingAvailabilityRemoveIds: vi.fn(),
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

  it('reverts an availability add by _id', () => {
    const setPendingAvailabilityAdds = vi.fn();
    const p = makeParams({ setPendingAvailabilityAdds });
    revertEntity('entity:avail-add-avail-uuid-1', p);
    const updater = setPendingAvailabilityAdds.mock.calls[0][0];
    const items = [
      {
        _id: 'avail-uuid-1',
        platform_id: 'plt-1',
        country_code: 'IN',
        availability_type: 'flatrate',
      },
      { _id: 'avail-uuid-2', platform_id: 'plt-2', country_code: 'US', availability_type: 'rent' },
    ];
    const result = updater(items);
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe('avail-uuid-2');
  });

  it('reverts an availability remove by id', () => {
    const setPendingAvailabilityRemoveIds = vi.fn();
    const p = makeParams({ setPendingAvailabilityRemoveIds });
    revertEntity('entity:avail-remove-avail-1', p);
    const updater = setPendingAvailabilityRemoveIds.mock.calls[0][0];
    const set = new Set(['avail-1', 'avail-2']);
    const result = updater(set);
    expect(result.has('avail-1')).toBe(false);
    expect(result.has('avail-2')).toBe(true);
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

  it('run-end revert removes entry from map by id', () => {
    const setPendingRunEndIds = vi.fn();
    const p = makeParams({ setPendingRunEndIds });
    revertEntity('entity:run-end-run-123', p);
    const updater = setPendingRunEndIds.mock.calls[0][0];
    const map = new Map([
      ['run-123', '2025-12-31'],
      ['run-456', '2026-01-15'],
    ]);
    const result = updater(map);
    expect(result.has('run-123')).toBe(false);
    expect(result.has('run-456')).toBe(true);
  });

  it('cast-remove revert removes id from set', () => {
    const setPendingCastRemoveIds = vi.fn();
    const p = makeParams({ setPendingCastRemoveIds });
    revertEntity('entity:cast-remove-actor-abc', p);
    const updater = setPendingCastRemoveIds.mock.calls[0][0];
    const set = new Set(['actor-abc', 'actor-def']);
    const result = updater(set);
    expect(result.has('actor-abc')).toBe(false);
    expect(result.has('actor-def')).toBe(true);
  });

  it('video-remove revert removes id from set', () => {
    const setPendingVideoRemoveIds = vi.fn();
    const p = makeParams({ setPendingVideoRemoveIds });
    revertEntity('entity:video-remove-vid-1', p);
    const updater = setPendingVideoRemoveIds.mock.calls[0][0];
    const set = new Set(['vid-1', 'vid-2']);
    const result = updater(set);
    expect(result.has('vid-1')).toBe(false);
    expect(result.has('vid-2')).toBe(true);
  });

  it('poster-remove revert removes id from set', () => {
    const setPendingPosterRemoveIds = vi.fn();
    const p = makeParams({ setPendingPosterRemoveIds });
    revertEntity('entity:poster-remove-poster-1', p);
    const updater = setPendingPosterRemoveIds.mock.calls[0][0];
    const set = new Set(['poster-1', 'poster-2']);
    const result = updater(set);
    expect(result.has('poster-1')).toBe(false);
    expect(result.has('poster-2')).toBe(true);
  });

  it('platform-remove revert removes id from set', () => {
    const setPendingPlatformRemoveIds = vi.fn();
    const p = makeParams({ setPendingPlatformRemoveIds });
    revertEntity('entity:platform-remove-plat-1', p);
    const updater = setPendingPlatformRemoveIds.mock.calls[0][0];
    const set = new Set(['plat-1', 'plat-2']);
    const result = updater(set);
    expect(result.has('plat-1')).toBe(false);
    expect(result.has('plat-2')).toBe(true);
  });

  it('ph-remove revert removes id from set', () => {
    const setPendingPHRemoveIds = vi.fn();
    const p = makeParams({ setPendingPHRemoveIds });
    revertEntity('entity:ph-remove-ph-1', p);
    const updater = setPendingPHRemoveIds.mock.calls[0][0];
    const set = new Set(['ph-1', 'ph-2']);
    const result = updater(set);
    expect(result.has('ph-1')).toBe(false);
    expect(result.has('ph-2')).toBe(true);
  });

  it('run-remove revert removes id from set', () => {
    const setPendingRunRemoveIds = vi.fn();
    const p = makeParams({ setPendingRunRemoveIds });
    revertEntity('entity:run-remove-run-1', p);
    const updater = setPendingRunRemoveIds.mock.calls[0][0];
    const set = new Set(['run-1', 'run-2']);
    const result = updater(set);
    expect(result.has('run-1')).toBe(false);
    expect(result.has('run-2')).toBe(true);
  });

  it('cast-add revert filters by _id', () => {
    const setPendingCastAdds = vi.fn();
    const p = makeParams({ setPendingCastAdds });
    revertEntity('entity:cast-add-cast-uuid-1', p);
    const updater = setPendingCastAdds.mock.calls[0][0];
    const items = [
      { _id: 'cast-uuid-1', actor_id: 'a1', credit_type: 'cast' },
      { _id: 'cast-uuid-2', actor_id: 'a2', credit_type: 'cast' },
    ];
    const result = updater(items);
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe('cast-uuid-2');
  });

  it('video-add revert filters by _id', () => {
    const setPendingVideoAdds = vi.fn();
    const p = makeParams({ setPendingVideoAdds });
    revertEntity('entity:video-add-vid-uuid-1', p);
    const updater = setPendingVideoAdds.mock.calls[0][0];
    const items = [
      { _id: 'vid-uuid-1', youtube_id: 'yt1' },
      { _id: 'vid-uuid-2', youtube_id: 'yt2' },
    ];
    const result = updater(items);
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe('vid-uuid-2');
  });

  it('poster-add revert filters by _id', () => {
    const setPendingPosterAdds = vi.fn();
    const p = makeParams({ setPendingPosterAdds });
    revertEntity('entity:poster-add-post-uuid-1', p);
    const updater = setPendingPosterAdds.mock.calls[0][0];
    const items = [
      { _id: 'post-uuid-1', image_url: 'img1.jpg' },
      { _id: 'post-uuid-2', image_url: 'img2.jpg' },
    ];
    const result = updater(items);
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe('post-uuid-2');
  });

  it('platform-add revert filters by platform_id', () => {
    const setPendingPlatformAdds = vi.fn();
    const p = makeParams({ setPendingPlatformAdds });
    revertEntity('entity:platform-add-netflix', p);
    const updater = setPendingPlatformAdds.mock.calls[0][0];
    const items = [
      { platform_id: 'netflix', available_from: null },
      { platform_id: 'prime', available_from: null },
    ];
    const result = updater(items);
    expect(result).toHaveLength(1);
    expect(result[0].platform_id).toBe('prime');
  });

  it('ph-add revert filters by production_house_id', () => {
    const setPendingPHAdds = vi.fn();
    const p = makeParams({ setPendingPHAdds });
    revertEntity('entity:ph-add-ph-uuid-1', p);
    const updater = setPendingPHAdds.mock.calls[0][0];
    const items = [{ production_house_id: 'ph-uuid-1' }, { production_house_id: 'ph-uuid-2' }];
    const result = updater(items);
    expect(result).toHaveLength(1);
    expect(result[0].production_house_id).toBe('ph-uuid-2');
  });

  it('does not call any setter for unknown key', () => {
    const p = makeParams();
    revertEntity('entity:unknown-key', p);
    // None of the setters should be called
    expect(p.setPendingCastAdds).not.toHaveBeenCalled();
    expect(p.setPendingCastRemoveIds).not.toHaveBeenCalled();
    expect(p.setLocalCastOrder).not.toHaveBeenCalled();
    expect(p.setPendingVideoAdds).not.toHaveBeenCalled();
    expect(p.setPendingVideoRemoveIds).not.toHaveBeenCalled();
    expect(p.setPendingPosterAdds).not.toHaveBeenCalled();
    expect(p.setPendingPosterRemoveIds).not.toHaveBeenCalled();
    expect(p.setPendingMainPosterId).not.toHaveBeenCalled();
    expect(p.setPendingPlatformAdds).not.toHaveBeenCalled();
    expect(p.setPendingPlatformRemoveIds).not.toHaveBeenCalled();
    expect(p.setPendingPHAdds).not.toHaveBeenCalled();
    expect(p.setPendingPHRemoveIds).not.toHaveBeenCalled();
    expect(p.setPendingAvailabilityAdds).not.toHaveBeenCalled();
    expect(p.setPendingAvailabilityRemoveIds).not.toHaveBeenCalled();
    expect(p.setPendingRunAdds).not.toHaveBeenCalled();
    expect(p.setPendingRunRemoveIds).not.toHaveBeenCalled();
    expect(p.setPendingRunEndIds).not.toHaveBeenCalled();
  });
});
