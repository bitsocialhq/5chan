import { describe, expect, it } from 'vitest';
import { getUnsupportedPostOptionsMessage } from '../post-options-utils';

describe('post-options-utils', () => {
  it('rejects additional dice options instead of dropping them', () => {
    expect(getUnsupportedPostOptionsMessage('dice+1d6 dice+1d20', 'qst')).toBe('unsupported options: dice+1d20');
  });
});
