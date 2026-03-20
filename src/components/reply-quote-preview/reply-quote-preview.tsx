import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Comment, useAccount } from '@bitsocialnet/bitsocial-react-hooks';
import { useFloating, offset, shift, size, autoUpdate, Placement } from '@floating-ui/react';
import { useDirectories } from '../../hooks/use-directories';
import useSafeAccountComment from '../../hooks/use-safe-account-comment';
import { getBoardPath } from '../../lib/utils/route-utils';
import { formatQuoteNumber, getQuoteTargetAvailability, shouldShowFloatingQuotePreview } from '../../lib/utils/quote-link-utils';
import { findPreferredScrollTarget, getThreadTopNavigationState, scrollThreadContainerToTop } from '../../lib/utils/thread-scroll-utils';
import useIsMobile from '../../hooks/use-is-mobile';
import styles from '../../views/post/post.module.css';
import { Post } from '../../views/post';
import { getCommentCommunityAddress, withResolvedCommentCommunityAddress } from '../../lib/utils/comment-utils';

interface ReplyQuotePreviewProps {
  isBacklinkReply?: boolean;
  backlinkReply?: Comment;
  isQuotelinkReply?: boolean;
  quotelinkReply?: Comment;
  quotelinkNumber?: number;
  isQuotelinkUnavailable?: boolean;
  isOP?: boolean;
  showTrailingBreak?: boolean;
}

const handleQuoteHover = (cid: string, onElementOutOfView: () => void) => {
  const targetElements = document.querySelectorAll(`[data-cid="${cid}"]`);
  const isOpElement = (element: HTMLElement) => element.getAttribute('data-post-cid') === cid;

  const isInViewport = (element: HTMLElement) => {
    const bounding = element.getBoundingClientRect();
    return (
      bounding.top >= 0 &&
      bounding.left >= 0 &&
      bounding.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      bounding.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  };

  let anyInView = false;

  targetElements.forEach((element) => {
    const htmlElement = element as HTMLElement;
    if (isInViewport(htmlElement)) {
      // Never apply quote-hover highlight styles to OP cards.
      if (isOpElement(htmlElement)) {
        htmlElement.classList.remove('highlight', 'double-highlight');
        anyInView = true;
        return;
      }

      const hasHighlight = Array.from(htmlElement.classList).some((className) => className.includes('highlight') && !className.includes('double-highlight'));
      if (hasHighlight) {
        htmlElement.classList.remove('highlight');
        htmlElement.classList.add('double-highlight');
      } else {
        htmlElement.classList.remove('double-highlight');
        htmlElement.classList.add('highlight');
      }
      anyInView = true;
    } else {
      // If not in view, remove both classes
      htmlElement.classList.remove('highlight', 'double-highlight');
    }
  });

  if (!anyInView) {
    onElementOutOfView();
  }
};

const getInPageScrollTarget = (selector: string) => findPreferredScrollTarget(selector, '[data-thread-scroll-preview="true"]');

const scrollToReplyOnPage = (cid: string) => {
  const el = getInPageScrollTarget(`[data-cid="${cid}"][data-post-cid]`);
  if (!el) return false;
  document.querySelectorAll('.scroll-highlight').forEach((prev) => prev.classList.remove('scroll-highlight'));
  el.scrollIntoView({ behavior: 'auto', block: 'center' });
  el.classList.add('scroll-highlight');
  return true;
};

const useIsOwnQuotelink = (quotelinkReply?: Comment) => {
  const account = useAccount();
  const ownQuotelink = useSafeAccountComment({ commentCid: quotelinkReply?.cid });
  const quotedAuthorAddress = quotelinkReply?.author?.address;
  const accountAuthorAddress = account?.author?.address;

  return Boolean(
    (quotelinkReply?.cid && ownQuotelink?.cid === quotelinkReply.cid) || (quotedAuthorAddress && accountAuthorAddress && quotedAuthorAddress === accountAuthorAddress),
  );
};

const DesktopQuotePreview = ({
  backlinkReply,
  quotelinkReply,
  quotelinkNumber,
  isBacklinkReply,
  isQuotelinkReply,
  isQuotelinkUnavailable,
  isOP,
  showTrailingBreak = true,
}: ReplyQuotePreviewProps) => {
  const [hoveredCid, setHoveredCid] = useState<string | null>(null);
  const [outOfViewCid, setOutOfViewCid] = useState<string | null>(null);
  const [placement, setPlacement] = useState<Placement>('right');
  const availableWidthRef = useRef<number>(0);
  const directories = useDirectories();

  const { refs, floatingStyles, update } = useFloating({
    placement,
    middleware: [
      shift({ padding: 10 }),
      offset({ mainAxis: placement === 'right' ? 8 : 4 }),
      size({
        apply({ availableWidth, elements }) {
          availableWidthRef.current = availableWidth;
          if (availableWidth >= 250) {
            elements.floating.style.maxWidth = `${availableWidth - 12}px`;
          } else if (placement === 'right') {
            setPlacement('left');
          }
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    const handleResize = () => {
      const availableWidth = availableWidthRef.current;
      if (availableWidth >= 250) {
        setPlacement('right');
      } else {
        setPlacement('left');
      }
      update();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [update]);

  const navigate = useNavigate();
  const location = useLocation();
  const normalizedBacklinkReply = withResolvedCommentCommunityAddress(backlinkReply);
  const normalizedQuotelinkReply = withResolvedCommentCommunityAddress(quotelinkReply);

  const isOnThreadPage = location.pathname.includes('/thread/');

  const handleClick = (e: React.MouseEvent, cid: string | undefined, communityAddress: string | undefined, isOpQuote = false) => {
    e.preventDefault();
    if (cid && communityAddress) {
      const boardPath = getBoardPath(communityAddress, directories);
      const threadRoute = `/${boardPath}/thread/${cid}`;
      if (isOpQuote) {
        if (isOnThreadPage && scrollThreadContainerToTop(cid)) return;
        navigate(threadRoute, { state: getThreadTopNavigationState(cid) });
        return;
      }
      if (isOnThreadPage && scrollToReplyOnPage(cid)) return;
      navigate(threadRoute);
    }
  };

  const handleMouseOver = (cid: string | undefined) => {
    if (!cid) return;

    handleQuoteHover(cid, () => setOutOfViewCid(cid));
    setHoveredCid(cid);
  };

  const handleMouseLeave = (cid: string | null) => {
    if (cid) {
      const targetElements = document.querySelectorAll(`[data-cid="${cid}"]`);
      targetElements.forEach((element) => {
        element.classList.remove('highlight');
        element.classList.remove('double-highlight');
      });
    }
    setHoveredCid(null);
    setOutOfViewCid(null);
  };

  const backlinkCommunityAddress = getCommentCommunityAddress(normalizedBacklinkReply);
  const backlinkBoardPath = backlinkCommunityAddress ? getBoardPath(backlinkCommunityAddress, directories) : undefined;
  const backlinkRoute = normalizedBacklinkReply?.cid
    ? backlinkBoardPath
      ? `/${backlinkBoardPath}/thread/${normalizedBacklinkReply.cid}`
      : `/thread/${normalizedBacklinkReply.cid}`
    : '#';

  const replyBacklink = (
    <>
      <Link
        className={styles.backlink}
        to={backlinkRoute}
        ref={refs.setReference}
        onMouseOver={() => handleMouseOver(normalizedBacklinkReply?.cid)}
        onMouseLeave={() => handleMouseLeave(normalizedBacklinkReply?.cid)}
        onClick={(e) => handleClick(e, normalizedBacklinkReply?.cid, backlinkCommunityAddress)}
      >
        {'>>'}
        {normalizedBacklinkReply?.number ?? '?'}
      </Link>
      {hoveredCid === normalizedBacklinkReply?.cid &&
        outOfViewCid === normalizedBacklinkReply?.cid &&
        createPortal(
          <div className={styles.replyQuotePreview} data-thread-scroll-preview='true' ref={refs.setFloating} style={floatingStyles}>
            <Post post={normalizedBacklinkReply} showReplies={false} />
          </div>,
          document.body,
        )}
    </>
  );
  const resolvedQuotelinkNumber = normalizedQuotelinkReply?.number ?? quotelinkNumber;
  const resolvedQuotelinkCid = normalizedQuotelinkReply?.cid;
  const resolvedQuotelinkCommunityAddress = getCommentCommunityAddress(normalizedQuotelinkReply);
  const quoteTargetAvailability = getQuoteTargetAvailability(normalizedQuotelinkReply);
  const quotelinkUnavailable = Boolean(isQuotelinkUnavailable || quoteTargetAvailability === 'unavailable');
  const quotelinkPendingResolution = !quotelinkUnavailable && quoteTargetAvailability === 'unresolved';
  const quotelinkClassName = quotelinkUnavailable ? `${styles.quoteLink} ${styles.quoteLinkUnavailable}` : styles.quoteLink;
  const quotelinkBoardPath = resolvedQuotelinkCommunityAddress ? getBoardPath(resolvedQuotelinkCommunityAddress, directories) : undefined;
  const quotelinkRoute = normalizedQuotelinkReply?.cid
    ? quotelinkBoardPath
      ? `/${quotelinkBoardPath}/thread/${normalizedQuotelinkReply.cid}`
      : `/thread/${normalizedQuotelinkReply.cid}`
    : '#';
  const shouldShowQuotelinkPreview = shouldShowFloatingQuotePreview({
    hoveredCid,
    outOfViewCid,
    quoteCid: resolvedQuotelinkCid,
    isUnavailable: quotelinkUnavailable,
  });
  const isOwnQuotelink = useIsOwnQuotelink(normalizedQuotelinkReply);
  const quotelinkLabel = (
    <>
      {formatQuoteNumber(resolvedQuotelinkNumber)}
      {isOP && ' (OP)'}
      {isOwnQuotelink && ' (You)'}
    </>
  );

  const replyQuotelink = (
    <>
      {quotelinkUnavailable ? (
        <span className={quotelinkClassName}>{quotelinkLabel}</span>
      ) : quotelinkPendingResolution ? (
        <span className={styles.quoteLink}>{quotelinkLabel}</span>
      ) : (
        <Link
          to={quotelinkRoute}
          ref={refs.setReference}
          className={quotelinkClassName}
          onMouseOver={() => handleMouseOver(resolvedQuotelinkCid)}
          onMouseLeave={() => handleMouseLeave(resolvedQuotelinkCid)}
          onClick={(e) => handleClick(e, resolvedQuotelinkCid, resolvedQuotelinkCommunityAddress, !!isOP)}
        >
          {quotelinkLabel}
        </Link>
      )}
      {showTrailingBreak && <br />}
      {shouldShowQuotelinkPreview &&
        createPortal(
          <div className={styles.replyQuotePreview} data-thread-scroll-preview='true' ref={refs.setFloating} style={floatingStyles}>
            <Post post={normalizedQuotelinkReply} showReplies={false} />
          </div>,
          document.body,
        )}
    </>
  );

  return isBacklinkReply ? replyBacklink : isQuotelinkReply && replyQuotelink;
};

const MobileQuotePreview = ({
  backlinkReply,
  quotelinkReply,
  quotelinkNumber,
  isBacklinkReply,
  isQuotelinkReply,
  isQuotelinkUnavailable,
  isOP,
  showTrailingBreak = true,
}: ReplyQuotePreviewProps) => {
  const [hoveredCid, setHoveredCid] = useState<string | null>(null);
  const [outOfViewCid, setOutOfViewCid] = useState<string | null>(null);
  const directories = useDirectories();
  const normalizedBacklinkReply = withResolvedCommentCommunityAddress(backlinkReply);
  const normalizedQuotelinkReply = withResolvedCommentCommunityAddress(quotelinkReply);

  const { refs, floatingStyles, update } = useFloating({
    placement: 'bottom',
    middleware: [shift({ padding: isBacklinkReply ? 5 : 10 })],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    // Create a stable function reference for proper cleanup
    const handleResize = () => update();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [update]);

  const navigate = useNavigate();
  const location = useLocation();
  const isOnThreadPage = location.pathname.includes('/thread/');

  const handleClick = (e: React.MouseEvent, cid: string | undefined, communityAddress: string | undefined, isOpQuote = false) => {
    e.preventDefault();
    if (cid && communityAddress) {
      const boardPath = getBoardPath(communityAddress, directories);
      const threadRoute = `/${boardPath}/thread/${cid}`;
      if (isOpQuote) {
        if (isOnThreadPage && scrollThreadContainerToTop(cid)) return;
        navigate(threadRoute, { state: getThreadTopNavigationState(cid) });
        return;
      }
      navigate(threadRoute);
    }
  };

  const handleMouseOver = (cid: string | undefined) => {
    if (!cid) return;

    handleQuoteHover(cid, () => setOutOfViewCid(cid));
    setHoveredCid(cid);
  };

  const handleMouseLeave = (cid: string | null) => {
    if (cid) {
      const targetElements = document.querySelectorAll(`[data-cid="${cid}"]`);
      targetElements.forEach((element) => {
        element.classList.remove('highlight');
        element.classList.remove('double-highlight');
      });
    }
    setHoveredCid(null);
    setOutOfViewCid(null);
  };

  const replyBacklink = (
    <>
      <span
        className={styles.backlink}
        ref={refs.setReference}
        onMouseOver={() => handleMouseOver(normalizedBacklinkReply?.cid)}
        onMouseLeave={() => handleMouseLeave(normalizedBacklinkReply?.cid)}
      >
        {`>>${normalizedBacklinkReply?.number ?? '?'}`}
      </span>
      {normalizedBacklinkReply?.number &&
        (() => {
          const backlinkCommunityAddress = getCommentCommunityAddress(normalizedBacklinkReply);
          const backlinkBoardPath = backlinkCommunityAddress ? getBoardPath(backlinkCommunityAddress, directories) : undefined;
          const backlinkRoute = normalizedBacklinkReply?.cid
            ? backlinkBoardPath
              ? `/${backlinkBoardPath}/thread/${normalizedBacklinkReply.cid}`
              : `/thread/${normalizedBacklinkReply.cid}`
            : '#';
          return (
            <Link to={backlinkRoute} className={styles.backlinkHash} onClick={(e) => handleClick(e, normalizedBacklinkReply?.cid, backlinkCommunityAddress)}>
              {' '}
              #
            </Link>
          );
        })()}
      {hoveredCid === normalizedBacklinkReply?.cid &&
        outOfViewCid === normalizedBacklinkReply?.cid &&
        createPortal(
          <div className={styles.replyQuotePreview} data-thread-scroll-preview='true' ref={refs.setFloating} style={floatingStyles}>
            <Post post={normalizedBacklinkReply} showReplies={false} />
          </div>,
          document.body,
        )}
    </>
  );
  const resolvedQuotelinkNumber = normalizedQuotelinkReply?.number ?? quotelinkNumber;
  const resolvedQuotelinkCid = normalizedQuotelinkReply?.cid;
  const resolvedQuotelinkCommunityAddress = getCommentCommunityAddress(normalizedQuotelinkReply);
  const quoteTargetAvailability = getQuoteTargetAvailability(normalizedQuotelinkReply);
  const quotelinkUnavailable = Boolean(isQuotelinkUnavailable || quoteTargetAvailability === 'unavailable');
  const quotelinkPendingResolution = !quotelinkUnavailable && quoteTargetAvailability === 'unresolved';
  const quotelinkClassName = quotelinkUnavailable ? `${styles.quoteLink} ${styles.quoteLinkUnavailable}` : styles.quoteLink;
  const shouldShowQuotelinkPreview = shouldShowFloatingQuotePreview({
    hoveredCid,
    outOfViewCid,
    quoteCid: resolvedQuotelinkCid,
    isUnavailable: quotelinkUnavailable,
  });
  const isOwnQuotelink = useIsOwnQuotelink(normalizedQuotelinkReply);

  const replyQuotelink = (
    <>
      <span
        ref={quotelinkUnavailable || quotelinkPendingResolution ? undefined : refs.setReference}
        className={quotelinkPendingResolution ? styles.quoteLink : quotelinkClassName}
        onMouseOver={quotelinkUnavailable || quotelinkPendingResolution ? undefined : () => handleMouseOver(resolvedQuotelinkCid)}
        onMouseLeave={quotelinkUnavailable || quotelinkPendingResolution ? undefined : () => handleMouseLeave(resolvedQuotelinkCid)}
      >
        {formatQuoteNumber(resolvedQuotelinkNumber)}
        {isOP && ' (OP)'}
        {isOwnQuotelink && ' (You)'}
      </span>
      {!quotelinkUnavailable &&
        !quotelinkPendingResolution &&
        resolvedQuotelinkNumber &&
        (() => {
          const quotelinkBoardPath = resolvedQuotelinkCommunityAddress ? getBoardPath(resolvedQuotelinkCommunityAddress, directories) : undefined;
          const quotelinkRoute = resolvedQuotelinkCid
            ? quotelinkBoardPath
              ? `/${quotelinkBoardPath}/thread/${resolvedQuotelinkCid}`
              : `/thread/${resolvedQuotelinkCid}`
            : '#';
          return (
            <Link className={quotelinkClassName} to={quotelinkRoute} onClick={(e) => handleClick(e, resolvedQuotelinkCid, resolvedQuotelinkCommunityAddress, !!isOP)}>
              {' '}
              #
            </Link>
          );
        })()}
      {showTrailingBreak && <br />}
      {shouldShowQuotelinkPreview &&
        createPortal(
          <div className={styles.replyQuotePreview} data-thread-scroll-preview='true' ref={refs.setFloating} style={floatingStyles}>
            <Post post={normalizedQuotelinkReply} showReplies={false} />
          </div>,
          document.body,
        )}
    </>
  );

  return isBacklinkReply ? replyBacklink : isQuotelinkReply && replyQuotelink;
};

const ReplyQuotePreview = ({
  backlinkReply,
  quotelinkReply,
  quotelinkNumber,
  isBacklinkReply,
  isQuotelinkReply,
  isQuotelinkUnavailable,
  isOP,
  showTrailingBreak,
}: ReplyQuotePreviewProps) => {
  const isMobile = useIsMobile();

  return isMobile ? (
    <MobileQuotePreview
      backlinkReply={backlinkReply}
      quotelinkReply={quotelinkReply}
      quotelinkNumber={quotelinkNumber}
      isBacklinkReply={isBacklinkReply}
      isQuotelinkReply={isQuotelinkReply}
      isQuotelinkUnavailable={isQuotelinkUnavailable}
      isOP={isOP}
      showTrailingBreak={showTrailingBreak}
    />
  ) : (
    <DesktopQuotePreview
      backlinkReply={backlinkReply}
      quotelinkReply={quotelinkReply}
      quotelinkNumber={quotelinkNumber}
      isBacklinkReply={isBacklinkReply}
      isQuotelinkReply={isQuotelinkReply}
      isQuotelinkUnavailable={isQuotelinkUnavailable}
      isOP={isOP}
      showTrailingBreak={showTrailingBreak}
    />
  );
};

export default ReplyQuotePreview;
