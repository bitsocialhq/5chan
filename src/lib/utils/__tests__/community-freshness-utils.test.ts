import { describe, expect, it } from 'vitest';
import type { CommunitySyncState } from '@bitsocial/bitsocial-react-hooks';
import { isCommunityKnownOffline } from '../community-freshness-utils';

const NOW_SECONDS = 1_704_067_210;

describe('isCommunityKnownOffline', () => {
  it.each<CommunitySyncState>(['succeeded', 'failed', 'stopped'])('treats terminal %s synchronization without cached data as offline', (syncState) => {
    expect(isCommunityKnownOffline({ syncState }, NOW_SECONDS)).toBe(true);
  });

  it.each<CommunitySyncState>(['initializing', 'loading', 'retrying'])('does not treat active %s synchronization without cached data as offline', (syncState) => {
    expect(isCommunityKnownOffline({ syncState }, NOW_SECONDS)).toBe(false);
  });

  it('keeps fresh cached data online after a terminal failure', () => {
    expect(
      isCommunityKnownOffline(
        {
          syncState: 'failed',
          updatedAt: NOW_SECONDS - 60,
        },
        NOW_SECONDS,
      ),
    ).toBe(false);
  });

  it('keeps stale cached data offline while synchronization retries', () => {
    expect(
      isCommunityKnownOffline(
        {
          syncState: 'retrying',
          updatedAt: NOW_SECONDS - 31 * 60,
        },
        NOW_SECONDS,
      ),
    ).toBe(true);
  });
});
