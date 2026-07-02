import { afterEach, describe, expect, it, vi } from 'vitest';
import { TRASH_BOARD_ADDRESS, TRASH_BOARD_CODE, TRASH_BOARD_PUBLIC_KEY } from '../../special-boards';

const importLookupUtilsWithDirectoryLists = async (directories: unknown[]) => {
  vi.resetModules();
  vi.doMock('../../../data/vendored-directory-lists', () => ({
    vendoredDirectoryLists: {
      directories,
    },
  }));
  return import('../directory-list-lookup-utils');
};

describe('directory-list-lookup-utils', () => {
  afterEach(() => {
    vi.doUnmock('../../../data/vendored-directory-lists');
    vi.resetModules();
  });

  it('does not expose hidden special boards as vendored directory candidates', async () => {
    const { getDirectoryCandidateBoardByAddress, getDirectoryCodeForBoardAddress } = await importLookupUtilsWithDirectoryLists([
      {
        directoryCode: 'b',
        boards: [
          {
            address: TRASH_BOARD_ADDRESS,
            publicKey: TRASH_BOARD_PUBLIC_KEY,
          },
        ],
      },
    ]);

    expect(getDirectoryCodeForBoardAddress(TRASH_BOARD_ADDRESS)).toBeUndefined();
    expect(getDirectoryCodeForBoardAddress(TRASH_BOARD_PUBLIC_KEY)).toBeUndefined();
    expect(getDirectoryCandidateBoardByAddress(TRASH_BOARD_ADDRESS)).toBeUndefined();
    expect(getDirectoryCandidateBoardByAddress(TRASH_BOARD_PUBLIC_KEY)).toBeUndefined();
  });

  it('excludes entire vendored directory lists that use a special board code', async () => {
    const { getVendoredDirectoryLists } = await importLookupUtilsWithDirectoryLists([
      {
        directoryCode: TRASH_BOARD_CODE,
        boards: [
          {
            address: TRASH_BOARD_ADDRESS,
            publicKey: TRASH_BOARD_PUBLIC_KEY,
          },
        ],
      },
      {
        directoryCode: 'b',
        boards: [
          {
            address: 'random-nsfw.bso',
          },
        ],
      },
    ]);

    expect(getVendoredDirectoryLists().map((directory) => directory.directoryCode)).toEqual(['b']);
  });
});
