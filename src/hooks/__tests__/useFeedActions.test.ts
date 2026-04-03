const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/hooks/useAuthGate', () => ({
  useAuthGate: () => ({ gate: <T extends (...args: unknown[]) => unknown>(fn: T) => fn }),
}));

jest.mock('@/features/feed', () => ({
  useVoteFeedItem: jest.fn(),
  useRemoveFeedVote: jest.fn(),
  useFollowEntity: jest.fn(),
  useUnfollowEntity: jest.fn(),
}));

import { renderHook, act } from '@testing-library/react-native';
import { useFeedActions } from '../useFeedActions';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import {
  useVoteFeedItem,
  useRemoveFeedVote,
  useFollowEntity,
  useUnfollowEntity,
} from '@/features/feed';
import type { NewsFeedItem } from '@shared/types';

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseVoteFeedItem = useVoteFeedItem as jest.MockedFunction<typeof useVoteFeedItem>;
const mockUseRemoveFeedVote = useRemoveFeedVote as jest.MockedFunction<typeof useRemoveFeedVote>;
const mockUseFollowEntity = useFollowEntity as jest.MockedFunction<typeof useFollowEntity>;
const mockUseUnfollowEntity = useUnfollowEntity as jest.MockedFunction<typeof useUnfollowEntity>;

const mockVoteMutate = jest.fn();
const mockRemoveMutate = jest.fn();
const mockFollowMutate = jest.fn();
const mockUnfollowMutate = jest.fn();

function makeItem(overrides: Partial<NewsFeedItem> = {}): NewsFeedItem {
  return {
    id: 'item-1',
    feed_type: 'video',
    content_type: 'trailer',
    title: 'Test Item',
    description: null,
    movie_id: 'movie-1',
    source_table: 'movie_videos',
    source_id: 'src-1',
    thumbnail_url: null,
    youtube_id: null,
    is_pinned: false,
    is_featured: false,
    display_order: 0,
    upvote_count: 0,
    downvote_count: 0,
    view_count: 0,
    comment_count: 0,
    bookmark_count: 0,
    published_at: '2024-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    movie: { id: 'movie-1', title: 'Test Movie', poster_url: null, release_date: null },
    ...overrides,
  };
}

function setup(
  opts: {
    userVotes?: Record<string, 'up' | 'down'>;
    allItems?: NewsFeedItem[];
    followPending?: boolean;
    unfollowPending?: boolean;
    userId?: string;
  } = {},
) {
  const setCommentSheetItemId = jest.fn();
  const allItems = opts.allItems ?? [makeItem()];
  const userVotes = opts.userVotes ?? {};

  mockUseAuth.mockReturnValue({ user: { id: opts.userId ?? 'current-user' } } as ReturnType<
    typeof useAuth
  >);
  mockUseVoteFeedItem.mockReturnValue({ mutate: mockVoteMutate } as unknown as ReturnType<
    typeof useVoteFeedItem
  >);
  mockUseRemoveFeedVote.mockReturnValue({ mutate: mockRemoveMutate } as unknown as ReturnType<
    typeof useRemoveFeedVote
  >);
  mockUseFollowEntity.mockReturnValue({
    mutate: mockFollowMutate,
    isPending: opts.followPending ?? false,
  } as unknown as ReturnType<typeof useFollowEntity>);
  mockUseUnfollowEntity.mockReturnValue({
    mutate: mockUnfollowMutate,
    isPending: opts.unfollowPending ?? false,
  } as unknown as ReturnType<typeof useUnfollowEntity>);

  return renderHook(() => useFeedActions({ allItems, userVotes, setCommentSheetItemId })).result
    .current;
}

describe('useFeedActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('voting', () => {
    it('upvotes when no prior vote', () => {
      const actions = setup({ userVotes: {} });
      act(() => actions.gatedUpvote('item-1'));
      expect(mockVoteMutate).toHaveBeenCalledWith({
        feedItemId: 'item-1',
        voteType: 'up',
        previousVote: null,
      });
    });

    it('removes vote when already upvoted', () => {
      const actions = setup({ userVotes: { 'item-1': 'up' } });
      act(() => actions.gatedUpvote('item-1'));
      expect(mockRemoveMutate).toHaveBeenCalledWith({ feedItemId: 'item-1', previousVote: 'up' });
    });

    it('switches from down to up', () => {
      const actions = setup({ userVotes: { 'item-1': 'down' } });
      act(() => actions.gatedUpvote('item-1'));
      expect(mockVoteMutate).toHaveBeenCalledWith({
        feedItemId: 'item-1',
        voteType: 'up',
        previousVote: 'down',
      });
    });

    it('downvotes when no prior vote', () => {
      const actions = setup({ userVotes: {} });
      act(() => actions.gatedDownvote('item-1'));
      expect(mockVoteMutate).toHaveBeenCalledWith({
        feedItemId: 'item-1',
        voteType: 'down',
        previousVote: null,
      });
    });

    it('removes vote when already downvoted', () => {
      const actions = setup({ userVotes: { 'item-1': 'down' } });
      act(() => actions.gatedDownvote('item-1'));
      expect(mockRemoveMutate).toHaveBeenCalledWith({
        feedItemId: 'item-1',
        previousVote: 'down',
      });
    });

    it('switches from up to down', () => {
      const actions = setup({ userVotes: { 'item-1': 'up' } });
      act(() => actions.gatedDownvote('item-1'));
      expect(mockVoteMutate).toHaveBeenCalledWith({
        feedItemId: 'item-1',
        voteType: 'down',
        previousVote: 'up',
      });
    });
  });

  describe('share', () => {
    it('calls Share.share with item title', () => {
      const { Share: rn } = require('react-native');
      const shareSpy = jest.spyOn(rn, 'share').mockResolvedValue({ action: 'sharedAction' });
      const actions = setup({ allItems: [makeItem({ id: 'item-1', title: 'My Movie' })] });
      act(() => actions.handleShare('item-1'));
      expect(shareSpy).toHaveBeenCalledWith({
        message: 'My Movie — Check it out on Faniverz!',
      });
      shareSpy.mockRestore();
    });

    it('does nothing if item is not found', () => {
      const { Share: rn } = require('react-native');
      const shareSpy = jest.spyOn(rn, 'share').mockResolvedValue({ action: 'sharedAction' });
      const actions = setup({ allItems: [] });
      act(() => actions.handleShare('nonexistent'));
      expect(shareSpy).not.toHaveBeenCalled();
      shareSpy.mockRestore();
    });
  });

  describe('follow/unfollow', () => {
    it('calls followMutation when not pending', () => {
      const actions = setup({ followPending: false, unfollowPending: false });
      act(() => actions.gatedFollow('movie', 'movie-1'));
      expect(mockFollowMutate).toHaveBeenCalledWith({ entityType: 'movie', entityId: 'movie-1' });
    });

    it('calls follow even when another mutation is pending (idempotent)', () => {
      const actions = setup({ followPending: true });
      act(() => actions.gatedFollow('movie', 'movie-1'));
      expect(mockFollowMutate).toHaveBeenCalledWith({ entityType: 'movie', entityId: 'movie-1' });
    });

    it('calls unfollowMutation', () => {
      const actions = setup({ followPending: false, unfollowPending: false });
      act(() => actions.gatedUnfollow('movie', 'movie-1'));
      expect(mockUnfollowMutate).toHaveBeenCalledWith({ entityType: 'movie', entityId: 'movie-1' });
    });

    it('calls unfollow even when another mutation is pending (idempotent)', () => {
      const actions = setup({ unfollowPending: true });
      act(() => actions.gatedUnfollow('movie', 'movie-1'));
      expect(mockUnfollowMutate).toHaveBeenCalledWith({ entityType: 'movie', entityId: 'movie-1' });
    });
  });

  describe('navigation', () => {
    it('navigates to /post/:id on feed item press', () => {
      const actions = setup();
      act(() => actions.handleFeedItemPress(makeItem({ id: 'item-42' })));
      expect(mockPush).toHaveBeenCalledWith('/post/item-42');
    });

    it('navigates to /movie/:id for movie entity', () => {
      const actions = setup();
      act(() => actions.handleEntityPress('movie', 'movie-99'));
      expect(mockPush).toHaveBeenCalledWith('/movie/movie-99');
    });

    it('navigates to /actor/:id for actor entity', () => {
      const actions = setup();
      act(() => actions.handleEntityPress('actor', 'actor-1'));
      expect(mockPush).toHaveBeenCalledWith('/actor/actor-1');
    });

    it('navigates to /production-house/:id for production_house entity', () => {
      const actions = setup();
      act(() => actions.handleEntityPress('production_house', 'ph-1'));
      expect(mockPush).toHaveBeenCalledWith('/production-house/ph-1');
    });

    it('navigates to /profile when pressing own user entity', () => {
      const actions = setup({ userId: 'me' });
      act(() => actions.handleEntityPress('user', 'me'));
      expect(mockPush).toHaveBeenCalledWith('/profile');
    });

    it('navigates to /user/:id when pressing another user entity', () => {
      const actions = setup({ userId: 'me' });
      act(() => actions.handleEntityPress('user', 'other'));
      expect(mockPush).toHaveBeenCalledWith('/user/other');
    });
  });

  describe('comment', () => {
    it('calls setCommentSheetItemId with the item id', () => {
      const setCommentSheetItemId = jest.fn();
      mockUseAuth.mockReturnValue({ user: { id: 'u1' } } as ReturnType<typeof useAuth>);
      mockUseVoteFeedItem.mockReturnValue({ mutate: jest.fn() } as unknown as ReturnType<
        typeof useVoteFeedItem
      >);
      mockUseRemoveFeedVote.mockReturnValue({ mutate: jest.fn() } as unknown as ReturnType<
        typeof useRemoveFeedVote
      >);
      mockUseFollowEntity.mockReturnValue({
        mutate: jest.fn(),
        isPending: false,
      } as unknown as ReturnType<typeof useFollowEntity>);
      mockUseUnfollowEntity.mockReturnValue({
        mutate: jest.fn(),
        isPending: false,
      } as unknown as ReturnType<typeof useUnfollowEntity>);

      const { result } = renderHook(() =>
        useFeedActions({ allItems: [], userVotes: {}, setCommentSheetItemId }),
      );
      act(() => result.current.handleComment('item-7'));
      expect(setCommentSheetItemId).toHaveBeenCalledWith('item-7');
    });
  });
});
