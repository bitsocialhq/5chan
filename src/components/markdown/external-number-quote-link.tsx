import type { MouseEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAccount } from '@bitsocial/bitsocial-react-hooks';
import { useDirectories } from '../../hooks/use-directories';
import useIsMobile from '../../hooks/use-is-mobile';
import { resolveExternalQuoteTarget } from '../../lib/utils/external-quote-resolver';
import { ExternalQuoteReference, getExternalQuoteBoardLabel, getExternalQuoteStatusMessage } from '../../lib/utils/external-quote-utils';
import useExternalQuoteStatusStore from '../../stores/use-external-quote-status-store';
import LoadingEllipsis from '../loading-ellipsis';
import postStyles from '../../views/post/post.module.css';
import { Post } from '../../views/post';
import styles from './markdown.module.css';

interface ExternalNumberQuoteLinkProps {
  isOP?: boolean;
  reference: ExternalQuoteReference;
}

type ResolvedExternalQuoteTarget = NonNullable<Awaited<ReturnType<typeof resolveExternalQuoteTarget>>>;

type PreviewState =
  | {
      kind: 'idle';
    }
  | {
      kind: 'loading';
      message: string;
    }
  | {
      kind: 'error';
      message: string;
    }
  | {
      kind: 'resolved';
      target: ResolvedExternalQuoteTarget;
    };

type PreviewPosition = {
  left: number;
  top: number;
};

const ExternalNumberQuoteLink = ({ isOP = false, reference }: ExternalNumberQuoteLinkProps) => {
  const { t } = useTranslation();
  const account = useAccount();
  const directories = useDirectories();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const setErrorStatus = useExternalQuoteStatusStore((state) => state.setErrorStatus);
  const [isResolving, setIsResolving] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewState, setPreviewState] = useState<PreviewState>({ kind: 'idle' });
  const [previewPosition, setPreviewPosition] = useState<PreviewPosition | null>(null);
  const anchorRef = useRef<HTMLAnchorElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const resolvedTargetRef = useRef<ResolvedExternalQuoteTarget | null | undefined>(undefined);
  const resolutionPromiseRef = useRef<Promise<ResolvedExternalQuoteTarget | null> | null>(null);
  const previewOpenRef = useRef(false);
  const latestStatusMessageRef = useRef('');

  const boardLabel = getExternalQuoteBoardLabel(reference, directories);
  const linkLabel = isOP ? `${reference.raw} (OP)` : reference.raw;

  const updatePreviewPosition = (anchor: HTMLElement | null) => {
    if (!anchor || isMobile) {
      return;
    }

    const padding = 10;
    const rect = anchor.getBoundingClientRect();
    const previewWidth = previewRef.current?.offsetWidth ?? Math.min(360, window.innerWidth - padding * 2);
    const previewHeight = previewRef.current?.offsetHeight ?? 0;
    const shouldPlaceLeft = rect.right + previewWidth + padding > window.innerWidth && rect.left - previewWidth - padding >= padding;
    const left = shouldPlaceLeft ? Math.max(padding, rect.left - previewWidth - 8) : Math.min(window.innerWidth - previewWidth - padding, rect.right + 8);
    const top = Math.min(Math.max(padding, rect.top - 8), Math.max(padding, window.innerHeight - previewHeight - padding));

    setPreviewPosition({ left, top });
  };

  useEffect(() => {
    if (!isPreviewOpen || isMobile) {
      return;
    }

    const reposition = () => updatePreviewPosition(anchorRef.current);
    reposition();

    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);

    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [isMobile, isPreviewOpen, previewState.kind]);

  const getInitialSearchMessage = () =>
    getExternalQuoteStatusMessage(t, {
      boardLabel,
      phase: 'search-board',
      quoteDisplay: reference.raw,
    });

  const getUnavailableMessage = () => t('external_quote_unavailable');
  const getCannotResolveMessage = () =>
    t('external_quote_cannot_resolve', {
      board: boardLabel,
      interpolation: { escapeValue: false },
      quote: reference.raw,
    });

  const resolveTarget = async ({ updatePreview }: { updatePreview: boolean }) => {
    if (!account?.id) {
      throw new Error('Missing active account while resolving external quote');
    }

    if (resolvedTargetRef.current !== undefined) {
      return resolvedTargetRef.current;
    }

    if (!resolutionPromiseRef.current) {
      resolutionPromiseRef.current = resolveExternalQuoteTarget({
        account,
        directories,
        onStatus: (status) => {
          const message = getExternalQuoteStatusMessage(t, status);
          latestStatusMessageRef.current = message;

          if (updatePreview && previewOpenRef.current) {
            setPreviewState({ kind: 'loading', message });
          }
        },
        reference,
      }).then((target) => {
        resolvedTargetRef.current = target;
        return target;
      });
    }

    try {
      const target = await resolutionPromiseRef.current;
      resolutionPromiseRef.current = null;
      return target;
    } catch (error) {
      resolutionPromiseRef.current = null;
      throw error;
    }
  };

  const handleMouseEnter = async (e: MouseEvent<HTMLAnchorElement>) => {
    if (isMobile) {
      return;
    }

    anchorRef.current = e.currentTarget;
    previewOpenRef.current = true;
    setIsPreviewOpen(true);
    updatePreviewPosition(e.currentTarget);

    if (resolvedTargetRef.current === null) {
      setPreviewState({ kind: 'error', message: getCannotResolveMessage() });
      return;
    }

    if (resolvedTargetRef.current?.comment) {
      setPreviewState({ kind: 'resolved', target: resolvedTargetRef.current });
      return;
    }

    setPreviewState({ kind: 'loading', message: latestStatusMessageRef.current || getInitialSearchMessage() });

    let target: ResolvedExternalQuoteTarget | null;

    try {
      target = await resolveTarget({ updatePreview: true });
    } catch {
      if (previewOpenRef.current) {
        setPreviewState({ kind: 'error', message: t('external_quote_resolution_unavailable') });
      }
      return;
    }

    if (!previewOpenRef.current) {
      return;
    }

    if (!target) {
      setPreviewState({ kind: 'error', message: getCannotResolveMessage() });
      return;
    }

    if (target.isUnavailable || !target.comment) {
      setPreviewState({ kind: 'error', message: getUnavailableMessage() });
      return;
    }

    setPreviewState({ kind: 'resolved', target });
  };

  const handleMouseLeave = () => {
    previewOpenRef.current = false;
    setIsPreviewOpen(false);
    setPreviewPosition(null);
  };

  const openExternalQuote = async (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    if (isResolving) {
      return;
    }

    if (!account?.id) {
      setErrorStatus(t('external_quote_resolution_unavailable'));
      return;
    }

    setIsResolving(true);

    const finishWithError = (message: string) => {
      setErrorStatus(message);
      setIsResolving(false);
    };

    let target: ResolvedExternalQuoteTarget | null;

    try {
      target = await resolveTarget({ updatePreview: false });
    } catch {
      finishWithError(getCannotResolveMessage());
      return;
    }

    if (!target) {
      finishWithError(getCannotResolveMessage());
      return;
    }

    if (target.isUnavailable) {
      finishWithError(getUnavailableMessage());
      return;
    }

    setIsResolving(false);
    navigate(target.route);
  };

  const previewContent =
    previewState.kind === 'idle' ? null : previewState.kind === 'resolved' ? (
      previewState.target.comment ? (
        <Post post={previewState.target.comment} showReplies={false} />
      ) : (
        <div className={`${styles.externalQuotePreviewState} ${styles.externalQuotePreviewError}`}>{getUnavailableMessage()}</div>
      )
    ) : previewState.kind === 'loading' ? (
      <div className={styles.externalQuotePreviewState}>
        <LoadingEllipsis string={previewState.message} />
      </div>
    ) : (
      <div className={`${styles.externalQuotePreviewState} ${styles.externalQuotePreviewError}`}>{previewState.message}</div>
    );
  const previewClassName =
    previewState.kind === 'resolved' && previewState.target.comment && !previewState.target.comment.parentCid
      ? `${postStyles.replyQuotePreview} ${postStyles.replyQuotePreviewOp}`
      : postStyles.replyQuotePreview;

  return (
    <>
      <a
        aria-busy={isResolving || undefined}
        className={isResolving ? styles.inlineQuoteLinkResolving : undefined}
        href={`#/${boardLabel}`}
        onClick={openExternalQuote}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        ref={anchorRef}
      >
        {linkLabel}
      </a>
      {!isMobile &&
        isPreviewOpen &&
        previewPosition &&
        previewContent &&
        createPortal(
          <div
            className={previewClassName}
            data-thread-scroll-preview='true'
            ref={previewRef}
            style={{ left: previewPosition.left, position: 'fixed', top: previewPosition.top, zIndex: 30 }}
          >
            {previewContent}
          </div>,
          document.body,
        )}
    </>
  );
};

export default ExternalNumberQuoteLink;
