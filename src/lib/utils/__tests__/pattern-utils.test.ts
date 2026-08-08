import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  consoleErrorMock: vi.fn(),
  communities: {} as Record<string, { roles?: Record<string, { role?: string }> }>,
}));

vi.mock('../../bitsocial-internals/stores', () => ({
  communitiesStore: {
    getState: () => ({
      communities: testState.communities,
    }),
  },
}));

import { commentMatchesPattern, displayNameMatchesPattern, matchesPattern, parsePattern, userHasRole, userIdMatchesPattern } from '../pattern-utils';

describe('pattern-utils', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    testState.communities = {
      'music-posting.eth': {
        roles: {
          'author-1': { role: 'moderator' },
          'author-2': { role: 'owner' },
        },
      },
    };
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(testState.consoleErrorMock);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('matches whole words, exact phrases, regexes, wildcards, and logical operators', () => {
    expect(matchesPattern('That feel when the girlfriend texts back', 'feel')).toBe(true);
    expect(matchesPattern('That feel when the girlfriend texts back', 'feels')).toBe(false);
    expect(matchesPattern('That feel when the girlfriend texts back', 'feel girlfriend')).toBe(true);
    expect(matchesPattern('That feel when the girlfriend texts back', 'girlfriend|boyfriend feel')).toBe(true);
    expect(matchesPattern('That feel when the girlfriend texts back', '"feel when the girlfriend"')).toBe(true);
    expect(matchesPattern('That feeling stays forever', 'feel*')).toBe(true);
    expect(matchesPattern('MIXED Case Example', '/mixed case example/i')).toBe(true);
  });

  it('falls back to a simple include when pattern parsing throws', () => {
    expect(matchesPattern('the broken marker foo(', 'foo(')).toBe(true);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('matches user ids through full and short addresses', () => {
    const comment = {
      author: {
        address: '12D3KooWabcdef',
        shortAddress: '12D3KooWabc',
      },
    };

    expect(userIdMatchesPattern(comment as never, 'abcdef')).toBe(true);
    expect(userIdMatchesPattern(comment as never, '12D3KooWabc')).toBe(true);
    expect(userIdMatchesPattern(comment as never, 'missing')).toBe(false);
  });

  it('matches display names case-insensitively and treats anonymous as undefined display names', () => {
    expect(displayNameMatchesPattern({ author: { displayName: 'Alice' } } as never, 'alice')).toBe(true);
    expect(displayNameMatchesPattern({ author: {} } as never, 'anonymous')).toBe(true);
    expect(displayNameMatchesPattern({ author: { displayName: 'Bob' } } as never, 'anonymous')).toBe(false);
  });

  it('matches roles with moderator aliases and rejects missing role metadata', () => {
    const modComment = {
      author: { address: 'author-1' },
      communityAddress: 'music-posting.eth',
    };
    const ownerComment = {
      author: { address: 'author-2' },
      communityAddress: 'music-posting.eth',
    };

    expect(userHasRole(modComment as never, 'moderator')).toBe(true);
    expect(userHasRole(modComment as never, 'mod')).toBe(true);
    expect(userHasRole(ownerComment as never, 'owner')).toBe(true);
    expect(userHasRole(ownerComment as never, 'admin')).toBe(false);
    expect(userHasRole({ author: { address: 'missing' }, communityAddress: 'unknown.eth' } as never, 'moderator')).toBe(false);
  });

  it('parses mixed special filters and content filters', () => {
    expect(parsePattern('#abc ##Alice #!#mod exact phrase')).toEqual({
      contentFilter: 'exact phrase',
      specialFilters: [
        { type: 'userId', value: 'abc' },
        { type: 'displayName', value: 'Alice' },
        { type: 'role', value: 'mod' },
      ],
    });
    expect(parsePattern('')).toEqual({
      contentFilter: '',
      specialFilters: [],
    });
  });

  it('matches comments against combined special filters and content filters', () => {
    const comment = {
      author: {
        address: 'author-1',
        displayName: 'Alice',
        shortAddress: 'auth1',
      },
      content: 'That feel when the girlfriend texts back',
      communityAddress: 'music-posting.eth',
      title: 'TFW',
    };

    expect(commentMatchesPattern(comment as never, '#auth1 ##Alice #!#moderator girlfriend')).toBe(true);
    expect(commentMatchesPattern(comment as never, '#auth1 ##Bob #!#moderator girlfriend')).toBe(false);
    expect(commentMatchesPattern(comment as never, '#auth1')).toBe(true);
    expect(commentMatchesPattern(comment as never, '##Alice')).toBe(true);
    expect(commentMatchesPattern(comment as never, '#!#mod')).toBe(true);
    expect(commentMatchesPattern(comment as never, 'tfw girlfriend')).toBe(true);
  });
});
