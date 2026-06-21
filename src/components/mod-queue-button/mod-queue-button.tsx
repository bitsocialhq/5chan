import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Comment, useCommunity, useFeed } from '@bitsocial/bitsocial-react-hooks';
import useModQueueStore from '../../stores/use-mod-queue-store';
import { areSameBoardAddress, getCommunityAddress } from '../../lib/utils/route-utils';
import { useDirectories } from '../../hooks/use-directories';
import { isPendingApprovalAwaiting } from '../../lib/utils/pending-approval-moderation';
import { useCommunityIdentifier, useCommunityIdentifiers } from '../../hooks/use-community-identifiers';
import { useCurrentTime } from '../../hooks/use-current-time';
import { canAccessBoardModQueue, hasModQueueAccessRole } from '../../lib/utils/mod-access';
import { useModeratedCommunityAddressInputs, useModeratedCommunityAddressesForInputs } from '../../hooks/use-moderated-community-addresses';
import { getAddressListFromKey, getAddressListKey } from '../../lib/utils/mod-queue-utils';
import { useLocallyModeratedModQueueFeed } from '../../hooks/use-locally-moderated-mod-queue-feed';
import ModQueueCommunityMetadataLoader from '../mod-queue-community-metadata-loader';
import styles from './mod-queue-button.module.css';

interface ModQueueButtonProps {
  boardIdentifier?: string;
  isMobile?: boolean;
}

interface ModQueueButtonContentProps {
  feed: Comment[];
  alertThresholdSeconds: number;
  boardIdentifier?: string;
  isMobile?: boolean;
}

const ModQueueButtonContent = ({ feed, alertThresholdSeconds, boardIdentifier, isMobile }: ModQueueButtonContentProps) => {
  const { t } = useTranslation();
  const currentTime = useCurrentTime();
  const locallyModeratedFeed = useLocallyModeratedModQueueFeed(feed, currentTime);

  const { normalCount, urgentCount } = useMemo(() => {
    let normal = 0;
    let urgent = 0;
    for (const comment of locallyModeratedFeed) {
      if (!isPendingApprovalAwaiting(comment)) continue;
      const timeWaiting = currentTime - (comment.timestamp ?? 0);
      if (timeWaiting > alertThresholdSeconds) urgent++;
      else normal++;
    }
    return { normalCount: normal, urgentCount: urgent };
  }, [alertThresholdSeconds, currentTime, locallyModeratedFeed]);

  const totalCount = normalCount + urgentCount;
  const to = boardIdentifier ? `/${boardIdentifier}/mod/queue` : '/mod/queue';

  const buttonContent = (
    <Link className='button' to={to}>
      {t('mod_queue')}
      {totalCount > 0 && (
        <strong>
          (
          {urgentCount > 0 && normalCount > 0 ? (
            <>
              <span className={styles.modQueueButtonCount}>{normalCount}</span>
              <span className={`${styles.modQueueButtonCount} ${styles.modQueueButtonCountAlert}`}>
                {'+'}
                {urgentCount}
              </span>
            </>
          ) : urgentCount > 0 ? (
            <span className={`${styles.modQueueButtonCount} ${styles.modQueueButtonCountAlert}`}>{urgentCount}</span>
          ) : (
            <span className={styles.modQueueButtonCount}>{totalCount}</span>
          )}
          )
        </strong>
      )}
    </Link>
  );

  return isMobile ? buttonContent : <>[{buttonContent}]</>;
};

export const ModQueueButton = ({ boardIdentifier, isMobile }: ModQueueButtonProps) => {
  const getAlertThresholdSeconds = useModQueueStore((state) => state.getAlertThresholdSeconds);

  const moderatedCommunityAddressInputs = useModeratedCommunityAddressInputs();
  const accountAddress = moderatedCommunityAddressInputs.accountAddress;
  const rawAccountCommunityAddresses = useModeratedCommunityAddressesForInputs(moderatedCommunityAddressInputs);
  const accountCommunityAddressesKey = getAddressListKey(rawAccountCommunityAddresses);
  const accountCommunityAddresses = useMemo(() => getAddressListFromKey(accountCommunityAddressesKey), [accountCommunityAddressesKey]);

  const directories = useDirectories();

  const resolvedAddress = useMemo(() => {
    if (boardIdentifier) {
      return getCommunityAddress(boardIdentifier, directories);
    }
    return undefined;
  }, [boardIdentifier, directories]);
  const resolvedCommunity = useCommunityIdentifier(resolvedAddress);
  const community = useCommunity(resolvedCommunity ? { community: resolvedCommunity } : undefined);

  const communityAddresses = useMemo(() => {
    if (resolvedAddress) {
      return [resolvedAddress];
    }
    return accountCommunityAddresses;
  }, [resolvedAddress, accountCommunityAddresses]);

  const accountRole = accountAddress ? community?.roles?.[accountAddress]?.role : undefined;
  const hasBoardAccessFromAccountCommunities = resolvedAddress
    ? accountCommunityAddresses.some((address) => areSameBoardAddress(address, resolvedAddress))
    : accountCommunityAddresses.length > 0;
  const hasBoardAccess = canAccessBoardModQueue({
    boardAddress: resolvedAddress,
    accountCommunityAddresses,
    accountRole,
  });
  const isBoardAccessLoading =
    Boolean(resolvedAddress) &&
    Boolean(accountAddress) &&
    !hasModQueueAccessRole(accountRole) &&
    !hasBoardAccessFromAccountCommunities &&
    community?.state !== 'succeeded' &&
    community?.state !== 'failed';

  // Only fetch if we have addresses to check and permissions
  const shouldFetch = !isBoardAccessLoading && communityAddresses.length > 0 && hasBoardAccess;

  const feedAddresses = shouldFetch ? communityAddresses : [];
  const feedCommunities = useCommunityIdentifiers(feedAddresses);
  const feedOptions = useMemo(
    () => ({
      communities: feedCommunities,
      modQueue: ['pendingApproval'],
      sortType: 'new' as const,
      postsPerPage: 200,
    }),
    [feedCommunities],
  );
  const { feed } = useFeed(feedOptions);
  const metadataLoader = <ModQueueCommunityMetadataLoader candidateCommunityAddresses={moderatedCommunityAddressInputs.candidateCommunityAddresses} />;

  if (!shouldFetch || communityAddresses.length === 0) {
    return metadataLoader;
  }

  const alertThresholdSeconds = getAlertThresholdSeconds();
  // Remount when switching boards so memoized counts reset cleanly.
  const contentKey = communityAddresses.join(',');
  return (
    <>
      {metadataLoader}
      <ModQueueButtonContent key={contentKey} feed={feed} alertThresholdSeconds={alertThresholdSeconds} boardIdentifier={boardIdentifier} isMobile={isMobile} />
    </>
  );
};
