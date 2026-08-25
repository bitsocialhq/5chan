import { describe, expect, it } from 'vitest';
import type { Community } from '@bitsocial/bitsocial-react-hooks';
import { getCompatiblePostSortType } from '../use-compatible-post-sort-type';

const communityWithSorts = (...sortTypes: string[]): Community =>
  ({
    posts: {
      pages: Object.fromEntries(sortTypes.map((sortType) => [sortType, { comments: [] }])),
    },
  }) as Community;

describe('getCompatiblePostSortType', () => {
  it('keeps the preferred sort when every loaded community publishes it', () => {
    expect(getCompatiblePostSortType([communityWithSorts('hot', 'active'), communityWithSorts('active')], 'active')).toBe('active');
  });

  it('uses the preloaded sort when any community does not publish the preference', () => {
    expect(getCompatiblePostSortType([communityWithSorts('hot', 'active'), communityWithSorts('hot')], 'active')).toBeUndefined();
  });

  it('uses the preloaded sort until every requested community has loaded', () => {
    expect(getCompatiblePostSortType([communityWithSorts('active'), undefined], 'active')).toBeUndefined();
    expect(getCompatiblePostSortType([], 'active')).toBeUndefined();
  });

  it('supports arbitrary community-defined sort names', () => {
    expect(getCompatiblePostSortType([communityWithSorts('bump')], 'bump')).toBe('bump');
  });
});
