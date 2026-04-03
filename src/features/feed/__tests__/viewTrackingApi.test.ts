jest.mock('@/lib/supabase', () => {
  const mockRpc = jest.fn();
  return {
    supabase: {
      rpc: mockRpc,
      __mocks: { mockRpc },
    },
  };
});

import { recordFeedViews } from '../viewTrackingApi';
import { supabase } from '@/lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { mockRpc } = (supabase as any).__mocks;

describe('recordFeedViews', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls supabase.rpc with correct function name and params', async () => {
    mockRpc.mockResolvedValue({ error: null });
    await recordFeedViews(['id-1', 'id-2']);
    expect(mockRpc).toHaveBeenCalledWith('record_feed_views', {
      p_feed_item_ids: ['id-1', 'id-2'],
    });
  });

  it('returns without throwing when RPC succeeds', async () => {
    mockRpc.mockResolvedValue({ error: null });
    await expect(recordFeedViews(['id-1'])).resolves.toBeUndefined();
  });

  it('logs console.warn and does not throw when RPC returns error', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    mockRpc.mockResolvedValue({ error: { message: 'DB error' } });
    await expect(recordFeedViews(['id-1'])).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      '[view-tracking] Failed to record feed views:',
      'DB error',
    );
    warnSpy.mockRestore();
  });

  it('does not call RPC when feedItemIds is empty', async () => {
    await recordFeedViews([]);
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
