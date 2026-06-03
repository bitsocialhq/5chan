import { describe, expect, it, vi } from 'vitest';
import {
  getContentWithPostOptionState,
  getNonokoPendingAccountCommentIndex,
  getNonokoPendingRouteState,
  getPostOptionsValidationError,
  getUnsupportedPostOptionsMessage,
  hasNonokoOption,
  stripGeneratedFortuneMarkup,
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

  it('strips generated fortune markers before appending a new fortune on fortune boards', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.25);
    const fortuneEntryRef = { current: null };
    const diceRollRef = { current: null };

    expect(
      getContentWithPostOptionState(
        'body[fortune color=#6023f8]Outlook good[/fortune]<span class="fortune" style="color:#7fec11"><br><br><b>Your fortune: Bad Luck</b></span>',
        'fortune',
        fortuneEntryRef,
        diceRollRef,
        's5s',
      ),
    ).toBe('body[fortune color=#fd4d32]Excellent Luck[/fortune]');

    randomSpy.mockRestore();
  });

  it('strips user-entered generated fortune markers even when fortune is not selected on fortune boards', () => {
    const fortuneEntryRef = { current: null };
    const diceRollRef = { current: null };

    expect(getContentWithPostOptionState('body[fortune color=#6023f8]Outlook good[/fortune]', '', fortuneEntryRef, diceRollRef, 's5s')).toBe('body');
  });

  it('keeps invalid or non-fortune-board fortune-looking text', () => {
    const fortuneEntryRef = { current: null };
    const diceRollRef = { current: null };
    const userText = '[fortune color=#000000]Excellent Luck[/fortune]';

    expect(stripGeneratedFortuneMarkup(userText)).toBe(userText);
    expect(getContentWithPostOptionState('body[fortune color=#6023f8]Outlook good[/fortune]', '', fortuneEntryRef, diceRollRef, 'mu')).toBe(
      'body[fortune color=#6023f8]Outlook good[/fortune]',
    );
  });
});
