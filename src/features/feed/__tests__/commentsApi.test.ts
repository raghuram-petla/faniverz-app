const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockDelete = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      delete: mockDelete,
    })),
  },
}));

import { fetchComments, addComment, deleteComment } from '../commentsApi';

describe('fetchComments', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches comments for a feed item with pagination', async () => {
    const mockComments = [
      { id: 'c1', feed_item_id: 'f1', user_id: 'u1', body: 'Great!', created_at: '2024-01-01' },
    ];
    const mockRange = jest.fn().mockResolvedValue({ data: mockComments, error: null });
    const mockOrder = jest.fn().mockReturnValue({ range: mockRange });
    const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });

    const result = await fetchComments('f1', 0, 20);
    expect(result).toEqual(mockComments);
    expect(mockEq).toHaveBeenCalledWith('feed_item_id', 'f1');
    expect(mockRange).toHaveBeenCalledWith(0, 19);
  });

  it('handles offset correctly', async () => {
    const mockRange = jest.fn().mockResolvedValue({ data: [], error: null });
    const mockOrder = jest.fn().mockReturnValue({ range: mockRange });
    const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });

    await fetchComments('f1', 20, 10);
    expect(mockRange).toHaveBeenCalledWith(20, 29);
  });

  it('throws on error', async () => {
    const mockRange = jest.fn().mockResolvedValue({ data: null, error: new Error('DB error') });
    const mockOrder = jest.fn().mockReturnValue({ range: mockRange });
    const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });

    await expect(fetchComments('f1', 0)).rejects.toThrow('DB error');
  });

  it('uses default pageSize of 20 when not provided', async () => {
    const mockRange = jest.fn().mockResolvedValue({ data: [], error: null });
    const mockOrder = jest.fn().mockReturnValue({ range: mockRange });
    const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });

    await fetchComments('f1', 0);
    expect(mockRange).toHaveBeenCalledWith(0, 19);
  });

  it('returns empty array when data is null', async () => {
    const mockRange = jest.fn().mockResolvedValue({ data: null, error: null });
    const mockOrder = jest.fn().mockReturnValue({ range: mockRange });
    const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });

    const result = await fetchComments('f1', 0);
    expect(result).toEqual([]);
  });
});

describe('addComment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('inserts a comment and returns it', async () => {
    const newComment = {
      id: 'c2',
      feed_item_id: 'f1',
      user_id: 'u1',
      body: 'Nice!',
      created_at: '2024-01-01',
    };
    const mockSingle = jest.fn().mockResolvedValue({ data: newComment, error: null });
    const mockCommentSelect = jest.fn().mockReturnValue({ single: mockSingle });
    mockInsert.mockReturnValue({ select: mockCommentSelect });

    const result = await addComment('f1', 'u1', 'Nice!');
    expect(result).toEqual(newComment);
    expect(mockInsert).toHaveBeenCalledWith({
      feed_item_id: 'f1',
      user_id: 'u1',
      body: 'Nice!',
    });
  });

  it('throws on error', async () => {
    const mockSingle = jest
      .fn()
      .mockResolvedValue({ data: null, error: new Error('Insert error') });
    const mockCommentSelect = jest.fn().mockReturnValue({ single: mockSingle });
    mockInsert.mockReturnValue({ select: mockCommentSelect });

    await expect(addComment('f1', 'u1', 'Fail')).rejects.toThrow('Insert error');
  });
});

describe('deleteComment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes a comment by id and user', async () => {
    const mockEq2 = jest.fn().mockResolvedValue({ error: null });
    const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
    mockDelete.mockReturnValue({ eq: mockEq1 });

    await deleteComment('c1', 'u1');
    expect(mockEq1).toHaveBeenCalledWith('id', 'c1');
    expect(mockEq2).toHaveBeenCalledWith('user_id', 'u1');
  });

  it('throws on error', async () => {
    const mockEq2 = jest.fn().mockResolvedValue({ error: new Error('Delete error') });
    const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
    mockDelete.mockReturnValue({ eq: mockEq1 });

    await expect(deleteComment('c1', 'u1')).rejects.toThrow('Delete error');
  });
});
