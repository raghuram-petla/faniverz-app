import { describe, it, expect } from 'vitest';
import { VARIANT_SPECS, type VariantType } from '@/lib/variant-config';

describe('VARIANT_SPECS', () => {
  const types: VariantType[] = ['poster', 'backdrop', 'photo', 'avatar'];

  it.each(types)('"%s" has 3 variant entries', (type) => {
    expect(VARIANT_SPECS[type]).toHaveLength(3);
  });

  it.each(types)('"%s" has _sm, _md, _lg suffixes in order', (type) => {
    const suffixes = VARIANT_SPECS[type].map((v) => v.suffix);
    expect(suffixes).toEqual(['_sm', '_md', '_lg']);
  });

  it('poster variants have correct widths', () => {
    const widths = VARIANT_SPECS.poster.map((v) => v.width);
    expect(widths).toEqual([200, 400, 800]);
  });

  it('backdrop variants have correct widths', () => {
    const widths = VARIANT_SPECS.backdrop.map((v) => v.width);
    expect(widths).toEqual([480, 960, 1920]);
  });

  it('photo variants have correct widths', () => {
    const widths = VARIANT_SPECS.photo.map((v) => v.width);
    expect(widths).toEqual([100, 200, 400]);
  });

  it('avatar variants have correct widths', () => {
    const widths = VARIANT_SPECS.avatar.map((v) => v.width);
    expect(widths).toEqual([64, 128, 256]);
  });

  it.each(types)('"%s" variants have qualities 80, 85, 90', (type) => {
    const qualities = VARIANT_SPECS[type].map((v) => v.quality);
    expect(qualities).toEqual([80, 85, 90]);
  });
});
