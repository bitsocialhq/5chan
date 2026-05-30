import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useFeed, useCommunity } from '@bitsocial/bitsocial-react-hooks';
import { useTranslation } from 'react-i18next';
import { shouldShowSnow } from '../../lib/snow';
import { BottomButton, CatalogButton, ReturnButton, TopButton } from '../../components/board-buttons/board-buttons';
import ErrorDisplay from '../../components/error-display/error-display';
import { PageFooterDesktop, PageFooterMobile, ThreadFooterStyleRow } from '../../components/footer';
import LoadingEllipsis from '../../components/loading-ellipsis';
import { useResolvedCommunityAddress } from '../../hooks/use-resolved-community-address';
import { useCommunityField } from '../../hooks/use-stable-community';
import { useFeedStateString } from '../../hooks/use-state-string';
import { getBoardPath } from '../../lib/utils/route-utils';
import { isCommentArchived } from '../../lib/utils/comment-moderation-utils';
import { removeMarkdown } from '../../lib/utils/post-utils';
import { useDirectories } from '../../hooks/use-directories';
import { useCommunityIdentifier, useCommunityIdentifiers } from '../../hooks/use-community-identifiers';
import styles from './archive.module.css';

type BoardFeedComment = {
  cid?: string;
  [key: string]: unknown;
  threadCid?: string;
  link?: string;
  content?: string;
  title?: string;
  timestamp?: number;
  number?: number | string;
  archived?: boolean;
  commentModeration?: {
    archived?: boolean;
  };
};

const BOARD_SORT_TYPE = 'active';

const ARCHIVE_FILTER_KEY = 'archived-only';
const SECONDS_PER_DAY = 60 * 60 * 24;

const getThreadLink = (boardPath: string | undefined, comment: BoardFeedComment): string | null => {
  const threadCid = comment.threadCid || comment.cid;
  if (!boardPath || !threadCid) {
    return null;
  }
  return `/${boardPath}/thread/${threadCid}`;
};

const getArchiveExcerptText = ({ content, title, link }: Pick<BoardFeedComment, 'content' | 'title' | 'link'>, t: (key: string) => string) => {
  const cleanTitle = typeof title === 'string' ? removeMarkdown(title).trim() : '';
  const cleanContent = typeof content === 'string' ? removeMarkdown(content).trim() : '';
  const cleanLink = typeof link === 'string' ? link.trim() : '';
  return cleanTitle || cleanContent || cleanLink || t('no_content');
};

const normalizeTimestamp = (timestamp: BoardFeedComment['timestamp']) => {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp) || timestamp <= 0) {
    return null;
  }

  return timestamp > 1_000_000_000_000 ? Math.floor(timestamp / 1000) : Math.floor(timestamp);
};

const getArchiveWindowInDays = (comments: BoardFeedComment[]) => {
  const oldestTimestamp = comments.reduce<number | null>((oldest, comment) => {
    const normalizedTimestamp = normalizeTimestamp(comment.timestamp);
    if (normalizedTimestamp === null) {
      return oldest;
    }

    if (oldest === null) {
      return normalizedTimestamp;
    }

    return Math.min(oldest, normalizedTimestamp);
  }, null);

  if (oldestTimestamp === null) {
    return null;
  }

  const currentTimestamp = Math.floor(Date.now() / 1000);
  const elapsedSeconds = Math.max(0, currentTimestamp - oldestTimestamp);

  return Math.max(1, Math.ceil(elapsedSeconds / SECONDS_PER_DAY));
};

const ArchiveFooter = ({ hasMore, loadingState, onLoadMore }: { hasMore: boolean; loadingState: string; onLoadMore: () => void }) => {
  const { t } = useTranslation();

  if (!hasMore) {
    return null;
  }

  return (
    <div className={styles.footerState}>
      <button type='button' className={styles.loadMoreButton} onClick={onLoadMore}>
        {t('load_more')}
      </button>
      <LoadingEllipsis string={loadingState} />
    </div>
  );
};

const ArchiveDesktopTopControls = ({ communityAddress }: { communityAddress: string | undefined }) => (
  <div className={styles.desktopNavLinks}>
    <span>
      [<ReturnButton address={communityAddress} />]
    </span>
    <span>
      [<CatalogButton address={communityAddress} />]
    </span>
    <span>
      [<BottomButton />]
    </span>
  </div>
);

const ArchiveDesktopFooterControls = ({ communityAddress }: { communityAddress: string | undefined }) => (
  <div className={styles.desktopFooterButtons}>
    <span>
      [<ReturnButton address={communityAddress} />]
    </span>
    <span>
      [<CatalogButton address={communityAddress} />]
    </span>
    <span>
      [<TopButton />]
    </span>
  </div>
);

const ArchiveMobileTopControls = ({ communityAddress }: { communityAddress: string | undefined }) => (
  <div className={styles.mobileNavLinks}>
    <ReturnButton address={communityAddress} />
    <CatalogButton address={communityAddress} />
    <BottomButton />
  </div>
);

const ArchiveMobileFooterControls = ({ communityAddress }: { communityAddress: string | undefined }) => (
  <div className={styles.mobileFooterButtons}>
    <ReturnButton address={communityAddress} />
    <CatalogButton address={communityAddress} />
    <TopButton />
  </div>
);

const Archive = () => {
  const { t } = useTranslation();
  const params = useParams();
  const boardIdentifier = params.boardIdentifier;
  const directories = useDirectories();

  const communityAddress = useResolvedCommunityAddress(boardIdentifier);

  const boardPath = useMemo(() => {
    if (!communityAddress) {
      return boardIdentifier;
    }
    return getBoardPath(communityAddress, directories);
  }, [boardIdentifier, directories, communityAddress]);

  const boardTitle = useCommunityField(communityAddress, (community) => community?.title) || `/${boardIdentifier || communityAddress || t('archive')}/`;

  const archiveFilter = useMemo(
    () => ({
      filter: (comment: BoardFeedComment) => isCommentArchived(comment),
      key: ARCHIVE_FILTER_KEY,
    }),
    [],
  );

  const communityAddresses = useMemo(() => (communityAddress ? [communityAddress] : []), [communityAddress]);
  const communities = useCommunityIdentifiers(communityAddresses);
  const communityIdentifier = useCommunityIdentifier(communityAddress);

  const feedOptions = useMemo(
    () => ({
      communities,
      sortType: BOARD_SORT_TYPE,
      filter: archiveFilter,
    }),
    [communities, archiveFilter],
  );

  const { feed, hasMore, loadMore } = useFeed(feedOptions);
  const loadingState = useFeedStateString(communityAddresses) || (hasMore ? t('loading_feed') : t('no_threads'));
  const community = useCommunity(communityIdentifier ? { community: communityIdentifier } : undefined);
  const { error: communityError } = community || {};
  const archiveWindowInDays = useMemo(() => getArchiveWindowInDays(feed), [feed]);
  const isLoading = feed.length === 0 && hasMore;
  const isEmpty = feed.length === 0 && !hasMore;
  const summaryText = isEmpty
    ? t('no_archived_threads')
    : archiveWindowInDays === null
      ? t('displaying_x_archived_threads', { count: feed.length })
      : t('displaying_x_archived_threads_from_past_x_days', {
          count: feed.length,
          days: archiveWindowInDays,
        });

  useEffect(() => {
    document.title = `${boardTitle} / ${t('archive')} - 5chan`;
  }, [boardTitle, t]);

  if (isLoading) {
    return (
      <div id='top' className={`${styles.page} ${shouldShowSnow() ? styles.garland : ''}`}>
        <ArchiveMobileTopControls communityAddress={communityAddress} />
        <hr className={styles.desktopDivider} />
        <ArchiveDesktopTopControls communityAddress={communityAddress} />
        <hr className={styles.divider} />
        <h4 className={styles.archiveSummary}>
          <LoadingEllipsis string={t('loading_archive')} />
        </h4>
        <PageFooterDesktop firstRow={<ArchiveDesktopFooterControls communityAddress={communityAddress} />} styleRow={<ThreadFooterStyleRow />} />
        <PageFooterMobile>
          <ArchiveMobileFooterControls communityAddress={communityAddress} />
        </PageFooterMobile>
      </div>
    );
  }

  return (
    <div id='top' className={`${styles.page} ${shouldShowSnow() ? styles.garland : ''}`}>
      <ArchiveMobileTopControls communityAddress={communityAddress} />
      <hr className={styles.desktopDivider} />
      <ArchiveDesktopTopControls communityAddress={communityAddress} />
      <hr className={styles.divider} />
      <h4 className={styles.archiveSummary}>{summaryText}</h4>

      {communityError && (
        <div className={styles.error}>
          <ErrorDisplay error={communityError} />
        </div>
      )}

      {!isEmpty && (
        <table id='arc-list' className={styles.flashListing}>
          <thead>
            <tr>
              <td className={styles.postblock}>No.</td>
              <td className={styles.postblock}>Excerpt</td>
              <td className={styles.postblock} aria-label='Actions'></td>
            </tr>
          </thead>
          <tbody>
            {feed.map((comment, index) => {
              const threadLink = getThreadLink(boardPath, comment);
              const threadNumber = comment.threadCid || comment.number || comment.cid;
              const cleanTitle = typeof comment.title === 'string' ? removeMarkdown(comment.title).trim() : '';
              const cleanContent = typeof comment.content === 'string' ? removeMarkdown(comment.content).trim() : '';
              const excerptText = getArchiveExcerptText(comment, t);

              return (
                <tr key={comment.cid || `archive-${index}`} className={`${styles.arcRow} ${index % 2 === 0 ? styles.rowOdd : ''}`}>
                  <td className={styles.numberCell}>{threadNumber || '—'}</td>
                  <td className={styles.teaserCol} title={excerptText}>
                    {cleanTitle ? (
                      <>
                        <b>{cleanTitle}</b>
                        {cleanContent ? ': ' : ''}
                        {cleanContent || null}
                      </>
                    ) : (
                      excerptText
                    )}
                  </td>
                  <td className={styles.viewCell}>
                    {threadLink ? (
                      <>
                        [
                        <Link to={threadLink} className={styles.viewLink}>
                          {t('view')}
                        </Link>
                        ]
                      </>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <ArchiveFooter hasMore={hasMore} loadingState={loadingState} onLoadMore={loadMore} />

      <PageFooterDesktop firstRow={<ArchiveDesktopFooterControls communityAddress={communityAddress} />} styleRow={<ThreadFooterStyleRow />} />
      <PageFooterMobile>
        <ArchiveMobileFooterControls communityAddress={communityAddress} />
      </PageFooterMobile>
    </div>
  );
};

export default Archive;
