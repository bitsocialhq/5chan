import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SEARCH_PROVIDERS } from '../../lib/search-providers';
import useSearchProviderStore from '../../stores/use-search-provider-store';
import styles from './search.module.css';

const SearchDirectory = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const query = (searchParams.get('q') ?? '').trim();
  const selectedProviderId = useSearchProviderStore((state) => state.selectedProviderId);
  const setSelectedProviderId = useSearchProviderStore((state) => state.setSelectedProviderId);
  const returnPath = query ? `/search?q=${encodeURIComponent(query)}` : '/search';

  useEffect(() => {
    document.title = `${t('change_provider')} - ${t('archive_search_title')} - 5chan`;
  }, [t]);

  return (
    <main className={styles.page}>
      <div className={styles.directoryNav}>
        [<Link to={returnPath}>{t('return')}</Link>]
      </div>
      <h4 className={styles.summary}>{t('search_provider_directory_subtitle')}</h4>
      <table className={styles.providerTable}>
        <thead>
          <tr>
            <th scope='col'>No.</th>
            <th scope='col'>{capitalizeFirst(t('name'))}</th>
            <th scope='col'>API</th>
            <th scope='col'>{t('directory_status')}</th>
          </tr>
        </thead>
        <tbody>
          {SEARCH_PROVIDERS.map((provider, index) => {
            const isSelected = provider.id === selectedProviderId;
            return (
              <tr key={provider.id} className={index % 2 === 0 ? styles.rowOdd : undefined}>
                <td>{index + 1}</td>
                <td>
                  <label>
                    <input type='radio' name='search-provider' value={provider.id} checked={isSelected} onChange={() => setSelectedProviderId(provider.id)} />{' '}
                    <a href={provider.siteUrl} target='_blank' rel='noreferrer noopener'>
                      {provider.name}
                    </a>
                  </label>
                </td>
                <td>
                  <a href={provider.apiUrl} target='_blank' rel='noreferrer noopener'>
                    {new URL(provider.apiUrl).host}
                  </a>
                </td>
                <td>{isSelected ? t('current_provider') : ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
};

const capitalizeFirst = (value: string): string => (value ? `${value[0].toUpperCase()}${value.slice(1)}` : value);

export default SearchDirectory;
