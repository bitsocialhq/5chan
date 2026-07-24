type DraftLocation = {
  pathname: string;
  search: string;
  hash: string;
};

export const getLocationDraftKey = ({ pathname, search, hash }: DraftLocation) => `${pathname.replace(/\/$/, '') || '/'}${search}${hash}`;

export const getPostFormDraftKey = ({ pathname, search, hash }: DraftLocation) =>
  getLocationDraftKey({
    pathname: pathname.replace(/\/settings$/, ''),
    search,
    hash,
  });
