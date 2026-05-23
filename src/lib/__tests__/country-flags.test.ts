import { describe, expect, it } from 'vitest';
import { COUNTRY_FLAG_HEIGHT, COUNTRY_FLAG_WIDTH, getCountryFlagPosition, getCountryLabel, normalizeCountryCode } from '../country-flags';

describe('country-flags', () => {
  it('places the first sprite cell at the origin', () => {
    expect(getCountryFlagPosition('ad')).toEqual({ x: 0, y: 0 });
  });

  it('maps a code to a grid-aligned sprite position', () => {
    const position = getCountryFlagPosition('us');
    expect(position).toBeDefined();
    expect(position!.x % COUNTRY_FLAG_WIDTH).toBe(0);
    expect(position!.y % COUNTRY_FLAG_HEIGHT).toBe(0);
    expect(position!.x).toBeGreaterThanOrEqual(0);
    expect(position!.x).toBeLessThan(16 * COUNTRY_FLAG_WIDTH);
  });

  // Exact positions from the original 4chan flags.css (the source of flags-1.png).
  it('matches the known sprite positions from flags.css', () => {
    expect(getCountryFlagPosition('us')).toEqual({ x: 240, y: 154 });
    expect(getCountryFlagPosition('ru')).toEqual({ x: 64, y: 132 });
    expect(getCountryFlagPosition('pl')).toEqual({ x: 128, y: 121 });
    expect(getCountryFlagPosition('jp')).toEqual({ x: 112, y: 77 });
    expect(getCountryFlagPosition('de')).toEqual({ x: 176, y: 33 });
    expect(getCountryFlagPosition('gb')).toEqual({ x: 32, y: 55 });
    expect(getCountryFlagPosition('br')).toEqual({ x: 240, y: 11 });
    expect(getCountryFlagPosition('za')).toEqual({ x: 0, y: 176 });
  });

  it('normalizes uk to gb and rejects unknown codes', () => {
    expect(normalizeCountryCode('UK')).toBe('gb');
    expect(normalizeCountryCode('zz')).toBeUndefined();
    expect(getCountryFlagPosition('zz')).toBeUndefined();
  });

  it('returns a human-readable label for ISO codes', () => {
    expect(getCountryLabel('de')).toBeTruthy();
    expect(getCountryLabel('zz')).toBeUndefined();
  });
});
