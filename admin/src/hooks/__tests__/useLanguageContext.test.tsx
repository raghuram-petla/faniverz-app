import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ─── Mocks before imports ───
const mockGetSession = vi.fn();
vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

const mockUseEffectiveUser = vi.fn();
vi.mock('@/hooks/useImpersonation', () => ({
  useEffectiveUser: () => mockUseEffectiveUser(),
}));

const mockLocalStorage: Record<string, string> = {};
beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(mockLocalStorage).forEach((k) => delete mockLocalStorage[k]);
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (k: string) => mockLocalStorage[k] ?? null,
      setItem: (k: string, v: string) => {
        mockLocalStorage[k] = v;
      },
      removeItem: (k: string) => {
        delete mockLocalStorage[k];
      },
    },
    writable: true,
    configurable: true,
  });
  mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } });
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
});

import { LanguageProvider, useLanguageContext } from '@/hooks/useLanguageContext';

const LANGUAGES = [
  { id: 'lang-te', code: 'te', name: 'Telugu', display_order: 1 },
  { id: 'lang-hi', code: 'hi', name: 'Hindi', display_order: 2 },
  { id: 'lang-ta', code: 'ta', name: 'Tamil', display_order: 3 },
];

function makeWrapper(languages = LANGUAGES) {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => languages });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <LanguageProvider>{children}</LanguageProvider>
    </QueryClientProvider>
  );
  return Wrapper;
}

function Consumer() {
  const ctx = useLanguageContext();
  return (
    <div>
      <span data-testid="selected-id">{ctx.selectedLanguageId ?? 'null'}</span>
      <span data-testid="selected-code">{ctx.selectedLanguageCode ?? 'null'}</span>
      <span data-testid="show-switcher">{String(ctx.showSwitcher)}</span>
      <span data-testid="lang-count">{ctx.languages.length}</span>
      <span data-testid="available-count">{ctx.availableLanguages.length}</span>
      <button onClick={() => ctx.setSelectedLanguageId('lang-hi')} data-testid="select-hi">
        Select Hi
      </button>
      <button onClick={() => ctx.setSelectedLanguageId(null)} data-testid="select-null">
        Select All
      </button>
    </div>
  );
}

describe('useLanguageContext — null user', () => {
  it('returns empty defaults when user is null', async () => {
    mockUseEffectiveUser.mockReturnValue(null);
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('selected-id').textContent).toBe('null');
      expect(screen.getByTestId('show-switcher').textContent).toBe('false');
    });
  });
});

describe('useLanguageContext — super_admin role', () => {
  it('does not auto-select a language (null = all)', async () => {
    mockUseEffectiveUser.mockReturnValue({ role: 'super_admin', languageIds: [] });
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('selected-id').textContent).toBe('null');
    });
  });

  it('shows switcher for super_admin', async () => {
    mockUseEffectiveUser.mockReturnValue({ role: 'super_admin', languageIds: [] });
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('show-switcher').textContent).toBe('true');
    });
  });

  it('availableLanguages = all languages for super_admin', async () => {
    mockUseEffectiveUser.mockReturnValue({ role: 'super_admin', languageIds: [] });
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('available-count').textContent).toBe('3');
    });
  });

  it('restores selectedLanguageId from localStorage for super_admin', async () => {
    mockLocalStorage['faniverz-admin-selected-language'] = 'lang-hi';
    mockUseEffectiveUser.mockReturnValue({ role: 'super_admin', languageIds: [] });
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('selected-id').textContent).toBe('lang-hi');
    });
  });

  it('selectedLanguageCode derived from selectedLanguageId', async () => {
    mockLocalStorage['faniverz-admin-selected-language'] = 'lang-te';
    mockUseEffectiveUser.mockReturnValue({ role: 'super_admin', languageIds: [] });
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('selected-code').textContent).toBe('te');
    });
  });

  it('setSelectedLanguageId saves to localStorage', async () => {
    mockUseEffectiveUser.mockReturnValue({ role: 'super_admin', languageIds: [] });
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );
    await waitFor(() => expect(screen.getByTestId('show-switcher').textContent).toBe('true'));

    act(() => {
      screen.getByTestId('select-hi').click();
    });
    expect(mockLocalStorage['faniverz-admin-selected-language']).toBe('lang-hi');
  });

  it('setSelectedLanguageId removes from localStorage when null', async () => {
    mockLocalStorage['faniverz-admin-selected-language'] = 'lang-te';
    mockUseEffectiveUser.mockReturnValue({ role: 'super_admin', languageIds: [] });
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );
    await waitFor(() => expect(screen.getByTestId('show-switcher').textContent).toBe('true'));

    act(() => {
      screen.getByTestId('select-null').click();
    });
    expect(mockLocalStorage['faniverz-admin-selected-language']).toBeUndefined();
  });
});

describe('useLanguageContext — admin role with 1 language', () => {
  it('auto-selects the single language', async () => {
    mockUseEffectiveUser.mockReturnValue({ role: 'admin', languageIds: ['lang-te'] });
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('selected-id').textContent).toBe('lang-te');
    });
  });

  it('does not show switcher for single-language admin', async () => {
    mockUseEffectiveUser.mockReturnValue({ role: 'admin', languageIds: ['lang-te'] });
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('show-switcher').textContent).toBe('false');
    });
  });

  it('availableLanguages filtered to assigned only', async () => {
    mockUseEffectiveUser.mockReturnValue({ role: 'admin', languageIds: ['lang-te'] });
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('available-count').textContent).toBe('1');
    });
  });
});

describe('useLanguageContext — admin role with 2+ languages', () => {
  it('shows switcher for multi-language admin', async () => {
    mockUseEffectiveUser.mockReturnValue({ role: 'admin', languageIds: ['lang-te', 'lang-hi'] });
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('show-switcher').textContent).toBe('true');
    });
  });

  it('defaults to first language when no stored value', async () => {
    mockUseEffectiveUser.mockReturnValue({ role: 'admin', languageIds: ['lang-te', 'lang-hi'] });
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('selected-id').textContent).toBe('lang-te');
    });
  });

  it('restores valid stored language for multi-language admin', async () => {
    mockLocalStorage['faniverz-admin-selected-language'] = 'lang-hi';
    mockUseEffectiveUser.mockReturnValue({ role: 'admin', languageIds: ['lang-te', 'lang-hi'] });
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('selected-id').textContent).toBe('lang-hi');
    });
  });

  it('falls back to first language if stored value not in user languages', async () => {
    mockLocalStorage['faniverz-admin-selected-language'] = 'lang-ta'; // not in languageIds
    mockUseEffectiveUser.mockReturnValue({ role: 'admin', languageIds: ['lang-te', 'lang-hi'] });
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('selected-id').textContent).toBe('lang-te');
    });
  });
});

describe('useLanguageContext — root role', () => {
  it('shows switcher for root role', async () => {
    mockUseEffectiveUser.mockReturnValue({ role: 'root', languageIds: [] });
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('show-switcher').textContent).toBe('true');
    });
  });

  it('availableLanguages = all languages for root', async () => {
    mockUseEffectiveUser.mockReturnValue({ role: 'root', languageIds: [] });
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('available-count').textContent).toBe('3');
    });
  });

  it('defaults to null (all languages) for root', async () => {
    mockUseEffectiveUser.mockReturnValue({ role: 'root', languageIds: [] });
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('selected-id').textContent).toBe('null');
    });
  });
});

describe('useLanguageContext — selectedLanguageCode fallback', () => {
  it('returns null code when selectedLanguageId does not match any language', async () => {
    mockLocalStorage['faniverz-admin-selected-language'] = 'lang-nonexistent';
    mockUseEffectiveUser.mockReturnValue({ role: 'super_admin', languageIds: [] });
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('selected-id').textContent).toBe('lang-nonexistent');
      expect(screen.getByTestId('selected-code').textContent).toBe('null');
    });
  });
});

describe('useLanguageContext — viewer role (not admin or super_admin)', () => {
  it('does not show switcher for viewer role', async () => {
    mockUseEffectiveUser.mockReturnValue({ role: 'viewer', languageIds: [] });
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('show-switcher').textContent).toBe('false');
    });
  });
});

describe('useLanguageContext — fetchLanguages', () => {
  it('returns empty array when fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => null });
    mockUseEffectiveUser.mockReturnValue({ role: 'super_admin', languageIds: [] });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>
        <LanguageProvider>{children}</LanguageProvider>
      </QueryClientProvider>
    );
    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('lang-count').textContent).toBe('0');
    });
  });

  it('throws when session is missing (getAccessToken)', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockUseEffectiveUser.mockReturnValue({ role: 'super_admin', languageIds: [] });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>
        <LanguageProvider>{children}</LanguageProvider>
      </QueryClientProvider>
    );
    // Should not crash
    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('lang-count').textContent).toBe('0');
    });
  });
});
