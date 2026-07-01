import React, { useMemo, useState, useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { useFeed, Comment, useEditedComment, useCommunity } from '@bitsocial/bitsocial-react-hooks';
import { useFloating, offset, shift, size, flip, autoUpdate } from '@floating-ui/react';
import { Virtuoso, type Components } from 'react-virtuoso';
import styles from './mod-queue.module.css';
import postStyles from '../post/post.module.css';
import useModQueueStore from '../../stores/use-mod-queue-store';
import LoadingEllipsis from '../../components/loading-ellipsis/loading-ellipsis';
import ErrorDisplay from '../../components/error-display/error-display';
import { getCommunityAddress, getBoardPath, areSameBoardAddress } from '../../lib/utils/route-utils';
import { useDirectories, DirectoryCommunity } from '../../hooks/use-directories';
import getShortAddress from '../../lib/get-short-address';
import { BOARD_CODE_GROUPS } from '../../constants/board-codes';
import { getHasThumbnail, getCommentMediaInfo } from '../../lib/utils/media-utils';
import { isPendingApprovalAwaiting, isPendingApprovalRejected } from '../../lib/utils/pending-approval-moderation';
import { getFormattedDate, getFormattedTimeAgo } from '../../lib/utils/time-utils';
import useFeedResetStore from '../../stores/use-feed-reset-store';
import { getCommentCommunityAddress } from '../../lib/utils/comment-utils';
import usePendingCommentModerationActions from '../../hooks/use-pending-comment-moderation-actions';
import {
  filterVisibleModQueueFeed,
  getAddressListFromKey,
  getAddressListKey,
  getModQueueBoardFilterGroups,
  getModQueueBoardFilterKey,
  getModQueueCommentRoute,
  getModQueueSelectedBoardAddresses,
  getQueuedCommentRouteState,
  getQueuedCommentSnapshot,
  getVisibleQueuedCommentHistory,
  shouldKeepQueuedCommentHistory,
} from '../../lib/utils/mod-queue-utils';
import Tooltip from '../../components/tooltip/tooltip';
import { useCommunityIdentifier, useCommunityIdentifiers } from '../../hooks/use-community-identifiers';
import useIsMobile from '../../hooks/use-is-mobile';
import { useCurrentTime } from '../../hooks/use-current-time';
import { Post } from '../post/post';
import { useLocallyModeratedModQueueFeed } from '../../hooks/use-locally-moderated-mod-queue-feed';
import ModQueueCommunityMetadataLoader from '../../components/mod-queue-community-metadata-loader/mod-queue-community-metadata-loader';
import capitalize from 'lodash/capitalize';
import lowerCase from 'lodash/lowerCase';
import { PageFooterDesktop, PageFooterMobile, StyleOnlyFooterFirstRow } from '../../components/footer/footer';
import footerStyles from '../../components/footer/footer.module.css';
import { useModeratedCommunityAddressInputs, useModeratedCommunityAddressesForInputs } from '../../hooks/use-moderated-community-addresses';
import PostTransferModal, { type PostTransferState } from '../../components/post-transfer-modal/post-transfer-modal';
import { canTransferComment } from '../../lib/comment-transfer';

/** Path for display: directory code, or full address if has TLD, or shortened for long IPNS keys (no dot) */
const getBoardDisplayPath = (address: string, path: string): string => {
  if (path !== address) return path;
  if (address.includes('.')) return address;
  return getShortAddress(address) || address;
};

interface ModQueueViewProps {
  boardIdentifier?: string; // If provided, shows queue for single board
}

const EMPTY_COMMENTS: Comment[] = [];
const MOD_QUEUE_VIRTUOSO_INCREASE_VIEWPORT_BY = { bottom: 600, top: 600 };
const NOOP_LOAD_MORE = () => undefined;

interface ModQueueFooterProps {
  hasMore: boolean;
  loadingStateString: string;
}

// Defined outside ModQueueView to preserve component identity across renders (Virtuoso optimization)
const ModQueueFooter = memo(({ hasMore, loadingStateString }: ModQueueFooterProps) => {
  return hasMore ? (
    <div className={styles.footer}>
      <LoadingEllipsis string={loadingStateString} />
    </div>
  ) : null;
});
ModQueueFooter.displayName = 'ModQueueFooter';

const ModQueueContinuingFooter = memo(({ hasMore }: { hasMore: boolean }) => {
  const { t } = useTranslation();

  return <ModQueueFooter hasMore={hasMore} loadingStateString={t('looking_for_more_posts')} />;
});
ModQueueContinuingFooter.displayName = 'ModQueueContinuingFooter';

interface ModQueueVirtuosoFooterContext {
  error: Error | null;
  hasMore: boolean;
}

const ModQueueVirtuosoFooter = memo(({ context }: { context?: ModQueueVirtuosoFooterContext }) => {
  if (!context) {
    return null;
  }

  return (
    <>
      {context.error && (
        <div className={styles.error}>
          <ErrorDisplay error={context.error} />
        </div>
      )}
      <ModQueueContinuingFooter hasMore={context.hasMore} />
    </>
  );
});
ModQueueVirtuosoFooter.displayName = 'ModQueueVirtuosoFooter';

const MOD_QUEUE_VIRTUOSO_COMPONENTS: Components<Comment, ModQueueVirtuosoFooterContext> = {
  Footer: ModQueueVirtuosoFooter,
};

const ModQueuePageFooter = memo(() => {
  const { t } = useTranslation();
  const reset = useFeedResetStore((state) => state.reset);

  return (
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
});
ModQueuePageFooter.displayName = 'ModQueuePageFooter';

interface ModQueueRowProps {
  comment: Comment;
  isOdd?: boolean;
  showBoard?: boolean;
  /** Board path for URLs (directory code or full address) */
  boardPath: string | undefined;
  /** Board path for display (shortened when long IPNS key with no TLD) */
  boardDisplayPath: string | undefined;
}

interface ModQueueActionState {
  status: 'approved' | 'rejected' | 'failed' | null;
  error?: unknown;
  errorMessage?: string;
  isPublishing: boolean;
  handleApprove: () => Promise<void>;
  handleReject: () => Promise<void>;
  handleTransfer?: () => void;
  handleRemove?: () => void;
}

interface ModQueueActionsProps {
  status: 'approved' | 'rejected' | 'failed' | null;
  error?: unknown;
  errorMessage?: string;
  isPublishing: boolean;
  handleApprove: () => Promise<void>;
  handleReject: () => Promise<void>;
  handleTransfer?: () => void;
  handleRemove?: () => void;
  variant: 'row' | 'card';
}

interface ModQueueExcerptPreviewLinkProps {
  comment: Comment;
  excerpt: string;
  postUrl: string | undefined;
  postUrlState: ReturnType<typeof getQueuedCommentRouteState>;
}

const getExcerptPreviewClassName = (comment: Comment) =>
  !comment.parentCid ? `${postStyles.replyQuotePreview} ${postStyles.replyQuotePreviewOp}` : postStyles.replyQuotePreview;

// The hover card is a compact preview, so cap its body shorter than the feed's
// 1000-char CommentContent limit and mark the cut with an ellipsis.
const PREVIEW_CONTENT_MAX_LENGTH = 350;

const truncatePreviewComment = (comment: Comment): Comment => {
  const { content } = comment;
  if (typeof content !== 'string' || content.length <= PREVIEW_CONTENT_MAX_LENGTH) {
    return comment;
  }
  return { ...comment, content: `${content.slice(0, PREVIEW_CONTENT_MAX_LENGTH).trimEnd()}…` };
};

// Floating preview of the full pending post, anchored to the excerpt text.
// Mirrors the quote-link hover previews (reply-quote-preview): a clean read-only
// Post positioned with useFloating, not the feed/mod-queue layout. Rendering it
// without isModQueue keeps it consistent with quote previews (no leading <hr>,
// no thread container, no inline approve/reject buttons that hover can't reach).
//
// Placement mirrors the quote previews: to the right of the excerpt on desktop,
// below it on mobile. See setReferenceNode for why desktop anchors to the cell.
const ModQueueExcerptPreviewLink = ({ comment, excerpt, postUrl, postUrlState }: ModQueueExcerptPreviewLinkProps) => {
  const isMobile = useIsMobile();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const previewComment = truncatePreviewComment(comment);

  const { refs, floatingStyles } = useFloating({
    placement: isMobile ? 'bottom-start' : 'right-start',
    middleware: [
      offset(isMobile ? 4 : 8),
      flip({ fallbackPlacements: isMobile ? ['top-start'] : ['left-start'] }),
      shift({ padding: 10 }),
      size({
        padding: 10,
        apply({ availableWidth, elements }) {
          elements.floating.style.maxWidth = `${Math.max(0, availableWidth - 12)}px`;
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  });
  // Stable callback refs from useFloating (not React refs read during render).
  const { setReference, setFloating } = refs;

  // Desktop anchors the card to the excerpt cell, not the inline <a>. The excerpt
  // is a wide single-line link whose box overflows the clipped flex cell, so its
  // right edge sits far past the visible text; anchoring there shoved the card off
  // to the right. The parent cell's right edge tracks where the ellipsized excerpt
  // visibly ends. Mobile keeps the <a> itself and opens below it.
  const setReferenceNode = (node: HTMLElement | null) => {
    setReference(!node || isMobile ? node : (node.parentElement ?? node));
  };

  const openPreview = () => setIsPreviewOpen(true);
  const closePreview = () => setIsPreviewOpen(false);

  const preview =
    isPreviewOpen && typeof document !== 'undefined'
      ? createPortal(
          <div className={getExcerptPreviewClassName(comment)} data-mod-queue-excerpt-preview='true' ref={setFloating} style={floatingStyles}>
            <Post post={previewComment} showReplies={false} />
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {postUrl ? (
        <Link
          to={postUrl}
          state={postUrlState}
          title={excerpt}
          ref={setReferenceNode}
          onMouseEnter={openPreview}
          onFocus={openPreview}
          onMouseLeave={closePreview}
          onBlur={closePreview}
        >
          {excerpt}
        </Link>
      ) : (
        <span title={excerpt} ref={setReferenceNode} tabIndex={0} onMouseEnter={openPreview} onFocus={openPreview} onMouseLeave={closePreview} onBlur={closePreview}>
          {excerpt}
        </span>
      )}
      {preview}
    </>
  );
};

const useModQueueTransfer = (comment: Comment) => {
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferState, setTransferState] = useState<PostTransferState>('idle');
  const rememberCommentsInQueue = useModQueueStore((state) => state.rememberCommentsInQueue);
  const canTransfer = canTransferComment(comment);
  const isTransferPublishing = transferState === 'publishing';
  const isTransferSucceeded = transferState === 'succeeded';
  const handleTransfer = useCallback(() => {
    if (canTransfer && !isTransferSucceeded) {
      setIsTransferOpen(true);
    }
  }, [canTransfer, isTransferSucceeded]);
  const handleCloseTransfer = useCallback(() => setIsTransferOpen(false), []);
  const handleTransferSuccess = useCallback(() => {
    const rejectedSnapshot = getQueuedCommentSnapshot({ ...comment, approved: false, pendingApproval: false });
    if (rejectedSnapshot) {
      rememberCommentsInQueue([rejectedSnapshot]);
    }
  }, [comment, rememberCommentsInQueue]);

  return {
    handleTransfer: canTransfer && !isTransferSucceeded ? handleTransfer : undefined,
    isTransferPublishing,
    isTransferSucceeded,
    transferModal:
      canTransfer && isTransferOpen ? (
        <PostTransferModal comment={comment} onClose={handleCloseTransfer} onTransferStateChange={setTransferState} onTransferSuccess={handleTransferSuccess} />
      ) : null,
  };
};

const ModQueueActions = ({ status, error, errorMessage, isPublishing, handleApprove, handleReject, handleTransfer, handleRemove, variant }: ModQueueActionsProps) => {
  const { t } = useTranslation();
  const displayError = error || errorMessage;

  const removeButton = handleRemove ? (
    variant === 'row' ? (
      <span className={styles.buttonWrapper}>
        [
        <button type='button' className={styles.button} onClick={handleRemove} disabled={isPublishing}>
          {t('modQueue.dismiss')}
        </button>
        ]
      </span>
    ) : (
      <span className={styles.cardRemoveButtonWrapper}>
        [
        <button type='button' className={styles.cardRemoveButton} onClick={handleRemove} disabled={isPublishing}>
          {t('modQueue.dismiss')}
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
          <button type='button' className={styles.button} onClick={handleApprove} disabled={isPublishing}>
            {t('approve')}
          </button>
          ]
        </span>
        <span className={styles.buttonWrapper}>
          [
          <button type='button' className={styles.button} onClick={handleReject} disabled={isPublishing}>
            {t('reject')}
          </button>
          ]
        </span>
        {handleTransfer && (
          <span className={styles.buttonWrapper}>
            [
            <button type='button' className={styles.button} onClick={handleTransfer} disabled={isPublishing}>
              {t('transfer')}
            </button>
            ]
          </span>
        )}
      </div>
    ) : (
      <div className={styles.cardActions}>
        <button type='button' className={`button ${styles.cardApproveButton}`} onClick={handleApprove} disabled={isPublishing}>
          {t('approve')}
        </button>
        <button type='button' className={`button ${styles.cardRejectButton}`} onClick={handleReject} disabled={isPublishing}>
          {t('reject')}
        </button>
        {handleTransfer && (
          <button type='button' className='button' onClick={handleTransfer} disabled={isPublishing}>
            {t('transfer')}
          </button>
        )}
      </div>
    );

  return buttons;
};

const useModQueueActions = (comment: Comment): ModQueueActionState => {
  const { cid, approved, removed, pendingApproval } = comment || {};
  const communityAddress = getCommentCommunityAddress(comment);
  const dismissCommentFromQueue = useModQueueStore((state) => state.dismissCommentFromQueue);
  const rememberCommentsInQueue = useModQueueStore((state) => state.rememberCommentsInQueue);

  const alreadyApproved = approved === true;
  const alreadyRejected = isPendingApprovalRejected({ approved, removed, pendingApproval });

  const {
    status: actionStatus,
    error,
    errorMessage,
    isPublishing,
    handleApprove,
    handleReject,
  } = usePendingCommentModerationActions({
    comment,
    commentCid: cid,
    communityAddress,
    onApproveSuccess: () => {
      const approvedSnapshot = getQueuedCommentSnapshot({ ...comment, approved: true, pendingApproval: false });
      if (approvedSnapshot) {
        rememberCommentsInQueue([approvedSnapshot]);
      }
    },
    onRejectSuccess: () => {
      const rejectedSnapshot = getQueuedCommentSnapshot({ ...comment, approved: false, pendingApproval: false });
      if (rejectedSnapshot) {
        rememberCommentsInQueue([rejectedSnapshot]);
      }
    },
  });

  const handleRemove = () => {
    if (cid) {
      dismissCommentFromQueue(cid);
    }
  };

  // Mod queue rows also reflect a comment that was already moderated before this
  // session, so combine that baseline with the live action-derived status.
  const status = alreadyApproved || actionStatus === 'approved' ? 'approved' : alreadyRejected || actionStatus === 'rejected' ? 'rejected' : actionStatus;

  return { status, error, errorMessage, isPublishing, handleApprove, handleReject, handleRemove };
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
  const { handleTransfer, isTransferPublishing, isTransferSucceeded, transferModal } = useModQueueTransfer(displayComment);
  const displayStatus = isTransferSucceeded ? 'rejected' : status;
  const displayIsPublishing = isPublishing || isTransferPublishing;

  return (
    <>
      <div className={`${styles.row} ${isOdd ? styles.rowOdd : ''}`}>
        <div className={styles.number}>{number ?? 'N/A'}</div>
        {showBoard && (
          <div className={styles.board}>{modQueueUrl ? <Link to={modQueueUrl}>/{boardDisplayPath ?? '—'}/</Link> : <span>/{boardDisplayPath ?? '—'}/</span>}</div>
        )}
        <div className={styles.excerpt}>
          <ModQueueExcerptPreviewLink comment={displayComment} excerpt={excerpt} postUrl={postUrl} postUrlState={postUrlState} />
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
            status={displayStatus}
            error={error}
            errorMessage={errorMessage}
            isPublishing={displayIsPublishing}
            handleApprove={handleApprove}
            handleReject={handleReject}
            handleTransfer={handleTransfer}
            handleRemove={displayStatus ? handleRemove : undefined}
            variant='row'
          />
        </div>
      </div>
      {transferModal}
    </>
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
  const { handleTransfer, isTransferPublishing, isTransferSucceeded, transferModal } = useModQueueTransfer(displayComment);
  const displayStatus = isTransferSucceeded ? 'rejected' : status;
  const displayIsPublishing = isPublishing || isTransferPublishing;

  return (
    <>
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
          {t('excerpt')}: <ModQueueExcerptPreviewLink comment={displayComment} excerpt={excerpt} postUrl={postUrl} postUrlState={postUrlState} /> / {t('type')}:{' '}
          {isReply ? t('reply') : t('post')} / {capitalize(t('image'))}: {hasThumbnail ? lowerCase(t('yes')) : lowerCase(t('no'))}
        </div>
        <ModQueueActions
          status={displayStatus}
          error={error}
          errorMessage={errorMessage}
          isPublishing={displayIsPublishing}
          handleApprove={handleApprove}
          handleReject={handleReject}
          handleTransfer={handleTransfer}
          handleRemove={displayStatus ? handleRemove : undefined}
          variant='card'
        />
      </div>
      {transferModal}
    </>
  );
});
ModQueueCard.displayName = 'ModQueueCard';

const ModQueueFeedPost = memo(({ comment }: { comment: Comment }) => {
  const { editedComment } = useEditedComment({ comment });
  const displayComment = editedComment || comment;
  const { status, error, errorMessage, isPublishing, handleApprove, handleReject, handleRemove } = useModQueueActions(comment);
  const { handleTransfer, isTransferPublishing, isTransferSucceeded, transferModal } = useModQueueTransfer(displayComment);
  const displayStatus = isTransferSucceeded ? 'rejected' : status;
  const displayIsPublishing = isPublishing || isTransferPublishing;

  return (
    <>
      <Post
        post={displayComment}
        showAllReplies={false}
        showReplies={false}
        isModQueue={true}
        modQueueStatus={displayStatus}
        modQueueError={error || errorMessage}
        isPublishing={displayIsPublishing}
        onApprove={handleApprove}
        onReject={handleReject}
        onTransfer={handleTransfer}
        onRemoveFromModQueue={displayStatus ? handleRemove : undefined}
      />
      {transferModal}
    </>
  );
});
ModQueueFeedPost.displayName = 'ModQueueFeedPost';

interface ModQueueBoardSummaryProps {
  feed: Comment[];
  directories: DirectoryCommunity[];
  accountCommunityAddresses: string[];
  selectedBoardFilter: string | null;
  setSelectedBoardFilter: (boardAddress: string | null) => void;
}

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

const ModQueueBoardSummary = memo(({ feed, directories, accountCommunityAddresses, selectedBoardFilter, setSelectedBoardFilter }: ModQueueBoardSummaryProps) => {
  const { t } = useTranslation();
  const getAlertThresholdSeconds = useModQueueStore((state) => state.getAlertThresholdSeconds);
  const currentTime = useCurrentTime();
  const alertThresholdSeconds = getAlertThresholdSeconds();
  const locallyModeratedFeed = useLocallyModeratedModQueueFeed(feed, currentTime);
  const boardGroups = useMemo(() => getModQueueBoardFilterGroups(accountCommunityAddresses, directories, BOARD_CODE_GROUPS), [accountCommunityAddresses, directories]);
  const selectedBoardFilterAddresses = useMemo(
    () => getModQueueSelectedBoardAddresses(accountCommunityAddresses, selectedBoardFilter, directories),
    [accountCommunityAddresses, selectedBoardFilter, directories],
  );

  const boardCounts = useMemo(() => {
    const counts = new Map<string, { normal: number; urgent: number }>();
    for (const group of boardGroups) {
      counts.set(group.filterKey, { normal: 0, urgent: 0 });
    }
    for (const item of locallyModeratedFeed) {
      const addr = getCommentCommunityAddress(item);
      if (!addr) continue;
      const entry = counts.get(getModQueueBoardFilterKey(addr, directories));
      if (!entry) continue;
      const isAwaiting = isPendingApprovalAwaiting(item);
      if (!isAwaiting) continue;
      const timeWaiting = currentTime - (item.timestamp ?? 0);
      const isUrgent = timeWaiting > alertThresholdSeconds;
      if (isUrgent) entry.urgent++;
      else entry.normal++;
    }
    return counts;
  }, [locallyModeratedFeed, boardGroups, currentTime, alertThresholdSeconds, directories]);

  const { totalNormal, totalUrgent } = useMemo(() => {
    let normal = 0;
    let urgent = 0;
    for (const entry of boardCounts.values()) {
      normal += entry.normal;
      urgent += entry.urgent;
    }
    return { totalNormal: normal, totalUrgent: urgent };
  }, [boardCounts]);

  const handleSelectAll = useCallback(() => setSelectedBoardFilter(null), [setSelectedBoardFilter]);
  const handleSelectBoard = useCallback((filterKey: string) => setSelectedBoardFilter(filterKey), [setSelectedBoardFilter]);

  if (boardGroups.length === 0) {
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
      {boardGroups.map((group) => {
        const displayText =
          group.isDirectory || group.filterKey.endsWith('.eth') || group.filterKey.endsWith('.sol')
            ? group.filterKey
            : getShortAddress(group.filterKey) || group.filterKey;
        const isSelected =
          selectedBoardFilter === group.filterKey ||
          group.addresses.some((address) => selectedBoardFilterAddresses?.some((selectedAddress) => areSameBoardAddress(address, selectedAddress)));
        const { normal, urgent } = boardCounts.get(group.filterKey) ?? { normal: 0, urgent: 0 };

        return (
          <React.Fragment key={group.filterKey}>
            {' / '}
            <button
              type='button'
              className={`${styles.boardSummaryLink} ${isSelected ? styles.boardSummaryLinkSelected : ''}`}
              onClick={() => handleSelectBoard(group.filterKey)}
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
});
ModQueueBoardSummary.displayName = 'ModQueueBoardSummary';

interface ModQueueContentProps {
  accountCommunityAddresses: string[];
  addressToPathMap: Map<string, string>;
  boardSummaryFeed: Comment[];
  compactCardItemContent: (index: number, comment: Comment) => React.ReactNode;
  compactRowItemContent: (index: number, comment: Comment) => React.ReactNode;
  communityError: Error | null | undefined;
  directories: DirectoryCommunity[];
  feedLength: number;
  feedPostItemContent: (index: number, comment: Comment) => React.ReactNode;
  filteredFeed: Comment[];
  hasMore: boolean;
  isMobile: boolean;
  isQueueEmpty: boolean;
  loadMore: () => void;
  resolvedAddress: string | undefined;
  selectedBoardFilter: string | null;
  setSelectedBoardFilter: React.Dispatch<React.SetStateAction<string | null>>;
  showBoardColumn: boolean;
  viewMode: 'compact' | 'feed';
  virtuosoFooterContext: ModQueueVirtuosoFooterContext | null;
}

const ModQueueContent = memo(
  ({
    accountCommunityAddresses,
    addressToPathMap,
    boardSummaryFeed,
    compactCardItemContent,
    compactRowItemContent,
    communityError,
    directories,
    feedLength,
    feedPostItemContent,
    filteredFeed,
    hasMore,
    isMobile,
    isQueueEmpty,
    loadMore,
    resolvedAddress,
    selectedBoardFilter,
    setSelectedBoardFilter,
    showBoardColumn,
    viewMode,
    virtuosoFooterContext,
  }: ModQueueContentProps) => {
    const { t } = useTranslation();

    return (
      <>
        <div className={styles.container}>
          {!resolvedAddress && (
            <div className={styles.controls}>
              <div className={styles.controlsLeft}>
                <ModQueueBoardSummary
                  feed={boardSummaryFeed}
                  directories={directories}
                  accountCommunityAddresses={accountCommunityAddresses}
                  selectedBoardFilter={selectedBoardFilter}
                  setSelectedBoardFilter={setSelectedBoardFilter}
                />
              </div>
            </div>
          )}

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

              {isQueueEmpty ? (
                <div className={`${styles.empty} ${styles.emptyTableRow}`}>{t('queue_is_empty')}</div>
              ) : hasMore ? (
                <Virtuoso
                  useWindowScroll
                  data={filteredFeed}
                  totalCount={filteredFeed.length}
                  endReached={loadMore}
                  increaseViewportBy={MOD_QUEUE_VIRTUOSO_INCREASE_VIEWPORT_BY}
                  itemContent={compactRowItemContent}
                  components={MOD_QUEUE_VIRTUOSO_COMPONENTS}
                  context={virtuosoFooterContext ?? undefined}
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
                  {communityError?.message && feedLength === 0 && (
                    <div className={styles.error}>
                      <ErrorDisplay error={communityError} />
                    </div>
                  )}
                  <ModQueueContinuingFooter hasMore={hasMore} />
                </>
              )}
            </>
          )}

          {viewMode === 'compact' && isMobile && (
            <>
              {isQueueEmpty ? (
                <div className={styles.empty}>{t('queue_is_empty')}</div>
              ) : hasMore ? (
                <Virtuoso
                  useWindowScroll
                  data={filteredFeed}
                  totalCount={filteredFeed.length}
                  endReached={loadMore}
                  increaseViewportBy={MOD_QUEUE_VIRTUOSO_INCREASE_VIEWPORT_BY}
                  itemContent={compactCardItemContent}
                  components={MOD_QUEUE_VIRTUOSO_COMPONENTS}
                  context={virtuosoFooterContext ?? undefined}
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
                  {communityError?.message && feedLength === 0 && (
                    <div className={styles.error}>
                      <ErrorDisplay error={communityError} />
                    </div>
                  )}
                  <ModQueueContinuingFooter hasMore={hasMore} />
                </>
              )}
            </>
          )}

          {viewMode === 'feed' && (
            <>
              {isQueueEmpty ? (
                <div className={styles.empty}>{t('queue_is_empty')}</div>
              ) : hasMore ? (
                <Virtuoso
                  useWindowScroll
                  data={filteredFeed}
                  totalCount={filteredFeed.length}
                  endReached={loadMore}
                  increaseViewportBy={MOD_QUEUE_VIRTUOSO_INCREASE_VIEWPORT_BY}
                  itemContent={feedPostItemContent}
                  components={MOD_QUEUE_VIRTUOSO_COMPONENTS}
                  context={virtuosoFooterContext ?? undefined}
                />
              ) : (
                <>
                  {filteredFeed.map((comment) => (
                    <ModQueueFeedPost key={comment.cid} comment={comment} />
                  ))}
                  {communityError?.message && feedLength === 0 && (
                    <div className={styles.error}>
                      <ErrorDisplay error={communityError} />
                    </div>
                  )}
                  <ModQueueContinuingFooter hasMore={hasMore} />
                </>
              )}
            </>
          )}
        </div>
        <ModQueuePageFooter />
      </>
    );
  },
);
ModQueueContent.displayName = 'ModQueueContent';

const ModQueueView = ({ boardIdentifier: propBoardIdentifier }: ModQueueViewProps) => {
  const params = useParams();
  const [selectedBoardFilter, setSelectedBoardFilter] = useState<string | null>(null);
  const viewMode = useModQueueStore((state) => state.viewMode);
  const dismissedCommentCids = useModQueueStore((state) => state.dismissedCommentCids);
  const queuedCommentHistory = useModQueueStore((state) => state.queuedCommentHistory);
  const rememberCommentsInQueue = useModQueueStore((state) => state.rememberCommentsInQueue);
  const isMobile = useIsMobile();

  const moderatedCommunityAddressInputs = useModeratedCommunityAddressInputs();
  const rawAccountCommunityAddresses = useModeratedCommunityAddressesForInputs(moderatedCommunityAddressInputs);
  const accountCommunityAddressesKey = getAddressListKey(rawAccountCommunityAddresses);
  const accountCommunityAddresses = useMemo(() => getAddressListFromKey(accountCommunityAddressesKey), [accountCommunityAddressesKey]);

  const directories = useDirectories();

  const boardIdentifier = propBoardIdentifier || params.boardIdentifier;

  const resolvedAddress = useMemo(() => {
    if (boardIdentifier) {
      return getCommunityAddress(boardIdentifier, directories);
    }
    return undefined;
  }, [boardIdentifier, directories]);

  const communityAddressesKey = resolvedAddress ?? accountCommunityAddressesKey;
  const communityAddresses = useMemo(
    () => (resolvedAddress ? [resolvedAddress] : getAddressListFromKey(communityAddressesKey)),
    [resolvedAddress, communityAddressesKey],
  );
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
  const selectedBoardFilterAddresses = useMemo(
    () => getModQueueSelectedBoardAddresses(communityAddresses, selectedBoardFilter, directories),
    [communityAddresses, selectedBoardFilter, directories],
  );
  const filteredFeed = useMemo(
    () => filterVisibleModQueueFeed(feedWithHistory, selectedBoardFilter, dismissedCommentCidSet, selectedBoardFilterAddresses),
    [feedWithHistory, selectedBoardFilter, dismissedCommentCidSet, selectedBoardFilterAddresses],
  );
  const hasVisibleComments = filteredFeed.length > 0;

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
  const feedPostItemContent = useCallback((_index: number, comment: Comment) => <ModQueueFeedPost key={comment.cid} comment={comment} />, []);

  const setResetFunction = useFeedResetStore((state) => state.setResetFunction);
  useEffect(() => {
    setResetFunction(reset);
  }, [reset, setResetFunction]);

  const footerError = feed.length === 0 && communityError?.message ? communityError : null;
  const virtuosoFooterContext = useMemo(
    () => ({
      error: footerError,
      hasMore,
    }),
    [footerError, hasMore],
  );
  const isQueueEmpty = !hasVisibleComments;
  const boardSummaryFeed = feed.length > 0 ? feed : EMPTY_COMMENTS;
  const visibleFilteredFeed = isQueueEmpty ? EMPTY_COMMENTS : filteredFeed;
  const visibleHasMore = isQueueEmpty ? false : hasMore;
  const visibleLoadMore = isQueueEmpty ? NOOP_LOAD_MORE : loadMore;
  const visibleCommunityError = isQueueEmpty ? null : communityError;
  const visibleFeedLength = isQueueEmpty ? 0 : feed.length;
  const visibleVirtuosoFooterContext = isQueueEmpty ? null : virtuosoFooterContext;

  return (
    <>
      <ModQueueCommunityMetadataLoader candidateCommunityAddresses={moderatedCommunityAddressInputs.candidateCommunityAddresses} />
      <ModQueueContent
        accountCommunityAddresses={accountCommunityAddresses}
        addressToPathMap={addressToPathMap}
        boardSummaryFeed={boardSummaryFeed}
        compactCardItemContent={compactCardItemContent}
        compactRowItemContent={compactRowItemContent}
        communityError={visibleCommunityError}
        directories={directories}
        feedLength={visibleFeedLength}
        feedPostItemContent={feedPostItemContent}
        filteredFeed={visibleFilteredFeed}
        hasMore={visibleHasMore}
        isMobile={isMobile}
        isQueueEmpty={isQueueEmpty}
        loadMore={visibleLoadMore}
        resolvedAddress={resolvedAddress}
        selectedBoardFilter={selectedBoardFilter}
        setSelectedBoardFilter={setSelectedBoardFilter}
        showBoardColumn={showBoardColumn}
        viewMode={viewMode}
        virtuosoFooterContext={visibleVirtuosoFooterContext}
      />
    </>
  );
};

export default ModQueueView;
