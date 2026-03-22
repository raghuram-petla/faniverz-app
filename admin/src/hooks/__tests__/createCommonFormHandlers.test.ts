import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/hooks/useImageUpload', () => ({
  uploadImage: vi.fn(),
}));

import { createCommonFormHandlers } from '@/hooks/createCommonFormHandlers';
import { uploadImage } from '@/hooks/useImageUpload';

function makeDeps() {
  return {
    setForm: vi.fn(),
    setPendingVideoAdds: vi.fn(),
    setPendingVideoRemoveIds: vi.fn(),
    setPendingPosterAdds: vi.fn(),
    setPendingPosterRemoveIds: vi.fn(),
    setPendingPlatformAdds: vi.fn(),
    setPendingPlatformRemoveIds: vi.fn(),
    setPendingPHAdds: vi.fn(),
    setPendingPHRemoveIds: vi.fn(),
    setPendingCastAdds: vi.fn(),
    setPendingCastRemoveIds: vi.fn(),
    setPendingRunAdds: vi.fn(),
    setPendingRunRemoveIds: vi.fn(),
    setPendingRunEndIds: vi.fn(),
  };
}

describe('createCommonFormHandlers', () => {
  let deps: ReturnType<typeof makeDeps>;
  let handlers: ReturnType<typeof createCommonFormHandlers>;

  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    deps = makeDeps();
    handlers = createCommonFormHandlers(deps);
  });

  describe('updateField', () => {
    it('calls setForm with updated field value', () => {
      handlers.updateField('title', 'My Movie');
      expect(deps.setForm).toHaveBeenCalledTimes(1);
      // Invoke the updater to verify it merges the field
      const updater = deps.setForm.mock.calls[0][0] as (prev: object) => object;
      const prev = { title: 'Old', synopsis: 'X' };
      expect(updater(prev)).toEqual({ title: 'My Movie', synopsis: 'X' });
    });

    it('supports boolean values', () => {
      handlers.updateField('is_featured', true);
      const updater = deps.setForm.mock.calls[0][0] as (prev: object) => object;
      expect(updater({ is_featured: false })).toEqual({ is_featured: true });
    });

    it('supports string array values', () => {
      handlers.updateField('genres', ['Action', 'Drama']);
      const updater = deps.setForm.mock.calls[0][0] as (prev: object) => object;
      expect(updater({ genres: [] })).toEqual({ genres: ['Action', 'Drama'] });
    });
  });

  describe('toggleGenre', () => {
    it('adds genre when not present', () => {
      handlers.toggleGenre('Action');
      const updater = deps.setForm.mock.calls[0][0] as (prev: { genres: string[] }) => {
        genres: string[];
      };
      const result = updater({ genres: ['Drama'] });
      expect(result.genres).toEqual(['Drama', 'Action']);
    });

    it('removes genre when already present', () => {
      handlers.toggleGenre('Drama');
      const updater = deps.setForm.mock.calls[0][0] as (prev: { genres: string[] }) => {
        genres: string[];
      };
      const result = updater({ genres: ['Action', 'Drama'] });
      expect(result.genres).toEqual(['Action']);
    });
  });

  describe('handleImageUpload', () => {
    it('calls uploadImage and updates form field on success', async () => {
      vi.mocked(uploadImage).mockResolvedValue('https://cdn.example.com/poster.jpg');
      const setUploading = vi.fn();
      const file = new File(['data'], 'poster.jpg', { type: 'image/jpeg' });

      await handlers.handleImageUpload(file, '/api/upload/poster', 'poster_url', setUploading);

      expect(setUploading).toHaveBeenCalledWith(true);
      expect(uploadImage).toHaveBeenCalledWith(file, '/api/upload/poster');
      expect(setUploading).toHaveBeenCalledWith(false);
      const updater = deps.setForm.mock.calls[0][0] as (prev: object) => object;
      expect(updater({ poster_url: '' })).toEqual({
        poster_url: 'https://cdn.example.com/poster.jpg',
      });
    });

    it('calls alert and sets uploading false on error', async () => {
      vi.mocked(uploadImage).mockRejectedValue(new Error('Upload failed'));
      const setUploading = vi.fn();
      const file = new File(['data'], 'poster.jpg', { type: 'image/jpeg' });

      await handlers.handleImageUpload(file, '/api/upload/poster', 'poster_url', setUploading);

      expect(window.alert).toHaveBeenCalledWith('Upload failed');
      expect(setUploading).toHaveBeenLastCalledWith(false);
    });

    it('shows generic alert for non-Error rejection', async () => {
      vi.mocked(uploadImage).mockRejectedValue('some string error');
      const setUploading = vi.fn();
      const file = new File(['data'], 'poster.jpg', { type: 'image/jpeg' });

      await handlers.handleImageUpload(file, '/api/upload/poster', 'poster_url', setUploading);

      expect(window.alert).toHaveBeenCalledWith('Upload failed');
    });
  });

  describe('handleVideoRemove', () => {
    it('filters pendingVideoAdds when isPending=true', () => {
      handlers.handleVideoRemove('vid-1', true);
      expect(deps.setPendingVideoAdds).toHaveBeenCalledTimes(1);
      const updater = deps.setPendingVideoAdds.mock.calls[0][0] as (
        prev: { _id: string }[],
      ) => { _id: string }[];
      const prev = [{ _id: 'vid-1' }, { _id: 'vid-2' }];
      expect(updater(prev)).toEqual([{ _id: 'vid-2' }]);
    });

    it('adds to pendingVideoRemoveIds when isPending=false', () => {
      handlers.handleVideoRemove('vid-db-1', false);
      expect(deps.setPendingVideoRemoveIds).toHaveBeenCalledTimes(1);
      const updater = deps.setPendingVideoRemoveIds.mock.calls[0][0] as (
        prev: Set<string>,
      ) => Set<string>;
      const result = updater(new Set<string>());
      expect(result.has('vid-db-1')).toBe(true);
    });
  });

  describe('handlePosterRemove', () => {
    it('filters pendingPosterAdds when isPending=true', () => {
      handlers.handlePosterRemove('p-1', true);
      const updater = deps.setPendingPosterAdds.mock.calls[0][0] as (
        prev: { _id: string }[],
      ) => { _id: string }[];
      expect(updater([{ _id: 'p-1' }, { _id: 'p-2' }])).toEqual([{ _id: 'p-2' }]);
    });

    it('adds to pendingPosterRemoveIds when isPending=false', () => {
      handlers.handlePosterRemove('p-db-1', false);
      const updater = deps.setPendingPosterRemoveIds.mock.calls[0][0] as (
        prev: Set<string>,
      ) => Set<string>;
      expect(updater(new Set<string>()).has('p-db-1')).toBe(true);
    });
  });

  describe('handlePlatformRemove', () => {
    it('filters pendingPlatformAdds by platform_id when isPending=true', () => {
      handlers.handlePlatformRemove('netflix', true);
      const updater = deps.setPendingPlatformAdds.mock.calls[0][0] as (
        prev: { platform_id: string }[],
      ) => { platform_id: string }[];
      const result = updater([{ platform_id: 'netflix' }, { platform_id: 'aha' }]);
      expect(result).toEqual([{ platform_id: 'aha' }]);
    });

    it('adds to pendingPlatformRemoveIds when isPending=false', () => {
      handlers.handlePlatformRemove('netflix', false);
      const updater = deps.setPendingPlatformRemoveIds.mock.calls[0][0] as (
        prev: Set<string>,
      ) => Set<string>;
      expect(updater(new Set<string>()).has('netflix')).toBe(true);
    });
  });

  describe('handlePHRemove', () => {
    it('filters pendingPHAdds by production_house_id when isPending=true', () => {
      handlers.handlePHRemove('ph-1', true);
      const updater = deps.setPendingPHAdds.mock.calls[0][0] as (
        prev: { production_house_id: string }[],
      ) => { production_house_id: string }[];
      const result = updater([{ production_house_id: 'ph-1' }, { production_house_id: 'ph-2' }]);
      expect(result).toEqual([{ production_house_id: 'ph-2' }]);
    });

    it('adds to pendingPHRemoveIds when isPending=false', () => {
      handlers.handlePHRemove('ph-db-1', false);
      const updater = deps.setPendingPHRemoveIds.mock.calls[0][0] as (
        prev: Set<string>,
      ) => Set<string>;
      expect(updater(new Set<string>()).has('ph-db-1')).toBe(true);
    });
  });

  describe('handleCastRemove', () => {
    it('filters pendingCastAdds by _id when isPending=true', () => {
      handlers.handleCastRemove('cast-1', true);
      const updater = deps.setPendingCastAdds.mock.calls[0][0] as (
        prev: { _id: string }[],
      ) => { _id: string }[];
      expect(updater([{ _id: 'cast-1' }, { _id: 'cast-2' }])).toEqual([{ _id: 'cast-2' }]);
    });

    it('adds to pendingCastRemoveIds when isPending=false', () => {
      handlers.handleCastRemove('cast-db-1', false);
      const updater = deps.setPendingCastRemoveIds.mock.calls[0][0] as (
        prev: Set<string>,
      ) => Set<string>;
      expect(updater(new Set<string>()).has('cast-db-1')).toBe(true);
    });
  });

  describe('handleRunRemove', () => {
    it('filters pendingRunAdds by _id when isPending=true', () => {
      handlers.handleRunRemove('run-1', true);
      const updater = deps.setPendingRunAdds.mock.calls[0][0] as (
        prev: { _id: string }[],
      ) => { _id: string }[];
      expect(updater([{ _id: 'run-1' }, { _id: 'run-2' }])).toEqual([{ _id: 'run-2' }]);
    });

    it('adds to pendingRunRemoveIds when isPending=false', () => {
      handlers.handleRunRemove('run-db-1', false);
      const updater = deps.setPendingRunRemoveIds.mock.calls[0][0] as (
        prev: Set<string>,
      ) => Set<string>;
      expect(updater(new Set<string>()).has('run-db-1')).toBe(true);
    });
  });

  describe('handleRunEnd', () => {
    it('sets run end date in pendingRunEndIds map', () => {
      handlers.handleRunEnd('run-1', '2025-12-31');
      expect(deps.setPendingRunEndIds).toHaveBeenCalledTimes(1);
      const updater = deps.setPendingRunEndIds.mock.calls[0][0] as (
        prev: Map<string, string>,
      ) => Map<string, string>;
      const result = updater(new Map<string, string>());
      expect(result.get('run-1')).toBe('2025-12-31');
    });

    it('preserves existing entries while adding new one', () => {
      handlers.handleRunEnd('run-2', '2025-06-30');
      const updater = deps.setPendingRunEndIds.mock.calls[0][0] as (
        prev: Map<string, string>,
      ) => Map<string, string>;
      const existing = new Map<string, string>([['run-1', '2025-01-01']]);
      const result = updater(existing);
      expect(result.get('run-1')).toBe('2025-01-01');
      expect(result.get('run-2')).toBe('2025-06-30');
    });
  });
});
