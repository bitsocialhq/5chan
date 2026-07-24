import { describe, expect, it } from 'vitest';
import { getLocationDraftKey, getPageDraftKey } from '../location-draft-utils';

describe('location draft utils', () => {
  it('normalizes trailing slashes while preserving search and hash state', () => {
    expect(getLocationDraftKey({ pathname: '/biz/', search: '?view=catalog', hash: '#post-1' })).toBe('/biz?view=catalog#post-1');
  });

  it('keeps settings overlays scoped to their underlying page', () => {
    expect(getPageDraftKey({ pathname: '/biz/catalog/settings', search: '?s=bitcoin&section=account-settings', hash: '' })).toBe('/biz/catalog?s=bitcoin');
  });
});
