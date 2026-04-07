import { Platform, Share } from 'react-native';
import { shareContent, type ShareContentParams } from '../shareContent';

jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });

beforeEach(() => jest.clearAllMocks());

const base: ShareContentParams = { type: 'movie', id: '123', title: 'Test Movie' };

describe('shareContent', () => {
  it('builds correct URL for each content type', async () => {
    const types = ['movie', 'actor', 'production-house', 'post', 'user'] as const;
    for (const type of types) {
      await shareContent({ ...base, type, id: '42' });
      const call = (Share.share as jest.Mock).mock.calls.at(-1)![0];
      const msg: string = call.message ?? '';
      const url: string = call.url ?? msg;
      expect(url).toContain(`https://faniverz.com/${type}/42`);
    }
  });

  it('includes title in message', async () => {
    await shareContent(base);
    const { message } = (Share.share as jest.Mock).mock.calls[0][0];
    expect(message).toContain('Test Movie');
    expect(message).toContain('Check it out on Faniverz!');
  });

  it('includes subtitle when provided', async () => {
    await shareContent({ ...base, subtitle: '2024' });
    const { message } = (Share.share as jest.Mock).mock.calls[0][0];
    expect(message).toContain('Test Movie (2024)');
  });

  it('includes rating when provided', async () => {
    await shareContent({ ...base, rating: '4.5★' });
    const { message } = (Share.share as jest.Mock).mock.calls[0][0];
    expect(message).toContain('4.5★');
  });

  it('includes both subtitle and rating', async () => {
    await shareContent({ ...base, subtitle: '2024', rating: '4.5★' });
    const { message } = (Share.share as jest.Mock).mock.calls[0][0];
    expect(message).toContain('Test Movie (2024) — 4.5★');
  });

  it('passes url separately on iOS', async () => {
    const original = Platform.OS;
    (Platform as { OS: string }).OS = 'ios';
    await shareContent(base);
    const call = (Share.share as jest.Mock).mock.calls[0][0];
    expect(call.url).toBe('https://faniverz.com/movie/123');
    expect(call.message).not.toContain('https://');
    (Platform as { OS: string }).OS = original;
  });

  it('appends url to message on Android', async () => {
    const original = Platform.OS;
    (Platform as { OS: string }).OS = 'android';
    await shareContent(base);
    const call = (Share.share as jest.Mock).mock.calls[0][0];
    expect(call.url).toBeUndefined();
    expect(call.message).toContain('https://faniverz.com/movie/123');
    (Platform as { OS: string }).OS = original;
  });

  it('swallows share cancellation errors on iOS', async () => {
    const original = Platform.OS;
    (Platform as { OS: string }).OS = 'ios';
    (Share.share as jest.Mock).mockRejectedValueOnce(new Error('User cancelled'));
    await expect(shareContent(base)).resolves.toBeUndefined();
    (Platform as { OS: string }).OS = original;
  });

  it('swallows share cancellation errors on Android', async () => {
    const original = Platform.OS;
    (Platform as { OS: string }).OS = 'android';
    (Share.share as jest.Mock).mockRejectedValueOnce(new Error('User cancelled'));
    await expect(shareContent(base)).resolves.toBeUndefined();
    (Platform as { OS: string }).OS = original;
  });
});
