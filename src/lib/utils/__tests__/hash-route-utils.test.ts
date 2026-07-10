import { describe, expect, it } from 'vitest';
import { canonicalizeNestedHashRoute } from '../hash-route-utils';

describe('canonicalizeNestedHashRoute', () => {
  it.each([
    ['#/biz/settings#p2p-stats-settings', '#/biz/settings?section=p2p-stats-settings'],
    ['#/biz/settings%23p2p-stats-settings', '#/biz/settings?section=p2p-stats-settings'],
    ['#/biz/settings?focus=1#account-settings', '#/biz/settings?focus=1&section=account-settings'],
    ['#/biz/catalog#s=test', '#/biz/catalog?s=test'],
    ['#/biz/catalog%23s=settings%23p2p-stats-settings', '#/biz/catalog?s=settings%23p2p-stats-settings'],
    ['#/biz/catalog?t=1w#s=cats%20and%20dogs', '#/biz/catalog?t=1w&s=cats+and+dogs'],
  ])('converts legacy route %s to %s', (input, expected) => {
    expect(canonicalizeNestedHashRoute(input)).toBe(expected);
  });

  it.each(['', '#/biz', '#/biz/settings?section=p2p-stats-settings', '#/biz/catalog?s=hash%23tag', '#/faq#sage'])('leaves unrelated route %s unchanged', (input) => {
    expect(canonicalizeNestedHashRoute(input)).toBe(input);
  });
});
