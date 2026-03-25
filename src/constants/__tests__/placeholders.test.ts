import { PLACEHOLDER_AVATAR, PLACEHOLDER_POSTER, PLACEHOLDER_PHOTO } from '../placeholders';

describe('placeholder constants', () => {
  it('exports PLACEHOLDER_AVATAR as a valid data URI', () => {
    expect(PLACEHOLDER_AVATAR).toMatch(/^data:image\/png;base64,/);
  });

  it('exports PLACEHOLDER_POSTER as a valid data URI', () => {
    expect(PLACEHOLDER_POSTER).toMatch(/^data:image\/png;base64,/);
  });

  it('exports PLACEHOLDER_PHOTO as a valid data URI', () => {
    expect(PLACEHOLDER_PHOTO).toMatch(/^data:image\/png;base64,/);
  });

  it('all placeholders are non-empty strings', () => {
    expect(PLACEHOLDER_AVATAR.length).toBeGreaterThan(0);
    expect(PLACEHOLDER_POSTER.length).toBeGreaterThan(0);
    expect(PLACEHOLDER_PHOTO.length).toBeGreaterThan(0);
  });

  it('all three use the same underlying gray PNG', () => {
    expect(PLACEHOLDER_AVATAR).toBe(PLACEHOLDER_POSTER);
    expect(PLACEHOLDER_POSTER).toBe(PLACEHOLDER_PHOTO);
  });
});
