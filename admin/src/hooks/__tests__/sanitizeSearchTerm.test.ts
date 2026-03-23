import { describe, it, expect } from 'vitest';

// Test the sanitization regex pattern used in useAdminReviews and useAdminAudit
// The function strips: , ( ) " ' \ % _
describe('sanitizeSearchTerm pattern', () => {
  const sanitize = (term: string) => term.replace(/[,()"'\\%_]/g, '').trim();

  it('strips SQL LIKE wildcards % and _', () => {
    expect(sanitize('100%')).toBe('100');
    expect(sanitize('user_name')).toBe('username');
    expect(sanitize('%admin%')).toBe('admin');
  });

  it('strips PostgREST special characters', () => {
    expect(sanitize("O'Brien")).toBe('OBrien');
    expect(sanitize('actor, director')).toBe('actor director');
    expect(sanitize('test"value')).toBe('testvalue');
    expect(sanitize('path\\to')).toBe('pathto');
  });

  it('preserves normal search terms', () => {
    expect(sanitize('john doe')).toBe('john doe');
    expect(sanitize('The Matrix')).toBe('The Matrix');
    expect(sanitize('user@email.com')).toBe('user@email.com');
  });

  it('trims whitespace', () => {
    expect(sanitize('  hello  ')).toBe('hello');
  });

  it('returns empty string for all-special input', () => {
    expect(sanitize('%_,()"\'\\')).toBe('');
  });
});
