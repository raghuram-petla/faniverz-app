import { fontFamily, typography } from '../typography';

describe('fontFamily', () => {
  it('exports all expected keys', () => {
    const expectedKeys = ['regular', 'bold', 'teluguRegular', 'teluguBold'];
    expect(Object.keys(fontFamily)).toEqual(expect.arrayContaining(expectedKeys));
    expect(Object.keys(fontFamily)).toHaveLength(expectedKeys.length);
  });

  it('has Inter font for regular and bold', () => {
    expect(fontFamily.regular).toBe('Inter-Regular');
    expect(fontFamily.bold).toBe('Inter-Bold');
  });

  it('has NotoSansTelugu font for Telugu variants', () => {
    expect(fontFamily.teluguRegular).toBe('NotoSansTelugu-Regular');
    expect(fontFamily.teluguBold).toBe('NotoSansTelugu-Bold');
  });

  it('has all string values', () => {
    Object.values(fontFamily).forEach((value) => {
      expect(typeof value).toBe('string');
    });
  });
});

describe('typography', () => {
  const expectedKeys = [
    'h1',
    'h2',
    'h3',
    'h4',
    'bodyLg',
    'body',
    'bodySm',
    'label',
    'labelSm',
    'caption',
  ];

  it('exports all expected keys', () => {
    expect(Object.keys(typography)).toEqual(expect.arrayContaining(expectedKeys));
    expect(Object.keys(typography)).toHaveLength(expectedKeys.length);
  });

  it('has heading styles (h1-h4) with bold fontFamily', () => {
    const headings = ['h1', 'h2', 'h3', 'h4'] as const;
    headings.forEach((key) => {
      expect(typography[key].fontFamily).toBe(fontFamily.bold);
    });
  });

  it('has body styles with regular fontFamily', () => {
    const bodies = ['bodyLg', 'body', 'bodySm'] as const;
    bodies.forEach((key) => {
      expect(typography[key].fontFamily).toBe(fontFamily.regular);
    });
  });

  it('has label styles with bold fontFamily', () => {
    expect(typography.label.fontFamily).toBe(fontFamily.bold);
    expect(typography.labelSm.fontFamily).toBe(fontFamily.bold);
  });

  it('has caption style with regular fontFamily', () => {
    expect(typography.caption.fontFamily).toBe(fontFamily.regular);
  });

  it('has fontSize and lineHeight on all styles', () => {
    expectedKeys.forEach((key) => {
      expect(typography[key]).toHaveProperty('fontSize');
      expect(typography[key]).toHaveProperty('lineHeight');
      expect(typeof typography[key].fontSize).toBe('number');
      expect(typeof typography[key].lineHeight).toBe('number');
    });
  });

  it('has heading font sizes in descending order', () => {
    expect(typography.h1.fontSize).toBeGreaterThan(typography.h2.fontSize!);
    expect(typography.h2.fontSize).toBeGreaterThan(typography.h3.fontSize!);
    expect(typography.h3.fontSize).toBeGreaterThan(typography.h4.fontSize!);
  });

  it('has body font sizes in descending order', () => {
    expect(typography.bodyLg.fontSize).toBeGreaterThan(typography.body.fontSize!);
    expect(typography.body.fontSize).toBeGreaterThan(typography.bodySm.fontSize!);
  });
});
