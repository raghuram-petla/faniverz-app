import { renderHook, act } from '@testing-library/react-native';
import { getMovieActionType, useMovieAction } from '../useMovieAction';

const mockFollowMutate = jest.fn();
const mockUnfollowMutate = jest.fn();
const mockAddMutate = jest.fn();
const mockRemoveMutate = jest.fn();

let mockFollowSet = new Set<string>();
let mockWatchlistSet = new Set<string>();

jest.mock('@shared/movieStatus', () => ({
  deriveMovieStatus: jest.fn((_movie, platformCount) =>
    platformCount > 0 ? 'streaming' : 'upcoming',
  ),
}));

jest.mock('@/features/feed', () => ({
  useEntityFollows: () => ({ followSet: mockFollowSet }),
  useFollowEntity: () => ({ mutate: mockFollowMutate }),
  useUnfollowEntity: () => ({ mutate: mockUnfollowMutate }),
}));

jest.mock('@/features/watchlist/hooks', () => ({
  useWatchlistSet: () => ({ watchlistSet: mockWatchlistSet }),
  useWatchlistMutations: () => ({
    add: { mutate: mockAddMutate },
    remove: { mutate: mockRemoveMutate },
  }),
}));

jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

jest.mock('@/hooks/useAuthGate', () => ({
  useAuthGate: () => ({
    gate: <T extends Function>(fn: T) => fn,
    isAuthenticated: true,
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockFollowSet = new Set<string>();
  mockWatchlistSet = new Set<string>();
});

describe('getMovieActionType', () => {
  it('returns follow for non-streaming statuses', () => {
    expect(getMovieActionType('announced')).toBe('follow');
    expect(getMovieActionType('upcoming')).toBe('follow');
    expect(getMovieActionType('in_theaters')).toBe('follow');
    expect(getMovieActionType('released')).toBe('follow');
  });

  it('returns watchlist for streaming status', () => {
    expect(getMovieActionType('streaming')).toBe('watchlist');
  });
});

describe('useMovieAction', () => {
  const preOttMovie = { id: 'm1', release_date: '2099-01-01', in_theaters: false };
  const streamingMovie = { id: 'm2', release_date: '2020-01-01', in_theaters: false };

  it('returns follow actionType for pre-OTT movie', () => {
    const { result } = renderHook(() => useMovieAction(preOttMovie, 0));
    expect(result.current.actionType).toBe('follow');
    expect(result.current.iconName).toBe('heart-outline');
    expect(result.current.label).toBe('Follow');
  });

  it('returns watchlist actionType for streaming movie', () => {
    const { result } = renderHook(() => useMovieAction(streamingMovie, 2));
    expect(result.current.actionType).toBe('watchlist');
    expect(result.current.iconName).toBe('bookmark-outline');
    expect(result.current.label).toBe('Save');
  });

  it('returns isActive true when following a pre-OTT movie', () => {
    mockFollowSet = new Set(['movie:m1']);
    const { result } = renderHook(() => useMovieAction(preOttMovie, 0));
    expect(result.current.isActive).toBe(true);
    expect(result.current.iconNameActive).toBe('heart');
    expect(result.current.labelActive).toBe('Following');
  });

  it('returns isActive true when streaming movie is watchlisted', () => {
    mockWatchlistSet = new Set(['m2']);
    const { result } = renderHook(() => useMovieAction(streamingMovie, 2));
    expect(result.current.isActive).toBe(true);
    expect(result.current.iconNameActive).toBe('bookmark');
    expect(result.current.labelActive).toBe('Saved');
  });

  it('returns isActive false when not following or watchlisted', () => {
    const { result } = renderHook(() => useMovieAction(preOttMovie, 0));
    expect(result.current.isActive).toBe(false);
  });

  it('calls followEntity on press for pre-OTT movie', () => {
    const { result } = renderHook(() => useMovieAction(preOttMovie, 0));
    act(() => result.current.onPress());
    expect(mockFollowMutate).toHaveBeenCalledWith({ entityType: 'movie', entityId: 'm1' });
  });

  it('calls unfollowEntity on press when already following', () => {
    mockFollowSet = new Set(['movie:m1']);
    const { result } = renderHook(() => useMovieAction(preOttMovie, 0));
    act(() => result.current.onPress());
    expect(mockUnfollowMutate).toHaveBeenCalledWith({ entityType: 'movie', entityId: 'm1' });
  });

  it('calls addToWatchlist on press for streaming movie', () => {
    const { result } = renderHook(() => useMovieAction(streamingMovie, 2));
    act(() => result.current.onPress());
    expect(mockAddMutate).toHaveBeenCalledWith({ userId: 'u1', movieId: 'm2' });
  });

  it('calls removeFromWatchlist on press when already watchlisted', () => {
    mockWatchlistSet = new Set(['m2']);
    const { result } = renderHook(() => useMovieAction(streamingMovie, 2));
    act(() => result.current.onPress());
    expect(mockRemoveMutate).toHaveBeenCalledWith({ userId: 'u1', movieId: 'm2' });
  });
});
