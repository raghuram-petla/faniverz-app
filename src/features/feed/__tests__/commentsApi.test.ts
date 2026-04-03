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

import { fetchComments, fetchReplies, addComment, deleteComment } from '../commentsApi';

describe('fetchComments', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches top-level comments with parent_comment_id IS NULL filter', async () => {
    const mockComments = [
      { id: 'c1', feed_item_id: 'f1', user_id: 'u1', body: 'Great!', parent_comment_id: null },
    ];
    const mockRange = jest.fn().mockResolvedValue({ data: mockComments, error: null });
    const mockOrder = jest.fn().mockReturnValue({ range: mockRange });
    const mockIs = jest.fn().mockReturnValue({ order: mockOrder });
    const mockEq = jest.fn().mockReturnValue({ is: mockIs });
    mockSelect.mockReturnValue({ eq: mockEq });

    const result = await fetchComments('f1', 0, 20);
    expect(result).toEqual(mockComments);
    expect(mockEq).toHaveBeenCalledWith('feed_item_id', 'f1');
    expect(mockIs).toHaveBeenCalledWith('parent_comment_id', null);
    expect(mockRange).toHaveBeenCalledWith(0, 19);
  });

  it('handles offset correctly', async () => {
    const mockRange = jest.fn().mockResolvedValue({ data: [], error: null });
    const mockOrder = jest.fn().mockReturnValue({ range: mockRange });
    const mockIs = jest.fn().mockReturnValue({ order: mockOrder });
    const mockEq = jest.fn().mockReturnValue({ is: mockIs });
    mockSelect.mockReturnValue({ eq: mockEq });

    await fetchComments('f1', 20, 10);
    expect(mockRange).toHaveBeenCalledWith(20, 29);
  });

  it('throws on error', async () => {
    const mockRange = jest.fn().mockResolvedValue({ data: null, error: new Error('DB error') });
    const mockOrder = jest.fn().mockReturnValue({ range: mockRange });
    const mockIs = jest.fn().mockReturnValue({ order: mockOrder });
    const mockEq = jest.fn().mockReturnValue({ is: mockIs });
    mockSelect.mockReturnValue({ eq: mockEq });

    await expect(fetchComments('f1', 0)).rejects.toThrow('DB error');
  });

  it('returns empty array when data is null', async () => {
    const mockRange = jest.fn().mockResolvedValue({ data: null, error: null });
    const mockOrder = jest.fn().mockReturnValue({ range: mockRange });
    const mockIs = jest.fn().mockReturnValue({ order: mockOrder });
    const mockEq = jest.fn().mockReturnValue({ is: mockIs });
    mockSelect.mockReturnValue({ eq: mockEq });

    const result = await fetchComments('f1', 0);
    expect(result).toEqual([]);
  });

  it('uses default offset and limit', async () => {
    const mockRange = jest.fn().mockResolvedValue({ data: [], error: null });
    const mockOrder = jest.fn().mockReturnValue({ range: mockRange });
    const mockIs = jest.fn().mockReturnValue({ order: mockOrder });
    const mockEq = jest.fn().mockReturnValue({ is: mockIs });
    mockSelect.mockReturnValue({ eq: mockEq });

    await fetchComments('f1');
    expect(mockRange).toHaveBeenCalledWith(0, 19);
  });
});

describe('fetchReplies', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches replies for a parent comment', async () => {
    const replies = [{ id: 'r1', parent_comment_id: 'c1', body: 'reply' }];
    const mockOrder = jest.fn().mockResolvedValue({ data: replies, error: null });
    const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });

    const result = await fetchReplies('c1');
    expect(result).toEqual(replies);
    expect(mockEq).toHaveBeenCalledWith('parent_comment_id', 'c1');
  });

  it('throws on error', async () => {
    const mockOrder = jest.fn().mockResolvedValue({ data: null, error: new Error('fail') });
    const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });

    await expect(fetchReplies('c1')).rejects.toThrow('fail');
  });

  it('returns empty array when data is null', async () => {
    const mockOrder = jest.fn().mockResolvedValue({ data: null, error: null });
    const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });

    const result = await fetchReplies('c1');
    expect(result).toEqual([]);
  });
});

describe('addComment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('inserts a top-level comment', async () => {
    const newComment = { id: 'c2', body: 'Nice!', parent_comment_id: null };
    const mockSingle = jest.fn().mockResolvedValue({ data: newComment, error: null });
    const mockCommentSelect = jest.fn().mockReturnValue({ single: mockSingle });
    mockInsert.mockReturnValue({ select: mockCommentSelect });

    const result = await addComment('f1', 'u1', 'Nice!');
    expect(result).toEqual(newComment);
    expect(mockInsert).toHaveBeenCalledWith({
      feed_item_id: 'f1',
      user_id: 'u1',
      body: 'Nice!',
      parent_comment_id: null,
    });
  });

  it('inserts a reply with parentCommentId', async () => {
    const reply = { id: 'r1', body: '@User reply', parent_comment_id: 'c1' };
    const mockSingle = jest.fn().mockResolvedValue({ data: reply, error: null });
    const mockCommentSelect = jest.fn().mockReturnValue({ single: mockSingle });
    mockInsert.mockReturnValue({ select: mockCommentSelect });

    const result = await addComment('f1', 'u1', '@User reply', 'c1');
    expect(result).toEqual(reply);
    expect(mockInsert).toHaveBeenCalledWith({
      feed_item_id: 'f1',
      user_id: 'u1',
      body: '@User reply',
      parent_comment_id: 'c1',
    });
  });

  it('throws on error', async () => {
    const mockSingle = jest.fn().mockResolvedValue({ data: null, error: new Error('Insert error') });
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
