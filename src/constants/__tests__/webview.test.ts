import { WEBVIEW_BASE_URL } from '../webview';

describe('WEBVIEW_BASE_URL', () => {
  it('is exported as a string', () => {
    expect(typeof WEBVIEW_BASE_URL).toBe('string');
  });

  it('is a valid URL', () => {
    expect(() => new URL(WEBVIEW_BASE_URL)).not.toThrow();
  });
});
