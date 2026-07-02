import { describe, expect, it } from 'vitest';
import { TRASH_BOARD_ADDRESS, TRASH_BOARD_PUBLIC_KEY } from '../../special-boards';
import { getDirectoryCodeForBoardAddress } from '../directory-list-lookup-utils';

describe('directory-list-lookup-utils', () => {
  it('does not expose hidden special boards as vendored directory candidates', () => {
    expect(getDirectoryCodeForBoardAddress(TRASH_BOARD_ADDRESS)).toBeUndefined();
    expect(getDirectoryCodeForBoardAddress(TRASH_BOARD_PUBLIC_KEY)).toBeUndefined();
  });
});
