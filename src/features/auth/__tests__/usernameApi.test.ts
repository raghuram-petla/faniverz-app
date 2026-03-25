const mockMaybeSingle = jest.fn();
const mockEq = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockUpdateEqFn = jest.fn().mockResolvedValue({ error: null });
const mockUpdate = jest.fn(() => ({ eq: mockUpdateEqFn }));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: mockSelect,
      update: mockUpdate,
    })),
  },
}));

import { validateUsername, checkUsernameAvailable, setUsername } from '../usernameApi';

describe('validateUsername', () => {
  it('returns error for short username', () => {
    expect(validateUsername('ab')).toBe('Username must be at least 3 characters');
  });

  it('returns error for long username', () => {
    expect(validateUsername('a'.repeat(21))).toBe('Username must be 20 characters or less');
  });

  it('returns error for invalid characters', () => {
    expect(validateUsername('User Name!')).toBe('Only lowercase letters, numbers, and underscores');
  });

  it('returns null for valid username', () => {
    expect(validateUsername('telugu_fan_99')).toBeNull();
  });

  it('returns null for 3-char username', () => {
    expect(validateUsername('abc')).toBeNull();
  });
});

describe('checkUsernameAvailable', () => {
  it('returns true when username is available', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const result = await checkUsernameAvailable('new_user');
    expect(result).toBe(true);
  });

  it('returns false when username is taken', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: 'u1' }, error: null });
    const result = await checkUsernameAvailable('taken_user');
    expect(result).toBe(false);
  });

  it('throws on error', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: new Error('DB error') });
    await expect(checkUsernameAvailable('error_user')).rejects.toThrow('DB error');
  });
});

describe('setUsername', () => {
  it('throws for invalid username', async () => {
    await expect(setUsername('u1', 'ab')).rejects.toThrow('Username must be at least 3 characters');
  });

  it('calls update for valid username', async () => {
    mockUpdateEqFn.mockResolvedValue({ error: null });

    await setUsername('u1', 'valid_user');
    expect(mockUpdate).toHaveBeenCalledWith({ username: 'valid_user' });
    expect(mockUpdateEqFn).toHaveBeenCalledWith('id', 'u1');
  });

  it('throws when supabase update returns an error', async () => {
    mockUpdateEqFn.mockResolvedValue({ error: new Error('duplicate key') });

    await expect(setUsername('u1', 'valid_user')).rejects.toThrow('duplicate key');
  });
});
