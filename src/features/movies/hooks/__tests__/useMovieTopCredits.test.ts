import { renderHook, waitFor } from '@testing-library/react-native';
import { createWrapper } from '@/__tests__/helpers/createWrapper';
import { useMovieTopCredits } from '../useMovieTopCredits';
import * as api from '../../api';

jest.mock('../../api');

const mockCredits = [
  { id: 'c1', credit_type: 'cast', actor: { id: 'a1', name: 'Actor 1' } },
  { id: 'cr1', credit_type: 'crew', actor: { id: 'a2', name: 'Director' } },
];

describe('useMovieTopCredits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches top credits when movieId is provided', async () => {
    (api.fetchMovieTopCredits as jest.Mock).mockResolvedValue(mockCredits);

    const { result } = renderHook(() => useMovieTopCredits('m1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockCredits);
    expect(api.fetchMovieTopCredits).toHaveBeenCalledWith('m1');
  });

  it('does not fetch when movieId is null', () => {
    const { result } = renderHook(() => useMovieTopCredits(null), { wrapper: createWrapper() });

    expect(result.current.isFetching).toBe(false);
    expect(api.fetchMovieTopCredits).not.toHaveBeenCalled();
  });

  it('handles error state', async () => {
    (api.fetchMovieTopCredits as jest.Mock).mockRejectedValue(new Error('Failed'));

    const { result } = renderHook(() => useMovieTopCredits('m1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });
});
