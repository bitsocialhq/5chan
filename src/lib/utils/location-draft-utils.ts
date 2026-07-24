type DraftLocation = {
  pathname: string;
  search: string;
  hash: string;
};

export const getLocationDraftKey = ({ pathname, search, hash }: DraftLocation) => `${pathname.replace(/\/$/, '') || '/'}${search}${hash}`;

export const getPageDraftKey = ({ pathname, search, hash }: DraftLocation) => {
  if (!pathname.endsWith('/settings')) {
    return getLocationDraftKey({ pathname, search, hash });
  }

  // Settings is an overlay, so discard its path and section while preserving the underlying page query.
  const searchParams = new URLSearchParams(search);
  searchParams.delete('section');
  const pageSearch = searchParams.toString();

  return getLocationDraftKey({
    pathname: pathname.replace(/\/settings$/, ''),
    search: pageSearch ? `?${pageSearch}` : '',
    hash,
  });
};
