import { describe, expect, it } from 'vitest';
import { getNonokoPendingAccountCommentIndex, getNonokoPendingRouteState, getUnsupportedPostOptionsMessage, hasNonokoOption } from '../post-options-utils';

describe('post-options-utils', () => {
  it('rejects additional dice options instead of dropping them', () => {
    expect(getUnsupportedPostOptionsMessage('dice+1d6 dice+1d20', 'qst')).toBe('unsupported options: dice+1d20');
  });

  it('supports nonoko while keeping sage unsupported', () => {
    expect(getUnsupportedPostOptionsMessage('nonoko', undefined)).toBeNull();
    expect(getUnsupportedPostOptionsMessage('sage', 'b')).toBe('unsupported options: sage');
    expect(hasNonokoOption('fortune nonoko')).toBe(true);
    expect(hasNonokoOption('nonokosage')).toBe(false);
  });

  it('reads the nonoko pending account comment index from direct and wrapped route state', () => {
    expect(getNonokoPendingRouteState(7)).toEqual({ nonokoPendingAccountCommentIndex: 7 });
    expect(getNonokoPendingAccountCommentIndex({ nonokoPendingAccountCommentIndex: 7 })).toBe(7);
    expect(getNonokoPendingAccountCommentIndex({ usr: { nonokoPendingAccountCommentIndex: 8 } })).toBe(8);
    expect(getNonokoPendingAccountCommentIndex({ nonokoPendingAccountCommentIndex: -1 })).toBeUndefined();
    expect(getNonokoPendingAccountCommentIndex({ nonokoPendingAccountCommentIndex: '7' })).toBeUndefined();
  });
});
