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
  PHOTO_VARIANTS: [{ suffix: '_sm', width: 200 }],
}));

import { POST } from '@/app/api/upload/actor-photo/route';

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

describe('POST /api/upload/actor-photo', () => {
  it('exports a POST handler created by createUploadHandler', () => {
    expect(POST).toBe(mockHandler);
  });

  it('is configured with the correct bucket', () => {
    expect(mockHandler._config.bucket).toBe('faniverz-actor-photos');
  });

  it('is configured with PHOTO_VARIANTS', () => {
    expect(mockHandler._config.variants).toEqual([{ suffix: '_sm', width: 200 }]);
  });

  it('is configured with the correct base URL env var', () => {
    expect(mockHandler._config.baseUrlEnvVar).toBe('R2_PUBLIC_BASE_URL_ACTORS');
  });

  it('is configured with the correct label', () => {
    expect(mockHandler._config.label).toBe('Actor photo');
  });

  it('delegates to the handler when called', async () => {
    mockHandler.mockResolvedValue({ status: 200 });
    const req = makeRequest();
    await POST(req);
    expect(mockHandler).toHaveBeenCalledWith(req);
  });
});
