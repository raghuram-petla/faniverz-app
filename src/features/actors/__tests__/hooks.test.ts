import { renderHook, waitFor, act } from '@testing-library/react-native';
import { createWrapper } from '@/__tests__/helpers/createWrapper';
import {
  useFavoriteActors,
  useSearchActors,
  useFavoriteActorMutations,
  useActorDetail,
} from '../hooks';
import * as api from '../api';

jest.mock('../api');

jest.mock('@/i18n', () => ({ t: (key: string) => key }));

const mockFavorites = [
  { id: 'f1', user_id: 'u1', actor_id: 'a1', actor: { id: 'a1', name: 'Mahesh Babu' } },
  { id: 'f2', user_id: 'u1', actor_id: 'a2', actor: { id: 'a2', name: 'Prabhas' } },
];

const mockSearchResults = [
  { id: 'a1', name: 'Mahesh Babu' },
  { id: 'a3', name: 'Mahesh Manjrekar' },
];

describe('useFavoriteActors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches favorite actors for a user', async () => {
    (api.fetchFavoriteActors as jest.Mock).mockResolvedValue(mockFavorites);

    const { result } = renderHook(() => useFavoriteActors('u1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockFavorites);
    expect(api.fetchFavoriteActors).toHaveBeenCalledWith('u1');
  });

  it('does not fetch when userId is empty', async () => {
    const { result } = renderHook(() => useFavoriteActors(''), { wrapper: createWrapper() });

    expect(result.current.isFetching).toBe(false);
    expect(api.fetchFavoriteActors).not.toHaveBeenCalled();
  });
});

describe('useSearchActors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('searches actors when query is at least 2 characters', async () => {
    (api.searchActors as jest.Mock).mockResolvedValue(mockSearchResults);

    const { result } = renderHook(() => useSearchActors('ma'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockSearchResults);
    expect(api.searchActors).toHaveBeenCalledWith('ma');
  });

  it('does not fetch when query is less than 2 characters', async () => {
    const { result } = renderHook(() => useSearchActors('m'), { wrapper: createWrapper() });

    expect(result.current.isFetching).toBe(false);
    expect(api.searchActors).not.toHaveBeenCalled();
  });

  it('does not fetch when query is empty', async () => {
    const { result } = renderHook(() => useSearchActors(''), { wrapper: createWrapper() });

    expect(result.current.isFetching).toBe(false);
    expect(api.searchActors).not.toHaveBeenCalled();
  });
});

describe('useActorDetail', () => {
  const mockActor = { id: 'a1', name: 'Allu Arjun', biography: 'Actor', photo_url: null };
  const mockFilmography = [{ id: 'm1', title: 'Pushpa', role: 'Lead' }];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns actor and filmography when both queries succeed', async () => {
    (api.fetchActorById as jest.Mock).mockResolvedValue(mockActor);
    (api.fetchActorFilmography as jest.Mock).mockResolvedValue(mockFilmography);

    const { result } = renderHook(() => useActorDetail('a1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.actor).toEqual(mockActor);
    expect(result.current.filmography).toEqual(mockFilmography);
  });

  it('returns null actor and empty filmography when not loaded yet', () => {
    (api.fetchActorById as jest.Mock).mockResolvedValue(mockActor);
    (api.fetchActorFilmography as jest.Mock).mockResolvedValue(mockFilmography);

    const { result } = renderHook(() => useActorDetail('a1'), { wrapper: createWrapper() });

    // Initially loading — actor is null, filmography is []
    expect(result.current.actor).toBeNull();
    expect(result.current.filmography).toEqual([]);
  });

  it('isLoading is true while either query is pending', () => {
    (api.fetchActorById as jest.Mock).mockImplementation(() => new Promise(() => {}));
    (api.fetchActorFilmography as jest.Mock).mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useActorDetail('a1'), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
  });

  it('does not fetch when id is empty', async () => {
    (api.fetchActorById as jest.Mock).mockResolvedValue(mockActor);
    (api.fetchActorFilmography as jest.Mock).mockResolvedValue(mockFilmography);

    const { result } = renderHook(() => useActorDetail(''), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(api.fetchActorById).not.toHaveBeenCalled();
    expect(api.fetchActorFilmography).not.toHaveBeenCalled();
  });

  it('calls refetch for both queries', async () => {
    (api.fetchActorById as jest.Mock).mockResolvedValue(mockActor);
    (api.fetchActorFilmography as jest.Mock).mockResolvedValue(mockFilmography);

    const { result } = renderHook(() => useActorDetail('a1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Call refetch — should not throw
    await act(async () => {
      await result.current.refetch();
    });
    expect(api.fetchActorById).toHaveBeenCalledTimes(2);
    expect(api.fetchActorFilmography).toHaveBeenCalledTimes(2);
  });

  it('exposes refetch function', () => {
    (api.fetchActorById as jest.Mock).mockResolvedValue(mockActor);
    (api.fetchActorFilmography as jest.Mock).mockResolvedValue(mockFilmography);

    const { result } = renderHook(() => useActorDetail('a1'), { wrapper: createWrapper() });
    expect(typeof result.current.refetch).toBe('function');
  });
});

describe('useFavoriteActorMutations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes add and remove mutations', () => {
    const { result } = renderHook(() => useFavoriteActorMutations(), {
      wrapper: createWrapper(),
    });

    expect(result.current.add).toBeDefined();
    expect(result.current.remove).toBeDefined();
  });

  it('add mutation calls addFavoriteActor', async () => {
    (api.addFavoriteActor as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useFavoriteActorMutations(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.add.mutate({ userId: 'u1', actorId: 'a1' });
    });

    await waitFor(() => expect(result.current.add.isSuccess).toBe(true));
    expect(api.addFavoriteActor).toHaveBeenCalledWith('u1', 'a1');
  });

  it('remove mutation calls removeFavoriteActor', async () => {
    (api.removeFavoriteActor as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useFavoriteActorMutations(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.remove.mutate({ userId: 'u1', actorId: 'a1' });
    });

    await waitFor(() => expect(result.current.remove.isSuccess).toBe(true));
    expect(api.removeFavoriteActor).toHaveBeenCalledWith('u1', 'a1');
  });

  it('shows alert when add mutation fails', async () => {
    const alertSpy = jest
      .spyOn(require('react-native').Alert, 'alert')
      .mockImplementation(() => {});
    (api.addFavoriteActor as jest.Mock).mockRejectedValue(new Error('add failed'));

    const { result } = renderHook(() => useFavoriteActorMutations(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.add.mutate({ userId: 'u1', actorId: 'a1' });
    });

    await waitFor(() => expect(result.current.add.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('shows alert when remove mutation fails', async () => {
    const alertSpy = jest
      .spyOn(require('react-native').Alert, 'alert')
      .mockImplementation(() => {});
    (api.removeFavoriteActor as jest.Mock).mockRejectedValue(new Error('remove failed'));

    const { result } = renderHook(() => useFavoriteActorMutations(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.remove.mutate({ userId: 'u1', actorId: 'a1' });
    });

    await waitFor(() => expect(result.current.remove.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
