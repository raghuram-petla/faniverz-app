import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockS3Client = vi.fn();

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {
    constructor(opts: Record<string, unknown>) {
      mockS3Client(opts);
    }
  },
}));

import { getR2Client } from '@/lib/r2-client';

describe('getR2Client', () => {
  beforeEach(() => {
    mockS3Client.mockReset();
    vi.unstubAllEnvs();
  });

  it('returns null when R2_ACCESS_KEY_ID is missing', () => {
    vi.stubEnv('R2_ACCESS_KEY_ID', '');
    vi.stubEnv('R2_SECRET_ACCESS_KEY', 'secret');

    expect(getR2Client()).toBeNull();
    expect(mockS3Client).not.toHaveBeenCalled();
  });

  it('returns null when R2_SECRET_ACCESS_KEY is missing', () => {
    vi.stubEnv('R2_ACCESS_KEY_ID', 'key');
    vi.stubEnv('R2_SECRET_ACCESS_KEY', '');

    expect(getR2Client()).toBeNull();
    expect(mockS3Client).not.toHaveBeenCalled();
  });

  it('returns null when both credentials are missing', () => {
    vi.stubEnv('R2_ACCESS_KEY_ID', '');
    vi.stubEnv('R2_SECRET_ACCESS_KEY', '');

    expect(getR2Client()).toBeNull();
  });

  it('uses Cloudflare R2 endpoint when R2_ENDPOINT is not set', () => {
    vi.stubEnv('R2_ACCESS_KEY_ID', 'my-key');
    vi.stubEnv('R2_SECRET_ACCESS_KEY', 'my-secret');
    vi.stubEnv('R2_ACCOUNT_ID', 'abc123');
    vi.stubEnv('R2_ENDPOINT', '');

    const client = getR2Client();
    expect(client).not.toBeNull();
    expect(mockS3Client).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'https://abc123.r2.cloudflarestorage.com',
        forcePathStyle: false,
        region: 'auto',
        credentials: { accessKeyId: 'my-key', secretAccessKey: 'my-secret' },
      }),
    );
  });

  it('uses custom endpoint when R2_ENDPOINT is set (MinIO)', () => {
    vi.stubEnv('R2_ACCESS_KEY_ID', 'minioadmin');
    vi.stubEnv('R2_SECRET_ACCESS_KEY', 'minioadmin');
    vi.stubEnv('R2_ENDPOINT', 'http://localhost:9000');

    const client = getR2Client();
    expect(client).not.toBeNull();
    expect(mockS3Client).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'http://localhost:9000',
        forcePathStyle: true,
        region: 'auto',
        credentials: { accessKeyId: 'minioadmin', secretAccessKey: 'minioadmin' },
      }),
    );
  });
});
