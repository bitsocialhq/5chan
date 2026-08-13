import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { alertChallengeVerificationFailed, getDuplicateMediaChallengeError, getPublicationPreview, getPublicationType, getVotePreview } from '../challenge-utils';

const alertMock = vi.fn();
const originalAlert = globalThis.alert;
const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

describe('challenge-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.alert = alertMock;
  });

  afterEach(() => {
    globalThis.alert = originalAlert;
  });

  it('alerts with merged object challenge errors, reason, and resolved board path', () => {
    alertChallengeVerificationFailed(
      {
        challengeErrors: {
          captcha: 'invalid captcha',
          ignored: 42,
        },
        challengeSuccess: false,
        reason: 'try again later',
      } as never,
      { communityAddress: 'business-and-finance.bso' },
    );

    expect(warnSpy).toHaveBeenCalledWith(
      'Challenge Verification Failed:',
      expect.objectContaining({ challengeSuccess: false }),
      'Publication:',
      expect.objectContaining({ communityAddress: 'business-and-finance.bso' }),
    );
    expect(alertMock).toHaveBeenCalledWith('Error from /biz/: invalid captcha try again later');
  });

  it('alerts with joined array challenge errors and falls back to the raw board address when unmapped', () => {
    alertChallengeVerificationFailed(
      {
        challengeErrors: ['first error', 'second error'],
        challengeSuccess: false,
      } as never,
      { communityAddress: 'unknown-board.eth' },
    );

    expect(alertMock).toHaveBeenCalledWith('Error from unknown-board.eth: first error second error');
  });

  it('uses communityAddress when the upgraded publication no longer exposes communityAddress', () => {
    alertChallengeVerificationFailed(
      {
        challengeErrors: ['first error'],
        challengeSuccess: false,
      } as never,
      { communityAddress: 'business-and-finance.bso' },
    );

    expect(alertMock).toHaveBeenCalledWith('Error from /biz/: first error');
  });

  it('warns about invalid challenge error payloads and falls back to an unknown error', () => {
    alertChallengeVerificationFailed(
      {
        challengeErrors: 'bad-shape',
        challengeSuccess: false,
      } as never,
      {},
    );

    expect(warnSpy).toHaveBeenCalledWith('challengeVerification.challengeErrors is not an object or array:', 'bad-shape');
    expect(alertMock).toHaveBeenCalledWith('Error from unknown board: unknown error');
  });

  it('logs successful challenge verification instead of alerting', () => {
    alertChallengeVerificationFailed({ challengeSuccess: true } as never, { communityAddress: 'business-and-finance.bso' });

    expect(logSpy).toHaveBeenCalledWith('Challenge verification succeeded:', expect.objectContaining({ challengeSuccess: true }));
    expect(alertMock).not.toHaveBeenCalled();
  });

  it('recognizes the deterministic duplicate-media challenge error', () => {
    expect(
      getDuplicateMediaChallengeError({
        challengeErrors: {
          allow: 'This media was already posted recently.',
          review: 'This media was already posted recently.',
        },
        challengeSuccess: false,
      } as never),
    ).toBe('This media was already posted recently.');
    expect(getDuplicateMediaChallengeError({ challengeErrors: ['different failure'], challengeSuccess: false } as never)).toBeUndefined();
    expect(getDuplicateMediaChallengeError({ challengeErrors: ['Prefix: This media was already posted recently.'], challengeSuccess: false } as never)).toBeUndefined();
    expect(getDuplicateMediaChallengeError({ challengeSuccess: true } as never)).toBeUndefined();
  });

  it('classifies publication types and vote previews', () => {
    expect(getPublicationType(undefined)).toBeUndefined();
    expect(getPublicationType({ vote: 1 })).toBe('vote');
    expect(getPublicationType({ parentCid: 'reply-parent' })).toBe('reply');
    expect(getPublicationType({ commentCid: 'comment-cid' })).toBe('edit');
    expect(getPublicationType({ title: 'new thread' })).toBe('post');

    expect(getVotePreview(undefined)).toBe('');
    expect(getVotePreview({ vote: 1 })).toBe(' +1');
    expect(getVotePreview({ vote: -1 })).toBe(' -1');
  });

  it('builds publication previews from title, content, links, and truncation rules', () => {
    expect(getPublicationPreview(undefined)).toBe('');
    expect(getPublicationPreview({ link: 'https://example.com/only-link' })).toBe('https://example.com/only-link');
    expect(getPublicationPreview({ title: 'Announcement', content: 'Now live' })).toBe('Announcement: Now live');
    expect(
      getPublicationPreview({
        content: 'a'.repeat(80),
      }),
    ).toBe(`${'a'.repeat(50)}...`);
  });
});
