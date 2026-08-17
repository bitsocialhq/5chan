import { Component, Suspense, use, useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { Comment } from '@bitsocial/bitsocial-react-hooks';
import { useTranslation } from 'react-i18next';
import capitalize from 'lodash/capitalize';
import BoardPagination, { type BoardPaginationFooterLink } from '../../components/board-pagination/board-pagination';
import { BottomButton, RefreshButton, TopButton } from '../../components/board-buttons/board-buttons';
import { PageFooterDesktop, PageFooterMobile } from '../../components/footer/footer';
import mobileFooterStyles from '../../components/footer/footer.module.css';
import LoadingEllipsis from '../../components/loading-ellipsis/loading-ellipsis';
import useSearchMatchHighlight from '../../hooks/use-search-match-highlight';
import { clearIndexerSearch, getIndexedPostComment, getIndexerSearch } from '../../lib/search-indexer';
import {
  getSearchPageHref,
  MAX_SEARCH_QUERY_LENGTH,
  SEARCH_CATALOG_PATH,
  SEARCH_DIRECTORY_PATH,
  SEARCH_PATH,
  getSearchDirectoryLinkState,
} from '../../lib/search-navigation';
import { getSearchProvider, type SearchProvider } from '../../lib/search-providers';
import { isSearchCatalogRoute } from '../../lib/utils/route-utils';
import useFeedResetStore from '../../stores/use-feed-reset-store';
import useSearchProviderStore from '../../stores/use-search-provider-store';
import useSearchSummaryStore from '../../stores/use-search-summary-store';
import { Post } from '../post/post';
import SearchCatalog from './search-catalog';
import styles from './search.module.css';

const getPage = (value: string | null): number => {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
};

/** The field is sized in characters like 4chan's, whose search controls carry no CSS width. */
const SEARCH_FIELD_CHARACTERS = 45;
/** Boards cap their pagelist at 10 pages, and search follows the same convention. */
const MAX_SEARCH_PAGES = 10;

/** The catalog and directory have their own buttons, so the pagelist keeps only the page links. */
const NO_FOOTER_LINKS: BoardPaginationFooterLink[] = [];

interface SearchControlsProps {
  isCatalogView: boolean;
  query: string;
}

const SearchDirectoryLink = ({ query }: { query: string }) => {
  const { t } = useTranslation();

  return (
    <Link className='button' to={SEARCH_DIRECTORY_PATH} state={getSearchDirectoryLinkState(query)}>
      {t('directory')}
    </Link>
  );
};

/** Index and catalog link to each other, the way a board and its catalog do. */
const SearchViewLink = ({ isCatalogView, query }: SearchControlsProps) => {
  const { t } = useTranslation();

  return (
    <Link className='button' to={getSearchPageHref(isCatalogView ? SEARCH_PATH : SEARCH_CATALOG_PATH, query)}>
      {t(isCatalogView ? 'return' : 'catalog')}
    </Link>
  );
};

const SearchDesktopTopControls = ({ isCatalogView, query }: SearchControlsProps) => (
  <div className={styles.desktopNavLinks}>
    <span>
      [<SearchViewLink isCatalogView={isCatalogView} query={query} />]
    </span>
    <span>
      [<BottomButton />]
    </span>
    <span>
      [<RefreshButton />]
    </span>
    {/* Boards keep the directory button on the right of the button row. */}
    <span className={styles.rightSideButtons}>
      [<SearchDirectoryLink query={query} />]
    </span>
  </div>
);

const SearchDesktopFooterControls = ({ isCatalogView, query }: SearchControlsProps) => (
  <div className={styles.desktopFooterButtons}>
    <span>
      [<SearchViewLink isCatalogView={isCatalogView} query={query} />]
    </span>
    <span>
      [<TopButton />]
    </span>
    <span>
      [<RefreshButton />]
    </span>
    <span className={styles.rightSideButtons}>
      [<SearchDirectoryLink query={query} />]
    </span>
  </div>
);

const SearchMobileTopControls = ({ isCatalogView, query }: SearchControlsProps) => (
  <div className={styles.mobileNavLinks}>
    <SearchViewLink isCatalogView={isCatalogView} query={query} />
    <BottomButton />
    <RefreshButton />
    <SearchDirectoryLink query={query} />
  </div>
);

const SearchMobileFooterControls = ({ isCatalogView, query }: SearchControlsProps) => (
  <div className={styles.mobileFooterButtons}>
    <SearchViewLink isCatalogView={isCatalogView} query={query} />
    <TopButton />
    <RefreshButton />
    <SearchDirectoryLink query={query} />
  </div>
);

const SearchFooter = ({ isCatalogView, page, query, totalPages }: SearchControlsProps & { page: number; totalPages: number }) => {
  const basePath = isCatalogView ? SEARCH_CATALOG_PATH : SEARCH_PATH;

  return (
    <>
      <PageFooterDesktop
        firstRow={<SearchDesktopFooterControls isCatalogView={isCatalogView} query={query} />}
        styleRow={
          <BoardPagination
            basePath={basePath}
            currentPage={page}
            totalPages={totalPages}
            footerStyle
            getPageHref={(nextPage) => getSearchPageHref(basePath, query, nextPage)}
            footerLinks={NO_FOOTER_LINKS}
          />
        }
      />
      <PageFooterMobile>
        <SearchMobileFooterControls isCatalogView={isCatalogView} query={query} />
        {totalPages > 1 && (
          <>
            <hr />
            <div className={mobileFooterStyles.mobileFooterPagination}>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                <span key={pageNumber}>
                  [
                  <Link
                    to={getSearchPageHref(basePath, query, pageNumber)}
                    className={pageNumber === page ? mobileFooterStyles.mobileFooterPaginationCurrent : undefined}
                  >
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
};

const SearchResults = ({ isCatalogView, page, provider, query }: SearchControlsProps & { page: number; provider: SearchProvider }) => {
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
  // The catalog shows the matched threads, so several matches in one thread collapse into one tile.
  const threads = useMemo(() => {
    const threadsByCid = new Map<string, Comment>();
    for (const { comment, threadComment } of matches) {
      const thread = threadComment ?? comment;
      if (thread.cid && !threadsByCid.has(thread.cid)) {
        threadsByCid.set(thread.cid, thread);
      }
    }
    return [...threadsByCid.values()];
  }, [matches]);
  const totalPages = Math.min(MAX_SEARCH_PAGES, Math.max(1, Math.ceil(result.total / result.limit)));
  const setSummary = useSearchSummaryStore((state) => state.setSummary);

  useSearchMatchHighlight(resultsRef, query);

  // The board header titles the page with the query and how many comments matched it.
  useEffect(() => {
    setSummary(result.query, result.total);
  }, [result, setSummary]);

  return (
    <>
      {matches.length === 0 ? (
        <div className={styles.empty}>{t('search_no_results')}</div>
      ) : isCatalogView ? (
        <SearchCatalog ref={resultsRef} threads={threads} />
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
      <SearchFooter isCatalogView={isCatalogView} page={page} query={query} totalPages={totalPages} />
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
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [retryKey, setRetryKey] = useState(0);
  const query = (searchParams.get('q') ?? '').trim().slice(0, MAX_SEARCH_QUERY_LENGTH);
  const page = getPage(searchParams.get('page'));
  const isCatalogView = isSearchCatalogRoute(location.pathname);
  const selectedProviderId = useSearchProviderStore((state) => state.selectedProviderId);
  const provider = getSearchProvider(selectedProviderId);
  const setResetFunction = useFeedResetStore((state) => state.setResetFunction);

  useEffect(() => {
    const title = query ? `${query} - ${t('archive_search_title')}` : t('archive_search_title');
    document.title = isCatalogView ? `${title} - ${t('catalog')} - 5chan` : `${title} - 5chan`;
  }, [isCatalogView, query, t]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuery = inputRef.current?.value.trim().slice(0, MAX_SEARCH_QUERY_LENGTH) ?? '';
    const basePath = isCatalogView ? SEARCH_CATALOG_PATH : SEARCH_PATH;
    navigate(nextQuery ? getSearchPageHref(basePath, nextQuery) : basePath);
  };

  const retry = useCallback(() => {
    clearIndexerSearch(provider, query, page);
    setRetryKey((value) => value + 1);
  }, [page, provider, query]);

  // The shared refresh button reruns whichever feed is on screen.
  useEffect(() => {
    setResetFunction(retry);
  }, [retry, setResetFunction]);

  return (
    <main id='top' className={styles.page}>
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
          size={SEARCH_FIELD_CHARACTERS}
          aria-label={t('archive_search_subtitle')}
          placeholder={t('archive_search_subtitle')}
        />
        <button type='submit'>{capitalize(t('search'))}</button>
      </form>
      <SearchMobileTopControls isCatalogView={isCatalogView} query={query} />
      <hr className={styles.desktopDivider} />
      <SearchDesktopTopControls isCatalogView={isCatalogView} query={query} />
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
              <SearchFooter isCatalogView={isCatalogView} page={page} query={query} totalPages={1} />
            </>
          }
        >
          <Suspense
            fallback={
              <>
                <div className={styles.loading}>
                  <LoadingEllipsis string={t('loading')} />
                </div>
                <SearchFooter isCatalogView={isCatalogView} page={page} query={query} totalPages={1} />
              </>
            }
          >
            <SearchResults isCatalogView={isCatalogView} page={page} provider={provider} query={query} />
          </Suspense>
        </SearchErrorBoundary>
      ) : (
        <>
          <p className={styles.intro}>{t('archive_search_subtitle')}</p>
          <SearchFooter isCatalogView={isCatalogView} page={page} query={query} totalPages={1} />
        </>
      )}
    </main>
  );
};

export default Search;
