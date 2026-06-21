import { type ReactNode, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { Comment, useComment } from '@bitsocial/bitsocial-react-hooks';
import { communitiesPagesStore as useCommunitiesPagesStore } from '../../lib/bitsocial-internals/stores';
import usePostNumberStore from '../../stores/use-post-number-store';
import getShortAddress from '../../lib/get-short-address';
import { getFormattedDate } from '../../lib/utils/time-utils';
import { isUnavailableQuoteTarget } from '../../lib/utils/quote-link-utils';
import { isPostPageView } from '../../lib/utils/view-utils';
import useIsMobile from '../../hooks/use-is-mobile';
import useStateString from '../../hooks/use-state-string';
import LoadingEllipsis from '../loading-ellipsis';
import BbcodeContent from '../../components/bbcode-content/bbcode-content';
import ErrorDisplay from '../../components/error-display/error-display';
import ReplyQuotePreview from '../reply-quote-preview';
import Markdown from '../markdown';
import Tooltip from '../tooltip';
import styles from '../../views/post/post.module.css';
import capitalize from 'lodash/capitalize';
import { getCommentCommunityAddress, withResolvedCommentCommunityAddress } from '../../lib/utils/comment-utils';
import { formatErrorMessageForDisplay } from '../../lib/utils/error-utils';
import { hasModQueueAccessRole } from '../../lib/utils/mod-access';
import { stripGeneratedFortuneMarkup } from '../../lib/utils/post-options-utils';

const QuotedCidLink = ({ cid, postCid }: { cid: string; postCid: string }) => {
  const quotedNumber = usePostNumberStore((state) => state.cidToNumber[cid]);
  const commentFromStore = useCommunitiesPagesStore((state) => state.comments[cid]);
  const commentFromHook = useComment({ commentCid: cid, onlyIfCached: true });
  // Prefer hook version to ensure 'number' property is populated for deeper nested replies in Virtuoso
  const quotedComment = commentFromHook?.number !== undefined ? commentFromHook : commentFromStore;
  const isOP = cid === postCid;
  const isUnavailable = isUnavailableQuoteTarget(quotedComment);

  return <ReplyQuotePreview isQuotelinkReply={true} quotelinkReply={quotedComment} quotelinkNumber={quotedNumber} isQuotelinkUnavailable={isUnavailable} isOP={isOP} />;
};

const useScopedCidToNumber = (cids: string[]) => {
  const sortedUniqueCids = useMemo(() => {
    const uniqueCids = new Set<string>();
    for (const cid of cids) {
      if (cid) {
        uniqueCids.add(cid);
      }
    }
    return Array.from(uniqueCids).toSorted();
  }, [cids]);

  const cidToNumber = usePostNumberStore(
    useMemo(
      () => (state) => {
        if (sortedUniqueCids.length === 0) {
          return {} as Record<string, number>;
        }
        const nextCidToNumber: Record<string, number> = {};
        for (const cid of sortedUniqueCids) {
          const number = state.cidToNumber[cid];
          if (typeof number === 'number') {
            nextCidToNumber[cid] = number;
          }
        }
        return nextCidToNumber;
      },
      [sortedUniqueCids],
    ),
  );

  return cidToNumber;
};

const getFailedCommentError = (comment: Comment | undefined): unknown => {
  if (comment?.state !== 'failed') return undefined;
  if (comment.error) return comment.error;
  return Array.isArray(comment.errors) ? comment.errors.find(Boolean) : undefined;
};

const getRoleByAddress = (roles: unknown, address?: string): string | undefined => {
  if (!roles || !address || typeof roles !== 'object') return undefined;

  const roleEntry = (roles as Record<string, { role?: unknown } | undefined>)[address];
  return typeof roleEntry?.role === 'string' ? roleEntry.role : undefined;
};

const CommentContent = ({
  appendContent,
  comment: post,
  prependContent,
  roles,
}: {
  appendContent?: ReactNode;
  comment: Comment;
  prependContent?: ReactNode;
  roles?: unknown;
}) => {
  const { t } = useTranslation();
  const params = useParams();
  const location = useLocation();
  const isInPostView = isPostPageView(location.pathname, params);
  const isMobile = useIsMobile();
  const resolvedPost = withResolvedCommentCommunityAddress(post);

  const { cid, content, deleted, parentCid, postCid, pendingApproval, quotedCids, reason, removed, state } = resolvedPost || {};
  const visibleContent = !cid && content ? stripGeneratedFortuneMarkup(content) : content;
  const communityAddress = getCommentCommunityAddress(resolvedPost);
  const authorAddress = resolvedPost?.author?.address;
  const authorRole = getRoleByAddress(roles, authorAddress);
  const isPrivilegedAuthor = hasModQueueAccessRole(authorRole);
  const shouldRenderBbcode = isPrivilegedAuthor;
  const purged = resolvedPost?.commentModeration?.purged;
  const banExpiresAt = resolvedPost?.author?.community?.banExpiresAt;
  const banned = !!banExpiresAt;

  const [showFullComment, setShowFullComment] = useState(false);
  const displayContent =
    visibleContent &&
    (!isInPostView && visibleContent.length > 1000 && !showFullComment && !isPrivilegedAuthor
      ? visibleContent.slice(0, 1000)
      : isInPostView && visibleContent.length > 2000 && !showFullComment && !isPrivilegedAuthor
        ? visibleContent.slice(0, 2000)
        : visibleContent);

  const quotelinkReplyFromStore = useCommunitiesPagesStore((state) => state.comments[parentCid]);
  const quotelinkReplyFromHook = useComment({ commentCid: parentCid, onlyIfCached: true });
  // Prefer hook version to ensure 'number' property is populated for deeper nested replies in Virtuoso
  const quotelinkReply = quotelinkReplyFromHook?.number !== undefined ? quotelinkReplyFromHook : quotelinkReplyFromStore;

  const isReply = !!parentCid;
  const isReplyingToReply = isReply && parentCid !== postCid;

  const contentNumbers = useMemo(() => {
    if (!visibleContent) return new Set<number>();
    return new Set([...visibleContent.matchAll(/(?<![>/\w])>>(\d+)(?![\d/])/g)].map((m) => parseInt(m[1], 10)));
  }, [visibleContent]);

  const relevantQuotedCids = useMemo(() => {
    const cids = quotedCids ? [...quotedCids] : [];
    if (parentCid) {
      cids.push(parentCid);
    }
    return cids;
  }, [quotedCids, parentCid]);

  const cidToNumber = useScopedCidToNumber(relevantQuotedCids);
  const filteredQuotedCids = useMemo(() => {
    if (!quotedCids?.length) return [];
    return quotedCids.filter((cid: string) => {
      const num = cidToNumber[cid];
      if (num === undefined) return false;
      return !contentNumbers.has(num);
    });
  }, [quotedCids, cidToNumber, contentNumbers]);

  const parentNumber = parentCid ? cidToNumber[parentCid] : undefined;
  const shouldShowReplyingToReply = isReplyingToReply && parentNumber !== undefined && !contentNumbers.has(parentNumber);

  const stateString = useStateString(resolvedPost);
  const hasFailedState = state === 'failed';
  const failedError = getFailedCommentError(resolvedPost);
  const failedErrorMessage = formatErrorMessageForDisplay(failedError);
  const shouldShowUnpublishedStateDetails = !cid && (!hasFailedState || Boolean(failedError));
  const reasonMessage = reason ? `${capitalize(t('reason'))}: ${reason}` : undefined;
  const pendingApprovalReason = pendingApproval ? reason?.trim() : undefined;
  const pendingApprovalReasonMessage = pendingApprovalReason
    ? t('pending_mod_approval_reason', {
        reason: pendingApprovalReason,
        interpolation: { escapeValue: false },
      })
    : undefined;

  const loadingString = (
    <div className={styles.stateString}>
      {failedError ? (
        <ErrorDisplay error={failedError} displayMessage={failedErrorMessage ?? capitalize(t('error'))} inline={true} showImmediately={true} />
      ) : !hasFailedState ? (
        <LoadingEllipsis string={stateString || t('loading')} />
      ) : (
        stateString || capitalize(t('failed'))
      )}
    </div>
  );
  const renderContent = (value: string | undefined) =>
    shouldRenderBbcode ? (
      <BbcodeContent content={value || ''} postCid={postCid} communityAddress={communityAddress} />
    ) : (
      <Markdown content={value || ''} postCid={postCid} communityAddress={communityAddress} />
    );

  return (
    <blockquote className={`${styles.postMessage} ${!isReply && isMobile && styles.clampLines}`}>
      {prependContent && (
        <>
          {prependContent}
          <br />
        </>
      )}
      {isReply &&
        !hasFailedState &&
        !(deleted || removed || purged) &&
        (filteredQuotedCids.length > 0
          ? filteredQuotedCids.map((cid: string) => <QuotedCidLink key={cid} cid={cid} postCid={postCid} />)
          : shouldShowReplyingToReply && <ReplyQuotePreview isQuotelinkReply={true} quotelinkReply={quotelinkReply} quotelinkNumber={parentNumber} />)}
      {purged ? (
        <span className={styles.grayEditMessage}>{capitalize(t('this_post_was_purged'))}</span>
      ) : removed ? (
        reasonMessage ? (
          <>
            <span className={styles.redEditMessage}>({t('this_post_was_removed')})</span>
            <br />
            <br />
            {renderContent(reasonMessage)}
          </>
        ) : (
          <span className={styles.grayEditMessage}>{capitalize(t('this_post_was_removed'))}.</span>
        )
      ) : deleted ? (
        reasonMessage ? (
          <>
            <span className={styles.grayEditMessage}>{t('user_deleted_this_post')}</span> {renderContent(reasonMessage)}
          </>
        ) : (
          <span className={styles.grayEditMessage}>{t('user_deleted_this_post')}</span>
        )
      ) : (
        <>
          {displayContent && renderContent(displayContent)}
          {pendingApproval && (
            <>
              <br />
              <br />
              <span className={styles.pendingApproval}>({t('pending_mod_approval')})</span>
              {pendingApprovalReasonMessage ? (
                <>
                  <br />
                  <br />
                  <span className={styles.pendingApprovalReason}>{renderContent(pendingApprovalReasonMessage)}</span>
                </>
              ) : null}
            </>
          )}
          {((!isInPostView && visibleContent?.length > 1000 && !showFullComment) || (isInPostView && visibleContent?.length > 2000 && !showFullComment)) &&
            !isPrivilegedAuthor && (
              <span className={styles.abbr}>
                <br />
                <br />
                <Trans
                  i18nKey={'comment_too_long'}
                  shouldUnescape={true}
                  components={{
                    1: (
                      <button
                        type='button'
                        key={cid}
                        aria-label={t('view')}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setShowFullComment(true);
                          }
                        }}
                        onClick={() => setShowFullComment(true)}
                      />
                    ),
                  }}
                />
              </span>
            )}
        </>
      )}
      {banned && (
        <span className={styles.removedContent}>
          <br />
          <br />
          <Tooltip
            content={`${t('ban_expires_at', {
              address: communityAddress && getShortAddress(communityAddress),
              timestamp: banExpiresAt ? getFormattedDate(banExpiresAt) : '',
              interpolation: { escapeValue: false },
            })}${reason ? `. ${capitalize(t('reason'))}: "${reason}"` : ''}`}
          >
            {`(${t('user_banned')})`}
          </Tooltip>
        </span>
      )}
      {shouldShowUnpublishedStateDetails && (
        <>
          <br />
          <br />
          {loadingString}
        </>
      )}
      {appendContent && (
        <>
          <br />
          <br />
          {appendContent}
        </>
      )}
    </blockquote>
  );
};

export default CommentContent;
