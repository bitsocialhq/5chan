import { Component, Suspense, use, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import capitalize from 'lodash/capitalize';
import LoadingEllipsis from '../../components/loading-ellipsis/loading-ellipsis';
import { type DirectoryCommunity, useDirectories } from '../../hooks/use-directories';
import { clearIndexerSearch, getIndexerSearch, getProviderPostUrl, type IndexedPost } from '../../lib/search-indexer';
import { getSearchProvider, type SearchProvider } from '../../lib/search-providers';
import { getBoardPath } from '../../lib/utils/route-utils';
import { getFormattedDate } from '../../lib/utils/time-utils';
import useSearchProviderStore from '../../stores/use-search-provider-store';
import styles from './search.module.css';

const getPage = (value: string | null): number => {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
};

const getSearchPath = (query: string, page = 1): string => {
  const params = new URLSearchParams({ q: query });
  if (page > 1) params.set('page', String(page));
  return `/search?${params.toString()}`;
};

const MAX_SEARCH_QUERY_LENGTH = 200;

const SearchProviderAttribution = ({ provider, query }: { provider: SearchProvider; query: string }) => {
  const { t } = useTranslation();
  const directoryParams = new URLSearchParams();
  if (query) directoryParams.set('q', query);
  const directoryPath = `/search/directory${directoryParams.size > 0 ? `?${directoryParams.toString()}` : ''}`;

  return (
    <div className={styles.providerNote}>
      {t('results_provided_by')}{' '}
      <a href={provider.siteUrl} target='_blank' rel='noreferrer noopener'>
        {provider.name}
      </a>{' '}
      [<Link to={directoryPath}>{t('change_provider')}</Link>]
    </div>
  );
};

const SearchResult = ({ directories, post, provider }: { directories: DirectoryCommunity[]; post: IndexedPost; provider: SearchProvider }) => {
  const { t } = useTranslation();
  const boardPath = getBoardPath(post.community_address, directories);
  const providerPostUrl = getProviderPostUrl(provider, boardPath, post.cid);
  const content = post.content?.trim() ?? '';
  const excerpt = content.length > 600 ? `${content.slice(0, 600)}…` : content;

  return (
    <article className={styles.result}>
      <div className={styles.resultInfo}>
        <Link to={`/${boardPath}`} className={styles.boardLink}>
          /{boardPath}/
        </Link>{' '}
        {post.title ? <span className={styles.subject}>{post.title}</span> : null}
        {post.title ? ' ' : null}
        <span className={styles.name}>{post.author_name || capitalize(t('anonymous'))}</span>{' '}
        <time dateTime={new Date(post.timestamp * 1000).toISOString()}>{getFormattedDate(post.timestamp)}</time> {post.depth > 0 ? `${t('reply')} ` : null}
        {post.archived ? <span className={styles.archived}>[{t('archived')}]</span> : null}
        {' ['}
        <a href={providerPostUrl} target='_blank' rel='noreferrer noopener'>
          {t('view')}
        </a>
        {']'}
      </div>
      {excerpt ? <blockquote className={styles.message}>{excerpt}</blockquote> : null}
    </article>
  );
};

const SearchResults = ({ page, provider, query }: { page: number; provider: SearchProvider; query: string }) => {
  const { t } = useTranslation();
  const directories = useDirectories();
  const result = use(getIndexerSearch(provider, query, page));
  const hasPrevious = result.page > 1;
  const hasNext = result.page * result.limit < result.total;

  return (
    <>
      <h4 className={styles.summary}>{t('search_results_heading', { count: result.posts.length, total: result.total, query: result.query })}</h4>
      {result.posts.length === 0 ? (
        <div className={styles.empty}>{t('search_no_results')}</div>
      ) : (
        <div className={styles.results}>
          {result.posts.map((post) => (
            <SearchResult key={post.cid} directories={directories} post={post} provider={provider} />
          ))}
        </div>
      )}
      {(hasPrevious || hasNext) && (
        <nav className={styles.pagination} aria-label={t('pagination.pageLabel')}>
          {hasPrevious ? <Link to={getSearchPath(query, page - 1)}>{t('previous')}</Link> : <span>{t('previous')}</span>}
          {' ['}
          {result.page}
          {'] '}
          {hasNext ? <Link to={getSearchPath(query, page + 1)}>{t('next')}</Link> : <span>{t('next')}</span>}
        </nav>
      )}
    </>
  );
};

interface SearchErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

class SearchErrorBoundary extends Component<SearchErrorBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const Search = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [retryKey, setRetryKey] = useState(0);
  const query = (searchParams.get('q') ?? '').trim().slice(0, MAX_SEARCH_QUERY_LENGTH);
  const page = getPage(searchParams.get('page'));
  const selectedProviderId = useSearchProviderStore((state) => state.selectedProviderId);
  const provider = getSearchProvider(selectedProviderId);

  useEffect(() => {
    document.title = query ? `${query} - ${t('archive_search_title')} - 5chan` : `${t('archive_search_title')} - 5chan`;
  }, [query, t]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuery = inputRef.current?.value.trim().slice(0, MAX_SEARCH_QUERY_LENGTH) ?? '';
    navigate(nextQuery ? getSearchPath(nextQuery) : '/search');
  };

  const retry = () => {
    clearIndexerSearch(provider, query, page);
    setRetryKey((value) => value + 1);
  };

  return (
    <main className={styles.page}>
      <form className={styles.searchForm} role='search' onSubmit={handleSubmit}>
        <input
          key={query}
          ref={inputRef}
          type='search'
          defaultValue={query}
          autoCorrect='off'
          autoComplete='off'
          spellCheck='false'
          autoCapitalize='off'
          maxLength={MAX_SEARCH_QUERY_LENGTH}
          aria-label={t('archive_search_subtitle')}
          placeholder={t('archive_search_subtitle')}
        />
        <button type='submit'>{capitalize(t('search'))}</button>
      </form>
      <SearchProviderAttribution provider={provider} query={query} />
      {query ? (
        <SearchErrorBoundary
          key={`${provider.id}:${query}:${page}:${retryKey}`}
          fallback={
            <div className={styles.error} role='alert'>
              {t('search_provider_unavailable')} [
              <button type='button' onClick={retry}>
                {t('refresh')}
              </button>
              ]
            </div>
          }
        >
          <Suspense
            fallback={
              <div className={styles.loading}>
                <LoadingEllipsis centered string={t('loading')} />
              </div>
            }
          >
            <SearchResults page={page} provider={provider} query={query} />
          </Suspense>
        </SearchErrorBoundary>
      ) : (
        <p className={styles.intro}>{t('archive_search_subtitle')}</p>
      )}
    </main>
  );
};

export default Search;
