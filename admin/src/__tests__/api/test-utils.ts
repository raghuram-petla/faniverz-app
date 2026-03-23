import type { NextRequest } from 'next/server';

/**
 * @contract Creates a mock NextRequest for API route testing.
 * @assumes body is JSON-serializable; auth header defaults to 'Bearer valid-token'.
 */
export function makeRequest(body: Record<string, unknown>, authHeader?: string): NextRequest {
  return {
    json: async () => body,
    headers: {
      get: (name: string) =>
        name === 'authorization' ? (authHeader ?? 'Bearer valid-token') : null,
    },
  } as unknown as NextRequest;
}

/**
 * @contract Standard vi.mock replacement for next/server NextResponse.
 * Use in vi.mock('next/server', () => nextResponseMock) at module level.
 */
export const nextResponseMock = {
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
      async json() {
        return body;
      },
    }),
  },
};

/**
 * @contract Creates a chainable Supabase mock that resolves with the given data.
 * Supports .select(), .eq(), .in(), .single(), .order(), .limit(), .range(), .neq(), .is(), .or()
 */
export function chainable(data: unknown = [], error: null | { message: string } = null) {
  const result = { data, error };
  const obj: Record<string, unknown> = {
    select: () => obj,
    eq: () => obj,
    neq: () => obj,
    in: () => obj,
    is: () => obj,
    or: () => obj,
    order: () => obj,
    limit: () => obj,
    range: () => obj,
    ilike: () => obj,
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    insert: () => obj,
    update: () => obj,
    delete: () => obj,
    upsert: () => obj,
    then: (fn: (v: typeof result) => void) => Promise.resolve(result).then(fn),
  };
  return obj;
}
