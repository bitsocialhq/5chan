import { beforeEach, describe, expect, it } from 'vitest';
import { clearStableLastVisitTimeFilterName, getStableLastVisitTimeFilterName, LAST_VISIT_STORAGE_KEY } from '../time-filter-utils';

describe('last-visit time filter', () => {
  beforeEach(() => {
    clearStableLastVisitTimeFilterName();
    localStorage.removeItem(LAST_VISIT_STORAGE_KEY);
  });

  it('starts a first visit on the freshest full-day window', () => {
    expect(getStableLastVisitTimeFilterName()).toBe('24h');
  });
});
