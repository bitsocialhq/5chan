import { describe, expect, it } from 'vitest';
import { getSearchDestination } from '../search-navigation';

const directories = [
  { address: 'music-posting.eth', directoryCode: 'mu', title: '/mu/ - Music' },
  { address: 'tech-posting.bso', directoryCode: 'g', title: '/g/ - Technology' },
];

describe('getSearchDestination', () => {
  it('keeps directory codes and board addresses as direct navigation', () => {
    expect(getSearchDestination('mu', directories)).toBe('/mu');
    expect(getSearchDestination('/g/', directories)).toBe('/g');
    expect(getSearchDestination('music-posting.eth', directories)).toBe('/mu');
    expect(getSearchDestination('unlisted-board.bso', directories)).toBe('/unlisted-board.bso');
  });

  it('opens a board typed by the name the homepage lists it under', () => {
    expect(getSearchDestination('Music', directories)).toBe('/mu');
    expect(getSearchDestination('technology', directories)).toBe('/g');
    expect(getSearchDestination('/mu/ - Music', directories)).toBe('/mu');
  });

  it('routes ordinary terms to archive search', () => {
    expect(getSearchDestination('old internet culture', directories)).toBe('/search?q=old%20internet%20culture');
    expect(getSearchDestination('bitcoin', directories)).toBe('/search?q=bitcoin');
    // Only the full board name opens a board; a partial one stays a post search.
    expect(getSearchDestination('music posting', directories)).toBe('/search?q=music%20posting');
  });

  it('ignores empty input', () => {
    expect(getSearchDestination('   ', directories)).toBeNull();
  });
});
