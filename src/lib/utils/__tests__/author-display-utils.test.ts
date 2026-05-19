import { describe, expect, it } from 'vitest';
import { KNOWN_5CHAN_DEVELOPER_ENTRIES, get5chanDeveloperBadge, getAuthorBadge, isKnown5chanDeveloper } from '../author-display-utils';

describe('author display utils', () => {
  it('recognizes the hardcoded 5chan developer addresses', () => {
    expect(isKnown5chanDeveloper('estebanabaroa.bso')).toBe(true);
    expect(isKnown5chanDeveloper('rinse12.bso')).toBe(true);
    expect(isKnown5chanDeveloper('plebeius.bso')).toBe(true);
    expect(isKnown5chanDeveloper('someone-else.bso')).toBe(false);
  });

  it('keeps optional developer profile metadata next to the hardcoded address', () => {
    expect(KNOWN_5CHAN_DEVELOPER_ENTRIES).toContainEqual({
      address: 'rinse12.bso',
      githubProfileUrl: 'https://github.com/rinse12',
      name: 'Rinse',
    });
    expect(KNOWN_5CHAN_DEVELOPER_ENTRIES).toContainEqual({
      address: 'plebeius.bso',
      githubProfileUrl: 'https://github.com/tomcasaburi',
      name: 'Tommaso Casaburi',
    });
  });

  it('labels known developers with the admin icon style', () => {
    expect(getAuthorBadge({ address: 'rinse12.bso' })).toEqual({
      icon: 'admin',
      label: '5chan Dev',
      title: '5chan Dev',
    });
  });

  it('keeps the developer label even when the account has a board role', () => {
    expect(getAuthorBadge({ address: 'plebeius.bso', role: 'owner' })).toEqual({
      icon: 'admin',
      label: '5chan Dev',
      title: '5chan Dev',
    });
  });

  it('returns only the 5chan Dev badge for known developers', () => {
    expect(get5chanDeveloperBadge('plebeius.bso')).toEqual({
      icon: 'admin',
      label: '5chan Dev',
      title: '5chan Dev',
    });
    expect(get5chanDeveloperBadge('other.bso')).toBeUndefined();
  });

  it('keeps board role labels for non-developers', () => {
    expect(getAuthorBadge({ address: 'other.bso', role: 'moderator' })).toEqual({
      capitalizeLabel: true,
      icon: 'mod',
      label: 'Board mod',
      title: 'moderator_of_this_board',
    });
    expect(getAuthorBadge({ address: 'other.bso', role: 'owner' })).toEqual({
      capitalizeLabel: true,
      icon: 'admin',
      label: 'Board owner',
      title: 'administrator_of_this_board',
    });
  });
});
