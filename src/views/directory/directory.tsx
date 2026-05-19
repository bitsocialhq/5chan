import { useEffect, useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { useCommunity } from '@bitsocial/bitsocial-react-hooks';
import { shouldShowSnow } from '../../lib/snow';
import { BottomButton, CatalogButton, ReturnButton, TopButton } from '../../components/board-buttons/board-buttons';
import { PageFooterDesktop, PageFooterMobile, ThreadFooterStyleRow } from '../../components/footer';
import LoadingEllipsis from '../../components/loading-ellipsis';
import Tooltip from '../../components/tooltip';
import { useDirectories } from '../../hooks/use-directories';
import { useCommunityIdentifier } from '../../hooks/use-community-identifiers';
import { useResolvedCommunityAddress } from '../../hooks/use-resolved-community-address';
import { isDirectoryRoute } from '../../lib/utils/route-utils';
import { DirectoryListBoard, sortDirectoryBoardsByRank, useDirectoryList } from '../../hooks/use-directory-list';
import { type CommunityFreshnessState, isCommunityKnownOffline } from '../../lib/utils/community-freshness-utils';
import getShortAddress from '../../lib/get-short-address';
import { get5chanDeveloperBadge } from '../../lib/utils/author-display-utils';
import useCommunityOfflineStore from '../../stores/use-community-offline-store';
import useIsCommunityOffline from '../../hooks/use-is-community-offline';
import { useNowSeconds } from '../../hooks/use-now-seconds';
import postStyles from '../post/post.module.css';
import styles from './directory.module.css';

const DIRECTORY_STATUS_CHECK_LIMIT = 5;
const DIRECTORY_STATUS_UNAVAILABLE_MARKER = '\u2014';

const computeBoardStatus = (
  communityState: CommunityFreshnessState | undefined,
  offlineState: CommunityFreshnessState | undefined,
  nowSeconds: number,
  isOffline: boolean,
  isOnlineStatusLoading: boolean,
): 'online' | 'offline' | 'loading' | 'unknown' => {
  const freshnessState = {
    state: communityState?.state ?? offlineState?.state,
    updatedAt: communityState?.updatedAt ?? offlineState?.updatedAt,
  };

  if (isOffline || isCommunityKnownOffline(freshnessState, nowSeconds)) return 'offline';
  if (isOnlineStatusLoading) return 'loading';
  if (!freshnessState.updatedAt) return 'unknown';
  return 'online';
};

const PASS_LINK = '/pass';

const DirectoryDesktopTopControls = ({ communityAddress }: { communityAddress: string | undefined }) => (
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

const DirectoryDesktopFooterControls = ({ communityAddress }: { communityAddress: string | undefined }) => (
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

const DirectoryMobileTopControls = ({ communityAddress }: { communityAddress: string | undefined }) => (
  <div className={styles.mobileNavLinks}>
    <ReturnButton address={communityAddress} />
    <CatalogButton address={communityAddress} />
    <BottomButton />
  </div>
);

const DirectoryMobileFooterControls = ({ communityAddress }: { communityAddress: string | undefined }) => (
  <div className={styles.mobileFooterButtons}>
    <ReturnButton address={communityAddress} />
    <CatalogButton address={communityAddress} />
    <TopButton />
  </div>
);

interface DirectoryRowProps {
  board: DirectoryListBoard;
  nowSeconds: number;
  rank: number;
  onVote: () => void;
}

const DirectoryRow = ({ board, nowSeconds, rank, onVote }: DirectoryRowProps) => {
  const { t } = useTranslation();
  const statusUnavailableReason = t('directory_status_unavailable_reason');
  const ownerAddress = board.owner;
  const ownerDisplay = ownerAddress ? getShortAddress(ownerAddress) || ownerAddress : undefined;
  const developerBadge = get5chanDeveloperBadge(ownerAddress);
  const shouldCheckStatus = rank <= DIRECTORY_STATUS_CHECK_LIMIT;
  const communityIdentifier = useCommunityIdentifier(shouldCheckStatus ? board.address : undefined);
  const community = useCommunity(shouldCheckStatus && communityIdentifier ? { community: communityIdentifier } : undefined);
  const { isOffline, isOnlineStatusLoading } = useIsCommunityOffline(community, shouldCheckStatus ? board.address : undefined);
  const offlineState = useCommunityOfflineStore((state) => (shouldCheckStatus ? state.communityOfflineState[board.address] : undefined));
  const status = shouldCheckStatus ? computeBoardStatus(community, offlineState, nowSeconds, isOffline, isOnlineStatusLoading) : 'unavailable';
  const boardLink = `/${board.address}`;

  return (
    <tr className={`${styles.dirRow} ${rank % 2 === 1 ? styles.rowOdd : ''}`}>
      <td className={styles.numberCell}>{rank}</td>
      <td className={styles.boardCol}>{board.address}</td>
      <td className={styles.ownerCell}>
        <span className={developerBadge ? `${styles.ownerName} ${postStyles.capcodeAdmin}` : undefined}>
          {ownerDisplay ?? t('directory_owner_anonymous')}
          {developerBadge && (
            <>
              {' ## '}
              {developerBadge.label} <span className={`${postStyles.capcodeIcon} ${postStyles.capcodeAdminIcon}`} title={developerBadge.title} />
            </>
          )}
        </span>
      </td>
      <td className={styles.statusCell}>
        {status === 'unavailable' ? (
          <span className={styles.statusUnavailable}>
            {DIRECTORY_STATUS_UNAVAILABLE_MARKER}
            <Tooltip content={statusUnavailableReason}>
              <sup className={styles.statusUnavailableHelp} aria-label={statusUnavailableReason} tabIndex={0}>
                ?
              </sup>
            </Tooltip>
          </span>
        ) : status === 'loading' ? (
          <LoadingEllipsis string={t('loading')} />
        ) : status === 'unknown' ? (
          <span className={styles.statusUnavailable}>{DIRECTORY_STATUS_UNAVAILABLE_MARKER}</span>
        ) : (
          <span className={status === 'offline' ? styles.statusOffline : styles.statusOnline}>
            {t(status === 'offline' ? 'directory_status_offline' : 'directory_status_online')}
          </span>
        )}
      </td>
      <td className={styles.scoreCell}>
        <span className={styles.scoreValue}>{board.score}</span>
      </td>
      <td className={styles.actionsCell}>
        [
        <button type='button' className={styles.actionButton} onClick={onVote} aria-label={t('upvote')} title={t('upvote')}>
          +1
        </button>
        ] [
        <button type='button' className={styles.actionButton} onClick={onVote} aria-label={t('downvote')} title={t('downvote')}>
          -1
        </button>
        ] [
        <Link to={boardLink} className={styles.viewLink}>
          {t('view')}
        </Link>
        ]
      </td>
    </tr>
  );
};

const getRepoEditUrl = (directoryCode: string) => `https://github.com/bitsocialnet/lists/edit/master/5chan-${directoryCode}-directory.json`;

const Directory = () => {
  const { t } = useTranslation();
  const params = useParams();
  const boardIdentifier = params.boardIdentifier;
  const directories = useDirectories();
  const isValidDirectoryCode = !!boardIdentifier && isDirectoryRoute(boardIdentifier, directories);
  const { list, loading } = useDirectoryList(isValidDirectoryCode ? boardIdentifier : undefined);
  const communityAddress = useResolvedCommunityAddress();
  const nowSeconds = useNowSeconds();

  const ranked = useMemo(() => (list ? sortDirectoryBoardsByRank(list.boards) : []), [list]);
  const directoryTitle = list?.title || (boardIdentifier ? `/${boardIdentifier}/ - ${t('directory')}` : t('directory'));

  useEffect(() => {
    if (!isValidDirectoryCode) return;
    document.title = `${directoryTitle} - 5chan`;
  }, [directoryTitle, isValidDirectoryCode]);

  if (!isValidDirectoryCode) {
    return <Navigate to='/not-found' replace />;
  }

  const handleVoteUnavailable = () => {
    const values = { boardIdentifier };
    window.alert(`${t('directory_voting_unavailable_intro', values)}\n\n${t('directory_voting_unavailable_outro', values)}`);
  };

  const isLoadingShell = loading && ranked.length === 0;
  const boardCount = ranked.length;
  const repoEditUrl = getRepoEditUrl(boardIdentifier!);

  return (
    <div id='top' className={`${styles.page} ${shouldShowSnow() ? styles.garland : ''}`}>
      <DirectoryMobileTopControls communityAddress={communityAddress} />
      <hr className={styles.desktopDivider} />
      <DirectoryDesktopTopControls communityAddress={communityAddress} />
      <hr className={styles.divider} />
      {isLoadingShell ? (
        <h4 className={styles.directorySummary}>
          <LoadingEllipsis string={t('loading_directory')} />
        </h4>
      ) : ranked.length === 0 ? (
        <h4 className={styles.directorySummary}>{t('directory_empty')}</h4>
      ) : (
        <h4 className={styles.directorySummary}>{t('directory_heading', { boardIdentifier, count: boardCount })}</h4>
      )}

      {!isLoadingShell && ranked.length > 0 && (
        <>
          <table className={styles.flashListing}>
            <thead>
              <tr>
                <th className={styles.postblock} scope='col'>
                  No.
                </th>
                <th className={styles.postblock} scope='col'>
                  {t('directory_board')}
                </th>
                <th className={styles.postblock} scope='col'>
                  {t('directory_owner')}
                </th>
                <th className={styles.postblock} scope='col'>
                  {t('directory_status')}
                </th>
                <th className={styles.postblock} scope='col'>
                  {t('directory_score')}
                </th>
                <th className={styles.postblock} scope='col'>
                  {t('directory_vote')}
                </th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((board, index) => (
                <DirectoryRow key={board.address} board={board} nowSeconds={nowSeconds} rank={index + 1} onVote={handleVoteUnavailable} />
              ))}
            </tbody>
          </table>
          <div className={styles.directoryFootnote}>
            <Trans
              i18nKey='directory_footnote'
              values={{ boardIdentifier }}
              components={{
                passLink: <Link to={PASS_LINK} />,
                repoLink: <a href={repoEditUrl} target='_blank' rel='noreferrer noopener' />,
              }}
            />
          </div>
        </>
      )}

      <PageFooterDesktop firstRow={<DirectoryDesktopFooterControls communityAddress={communityAddress} />} styleRow={<ThreadFooterStyleRow />} />
      <PageFooterMobile>
        <DirectoryMobileFooterControls communityAddress={communityAddress} />
      </PageFooterMobile>
    </div>
  );
};

export default Directory;
