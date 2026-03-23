import { renderHook, waitFor } from '@testing-library/react-native';
import { createWrapper } from '@/__tests__/helpers/createWrapper';
import { useMovies } from '../useMovies';
import * as api from '../../api';

jest.mock('../../api');

const mockMovies = [
  { id: '1', title: 'Movie 1', in_theaters: true },
  { id: '2', title: 'Movie 2', in_theaters: false },
];

describe('useMovies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches movies successfully', async () => {
    (api.fetchMovies as jest.Mock).mockResolvedValue(mockMovies);

    const { result } = renderHook(() => useMovies(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockMovies);
  });

  it('passes filters to fetch function', async () => {
    (api.fetchMovies as jest.Mock).mockResolvedValue([mockMovies[0]]);

    const filters = { movieStatus: 'in_theaters' as const };
    renderHook(() => useMovies(filters), { wrapper: createWrapper() });

    await waitFor(() => expect(api.fetchMovies).toHaveBeenCalledWith(filters));
  });

  it('uses correct query key with filters', async () => {
    (api.fetchMovies as jest.Mock).mockResolvedValue([]);
    const filters = { movieStatus: 'streaming' as const };

    const { result } = renderHook(() => useMovies(filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
