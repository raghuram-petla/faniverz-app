import { renderHook, waitFor } from '@testing-library/react-native';
import { createWrapper } from '@/__tests__/helpers/createWrapper';
import { useMoviesByMonth } from '../useMoviesByMonth';
import * as api from '../../api';

jest.mock('../../api');

describe('useMoviesByMonth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches movies for the given year and month', async () => {
    const mockMovies = [{ id: '1', title: 'Test Movie' }];
    (api.fetchMoviesByMonth as jest.Mock).mockResolvedValue(mockMovies);

    const { result } = renderHook(() => useMoviesByMonth(2025, 3), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockMovies);
    expect(api.fetchMoviesByMonth).toHaveBeenCalledWith(2025, 3);
  });

  it('returns empty array when no movies exist', async () => {
    (api.fetchMoviesByMonth as jest.Mock).mockResolvedValue([]);

    const { result } = renderHook(() => useMoviesByMonth(2025, 0), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('handles fetch error', async () => {
    (api.fetchMoviesByMonth as jest.Mock).mockRejectedValue(new Error('Fetch failed'));

    const { result } = renderHook(() => useMoviesByMonth(2025, 5), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
