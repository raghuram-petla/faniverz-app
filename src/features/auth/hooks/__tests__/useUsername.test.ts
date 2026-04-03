jest.mock('@/i18n', () => ({ t: (key: string) => key }));

jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: jest.fn(() => ({ user: { id: 'u1' } })),
}));

jest.mock('../../usernameApi', () => ({
  checkUsernameAvailable: jest.fn(),
  setUsername: jest.fn(),
  validateUsername: jest.fn(),
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useCheckUsername, useSetUsername } from '../useUsername';
import { checkUsernameAvailable, validateUsername } from '../../usernameApi';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { createWrapper } from '@/__tests__/helpers/createWrapper';

describe('useCheckUsername', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns null availability for empty string', () => {
    (validateUsername as jest.Mock).mockReturnValue('Username must be at least 3 characters');
    const { result } = renderHook(() => useCheckUsername(''));
    expect(result.current.isAvailable).toBeNull();
  });

  it('returns validation error for short username', () => {
    (validateUsername as jest.Mock).mockReturnValue('Username must be at least 3 characters');
    const { result } = renderHook(() => useCheckUsername('ab'));
    expect(result.current.error).toBe('Username must be at least 3 characters');
  });

  it('checks availability after debounce for valid username', async () => {
    (validateUsername as jest.Mock).mockReturnValue(null);
    (checkUsernameAvailable as jest.Mock).mockResolvedValue(true);

    const { result } = renderHook(() => useCheckUsername('valid_user'));

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => expect(result.current.isAvailable).toBe(true));
  });

  it('sets error when username is taken', async () => {
    (validateUsername as jest.Mock).mockReturnValue(null);
    (checkUsernameAvailable as jest.Mock).mockResolvedValue(false);

    const { result } = renderHook(() => useCheckUsername('taken_user'));

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => expect(result.current.error).toBe('common.usernameTaken'));
  });

  it('sets error when availability check throws', async () => {
    (validateUsername as jest.Mock).mockReturnValue(null);
    (checkUsernameAvailable as jest.Mock).mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useCheckUsername('valid_user'));

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => expect(result.current.error).toBe('common.failedToCheckAvailability'));
    expect(result.current.isAvailable).toBeNull();
  });

  it('resets isChecking when validation error occurs', () => {
    (validateUsername as jest.Mock).mockReturnValue('Too short');
    const { result } = renderHook(() => useCheckUsername('ab'));
    expect(result.current.isChecking).toBe(false);
  });

  it('resets state when username becomes empty after being non-empty', async () => {
    (validateUsername as jest.Mock).mockReturnValue(null);
    (checkUsernameAvailable as jest.Mock).mockResolvedValue(true);

    const { result, rerender } = renderHook(
      ({ username }: { username: string }) => useCheckUsername(username),
      { initialProps: { username: 'valid_user' } },
    );

    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    await waitFor(() => expect(result.current.isAvailable).toBe(true));

    // Now set to empty — validateUsername returns null but username is falsy
    (validateUsername as jest.Mock).mockReturnValue(null);
    rerender({ username: '' });

    expect(result.current.isAvailable).toBeNull();
    expect(result.current.isChecking).toBe(false);
  });

  it('ignores stale error when username changes before check fails', async () => {
    (validateUsername as jest.Mock).mockReturnValue(null);
    let rejectFirst: (err: Error) => void;
    const firstPromise = new Promise<boolean>((_, reject) => {
      rejectFirst = reject;
    });
    (checkUsernameAvailable as jest.Mock)
      .mockReturnValueOnce(firstPromise)
      .mockResolvedValueOnce(true);

    const { result, rerender } = renderHook(
      ({ username }: { username: string }) => useCheckUsername(username),
      { initialProps: { username: 'first_user' } },
    );

    // Advance to trigger first debounced request
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    // Change username — invalidates the pending request
    rerender({ username: 'second_user' });

    // Advance to trigger second debounced request
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    // Now reject the first (stale) request — should be ignored
    await act(async () => {
      rejectFirst!(new Error('network fail'));
    });

    // State should reflect second request result
    await waitFor(() => expect(result.current.isAvailable).toBe(true));
    expect(result.current.error).toBeNull();
  });

  it('ignores stale response when username changes before check completes', async () => {
    (validateUsername as jest.Mock).mockReturnValue(null);
    // First call resolves slowly, second call resolves before first advances
    let resolveFirst: (v: boolean) => void;
    const firstPromise = new Promise<boolean>((res) => {
      resolveFirst = res;
    });
    (checkUsernameAvailable as jest.Mock)
      .mockReturnValueOnce(firstPromise)
      .mockResolvedValueOnce(true);

    const { result, rerender } = renderHook(
      ({ username }: { username: string }) => useCheckUsername(username),
      { initialProps: { username: 'first_user' } },
    );

    // Advance timer to start first debounced request
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    // Change username — invalidates the pending request
    rerender({ username: 'second_user' });

    // Advance timer to start second debounced request
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    // Now resolve the first (now stale) request — should be ignored
    await act(async () => {
      resolveFirst!(false);
    });

    // State should reflect the second (current) request result
    await waitFor(() => expect(result.current.isAvailable).toBe(true));
  });
});

describe('useSetUsername', () => {
  it('returns a mutation function', () => {
    const { result } = renderHook(() => useSetUsername(), { wrapper: createWrapper() });
    expect(result.current.mutateAsync).toBeDefined();
  });

  it('mutates successfully and calls setUsername with correct args', async () => {
    const { setUsername } = require('../../usernameApi');
    (setUsername as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useSetUsername(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate('newname');
    });

    await waitFor(() => expect(setUsername).toHaveBeenCalledWith('u1', 'newname'));
  });

  it('throws error and shows Alert when mutation fails', async () => {
    const { setUsername } = require('../../usernameApi');
    (setUsername as jest.Mock).mockRejectedValue(new Error('Username already exists'));

    const { Alert } = require('react-native');
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useSetUsername(), { wrapper: createWrapper() });

    await act(async () => {
      try {
        await result.current.mutateAsync('taken');
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    alertSpy.mockRestore();
  });

  it('throws when user is not logged in', async () => {
    (useAuth as jest.Mock).mockReturnValueOnce({ user: null });
    const { result } = renderHook(() => useSetUsername(), { wrapper: createWrapper() });

    await act(async () => {
      try {
        await result.current.mutateAsync('someuser');
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('shows Alert with fallback message when error has no message', async () => {
    const { setUsername } = require('../../usernameApi');
    const errorWithoutMessage = new Error('');
    errorWithoutMessage.message = '';
    (setUsername as jest.Mock).mockRejectedValue(errorWithoutMessage);

    const { Alert } = require('react-native');
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useSetUsername(), { wrapper: createWrapper() });

    await act(async () => {
      try {
        await result.current.mutateAsync('someuser');
      } catch {
        // expected
      }
    });

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith('common.error', 'common.failedToSetUsername'),
    );
    alertSpy.mockRestore();
  });
});
