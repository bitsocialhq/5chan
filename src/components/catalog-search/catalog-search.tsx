import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from './catalog-search.module.css';
import useIsMobile from '../../hooks/use-is-mobile';
import useCatalogFiltersStore from '../../stores/use-catalog-filters-store';
import debounce from 'lodash/debounce';
import { getCatalogSearchHash } from '../../lib/utils/route-utils';

const CatalogSearch = () => {
  const { t } = useTranslation();
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();
  const [searchState, setSearchState] = useState({ open: false, value: '' });
  const { setSearchFilter, clearSearchFilter } = useCatalogFiltersStore();
  const legacyQueryParam = new URLSearchParams(search).get('q') ?? '';
  const hashSearchParam = new URLSearchParams(hash.replace(/^#/, '')).get('s') ?? '';
  const catalogSearchParam = hashSearchParam || legacyQueryParam;
  const openSearch = !!catalogSearchParam || searchState.open;
  const inputValue = searchState.open || searchState.value ? searchState.value : catalogSearchParam;

  useEffect(() => {
    if (legacyQueryParam) {
      const urlParams = new URLSearchParams(search);
      urlParams.delete('q');
      const newSearch = urlParams.toString();
      navigate(`${pathname}${newSearch ? `?${newSearch}` : ''}${getCatalogSearchHash(catalogSearchParam)}`, { replace: true });
    }

    if (catalogSearchParam) {
      setSearchFilter(catalogSearchParam);
      return;
    }

    clearSearchFilter();
  }, [catalogSearchParam, clearSearchFilter, legacyQueryParam, navigate, pathname, search, setSearchFilter]);

  const updateURL = useCallback(
    (searchText: string) => {
      const urlParams = new URLSearchParams(search);
      urlParams.delete('q');
      if (searchText.trim()) {
        const newSearch = urlParams.toString();
        navigate(`${pathname}${newSearch ? `?${newSearch}` : ''}${getCatalogSearchHash(searchText)}`, { replace: true });
        return;
      }
      const newSearch = urlParams.toString();
      const newPath = pathname + (newSearch ? `?${newSearch}` : '');
      navigate(newPath, { replace: true });
    },
    [pathname, search, navigate],
  );

  const debouncedSetSearchFilter = useMemo(
    () =>
      debounce((text: string) => {
        if (text.trim()) {
          setSearchFilter(text);
          updateURL(text);
        } else {
          clearSearchFilter();
          updateURL('');
        }
      }, 300),
    [setSearchFilter, clearSearchFilter, updateURL],
  );

  useEffect(() => {
    return () => debouncedSetSearchFilter.cancel();
  }, [debouncedSetSearchFilter]);

  const handleToggleSearch = useCallback(() => {
    if (openSearch) {
      clearSearchFilter();
      updateURL('');
      setSearchState({ open: false, value: '' });
    } else {
      setSearchState((prev) => ({ open: true, value: prev.value }));
    }
  }, [openSearch, clearSearchFilter, updateURL]);

  const handleCloseSearch = useCallback(() => {
    setSearchState({ open: false, value: '' });
    clearSearchFilter();
    updateURL('');
  }, [clearSearchFilter, updateURL]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setSearchState((prev) => ({ ...prev, value: next }));
    debouncedSetSearchFilter(next);
  };

  const isMobile = useIsMobile();

  return (
    <>
      {!isMobile && '['}
      <button
        type='button'
        className={`${styles.filtersButton} button`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggleSearch();
          }
        }}
        onClick={handleToggleSearch}
      >
        {t('search')}
      </button>
      {!isMobile && ']'}
      {openSearch && (
        <div className={styles.searchContainer}>
          <input
            ref={(el) => el?.focus()}
            type='text'
            aria-label={t('search')}
            value={inputValue}
            onChange={handleSearchChange}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                handleCloseSearch();
              }
            }}
          />
          <button
            type='button'
            className={styles.closeSearch}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCloseSearch();
              }
            }}
            onClick={handleCloseSearch}
          >
            ✖
          </button>
        </div>
      )}
    </>
  );
};

export default CatalogSearch;
