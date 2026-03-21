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
  AVATAR_VARIANTS: [{ suffix: '_sm', width: 100 }],
}));

import { POST } from '@/app/api/upload/profile-avatar/route';

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

describe('POST /api/upload/profile-avatar', () => {
  it('exports a POST handler created by createUploadHandler', () => {
    expect(POST).toBe(mockHandler);
  });

  it('is configured with the correct bucket', () => {
    expect(mockHandler._config.bucket).toBe('faniverz-profile-avatars');
  });

  it('is configured with AVATAR_VARIANTS', () => {
    expect(mockHandler._config.variants).toEqual([{ suffix: '_sm', width: 100 }]);
  });

  it('is configured with the correct base URL env var', () => {
    expect(mockHandler._config.baseUrlEnvVar).toBe('R2_PUBLIC_BASE_URL_AVATARS');
  });

  it('is configured with the correct label', () => {
    expect(mockHandler._config.label).toBe('Profile avatar');
  });

  it('delegates to the handler when called', async () => {
    mockHandler.mockResolvedValue({ status: 200 });
    const req = makeRequest();
    await POST(req);
    expect(mockHandler).toHaveBeenCalledWith(req);
  });
});
