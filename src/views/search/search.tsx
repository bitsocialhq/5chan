import { Component, Suspense, use, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import capitalize from 'lodash/capitalize';
import BoardPagination, { type BoardPaginationFooterLink } from '../../components/board-pagination/board-pagination';
import { BottomButton, TopButton } from '../../components/board-buttons/board-buttons';
import { PageFooterDesktop, PageFooterMobile } from '../../components/footer/footer';
import mobileFooterStyles from '../../components/footer/footer.module.css';
import LoadingEllipsis from '../../components/loading-ellipsis/loading-ellipsis';
import useSearchMatchHighlight from '../../hooks/use-search-match-highlight';
import { clearIndexerSearch, getIndexedPostComment, getIndexerSearch } from '../../lib/search-indexer';
import { getSearchProvider, type SearchProvider } from '../../lib/search-providers';
import useSearchProviderStore from '../../stores/use-search-provider-store';
import { Post } from '../post/post';
import styles from './search.module.css';

const getPage = (value: string | null): number => {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
};

const SEARCH_PATH = '/search';

const getSearchPageHref = (query: string, page = 1): { pathname: string; search: string } => {
  const params = new URLSearchParams({ q: query });
  if (page > 1) params.set('page', String(page));
  return { pathname: SEARCH_PATH, search: `?${params.toString()}` };
};

const getSearchPath = (query: string, page = 1): string => {
  const { pathname, search } = getSearchPageHref(query, page);
  return `${pathname}${search}`;
};

const MAX_SEARCH_QUERY_LENGTH = 200;
/** Boards cap their pagelist at 10 pages, and search follows the same convention. */
const MAX_SEARCH_PAGES = 10;

const SEARCH_DIRECTORY_PATH = '/search/directory';
/** The provider directory has its own button row, so the pagelist keeps only the page links. */
const NO_FOOTER_LINKS: BoardPaginationFooterLink[] = [];

/** Keeps the current query out of the directory URL while still allowing a return to it. */
const getDirectoryLinkState = (query: string) => (query ? { returnPath: getSearchPath(query) } : undefined);

const SearchDirectoryLink = ({ query }: { query: string }) => {
  const { t } = useTranslation();

  return (
    <Link className='button' to={SEARCH_DIRECTORY_PATH} state={getDirectoryLinkState(query)}>
      {t('directory')}
    </Link>
  );
};

const SearchDesktopTopControls = ({ query }: { query: string }) => (
  <div className={styles.desktopNavLinks}>
    <span>
      [<BottomButton />]
    </span>
    {/* Boards keep the directory button on the right of the button row. */}
    <span className={styles.rightSideButtons}>
      [<SearchDirectoryLink query={query} />]
    </span>
  </div>
);

const SearchDesktopFooterControls = ({ query }: { query: string }) => (
  <div className={styles.desktopFooterButtons}>
    <span>
      [<TopButton />]
    </span>
    <span className={styles.rightSideButtons}>
      [<SearchDirectoryLink query={query} />]
    </span>
  </div>
);

const SearchMobileTopControls = ({ query }: { query: string }) => (
  <div className={styles.mobileNavLinks}>
    <SearchDirectoryLink query={query} />
    <BottomButton />
  </div>
);

const SearchMobileFooterControls = ({ query }: { query: string }) => (
  <div className={styles.mobileFooterButtons}>
    <SearchDirectoryLink query={query} />
    <TopButton />
  </div>
);

const SearchProviderAttribution = ({ provider, query }: { provider: SearchProvider; query: string }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.providerNote}>
      {t('results_provided_by')}{' '}
      <a href={provider.siteUrl} target='_blank' rel='noreferrer noopener'>
        {provider.name}
      </a>{' '}
      [
      <Link to={SEARCH_DIRECTORY_PATH} state={getDirectoryLinkState(query)}>
        {t('change_provider')}
      </Link>
      ]
    </div>
  );
};

const SearchFooter = ({ page, query, totalPages }: { page: number; query: string; totalPages: number }) => (
  <>
    <PageFooterDesktop
      firstRow={<SearchDesktopFooterControls query={query} />}
      styleRow={
        <BoardPagination
          basePath={SEARCH_PATH}
          currentPage={page}
          totalPages={totalPages}
          footerStyle
          getPageHref={(nextPage) => getSearchPageHref(query, nextPage)}
          footerLinks={NO_FOOTER_LINKS}
        />
      }
    />
    <PageFooterMobile>
      <SearchMobileFooterControls query={query} />
      {totalPages > 1 && (
        <>
          <hr />
          <div className={mobileFooterStyles.mobileFooterPagination}>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <span key={pageNumber}>
                [
                <Link to={getSearchPageHref(query, pageNumber)} className={pageNumber === page ? mobileFooterStyles.mobileFooterPaginationCurrent : undefined}>
                  {pageNumber}
                </Link>
                ]
              </span>
            ))}
          </div>
        </>
      )}
    </PageFooterMobile>
  </>
);

const SearchResults = ({ page, provider, query }: { page: number; provider: SearchProvider; query: string }) => {
  const { t } = useTranslation();
  const result = use(getIndexerSearch(provider, query, page));
  const resultsRef = useRef<HTMLDivElement>(null);
  // A matched reply is shown in its thread: the OP, then that one reply.
  const matches = useMemo(
    () =>
      result.posts.map((post) => {
        const comment = getIndexedPostComment(post);
        const threadPost = post.depth > 0 ? result.threadPosts[post.post_cid] : undefined;
        return {
          comment,
          threadComment: threadPost ? getIndexedPostComment(threadPost) : undefined,
          replyPaginationOverride: { hasMore: false, replies: [comment] },
        };
      }),
    [result],
  );
  const totalPages = Math.min(MAX_SEARCH_PAGES, Math.max(1, Math.ceil(result.total / result.limit)));

  useSearchMatchHighlight(resultsRef, query);

  return (
    <>
      <h4 className={styles.summary}>{t('search_results_heading', { count: result.posts.length, total: result.total, query: result.query })}</h4>
      {matches.length === 0 ? (
        <div className={styles.empty}>{t('search_no_results')}</div>
      ) : (
        <div className={styles.results} ref={resultsRef}>
          {matches.map(({ comment, replyPaginationOverride, threadComment }) =>
            threadComment ? (
              <Post key={comment.cid} post={threadComment} replyPaginationOverride={replyPaginationOverride} />
            ) : (
              <Post key={comment.cid} post={comment} showReplies={false} />
            ),
          )}
        </div>
      )}
      <SearchFooter page={page} query={query} totalPages={totalPages} />
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
    <main id='top' className={styles.page}>
      <SearchMobileTopControls query={query} />
      <hr className={styles.desktopDivider} />
      <SearchDesktopTopControls query={query} />
      <hr className={styles.divider} />
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
            <>
              <div className={styles.error} role='alert'>
                {t('search_provider_unavailable')} [
                <button type='button' onClick={retry}>
                  {t('refresh')}
                </button>
                ]
              </div>
              <SearchFooter page={page} query={query} totalPages={1} />
            </>
          }
        >
          <Suspense
            fallback={
              <>
                <div className={styles.loading}>
                  <LoadingEllipsis centered string={t('loading')} />
                </div>
                <SearchFooter page={page} query={query} totalPages={1} />
              </>
            }
          >
            <SearchResults page={page} provider={provider} query={query} />
          </Suspense>
        </SearchErrorBoundary>
      ) : (
        <>
          <p className={styles.intro}>{t('archive_search_subtitle')}</p>
          <SearchFooter page={page} query={query} totalPages={1} />
        </>
      )}
    </main>
  );
};

export default Search;
