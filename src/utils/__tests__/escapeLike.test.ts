import { escapeLike } from '../escapeLike';

describe('escapeLike', () => {
  it('returns the string unchanged when no special characters are present', () => {
    expect(escapeLike('hello world')).toBe('hello world');
  });

  it('escapes percent sign', () => {
    expect(escapeLike('100%')).toBe('100\\%');
  });

  it('escapes underscore', () => {
    expect(escapeLike('some_value')).toBe('some\\_value');
  });

  it('escapes backslash', () => {
    expect(escapeLike('path\\to')).toBe('path\\\\to');
  });

  it('escapes multiple special characters in one string', () => {
    expect(escapeLike('%_\\')).toBe('\\%\\_\\\\');
  });

  it('escapes multiple occurrences of the same character', () => {
    expect(escapeLike('%%')).toBe('\\%\\%');
  });

  it('handles mixed normal and special characters', () => {
    expect(escapeLike('hello%world_test\\end')).toBe('hello\\%world\\_test\\\\end');
  });

  it('returns empty string for empty input', () => {
    expect(escapeLike('')).toBe('');
  });

  it('does not escape characters that are not LIKE-special', () => {
    expect(escapeLike('abc123!@#$^&*()')).toBe('abc123!@#$^&*()');
  });

  it('handles string with only special characters', () => {
    expect(escapeLike('_%\\')).toBe('\\_\\%\\\\');
  });
});
