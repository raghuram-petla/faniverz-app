import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockHandler } = vi.hoisted(() => {
  const mockHandler = vi.fn() as ReturnType<typeof vi.fn> & { _config: Record<string, unknown> };
  return { mockHandler };
});

vi.mock('@/lib/upload-handler', () => ({
  createUploadHandler: (config: Record<string, unknown>) => {
    mockHandler._config = config;
    return mockHandler;
  },
}));

vi.mock('@/lib/image-resize', () => ({
  BACKDROP_VARIANTS: [{ suffix: '_md', width: 780 }],
}));

import { POST } from '@/app/api/upload/movie-backdrop/route';

function makeRequest(authHeader = 'Bearer valid-token') {
  return {
    headers: {
      get: (name: string) => (name === 'authorization' ? authHeader : null),
    },
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/upload/movie-backdrop', () => {
  it('exports a POST handler created by createUploadHandler', () => {
    expect(POST).toBe(mockHandler);
  });

  it('is configured with the correct bucket', () => {
    expect(mockHandler._config.bucket).toBe('faniverz-movie-backdrops');
  });

  it('is configured with BACKDROP_VARIANTS', () => {
    expect(mockHandler._config.variants).toEqual([{ suffix: '_md', width: 780 }]);
  });

  it('is configured with the correct base URL env var', () => {
    expect(mockHandler._config.baseUrlEnvVar).toBe('R2_PUBLIC_BASE_URL_BACKDROPS');
  });

  it('is configured with the correct label', () => {
    expect(mockHandler._config.label).toBe('Movie backdrop');
  });

  it('delegates to the handler when called', async () => {
    mockHandler.mockResolvedValue({ status: 200 });
    const req = makeRequest();
    await POST(req);
    expect(mockHandler).toHaveBeenCalledWith(req);
  });
});
