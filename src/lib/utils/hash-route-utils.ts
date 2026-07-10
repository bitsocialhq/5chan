const splitPathAndSearch = (route: string): [string, string] => {
  const searchIndex = route.indexOf('?');
  return searchIndex === -1 ? [route, ''] : [route.slice(0, searchIndex), route.slice(searchIndex + 1)];
};

const findNestedHashSeparator = (route: string): { index: number; length: number } | null => {
  const literalIndex = route.indexOf('#');
  if (literalIndex !== -1) return { index: literalIndex, length: 1 };

  const encodedIndex = route.toLowerCase().indexOf('%23');
  return encodedIndex === -1 ? null : { index: encodedIndex, length: 3 };
};

/**
 * Converts legacy nested-fragment routes into portable one-fragment routes.
 * Telegram percent-encodes the inner hash before opening links, so both raw
 * `#` and encoded `%23` separators are accepted here.
 */
export const canonicalizeNestedHashRoute = (hash: string): string => {
  if (!hash.startsWith('#/')) return hash;

  const route = hash.slice(1);
  const separator = findNestedHashSeparator(route);
  if (!separator) return hash;

  const routeBeforeNestedHash = route.slice(0, separator.index);
  const nestedFragment = route.slice(separator.index + separator.length);
  const [pathname, search] = splitPathAndSearch(routeBeforeNestedHash);
  const searchParams = new URLSearchParams(search);

  if (pathname.endsWith('/settings') && /^[a-z0-9-]+-settings$/i.test(nestedFragment)) {
    searchParams.set('section', nestedFragment);
  } else if (/\/catalog(?:\/settings)?$/.test(pathname)) {
    const legacyCatalogParams = new URLSearchParams(nestedFragment);
    const catalogSearch = legacyCatalogParams.get('s');
    if (catalogSearch === null) return hash;
    searchParams.set('s', catalogSearch);
  } else {
    return hash;
  }

  const nextSearch = searchParams.toString();
  return `#${pathname}${nextSearch ? `?${nextSearch}` : ''}`;
};
