import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from './catalog-search.module.css';
import useIsMobile from '../../hooks/use-is-mobile';
import useCatalogFiltersStore from '../../stores/use-catalog-filters-store';
import debounce from 'lodash/debounce';
import { getCatalogSearchPath } from '../../lib/utils/route-utils';

const CatalogSearch = () => {
  const { t } = useTranslation();
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();
  const [searchState, setSearchState] = useState({ open: false, value: '' });
  const { setSearchFilter, clearSearchFilter } = useCatalogFiltersStore();
  const searchParams = new URLSearchParams(search);
  const querySearchParam = searchParams.get('s') ?? '';
  const legacyQueryParam = searchParams.get('q') ?? '';
  const hashSearchParam = new URLSearchParams(hash.replace(/^#/, '')).get('s') ?? '';
  const catalogSearchParam = querySearchParam || hashSearchParam || legacyQueryParam;
  const openSearch = !!catalogSearchParam || searchState.open;
  const inputValue = searchState.open || searchState.value ? searchState.value : catalogSearchParam;

  useEffect(() => {
    if (hashSearchParam || legacyQueryParam) {
      navigate(getCatalogSearchPath(pathname, catalogSearchParam, search), { replace: true });
    }

    if (catalogSearchParam) {
      setSearchFilter(catalogSearchParam);
      return;
    }

    clearSearchFilter();
  }, [catalogSearchParam, clearSearchFilter, hashSearchParam, legacyQueryParam, navigate, pathname, search, setSearchFilter]);

  const updateURL = useCallback(
    (searchText: string) => {
      navigate(getCatalogSearchPath(pathname, searchText, search), { replace: true });
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
