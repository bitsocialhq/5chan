import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'react-router-dom';
import { useComment } from '@bitsocialnet/bitsocial-react-hooks';
import BoardsBar from '../boards-bar';
import SiteLegalMeta from '../site-legal-meta';
import StyleSelector from '../style-selector/style-selector';
import { ReturnButton, CatalogButton, TopButton, UpdateButton, AutoButton, PostPageStats, RefreshButton } from '../board-buttons/board-buttons';
import { isAllView, isSubscriptionsView, isModView } from '../../lib/utils/view-utils';
import useReplyModalStore from '../../stores/use-reply-modal-store';
import useThreadLiveUpdatesStore from '../../stores/use-thread-live-updates-store';
import useCountLinksInReplies from '../../hooks/use-count-links-in-replies';
import { usePostPageNumber } from '../../hooks/use-post-page-number';
import { useDirectoryByAddress } from '../../hooks/use-directories';
import capitalize from 'lodash/capitalize';
import styles from './footer.module.css';

/* -----------------------------------------------------------------------------
 * PageFooterDesktop
 * Main page footer wrapper: hr, first row slot, BoardsBar, SiteLegalMeta.
 * -------------------------------------------------------------------------- */

interface PageFooterDesktopProps {
  /** Mode-specific first row content (e.g. board pagination or thread controls) */
  firstRow: React.ReactNode;
  /** Optional row between first row and BoardsBar (e.g. style selector on thread page) */
  styleRow?: React.ReactNode;
}

export const PageFooterDesktop = ({ firstRow, styleRow }: PageFooterDesktopProps) => (
  <footer className={styles.footer}>
    <hr />
    <div className={styles.firstRow}>{firstRow}</div>
    {styleRow != null ? <div className={styles.styleRow}>{styleRow}</div> : null}
    <div className={styles.boardsBarRow}>
      <BoardsBar />
    </div>
    <div className={styles.legalMeta}>
      <SiteLegalMeta order='license-first' />
    </div>
  </footer>
);

/* -----------------------------------------------------------------------------
 * StyleOnlyFooterFirstRow
 * Footer first row with only the style selector (right-aligned). Used by mod queue.
 * -------------------------------------------------------------------------- */

export const StyleOnlyFooterFirstRow = () => {
  const { t } = useTranslation();
  return (
    <div className={`${styles.footerRow} ${styles.footerRowRightOnly}`}>
      <div className={styles.footerRight}>
        <span className={styles.styleLabel}>{t('style')}:</span>
        <StyleSelector />
      </div>
    </div>
  );
};

/* -----------------------------------------------------------------------------
 * CatalogFooterFirstRow
 * Catalog footer first row: Return, Archive, Top, Refresh on left; Style selector on right.
 * -------------------------------------------------------------------------- */

interface CatalogFooterFirstRowProps {
  communityAddress?: string;
  isInAllView?: boolean;
  isInSubscriptionsView?: boolean;
  isInModView?: boolean;
}

export const CatalogFooterFirstRow = ({ communityAddress, isInAllView = false, isInSubscriptionsView = false, isInModView = false }: CatalogFooterFirstRowProps) => {
  const { t } = useTranslation();
  return (
    <div className={styles.footerRow}>
      <div className={styles.footerLeft}>
        <span>
          [<ReturnButton address={communityAddress} isInAllView={isInAllView} isInSubscriptionsView={isInSubscriptionsView} isInModView={isInModView} />]
        </span>
        <span>
          [<CatalogButton address={communityAddress} isInAllView={isInAllView} isInSubscriptionsView={isInSubscriptionsView} isInModView={isInModView} />]
        </span>
        <span>
          [<TopButton />]
        </span>
        <span>
          [<RefreshButton />]
        </span>
      </div>
      <div className={styles.footerRight}>
        <span className={styles.styleLabel}>{t('style')}:</span>
        <StyleSelector />
      </div>
    </div>
  );
};

/* -----------------------------------------------------------------------------
 * ThreadFooterStyleRow
 * Style selector on its own row (thread page only, below first row, above BoardsBar).
 * -------------------------------------------------------------------------- */

export const ThreadFooterStyleRow = () => {
  const { t } = useTranslation();
  return (
    <span className={styles.styleRowContent}>
      <span className={styles.styleLabel}>{t('style')}:</span>
      <StyleSelector />
    </span>
  );
};

/* -----------------------------------------------------------------------------
 * ThreadFooterFirstRow
 * Thread page footer first row: Return, Catalog, Top, Update, Auto, Post a Reply, stats.
 * -------------------------------------------------------------------------- */

interface ThreadFooterFirstRowProps {
  postCid: string;
  threadNumber: number | undefined;
  communityAddress: string;
  /** Thread closed - disable Post a Reply */
  isThreadClosed?: boolean;
}

export const ThreadFooterFirstRow = ({ postCid, threadNumber, communityAddress, isThreadClosed = false }: ThreadFooterFirstRowProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const params = useParams();
  const { openReplyModalEmpty } = useReplyModalStore();

  const isInAllView = isAllView(location.pathname);
  const isInSubscriptionsView = isSubscriptionsView(location.pathname, params);
  const isInModView = isModView(location.pathname);

  const handlePostReplyClick = () => {
    if (isThreadClosed) return;
    openReplyModalEmpty(postCid, threadNumber, communityAddress);
  };

  return (
    <div className={styles.threadRow}>
      <div className={styles.threadLeft}>
        <span>
          [<ReturnButton address={communityAddress} isInAllView={isInAllView} isInSubscriptionsView={isInSubscriptionsView} isInModView={isInModView} />]
        </span>
        <span>
          [<CatalogButton address={communityAddress} isInAllView={isInAllView} isInSubscriptionsView={isInSubscriptionsView} isInModView={isInModView} />]
        </span>
        <span>
          [<TopButton />]
        </span>
        <span>
          [<UpdateButton />]
        </span>
        <span>
          [<AutoButton />]
        </span>
      </div>
      <div className={styles.threadCenter}>
        <span>
          [
          <button type='button' className={styles.button} onClick={handlePostReplyClick} disabled={isThreadClosed} aria-label={t('post_a_reply')}>
            {t('post_a_reply')}
          </button>
          ]
        </span>
      </div>
      <div className={styles.threadRight}>
        <PostPageStats />
      </div>
    </div>
  );
};

/* -----------------------------------------------------------------------------
 * PageFooterMobile
 * Mobile-only page footer with content slot and footer links.
 * -------------------------------------------------------------------------- */

export const PageFooterMobile = ({ children }: { children: React.ReactNode }) => (
  <footer className={styles.mobileFooter}>
    <hr />
    {children}
    <hr />
    <div className={styles.mobileFooterLinks}>
      <SiteLegalMeta order='license-first' />
    </div>
  </footer>
);

/* -----------------------------------------------------------------------------
 * ThreadFooterMobile
 * Mobile thread page footer: Post a Reply, Return/Catalog/Top, Update/Auto, stats.
 * -------------------------------------------------------------------------- */

interface ThreadFooterMobileProps {
  postCid: string;
  threadNumber: number | undefined;
  communityAddress: string;
  isThreadClosed?: boolean;
}

export const ThreadFooterMobile = ({ postCid, threadNumber, communityAddress, isThreadClosed = false }: ThreadFooterMobileProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const params = useParams();
  const { openReplyModalEmpty } = useReplyModalStore();
  const autoUpdateEnabled = useThreadLiveUpdatesStore((state) => state.enabled);

  const isInAllView = isAllView(location.pathname);
  const isInSubscriptionsView = isSubscriptionsView(location.pathname, params);
  const isInModView = isModView(location.pathname);

  const post = useComment({ commentCid: postCid, autoUpdate: autoUpdateEnabled });
  const { replyCount } = post || {};
  const linkCount = useCountLinksInReplies(post);
  const directoryEntry = useDirectoryByAddress(communityAddress);
  const requirePostLinkIsMedia = directoryEntry?.features?.requirePostLinkIsMedia === true;
  const pageNumber = usePostPageNumber({ subplebbitAddress: communityAddress, postCid, enabled: true });

  const handlePostReplyClick = () => {
    if (isThreadClosed) return;
    openReplyModalEmpty(postCid, threadNumber, communityAddress);
  };

  return (
    <PageFooterMobile>
      <div className={styles.threadMobileFooterContent}>
        <div className={styles.mobileFooterButtons}>
          <button className='button' onClick={handlePostReplyClick} disabled={isThreadClosed}>
            {t('post_a_reply')}
          </button>
        </div>
        <div className={styles.mobileFooterButtons}>
          <ReturnButton address={communityAddress} isInAllView={isInAllView} isInSubscriptionsView={isInSubscriptionsView} isInModView={isInModView} />
          <CatalogButton address={communityAddress} isInAllView={isInAllView} isInSubscriptionsView={isInSubscriptionsView} isInModView={isInModView} />
          <TopButton />
        </div>
        <div className={styles.mobileFooterButtons}>
          <UpdateButton />
          <AutoButton />
        </div>
        <div className={styles.mobileFooterStats}>
          {capitalize(t('replies'))}: {replyCount ?? '?'} / {capitalize(requirePostLinkIsMedia ? t('images') : t('links'))}: {linkCount ?? '?'} /{' '}
          {t('pagination.pageLabel')}: {pageNumber ?? '?'}
        </div>
      </div>
    </PageFooterMobile>
  );
};
