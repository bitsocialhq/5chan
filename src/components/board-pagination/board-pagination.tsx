import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useFeedViewSettingsStore from '../../stores/use-feed-view-settings-store';
import { useDirectories } from '../../hooks/use-directories';
import { isFlashBoardRoute } from '../../lib/utils/route-utils';
import StyleSelector from '../style-selector/style-selector';
import footerStyles from '../footer/footer.module.css';
import styles from './board-pagination.module.css';

export interface BoardPaginationFooterLink {
  label: string;
  state?: unknown;
  to: string;
}

interface BoardPaginationProps {
  basePath: string;
  currentPage: number;
  search?: string;
  totalPages: number;
  /** When true, renders pagelist: [All] [1] [2] ... [10] Catalog Archive + Style select */
  footerStyle?: boolean;
  /** When true, pagelist is never shown (multiboards always use infinite scroll) */
  isMultiboard?: boolean;
  /** Overrides the default `<basePath>/<page>` links, for feeds paginated by query string. */
  getPageHref?: (page: number) => { pathname: string; search?: string };
  /** Replaces the trailing Catalog/Archive links. Feeds using it are paginated by their provider, so the infinite-scroll shortcut is dropped. */
  footerLinks?: BoardPaginationFooterLink[];
}

const BoardPagination = ({
  basePath,
  currentPage,
  search = '',
  totalPages,
  footerStyle = false,
  isMultiboard = false,
  getPageHref,
  footerLinks,
}: BoardPaginationProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const directories = useDirectories();
  const enableInfiniteScroll = useFeedViewSettingsStore((state) => state.enableInfiniteScroll);
  const setEnableInfiniteScroll = useFeedViewSettingsStore((state) => state.setEnableInfiniteScroll);

  const supportsInfiniteScroll = !footerLinks;
  const pageHref = (page: number) => getPageHref?.(page) ?? { pathname: page === 1 ? basePath : `${basePath}/${page}`, search };
  const boardIdentifier = basePath.replace(/^\//, '').split('/')[0];
  const showCatalogLink = !isFlashBoardRoute(boardIdentifier, directories);
  const catalogHref = { pathname: `${basePath}/catalog`, search };

  if (totalPages <= 1 && !footerStyle) {
    return null;
  }

  if (footerStyle) {
    const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
    const archiveHref = { pathname: `${basePath}/archive`, search };

    return (
      <div className={`${footerStyles.footerRow} ${isMultiboard ? footerStyles.footerRowRightOnly : ''}`}>
        {!isMultiboard && (!enableInfiniteScroll || !supportsInfiniteScroll) && (
          <div className={styles.pagelist}>
            {currentPage > 1 && (
              <button type='button' className={styles.pagelistNavButton} onClick={() => navigate(pageHref(currentPage - 1))}>
                {t('previous')}
              </button>
            )}
            {currentPage === 1 && supportsInfiniteScroll && (
              <span className={styles.footerPageItem}>
                <span className={styles.footerPageBracket}>[</span>
                <button
                  type='button'
                  className={styles.footerPageLink}
                  tabIndex={0}
                  onClick={() => setEnableInfiniteScroll(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setEnableInfiniteScroll(true);
                    }
                  }}
                >
                  {t('all')}
                </button>
                <span className={styles.footerPageBracket}>]</span>
              </span>
            )}
            {pageNumbers.map((page) => (
              <span key={page} className={styles.footerPageItem}>
                <span className={styles.footerPageBracket}>[</span>
                <Link to={pageHref(page)} className={page === currentPage ? styles.footerPageCurrent : styles.footerPageLink}>
                  {page}
                </Link>
                <span className={styles.footerPageBracket}>]</span>
              </span>
            ))}
            {currentPage < totalPages ? (
              <button type='button' className={styles.pagelistNavButton} onClick={() => navigate(pageHref(currentPage + 1))}>
                {t('next')}
              </button>
            ) : (
              <span className={styles.footerNavPlainDisabled}>{t('next')}</span>
            )}
            {footerLinks ? (
              footerLinks.map((link) => (
                <Link key={link.to} to={link.to} state={link.state} className={styles.pagelistSeparatorLink}>
                  {link.label}
                </Link>
              ))
            ) : (
              <>
                {showCatalogLink && (
                  <Link to={catalogHref} className={styles.pagelistSeparatorLink}>
                    {t('catalog')}
                  </Link>
                )}
                <Link to={archiveHref} className={styles.pagelistSeparatorLink}>
                  {t('archive')}
                </Link>
              </>
            )}
          </div>
        )}
        <div className={footerStyles.footerRight}>
          <span className={footerStyles.styleLabel}>{t('style')}:</span>
          <StyleSelector />
        </div>
      </div>
    );
  }

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className={styles.pagination}>
      {currentPage > 1 && (
        <button type='button' onClick={() => navigate(pageHref(currentPage - 1))} aria-label={t('previous')}>
          {t('previous')}
        </button>
      )}
      {pageNumbers.map((page) => {
        const href = pageHref(page);
        const isCurrent = page === currentPage;
        return isCurrent ? (
          <span key={page} className={`${styles.paginationButton} ${styles.pageButtonActive}`} aria-label={t('pagination.pageCurrent', { page })} aria-current='page'>
            {page}
          </span>
        ) : (
          <Link key={page} to={href} className={styles.paginationButton} aria-label={`Go to page ${page}`}>
            {page}
          </Link>
        );
      })}
      {currentPage < totalPages ? (
        <button type='button' onClick={() => navigate(pageHref(currentPage + 1))} aria-label={t('next')}>
          {t('next')}
        </button>
      ) : (
        <span className={styles.disabled} aria-disabled='true'>
          {t('next')}
        </span>
      )}
    </div>
  );
};

export default BoardPagination;
