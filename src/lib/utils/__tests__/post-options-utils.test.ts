import { describe, expect, it } from 'vitest';
import {
  getNonokoPendingAccountCommentIndex,
  getNonokoPendingRouteState,
  getPostOptionsValidationError,
  getUnsupportedPostOptionsMessage,
  hasNonokoOption,
} from '../post-options-utils';

describe('post-options-utils', () => {
  it('rejects additional dice options instead of dropping them', () => {
    expect(getUnsupportedPostOptionsMessage('dice+1d6 dice+1d20', 'qst')).toBe('Unsupported options: dice+1d20.');
  });

  it('supports nonoko while keeping sage unsupported', () => {
    expect(getUnsupportedPostOptionsMessage('nonoko', undefined)).toBeNull();
    expect(getUnsupportedPostOptionsMessage('sage', 'b')).toBe('Unsupported options: sage [learn why].');
    expect(hasNonokoOption('fortune nonoko')).toBe(true);
    expect(hasNonokoOption('nonokosage')).toBe(false);
  });

  it('describes board-specific options with supported directories', () => {
    expect(getPostOptionsValidationError('fortune', 'mu')).toEqual({
      unsupportedOptions: ['fortune'],
      supportedDirectoryCodesByOption: [{ option: 'fortune', directoryCodes: ['b', 's5s'] }],
    });
    expect(getUnsupportedPostOptionsMessage('fortune', 'mu')).toBe('Unsupported options: fortune. Option "fortune" is supported on: /b/, /s5s/.');
    expect(getUnsupportedPostOptionsMessage('sage fortune', 'pol')).toBe('Unsupported options: sage [learn why], fortune. Option "fortune" is supported on: /b/, /s5s/.');
    expect(getPostOptionsValidationError('fortune dice+1d6', 'mu')).toEqual({
      unsupportedOptions: ['fortune', 'dice+1d6'],
      supportedDirectoryCodesByOption: [
        { option: 'fortune', directoryCodes: ['b', 's5s'] },
        { option: 'dice+1d6', directoryCodes: ['qst', 'tg'] },
      ],
    });
  });

  it('reads the nonoko pending account comment index from direct and wrapped route state', () => {
    expect(getNonokoPendingRouteState(7)).toEqual({ nonokoPendingAccountCommentIndex: 7 });
    expect(getNonokoPendingAccountCommentIndex({ nonokoPendingAccountCommentIndex: 7 })).toBe(7);
    expect(getNonokoPendingAccountCommentIndex({ usr: { nonokoPendingAccountCommentIndex: 8 } })).toBe(8);
    expect(getNonokoPendingAccountCommentIndex({ nonokoPendingAccountCommentIndex: -1 })).toBeUndefined();
    expect(getNonokoPendingAccountCommentIndex({ nonokoPendingAccountCommentIndex: '7' })).toBeUndefined();
  });
});
