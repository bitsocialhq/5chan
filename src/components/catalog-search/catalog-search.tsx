import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from './catalog-search.module.css';
import useIsMobile from '../../hooks/use-is-mobile';
import useCatalogFiltersStore from '../../stores/use-catalog-filters-store';
import debounce from 'lodash/debounce';

const CatalogSearch = () => {
  const { t } = useTranslation();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [searchState, setSearchState] = useState({ open: false, value: '' });
  const { setSearchFilter, clearSearchFilter } = useCatalogFiltersStore();
  const queryParam = new URLSearchParams(search).get('q') ?? '';
  const openSearch = !!queryParam || searchState.open;
  const inputValue = searchState.open || searchState.value ? searchState.value : queryParam;

  useEffect(() => {
    if (queryParam) {
      setSearchFilter(queryParam);
      return;
    }

    clearSearchFilter();
  }, [queryParam, setSearchFilter, clearSearchFilter]);

  const updateURL = useCallback(
    (searchText: string) => {
      const urlParams = new URLSearchParams(search);
      if (searchText.trim()) {
        urlParams.set('q', searchText);
      } else {
        urlParams.delete('q');
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
      <span
        className={`${styles.filtersButton} button`}
        role='button'
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
      </span>
      {!isMobile && ']'}
      {openSearch && (
        <div className={styles.searchContainer}>
          <input
            ref={(el) => el?.focus()}
            type='text'
            value={inputValue}
            onChange={handleSearchChange}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                handleCloseSearch();
              }
            }}
          />
          <span
            className={styles.closeSearch}
            role='button'
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
          </span>
        </div>
      )}
    </>
  );
};

export default CatalogSearch;
