import React, { useMemo, useState, useEffect, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { useFeed, Comment, usePublishCommentModeration, useEditedComment, useCommunity, useAccount } from '@bitsocial/bitsocial-react-hooks';
import useAccountsStore from '@bitsocial/bitsocial-react-hooks/dist/stores/accounts/index.js';
import { Virtuoso } from 'react-virtuoso';
import styles from './mod-queue.module.css';
import useModQueueStore from '../../stores/use-mod-queue-store';
import LoadingEllipsis from '../../components/loading-ellipsis';
import ErrorDisplay from '../../components/error-display/error-display';
import { useFeedStateString } from '../../hooks/use-state-string';
import { getCommunityAddress, getBoardPath, extractDirectoryFromTitle, areSameBoardAddress } from '../../lib/utils/route-utils';
import { useDirectories, DirectoryCommunity } from '../../hooks/use-directories';
import getShortAddress from '../../lib/get-short-address';
import { BOARD_CODE_GROUPS } from '../../constants/board-codes';
import { getHasThumbnail, getCommentMediaInfo } from '../../lib/utils/media-utils';
import {
  approvePendingCommentModeration,
  isPendingApprovalAwaiting,
  isPendingApprovalRejected,
  rejectPendingCommentModeration,
} from '../../lib/utils/pending-approval-moderation';
import { getFormattedDate, getFormattedTimeAgo } from '../../lib/utils/time-utils';
import useFeedResetStore from '../../stores/use-feed-reset-store';
import useChallengesStore from '../../stores/use-challenges-store';
import { alertChallengeVerificationFailed } from '../../lib/utils/challenge-utils';
import { getCommentCommunityAddress } from '../../lib/utils/comment-utils';
import { formatErrorForDisplay } from '../../lib/utils/error-utils';
import {
  filterVisibleModQueueFeed,
  getModQueueCommentRoute,
  getQueuedCommentRouteState,
  getQueuedCommentSnapshot,
  getVisibleQueuedCommentHistory,
  shouldKeepQueuedCommentHistory,
} from '../../lib/utils/mod-queue-utils';
import Tooltip from '../../components/tooltip';
import { useAccountCommunityAddresses } from '../../hooks/use-account-community-addresses';
import { useCommunityIdentifier, useCommunityIdentifiers } from '../../hooks/use-community-identifiers';
import useIsMobile from '../../hooks/use-is-mobile';
import { useCurrentTime } from '../../hooks/use-current-time';
import { Post } from '../post/post';
import { canAccessBoardModQueue, hasModQueueAccessRole } from '../../lib/utils/mod-access';
import capitalize from 'lodash/capitalize';
import lowerCase from 'lodash/lowerCase';
import { PageFooterDesktop, PageFooterMobile, StyleOnlyFooterFirstRow } from '../../components/footer';
import footerStyles from '../../components/footer/footer.module.css';

const { addChallenge } = useChallengesStore.getState();

/** Path for display: directory code, or full address if has TLD, or shortened for long IPNS keys (no dot) */
const getBoardDisplayPath = (address: string, path: string): string => {
  if (path !== address) return path;
  if (address.includes('.')) return address;
  return getShortAddress(address) || address;
};

type LocalModerationEditSummary = Record<string, { timestamp?: number; value: unknown } | undefined>;
type LocalModerationEditSummaries = Record<string, LocalModerationEditSummary | undefined>;

const LOCAL_MODERATION_EDIT_FIELDS = ['approved', 'removed'] as const;
const LOCAL_EDIT_PENDING_SECONDS = 20 * 60;

const shouldApplyLocalModerationEdit = (
  comment: Comment,
  propertyName: (typeof LOCAL_MODERATION_EDIT_FIELDS)[number],
  edit: { timestamp?: number; value: unknown },
  now: number,
) => {
  const editTimestamp = edit.timestamp ?? 0;
  const updatedAt = (comment as { updatedAt?: number }).updatedAt;
  const currentValue = (comment as Record<string, unknown>)[propertyName];

  if (!updatedAt) {
    return Object.is(currentValue, edit.value) || editTimestamp > now - LOCAL_EDIT_PENDING_SECONDS;
  }

  if (updatedAt < editTimestamp || Object.is(currentValue, edit.value)) {
    return true;
  }

  return editTimestamp > now - LOCAL_EDIT_PENDING_SECONDS || updatedAt - editTimestamp < LOCAL_EDIT_PENDING_SECONDS;
};

const applyLocalModerationEdits = (comment: Comment, editSummary: LocalModerationEditSummary | undefined, now: number): Comment => {
  if (!editSummary) {
    return comment;
  }

  let editedComment: Comment | undefined;
  for (const propertyName of LOCAL_MODERATION_EDIT_FIELDS) {
    const edit = editSummary[propertyName];
    if (!edit || edit.value === undefined || !shouldApplyLocalModerationEdit(comment, propertyName, edit, now)) {
      continue;
    }
    editedComment = { ...(editedComment ?? comment), [propertyName]: edit.value } as Comment;
  }

  return editedComment ?? comment;
};

const useLocallyModeratedModQueueFeed = (feed: Comment[], currentTime: number) => {
  const accountId = useAccountsStore((state) => state.activeAccountId);
  const editSummaries = useAccountsStore((state) => (accountId ? state.accountsEditsSummaries[accountId] : undefined)) as LocalModerationEditSummaries | undefined;

  return useMemo(() => {
    if (!editSummaries) {
      return feed;
    }
    return feed.map((comment) => (comment.cid ? applyLocalModerationEdits(comment, editSummaries[comment.cid], currentTime) : comment));
  }, [currentTime, editSummaries, feed]);
};

interface ModQueueViewProps {
  boardIdentifier?: string; // If provided, shows queue for single board
}

interface ModQueueFooterProps {
  hasMore: boolean;
  communityAddresses: string[];
}

// Defined outside ModQueueView to preserve component identity across renders (Virtuoso optimization)
// The useFeedStateString hook is called here instead of in ModQueueView to isolate re-renders
// caused by backend IPFS state changes to just this footer component
const ModQueueFooter = ({ hasMore, communityAddresses }: ModQueueFooterProps) => {
  const { t } = useTranslation();
  const loadingStateString = useFeedStateString(communityAddresses) || t('loading');

  return hasMore ? (
    <div className={styles.footer}>
      <LoadingEllipsis string={loadingStateString} />
    </div>
  ) : null;
};

interface ModQueueRowProps {
  comment: Comment;
  isOdd?: boolean;
  showBoard?: boolean;
  /** Board path for URLs (directory code or full address) */
  boardPath: string | undefined;
  /** Board path for display (shortened when long IPNS key with no TLD) */
  boardDisplayPath: string | undefined;
}

// Track which action was initiated to show appropriate completion message
type ModerationAction = 'approve' | 'reject' | null;

interface ModQueueActionState {
  status: 'approved' | 'rejected' | 'failed' | null;
  error?: unknown;
  errorMessage?: string;
  isPublishing: boolean;
  handleApprove: () => Promise<void>;
  handleReject: () => Promise<void>;
  handleRemove?: () => void;
}

interface ModQueueActionsProps {
  status: 'approved' | 'rejected' | 'failed' | null;
  error?: unknown;
  errorMessage?: string;
  isPublishing: boolean;
  handleApprove: () => Promise<void>;
  handleReject: () => Promise<void>;
  handleRemove?: () => void;
  variant: 'row' | 'card';
}

const ModQueueActions = ({ status, error, errorMessage, isPublishing, handleApprove, handleReject, handleRemove, variant }: ModQueueActionsProps) => {
  const { t } = useTranslation();
  const displayError = error || errorMessage;

  const removeButton = handleRemove ? (
    variant === 'row' ? (
      <span className={styles.buttonWrapper}>
        [
        <button className={styles.button} onClick={handleRemove} disabled={isPublishing}>
          {t('remove')}
        </button>
        ]
      </span>
    ) : (
      <span className={styles.cardRemoveButtonWrapper}>
        [
        <button className={styles.cardRemoveButton} onClick={handleRemove} disabled={isPublishing}>
          {t('remove')}
        </button>
        ]
      </span>
    )
  ) : null;

  if (status === 'approved') {
    const content = <span className={`${styles.button} ${styles.approve}`}>{t('approved')}</span>;
    return variant === 'card' ? (
      <div className={styles.cardActions}>
        {content}
        {removeButton}
      </div>
    ) : (
      <span className={styles.actionButtons}>
        {content} {removeButton}
      </span>
    );
  }
  if (status === 'rejected') {
    const content = <span className={`${styles.button} ${styles.reject}`}>{t('rejected')}</span>;
    return variant === 'card' ? (
      <div className={styles.cardActions}>
        {content}
        {removeButton}
      </div>
    ) : (
      <span className={styles.actionButtons}>
        {content} {removeButton}
      </span>
    );
  }
  if (status === 'failed') {
    const content = displayError ? (
      <ErrorDisplay error={displayError} displayMessage={t('failed')} inline={true} showImmediately={true} />
    ) : (
      <span className={`${styles.button} ${styles.reject}`}>{t('failed')}</span>
    );
    return variant === 'card' ? <div className={styles.cardActions}>{content}</div> : content;
  }
  if (isPublishing) {
    const content = <LoadingEllipsis string={t('publishing')} />;
    return variant === 'card' ? <div className={styles.cardActions}>{content}</div> : content;
  }

  const buttons =
    variant === 'row' ? (
      <div className={styles.actionButtons}>
        <span className={styles.buttonWrapper}>
          [
          <button className={styles.button} onClick={handleApprove} disabled={isPublishing}>
            {t('approve')}
          </button>
          ]
        </span>
        <span className={styles.buttonWrapper}>
          [
          <button className={styles.button} onClick={handleReject} disabled={isPublishing}>
            {t('reject')}
          </button>
          ]
        </span>
      </div>
    ) : (
      <div className={styles.cardActions}>
        <button className={`button ${styles.cardApproveButton}`} onClick={handleApprove} disabled={isPublishing}>
          {t('approve')}
        </button>
        <button className={`button ${styles.cardRejectButton}`} onClick={handleReject} disabled={isPublishing}>
          {t('reject')}
        </button>
      </div>
    );

  return buttons;
};

const useModQueueActions = (comment: Comment): ModQueueActionState => {
  const { t } = useTranslation();
  const { cid, approved, removed, pendingApproval } = comment || {};
  const communityAddress = getCommentCommunityAddress(comment);
  const dismissCommentFromQueue = useModQueueStore((state) => state.dismissCommentFromQueue);
  const rememberCommentsInQueue = useModQueueStore((state) => state.rememberCommentsInQueue);
  const [initiatedAction, setInitiatedAction] = useState<ModerationAction>(null);

  const alreadyApproved = approved === true;
  const alreadyRejected = isPendingApprovalRejected({ approved, removed, pendingApproval });

  const {
    publishCommentModeration: approve,
    state: approveState,
    error: approveError,
  } = usePublishCommentModeration({
    commentCid: cid,
    communityAddress,
    commentModeration: approvePendingCommentModeration,
    onChallenge: async (...args: any) => {
      addChallenge([...args, comment]);
    },
    onChallengeVerification: async (challengeVerification, comment) => {
      alertChallengeVerificationFailed(challengeVerification, comment);
    },
    onError: (error: Error & { details?: unknown }) => {
      console.error('Approve failed:', error, error.details);
    },
  });

  const {
    publishCommentModeration: reject,
    state: rejectState,
    error: rejectError,
  } = usePublishCommentModeration({
    commentCid: cid,
    communityAddress,
    commentModeration: rejectPendingCommentModeration,
    onChallenge: async (...args: any) => {
      addChallenge([...args, comment]);
    },
    onChallengeVerification: async (challengeVerification, comment) => {
      alertChallengeVerificationFailed(challengeVerification, comment);
    },
    onError: (error: Error & { details?: unknown }) => {
      console.error('Reject failed:', error, error.details);
    },
  });

  const handleApprove = async () => {
    const confirm = window.confirm(t('double_confirm'));
    if (!confirm) {
      return;
    }

    setInitiatedAction('approve');
    try {
      await approve();
      const approvedSnapshot = getQueuedCommentSnapshot({ ...comment, approved: true, pendingApproval: false });
      if (approvedSnapshot) {
        rememberCommentsInQueue([approvedSnapshot]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async () => {
    const confirm = window.confirm(t('double_confirm'));
    if (!confirm) {
      return;
    }

    setInitiatedAction('reject');
    try {
      await reject();
      const rejectedSnapshot = getQueuedCommentSnapshot({ ...comment, approved: false, pendingApproval: false });
      if (rejectedSnapshot) {
        rememberCommentsInQueue([rejectedSnapshot]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemove = () => {
    if (cid) {
      dismissCommentFromQueue(cid);
    }
  };

  const isApproving = initiatedAction === 'approve' && approveState !== 'initializing' && approveState !== 'succeeded' && approveState !== 'failed';
  const isRejecting = initiatedAction === 'reject' && rejectState !== 'initializing' && rejectState !== 'succeeded' && rejectState !== 'failed';
  const isPublishing = isApproving || isRejecting;

  const approveSucceeded = initiatedAction === 'approve' && approveState === 'succeeded';
  const rejectSucceeded = initiatedAction === 'reject' && rejectState === 'succeeded';

  const approveFailed = initiatedAction === 'approve' && approveState === 'failed';
  const rejectFailed = initiatedAction === 'reject' && rejectState === 'failed';

  const status = alreadyApproved || approveSucceeded ? 'approved' : alreadyRejected || rejectSucceeded ? 'rejected' : approveFailed || rejectFailed ? 'failed' : null;
  const error = approveFailed ? approveError : rejectFailed ? rejectError : undefined;
  const errorMessage = formatErrorForDisplay(error);

  return { status, error, errorMessage, isPublishing, handleApprove, handleReject, handleRemove: status ? handleRemove : undefined };
};

const ModQueueRow = memo(({ comment, isOdd = false, showBoard = false, boardPath, boardDisplayPath }: ModQueueRowProps) => {
  const { t } = useTranslation();
  const getAlertThresholdSeconds = useModQueueStore((state) => state.getAlertThresholdSeconds);
  const isMobile = useIsMobile();
  const currentTime = useCurrentTime();

  const { editedComment } = useEditedComment({ comment });
  const displayComment = editedComment || comment;

  const { content, title, timestamp, cid, link, thumbnailUrl, linkWidth, linkHeight, number, parentCid } = displayComment;

  const timeWaiting = currentTime - timestamp;
  const alertThresholdSeconds = getAlertThresholdSeconds();
  const isOverThreshold = timeWaiting > alertThresholdSeconds;

  // Only show alert animation for comments awaiting approval (not approved or rejected)
  const isAwaitingApproval = isPendingApprovalAwaiting(displayComment);

  const { status, error, errorMessage, isPublishing, handleApprove, handleReject, handleRemove } = useModQueueActions(comment);
  const hasTitle = title && title.trim().length > 0;
  const hasContent = content && content.trim().length > 0;
  const hasLink = link && link.length > 0;
  const isReply = !!parentCid;
  const commentMediaInfo = getCommentMediaInfo(link, thumbnailUrl, linkWidth, linkHeight);
  const hasThumbnail = getHasThumbnail(commentMediaInfo, link);
  const rawExcerpt = (
    (hasTitle && hasContent ? `${title}: ${content}` : null) ||
    (hasTitle ? title : null) ||
    (hasContent ? content : null) ||
    (hasLink ? link : null) ||
    (hasThumbnail ? t('image') : null) ||
    t('no_content')
  ).trim();
  // Only truncate excerpt on desktop, allow wrapping on mobile
  const excerpt = !isMobile && rawExcerpt.length > 101 ? rawExcerpt.slice(0, 98) + '...' : rawExcerpt;
  const postUrl = getModQueueCommentRoute(boardPath, comment.cid || cid);
  const postUrlState = getQueuedCommentRouteState(comment);

  const modQueueUrl = boardPath ? `/${boardPath}/mod/queue` : undefined;

  return (
    <div className={`${styles.row} ${isOdd ? styles.rowOdd : ''}`}>
      <div className={styles.number}>{number ?? 'N/A'}</div>
      {showBoard && (
        <div className={styles.board}>{modQueueUrl ? <Link to={modQueueUrl}>/{boardDisplayPath ?? '—'}/</Link> : <span>/{boardDisplayPath ?? '—'}/</span>}</div>
      )}
      <div className={styles.excerpt}>
        {postUrl ? (
          <Link to={postUrl} state={postUrlState} title={excerpt}>
            {excerpt}
          </Link>
        ) : (
          <span title={excerpt}>{excerpt}</span>
        )}
      </div>
      <div className={styles.time}>
        {isMobile ? (
          // On mobile, show shorter time ago format without tooltip
          isAwaitingApproval && isOverThreshold ? (
            <span className={styles.alert}>{getFormattedTimeAgo(timestamp)}</span>
          ) : (
            <span>{getFormattedTimeAgo(timestamp)}</span>
          )
        ) : // On desktop, show full date with tooltip
        isAwaitingApproval && isOverThreshold ? (
          <>
            <Tooltip content={getFormattedTimeAgo(timestamp)}>
              <span>{getFormattedDate(timestamp)}</span>
            </Tooltip>
            <span className={styles.alertWrapper}>
              {' '}
              (<span className={styles.alert}>{getFormattedTimeAgo(timestamp)}</span>)
            </span>
          </>
        ) : (
          <Tooltip content={getFormattedTimeAgo(timestamp)}>
            <span>{getFormattedDate(timestamp)}</span>
          </Tooltip>
        )}
      </div>
      <div className={styles.type}>{isReply ? capitalize(t('reply')) : capitalize(t('post'))}</div>
      <div className={styles.image}>{hasThumbnail ? t('yes') : t('no')}</div>
      <div className={styles.actions}>
        <ModQueueActions
          status={status}
          error={error}
          errorMessage={errorMessage}
          isPublishing={isPublishing}
          handleApprove={handleApprove}
          handleReject={handleReject}
          handleRemove={handleRemove}
          variant='row'
        />
      </div>
    </div>
  );
});
ModQueueRow.displayName = 'ModQueueRow';

interface ModQueueCardProps {
  comment: Comment;
  showBoard?: boolean;
  /** Board path for URLs (directory code or full address) */
  boardPath: string | undefined;
  /** Board path for display (shortened when long IPNS key with no TLD) */
  boardDisplayPath: string | undefined;
}

const ModQueueCard = memo(({ comment, showBoard = false, boardPath, boardDisplayPath }: ModQueueCardProps) => {
  const { t } = useTranslation();
  const getAlertThresholdSeconds = useModQueueStore((state) => state.getAlertThresholdSeconds);
  const currentTime = useCurrentTime();

  const { editedComment } = useEditedComment({ comment });
  const displayComment = editedComment || comment;

  const { content, title, timestamp, cid, link, thumbnailUrl, linkWidth, linkHeight, number, parentCid } = displayComment;

  const timeWaiting = currentTime - timestamp;
  const alertThresholdSeconds = getAlertThresholdSeconds();
  const isOverThreshold = timeWaiting > alertThresholdSeconds;
  const isAwaitingApproval = isPendingApprovalAwaiting(displayComment);

  const { status, error, errorMessage, isPublishing, handleApprove, handleReject, handleRemove } = useModQueueActions(comment);
  const hasTitle = title && title.trim().length > 0;
  const hasContent = content && content.trim().length > 0;
  const hasLink = link && link.length > 0;
  const isReply = !!parentCid;
  const commentMediaInfo = getCommentMediaInfo(link, thumbnailUrl, linkWidth, linkHeight);
  const hasThumbnail = getHasThumbnail(commentMediaInfo, link);
  const rawExcerpt = (
    (hasTitle && hasContent ? `${title}: ${content}` : null) ||
    (hasTitle ? title : null) ||
    (hasContent ? content : null) ||
    (hasLink ? link : null) ||
    (hasThumbnail ? t('image') : null) ||
    t('no_content')
  ).trim();
  const excerpt = rawExcerpt.length > 140 ? rawExcerpt.slice(0, 137) + '...' : rawExcerpt;
  const postUrl = getModQueueCommentRoute(boardPath, comment.cid || cid);
  const postUrlState = getQueuedCommentRouteState(comment);

  const modQueueUrl = boardPath ? `/${boardPath}/mod/queue` : undefined;

  return (
    <div className={styles.mobileCard}>
      <div className={styles.cardHeader}>
        <span className={styles.cardHeaderLeft}>
          <span className={styles.cardNumber}>No. {number ?? 'N/A'}</span>
          {showBoard && boardPath && (
            <>
              <span className={styles.cardBoardSeparator}> - </span>
              <span className={styles.cardBoard}>{modQueueUrl ? <Link to={modQueueUrl}>/{boardDisplayPath}/</Link> : <span>/{boardDisplayPath}/</span>}</span>
            </>
          )}
        </span>
        <span className={styles.cardTime}>
          {isAwaitingApproval && isOverThreshold ? (
            <>
              {getFormattedDate(timestamp)} (<span className={styles.alert}>{getFormattedTimeAgo(timestamp)}</span>)
            </>
          ) : (
            getFormattedDate(timestamp)
          )}
        </span>
      </div>
      <div className={styles.cardContent}>
        {t('excerpt')}:{' '}
        {postUrl ? (
          <Link to={postUrl} state={postUrlState} title={excerpt}>
            {excerpt}
          </Link>
        ) : (
          <span title={excerpt}>{excerpt}</span>
        )}{' '}
        / {t('type')}: {isReply ? t('reply') : t('post')} / {capitalize(t('image'))}: {hasThumbnail ? lowerCase(t('yes')) : lowerCase(t('no'))}
      </div>
      <ModQueueActions
        status={status}
        error={error}
        errorMessage={errorMessage}
        isPublishing={isPublishing}
        handleApprove={handleApprove}
        handleReject={handleReject}
        handleRemove={handleRemove}
        variant='card'
      />
    </div>
  );
});
ModQueueCard.displayName = 'ModQueueCard';

const ModQueueFeedPost = ({ comment }: { comment: Comment }) => {
  const { editedComment } = useEditedComment({ comment });
  const displayComment = editedComment || comment;
  const { status, error, errorMessage, isPublishing, handleApprove, handleReject, handleRemove } = useModQueueActions(comment);

  return (
    <Post
      post={displayComment}
      showAllReplies={false}
      showReplies={false}
      isModQueue={true}
      modQueueStatus={status}
      modQueueError={error || errorMessage}
      isPublishing={isPublishing}
      onApprove={handleApprove}
      onReject={handleReject}
      onRemoveFromModQueue={handleRemove}
    />
  );
};

interface ModQueueBoardSummaryProps {
  feed: Comment[];
  directories: DirectoryCommunity[];
  accountCommunityAddresses: string[];
}

const findBoardAddressByCode = (code: string, dirs: DirectoryCommunity[]): string | null => {
  const entry = dirs.find((sub) => {
    if (!sub.title) return false;
    const directory = extractDirectoryFromTitle(sub.title);
    return directory === code;
  });
  return entry?.address || null;
};

const ModQueueBoardCount = ({ normal, urgent }: { normal: number; urgent: number }) => {
  const total = normal + urgent;
  if (total === 0) return null;
  return (
    <strong>
      (
      {urgent > 0 && normal > 0 ? (
        <>
          <span className={styles.modQueueButtonCount}>{normal}</span>
          <span className={`${styles.modQueueButtonCount} ${styles.modQueueButtonCountAlert}`}>+{urgent}</span>
        </>
      ) : urgent > 0 ? (
        <span className={`${styles.modQueueButtonCount} ${styles.modQueueButtonCountAlert}`}>{urgent}</span>
      ) : (
        <span className={styles.modQueueButtonCount}>{total}</span>
      )}
      )
    </strong>
  );
};

const ModQueueBoardSummary = ({ feed, directories, accountCommunityAddresses }: ModQueueBoardSummaryProps) => {
  const { t } = useTranslation();
  const selectedBoardFilter = useModQueueStore((state) => state.selectedBoardFilter);
  const setSelectedBoardFilter = useModQueueStore((state) => state.setSelectedBoardFilter);
  const getAlertThresholdSeconds = useModQueueStore((state) => state.getAlertThresholdSeconds);
  const currentTime = useCurrentTime();
  const alertThresholdSeconds = getAlertThresholdSeconds();
  const modAddressSet = useMemo(() => new Set(accountCommunityAddresses), [accountCommunityAddresses]);
  const locallyModeratedFeed = useLocallyModeratedModQueueFeed(feed, currentTime);

  const boardCounts = useMemo(() => {
    const counts = new Map<string, { normal: number; urgent: number }>();
    for (const address of accountCommunityAddresses) {
      counts.set(address, { normal: 0, urgent: 0 });
    }
    for (const item of locallyModeratedFeed) {
      const addr = getCommentCommunityAddress(item);
      if (!addr) continue;
      const entry = counts.get(addr);
      if (!entry) continue;
      const isAwaiting = isPendingApprovalAwaiting(item);
      if (!isAwaiting) continue;
      const timeWaiting = currentTime - (item.timestamp ?? 0);
      const isUrgent = timeWaiting > alertThresholdSeconds;
      if (isUrgent) entry.urgent++;
      else entry.normal++;
    }
    return counts;
  }, [locallyModeratedFeed, accountCommunityAddresses, currentTime, alertThresholdSeconds]);

  const { totalNormal, totalUrgent } = useMemo(() => {
    let normal = 0;
    let urgent = 0;
    for (const entry of boardCounts.values()) {
      normal += entry.normal;
      urgent += entry.urgent;
    }
    return { totalNormal: normal, totalUrgent: urgent };
  }, [boardCounts]);

  // Order: All first, then BOARD_CODE_GROUPS order (directory boards), then non-directory boards
  const orderedAddresses = useMemo(() => {
    const ordered: string[] = [];
    const seen = new Set<string>();

    for (const group of BOARD_CODE_GROUPS) {
      for (const code of group) {
        const address = findBoardAddressByCode(code, directories);
        if (address && modAddressSet.has(address) && !seen.has(address)) {
          ordered.push(address);
          seen.add(address);
        }
      }
    }
    // Directory boards not in BOARD_CODE_GROUPS (custom dirs)
    for (const addr of accountCommunityAddresses) {
      const path = getBoardPath(addr, directories);
      if (path !== addr && !seen.has(addr)) {
        ordered.push(addr);
        seen.add(addr);
      }
    }
    // Non-directory boards (own category, like subscriptions in boardsbar)
    for (const addr of accountCommunityAddresses) {
      if (!seen.has(addr)) {
        ordered.push(addr);
      }
    }
    return ordered;
  }, [accountCommunityAddresses, directories, modAddressSet]);

  const handleSelectAll = useCallback(() => setSelectedBoardFilter(null), [setSelectedBoardFilter]);
  const handleSelectBoard = useCallback((address: string) => setSelectedBoardFilter(address), [setSelectedBoardFilter]);

  if (accountCommunityAddresses.length === 0) {
    return null;
  }

  return (
    <span className={styles.boardSummary}>
      <button type='button' className={`${styles.boardSummaryLink} ${!selectedBoardFilter ? styles.boardSummaryLinkSelected : ''}`} onClick={handleSelectAll}>
        {t('all')}
        {totalNormal + totalUrgent > 0 && (
          <>
            {' '}
            <ModQueueBoardCount normal={totalNormal} urgent={totalUrgent} />
          </>
        )}
      </button>
      {orderedAddresses.map((address) => {
        const boardPath = getBoardPath(address, directories);
        const isInDirectory = boardPath !== address;
        const displayText = isInDirectory ? boardPath : address.endsWith('.eth') || address.endsWith('.sol') ? address : getShortAddress(address) || address;
        const isSelected = selectedBoardFilter === address;
        const { normal, urgent } = boardCounts.get(address) ?? { normal: 0, urgent: 0 };

        return (
          <React.Fragment key={address}>
            {' / '}
            <button
              type='button'
              className={`${styles.boardSummaryLink} ${isSelected ? styles.boardSummaryLinkSelected : ''}`}
              onClick={() => handleSelectBoard(address)}
            >
              {displayText}
              {normal + urgent > 0 && (
                <>
                  {' '}
                  <ModQueueBoardCount normal={normal} urgent={urgent} />
                </>
              )}
            </button>
          </React.Fragment>
        );
      })}
    </span>
  );
};

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

  const account = useAccount();
  const accountAddress = account?.author?.address;
  const accountCommunityAddresses = useAccountCommunityAddresses();

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

  if (!shouldFetch || communityAddresses.length === 0) {
    return null;
  }

  const alertThresholdSeconds = getAlertThresholdSeconds();
  // Remount when switching boards so memoized counts reset cleanly.
  const contentKey = communityAddresses.join(',');
  return <ModQueueButtonContent key={contentKey} feed={feed} alertThresholdSeconds={alertThresholdSeconds} boardIdentifier={boardIdentifier} isMobile={isMobile} />;
};

const ModQueueView = ({ boardIdentifier: propBoardIdentifier }: ModQueueViewProps) => {
  const { t } = useTranslation();
  const params = useParams();
  const selectedBoardFilter = useModQueueStore((state) => state.selectedBoardFilter);
  const viewMode = useModQueueStore((state) => state.viewMode);
  const dismissedCommentCids = useModQueueStore((state) => state.dismissedCommentCids);
  const queuedCommentHistory = useModQueueStore((state) => state.queuedCommentHistory);
  const rememberCommentsInQueue = useModQueueStore((state) => state.rememberCommentsInQueue);
  const isMobile = useIsMobile();

  const accountCommunityAddresses = useAccountCommunityAddresses();

  const directories = useDirectories();

  const boardIdentifier = propBoardIdentifier || params.boardIdentifier;

  const resolvedAddress = useMemo(() => {
    if (boardIdentifier) {
      return getCommunityAddress(boardIdentifier, directories);
    }
    return undefined;
  }, [boardIdentifier, directories]);

  const communityAddresses = useMemo(() => {
    if (resolvedAddress) return [resolvedAddress];
    return accountCommunityAddresses;
  }, [resolvedAddress, accountCommunityAddresses]);
  const communities = useCommunityIdentifiers(communityAddresses);

  const communityAddress = communityAddresses[0];
  const communityIdentifier = useCommunityIdentifier(communityAddress);
  const community = useCommunity(communityIdentifier ? { community: communityIdentifier } : undefined);
  const { error: communityError } = community || {};

  const feedOptions = useMemo(
    () => ({
      communities,
      modQueue: ['pendingApproval'],
      postsPerPage: 50,
    }),
    [communities],
  );
  const { feed, hasMore, loadMore, reset } = useFeed(feedOptions);

  const queuedCommentSnapshots = useMemo(
    () =>
      feed.flatMap((comment) => {
        const snapshot = getQueuedCommentSnapshot(comment);
        return snapshot && shouldKeepQueuedCommentHistory(snapshot) ? [snapshot] : [];
      }),
    [feed],
  );
  useEffect(() => {
    if (queuedCommentSnapshots.length > 0) {
      rememberCommentsInQueue(queuedCommentSnapshots);
    }
  }, [queuedCommentSnapshots, rememberCommentsInQueue]);

  const feedWithHistory = useMemo(
    () => [...feed, ...(getVisibleQueuedCommentHistory(feed, queuedCommentHistory, communityAddresses) as Comment[])],
    [communityAddresses, feed, queuedCommentHistory],
  );

  const dismissedCommentCidSet = useMemo(() => new Set(dismissedCommentCids), [dismissedCommentCids]);
  const filteredFeed = useMemo(
    () => filterVisibleModQueueFeed(feedWithHistory, selectedBoardFilter, dismissedCommentCidSet),
    [feedWithHistory, selectedBoardFilter, dismissedCommentCidSet],
  );

  const addressToPathMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const addr of communityAddresses) {
      map.set(addr, getBoardPath(addr, directories));
    }
    return map;
  }, [communityAddresses, directories]);

  const showBoardColumn = !resolvedAddress;
  const compactRowItemContent = useCallback(
    (index: number, comment: Comment) => {
      const commentCommunityAddress = getCommentCommunityAddress(comment);
      const path = addressToPathMap.get(commentCommunityAddress || '') ?? (commentCommunityAddress ? getBoardPath(commentCommunityAddress, directories) : undefined);
      return (
        <ModQueueRow
          key={comment.cid}
          comment={comment}
          isOdd={index % 2 === 0}
          showBoard={showBoardColumn}
          boardPath={path}
          boardDisplayPath={path && commentCommunityAddress ? getBoardDisplayPath(commentCommunityAddress, path) : undefined}
        />
      );
    },
    [addressToPathMap, showBoardColumn, directories],
  );
  const compactCardItemContent = useCallback(
    (_index: number, comment: Comment) => {
      const commentCommunityAddress = getCommentCommunityAddress(comment);
      const path = addressToPathMap.get(commentCommunityAddress || '') ?? (commentCommunityAddress ? getBoardPath(commentCommunityAddress, directories) : undefined);
      return (
        <ModQueueCard
          key={comment.cid}
          comment={comment}
          showBoard={showBoardColumn}
          boardPath={path}
          boardDisplayPath={path && commentCommunityAddress ? getBoardDisplayPath(commentCommunityAddress, path) : undefined}
        />
      );
    },
    [addressToPathMap, showBoardColumn, directories],
  );

  const setResetFunction = useFeedResetStore((state) => state.setResetFunction);
  useEffect(() => {
    setResetFunction(reset);
  }, [reset, setResetFunction]);

  // Memoize footer components object to preserve identity across renders (Virtuoso optimization)
  // Note: useFeedStateString is called inside ModQueueFooter to isolate re-renders from backend state changes
  const footerComponents = useMemo(
    () => ({
      Footer: () => (
        <>
          {communityError?.message && feed.length === 0 && (
            <div className={styles.error}>
              <ErrorDisplay error={communityError} />
            </div>
          )}
          <ModQueueFooter hasMore={hasMore} communityAddresses={communityAddresses} />
        </>
      ),
    }),
    [hasMore, communityAddresses, communityError, feed.length],
  );

  const pageFooter = (
    <>
      <PageFooterDesktop firstRow={<StyleOnlyFooterFirstRow />} />
      <PageFooterMobile>
        <div>
          <div className={footerStyles.mobileFooterButtons}>
            <button type='button' className='button' onClick={() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' })}>
              {t('top')}
            </button>
            <button type='button' className='button' onClick={() => reset?.()}>
              {t('refresh')}
            </button>
          </div>
        </div>
      </PageFooterMobile>
    </>
  );

  return (
    <>
      <div className={styles.container}>
        {!resolvedAddress && (
          <div className={styles.controls}>
            <div className={styles.controlsLeft}>
              <ModQueueBoardSummary feed={feed} directories={directories} accountCommunityAddresses={accountCommunityAddresses} />
            </div>
          </div>
        )}

        {filteredFeed.length === 0 && !hasMore ? (
          <div className={styles.empty}>{t('queue_is_empty')}</div>
        ) : (
          <>
            {viewMode === 'compact' && !isMobile && (
              <>
                <div className={styles.tableHeader}>
                  <div className={styles.numberHeader}>No.</div>
                  {!resolvedAddress && <div className={styles.boardHeader}>{t('board')}</div>}
                  <div className={styles.excerptHeader}>{t('excerpt')}</div>
                  <div className={styles.timeHeader}>{t('submitted')}</div>
                  <div className={styles.typeHeader}>{t('type')}</div>
                  <div className={styles.imageHeader}>{t('image')}</div>
                  <div className={styles.actionsHeader}>{t('actions')}</div>
                </div>

                {hasMore ? (
                  <Virtuoso
                    useWindowScroll
                    data={filteredFeed}
                    totalCount={filteredFeed.length}
                    endReached={loadMore}
                    increaseViewportBy={{ bottom: 600, top: 600 }}
                    itemContent={compactRowItemContent}
                    components={footerComponents}
                  />
                ) : (
                  <>
                    {filteredFeed.map((comment, index) => {
                      const commentCommunityAddress = getCommentCommunityAddress(comment);
                      const path =
                        addressToPathMap.get(commentCommunityAddress || '') ?? (commentCommunityAddress ? getBoardPath(commentCommunityAddress, directories) : undefined);
                      return (
                        <ModQueueRow
                          key={comment.cid}
                          comment={comment}
                          isOdd={index % 2 === 0}
                          showBoard={showBoardColumn}
                          boardPath={path}
                          boardDisplayPath={path && commentCommunityAddress ? getBoardDisplayPath(commentCommunityAddress, path) : undefined}
                        />
                      );
                    })}
                    {communityError?.message && feed.length === 0 && (
                      <div className={styles.error}>
                        <ErrorDisplay error={communityError} />
                      </div>
                    )}
                    <ModQueueFooter hasMore={hasMore} communityAddresses={communityAddresses} />
                  </>
                )}
              </>
            )}

            {viewMode === 'compact' && isMobile && (
              <>
                {hasMore ? (
                  <Virtuoso
                    useWindowScroll
                    data={filteredFeed}
                    totalCount={filteredFeed.length}
                    endReached={loadMore}
                    increaseViewportBy={{ bottom: 600, top: 600 }}
                    itemContent={compactCardItemContent}
                    components={footerComponents}
                  />
                ) : (
                  <>
                    {filteredFeed.map((comment) => {
                      const commentCommunityAddress = getCommentCommunityAddress(comment);
                      const path =
                        addressToPathMap.get(commentCommunityAddress || '') ?? (commentCommunityAddress ? getBoardPath(commentCommunityAddress, directories) : undefined);
                      return (
                        <ModQueueCard
                          key={comment.cid}
                          comment={comment}
                          showBoard={showBoardColumn}
                          boardPath={path}
                          boardDisplayPath={path && commentCommunityAddress ? getBoardDisplayPath(commentCommunityAddress, path) : undefined}
                        />
                      );
                    })}
                    {communityError?.message && feed.length === 0 && (
                      <div className={styles.error}>
                        <ErrorDisplay error={communityError} />
                      </div>
                    )}
                    <ModQueueFooter hasMore={hasMore} communityAddresses={communityAddresses} />
                  </>
                )}
              </>
            )}

            {viewMode === 'feed' && (
              <>
                {hasMore ? (
                  <Virtuoso
                    useWindowScroll
                    data={filteredFeed}
                    totalCount={filteredFeed.length}
                    endReached={loadMore}
                    increaseViewportBy={{ bottom: 600, top: 600 }}
                    itemContent={(_index, comment) => <ModQueueFeedPost key={comment.cid} comment={comment} />}
                    components={footerComponents}
                  />
                ) : (
                  <>
                    {filteredFeed.map((comment) => (
                      <ModQueueFeedPost key={comment.cid} comment={comment} />
                    ))}
                    {communityError?.message && feed.length === 0 && (
                      <div className={styles.error}>
                        <ErrorDisplay error={communityError} />
                      </div>
                    )}
                    <ModQueueFooter hasMore={hasMore} communityAddresses={communityAddresses} />
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
      {pageFooter}
    </>
  );
};

export default ModQueueView;
