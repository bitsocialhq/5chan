import { describe, expect, it } from 'vitest';
import { getBoardFlagDefinition, normalizeBoardFlagKind } from '../board-flags';

describe('board-flags', () => {
  it('normalizes board flag kind aliases', () => {
    expect(normalizeBoardFlagKind('pol')).toBe('pol');
    expect(normalizeBoardFlagKind('memeflags')).toBe('pol');
    expect(normalizeBoardFlagKind('mlp')).toBe('pony');
    expect(normalizeBoardFlagKind('unknown')).toBeUndefined();
  });

  it('maps political flags to the flags-2 sprite grid', () => {
    expect(getBoardFlagDefinition('pol', 'AC')).toMatchObject({
      code: 'AC',
      label: 'Anarcho-Capitalist',
      spritePath: 'assets/icons/flags-2.png',
      width: 16,
      height: 12,
      x: 0,
      y: 0,
    });
    expect(getBoardFlagDefinition('pol', 'WP')).toMatchObject({ code: 'WP', x: 64, y: 48 });
  });

  it('maps pony flags to the flags-pony sprite grid', () => {
    expect(getBoardFlagDefinition('pony', '4CC')).toMatchObject({
      code: '4CC',
      label: '4cc /mlp/',
      spritePath: 'assets/icons/flags-pony.png',
      width: 16,
      height: 16,
      x: 0,
      y: 0,
    });
    expect(getBoardFlagDefinition('pony', 'AJ')).toMatchObject({ code: 'AJ', label: 'Applejack', x: 80, y: 0 });
    expect(getBoardFlagDefinition('pony', 'ZS')).toMatchObject({ code: 'ZS', label: 'Zipp Storm', x: 16, y: 144 });
  });
});
