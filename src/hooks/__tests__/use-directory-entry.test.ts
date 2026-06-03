import { describe, expect, it } from 'vitest';
import { getDirectoryEntryForAddress } from '../use-directory-entry';

describe('getDirectoryEntryForAddress', () => {
  it('inherits directory metadata for a non-primary directory candidate board', () => {
    const entry = getDirectoryEntryForAddress({
      address: 'nothing-is-beyond-our-reach.bso',
      directoryCodeHint: 'pol',
      directories: [
        {
          address: 'politically-incorrect.bso',
          directoryCode: 'pol',
          features: { hasFlags: true, requirePostLink: true },
          title: '/pol/ - Politically Incorrect',
        },
      ],
      list: {
        directoryCode: 'pol',
        title: '/pol/ - Politically Incorrect',
        features: { hasFlags: true, requirePostLink: true },
        boards: [{ address: 'politically-incorrect.bso' }, { address: 'nothing-is-beyond-our-reach.bso', publicKey: 'pol-candidate-key' }],
      },
    });

    expect(entry).toMatchObject({
      address: 'nothing-is-beyond-our-reach.bso',
      directoryCode: 'pol',
      features: { hasFlags: true, requirePostLink: true },
      publicKey: 'pol-candidate-key',
      title: '/pol/ - Politically Incorrect',
    });
  });
});
