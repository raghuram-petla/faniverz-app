import { buildYouTubePlayerHtml } from '@/utils/buildYouTubePlayerHtml';

describe('buildYouTubePlayerHtml', () => {
  it('returns empty-body HTML for invalid youtubeId', () => {
    const result = buildYouTubePlayerHtml('<script>xss</script>');
    expect(result).toContain('background:#000');
    expect(result).not.toContain('<script>xss</script>');
  });

  it('returns empty-body HTML for empty string', () => {
    const result = buildYouTubePlayerHtml('');
    expect(result).toContain('background:#000');
    expect(result).not.toContain('YT.Player');
  });

  it('interpolates valid youtubeId into HTML', () => {
    const result = buildYouTubePlayerHtml('dQw4w9WgXcQ');
    expect(result).toContain('dQw4w9WgXcQ');
  });

  it('includes YouTube IFrame API script', () => {
    const result = buildYouTubePlayerHtml('dQw4w9WgXcQ');
    expect(result).toContain('youtube.com/iframe_api');
  });

  it('sets autoplay=1 and playsinline=1', () => {
    const result = buildYouTubePlayerHtml('dQw4w9WgXcQ');
    expect(result).toContain('autoplay: 1');
    expect(result).toContain('playsinline: 1');
  });

  it('disables related videos with rel=0', () => {
    const result = buildYouTubePlayerHtml('dQw4w9WgXcQ');
    expect(result).toContain('rel: 0');
  });

  it('posts ready message on player ready', () => {
    const result = buildYouTubePlayerHtml('dQw4w9WgXcQ');
    expect(result).toContain("type: 'ready'");
  });

  it('posts stateChange message on player state change', () => {
    const result = buildYouTubePlayerHtml('dQw4w9WgXcQ');
    expect(result).toContain("type: 'stateChange'");
  });

  it('posts timeUpdate message on interval', () => {
    const result = buildYouTubePlayerHtml('dQw4w9WgXcQ');
    expect(result).toContain("type: 'timeUpdate'");
  });

  it('exposes receiveCommand for play/pause/seek', () => {
    const result = buildYouTubePlayerHtml('dQw4w9WgXcQ');
    expect(result).toContain('receiveCommand');
    expect(result).toContain("'play'");
    expect(result).toContain("'pause'");
    expect(result).toContain("'seek'");
  });
});
