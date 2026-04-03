const mockUpsert = jest.fn();
const mockDelete = jest.fn();
const mockSelect = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      upsert: mockUpsert,
      delete: mockDelete,
      select: mockSelect,
    })),
  },
}));

import { likeComment, unlikeComment, fetchUserCommentLikes } from '../commentLikesApi';

describe('likeComment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('upserts a comment like', async () => {
    mockUpsert.mockResolvedValue({ error: null });

    await likeComment('c1', 'u1');
    expect(mockUpsert).toHaveBeenCalledWith(
      { comment_id: 'c1', user_id: 'u1' },
      { onConflict: 'comment_id,user_id' },
    );
  });

  it('throws on error', async () => {
    mockUpsert.mockResolvedValue({ error: new Error('upsert fail') });
    await expect(likeComment('c1', 'u1')).rejects.toThrow('upsert fail');
  });
});

describe('unlikeComment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes a comment like', async () => {
    const mockEq2 = jest.fn().mockResolvedValue({ error: null });
    const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
    mockDelete.mockReturnValue({ eq: mockEq1 });

    await unlikeComment('c1', 'u1');
    expect(mockEq1).toHaveBeenCalledWith('comment_id', 'c1');
    expect(mockEq2).toHaveBeenCalledWith('user_id', 'u1');
  });

  it('throws on error', async () => {
    const mockEq2 = jest.fn().mockResolvedValue({ error: new Error('delete fail') });
    const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
    mockDelete.mockReturnValue({ eq: mockEq1 });

    await expect(unlikeComment('c1', 'u1')).rejects.toThrow('delete fail');
  });
});

describe('fetchUserCommentLikes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns empty record for empty commentIds', async () => {
    const result = await fetchUserCommentLikes('u1', []);
    expect(result).toEqual({});
  });

  it('fetches liked comment IDs', async () => {
    const mockIn = jest.fn().mockResolvedValue({ data: [{ comment_id: 'c1' }, { comment_id: 'c3' }], error: null });
    const mockEq = jest.fn().mockReturnValue({ in: mockIn });
    mockSelect.mockReturnValue({ eq: mockEq });

    const result = await fetchUserCommentLikes('u1', ['c1', 'c2', 'c3']);
    expect(result).toEqual({ c1: true, c3: true });
  });

  it('batches large arrays', async () => {
    const ids = Array.from({ length: 50 }, (_, i) => `c${i}`);
    const mockIn = jest.fn().mockResolvedValue({ data: [], error: null });
    const mockEq = jest.fn().mockReturnValue({ in: mockIn });
    mockSelect.mockReturnValue({ eq: mockEq });

    await fetchUserCommentLikes('u1', ids);
    // Should be called 2 times (40 + 10 batches)
    expect(mockIn).toHaveBeenCalledTimes(2);
  });

  it('throws on error', async () => {
    const mockIn = jest.fn().mockResolvedValue({ data: null, error: new Error('fetch fail') });
    const mockEq = jest.fn().mockReturnValue({ in: mockIn });
    mockSelect.mockReturnValue({ eq: mockEq });

    await expect(fetchUserCommentLikes('u1', ['c1'])).rejects.toThrow('fetch fail');
  });

  it('handles null data from supabase', async () => {
    const mockIn = jest.fn().mockResolvedValue({ data: null, error: null });
    const mockEq = jest.fn().mockReturnValue({ in: mockIn });
    mockSelect.mockReturnValue({ eq: mockEq });

    const result = await fetchUserCommentLikes('u1', ['c1']);
    expect(result).toEqual({});
  });
});
