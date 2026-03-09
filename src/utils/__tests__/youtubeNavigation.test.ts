import { Linking, Share } from 'react-native';
import {
  handleYouTubeNavigation,
  handleYouTubeOpenWindow,
  shareYouTubeVideo,
  buildYouTubeEmbedHtml,
} from '../youtubeNavigation';

jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);

function makeRequest(url: string) {
  return { url } as any;
}

describe('handleYouTubeNavigation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('allows about:blank', () => {
    expect(handleYouTubeNavigation(makeRequest('about:blank'), 'abc')).toBe(true);
  });

  it('allows base URL (example.com)', () => {
    expect(handleYouTubeNavigation(makeRequest('https://example.com'), 'abc')).toBe(true);
  });

  it('allows embed URL', () => {
    expect(
      handleYouTubeNavigation(makeRequest('https://www.youtube.com/embed/abc?autoplay=1'), 'abc'),
    ).toBe(true);
  });

  it('opens YouTube app for watch URLs', () => {
    const url = 'https://www.youtube.com/watch?v=abc123';
    expect(handleYouTubeNavigation(makeRequest(url), 'abc123')).toBe(false);
    expect(Linking.openURL).toHaveBeenCalledWith(url);
  });

  it('triggers native share for share URLs', () => {
    const url = 'https://www.youtube.com/share?v=abc123';
    expect(handleYouTubeNavigation(makeRequest(url), 'abc123')).toBe(false);
    expect(Share.share).toHaveBeenCalledWith({
      message: 'https://www.youtube.com/watch?v=abc123',
    });
  });

  it('blocks unknown external URLs', () => {
    expect(handleYouTubeNavigation(makeRequest('https://evil.com'), 'abc')).toBe(false);
  });
});

describe('handleYouTubeOpenWindow', () => {
  beforeEach(() => jest.clearAllMocks());

  it('opens YouTube app for watch URLs', () => {
    const url = 'https://www.youtube.com/watch?v=abc123';
    handleYouTubeOpenWindow(url, 'abc123');
    expect(Linking.openURL).toHaveBeenCalledWith(url);
  });

  it('opens YouTube app for youtu.be URLs', () => {
    const url = 'https://youtu.be/abc123';
    handleYouTubeOpenWindow(url, 'abc123');
    expect(Linking.openURL).toHaveBeenCalledWith(url);
  });

  it('triggers native share for share URLs', () => {
    handleYouTubeOpenWindow('https://www.youtube.com/share?v=abc123', 'abc123');
    expect(Share.share).toHaveBeenCalledWith({
      message: 'https://www.youtube.com/watch?v=abc123',
    });
  });

  it('triggers native share for intent:// URLs', () => {
    handleYouTubeOpenWindow('intent://www.youtube.com/watch?v=abc123#Intent;end', 'abc123');
    expect(Share.share).toHaveBeenCalledWith({
      message: 'https://www.youtube.com/watch?v=abc123',
    });
  });
});

describe('shareYouTubeVideo', () => {
  beforeEach(() => jest.clearAllMocks());

  it('triggers native share with YouTube watch URL', () => {
    shareYouTubeVideo('abc123');
    expect(Share.share).toHaveBeenCalledWith({
      message: 'https://www.youtube.com/watch?v=abc123',
    });
  });
});

describe('buildYouTubeEmbedHtml', () => {
  it('includes embed iframe with youtube ID', () => {
    const html = buildYouTubeEmbedHtml('testId');
    expect(html).toContain('/embed/testId');
  });

  it('includes mute param when autoMute is true', () => {
    const html = buildYouTubeEmbedHtml('testId', true);
    expect(html).toContain('mute=1');
  });

  it('excludes mute param by default', () => {
    const html = buildYouTubeEmbedHtml('testId');
    expect(html).not.toContain('mute=1');
  });

  it('includes autoplay and playsinline params', () => {
    const html = buildYouTubeEmbedHtml('testId');
    expect(html).toContain('autoplay=1');
    expect(html).toContain('playsinline=1');
  });
});
