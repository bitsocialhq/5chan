import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import capitalize from 'lodash/capitalize';
import { BottomButton, TopButton } from '../../components/board-buttons/board-buttons';
import { PageFooterDesktop, PageFooterMobile, ThreadFooterStyleRow } from '../../components/footer/footer';
import { SEARCH_PATH } from '../../lib/search-navigation';
import { getDirectorySearchProvider, getRankedSearchProviders } from '../../lib/search-providers';
import useSearchProviderStore from '../../stores/use-search-provider-store';
import styles from '../directory/directory.module.css';

/** The search that linked here travels in the router state, so the query stays out of this URL. */
const getReturnPath = (state: unknown): string => {
  const returnPath = (state as { returnPath?: unknown } | null)?.returnPath;
  return typeof returnPath === 'string' && returnPath.startsWith(`${SEARCH_PATH}?`) ? returnPath : SEARCH_PATH;
};

/** The provider list lives in the same repo the board directories are submitted to. */
const SUBMIT_PROVIDER_URL = 'https://github.com/bitsocialnet/lists/edit/master/5chan-search-providers.json';

const SubmitProviderLink = () => {
  const { t } = useTranslation();

  return (
    <a className='button' href={SUBMIT_PROVIDER_URL} target='_blank' rel='noreferrer noopener'>
      {t('directory_submit_provider')}
    </a>
  );
};

const ReturnToSearchButton = ({ returnPath }: { returnPath: string }) => {
  const { t } = useTranslation();

  return (
    <Link className='button' to={returnPath}>
      {t('return')}
    </Link>
  );
};

const DesktopTopControls = ({ returnPath }: { returnPath: string }) => (
  <div className={styles.desktopNavLinks}>
    <div className={styles.navButtonGroup}>
      <span>
        [<ReturnToSearchButton returnPath={returnPath} />]
      </span>
      <span>
        [<BottomButton />]
      </span>
    </div>
    <span className={styles.submitBoardControl}>
      [<SubmitProviderLink />]
    </span>
  </div>
);

const DesktopFooterControls = ({ returnPath }: { returnPath: string }) => (
  <div className={styles.desktopFooterButtons}>
    <div className={styles.navButtonGroup}>
      <span>
        [<ReturnToSearchButton returnPath={returnPath} />]
      </span>
      <span>
        [<TopButton />]
      </span>
    </div>
    <span className={styles.submitBoardControl}>
      [<SubmitProviderLink />]
    </span>
  </div>
);

const MobileTopControls = ({ returnPath }: { returnPath: string }) => (
  <div className={styles.mobileNavLinks}>
    <div>
      <ReturnToSearchButton returnPath={returnPath} />
      <BottomButton />
    </div>
    <div className={styles.mobileSubmitRow}>
      <SubmitProviderLink />
    </div>
  </div>
);

const MobileFooterControls = ({ returnPath }: { returnPath: string }) => (
  <div className={styles.mobileFooterButtons}>
    <div>
      <ReturnToSearchButton returnPath={returnPath} />
      <TopButton />
    </div>
    <div className={styles.mobileSubmitRow}>
      <SubmitProviderLink />
    </div>
  </div>
);

const DIRECTORY_SCORE_UNAVAILABLE_MARKER = '\u2014';

/** Directory of the indexers that can power /search/, laid out like the board directories. */
const SearchDirectory = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const selectedProviderId = useSearchProviderStore((state) => state.selectedProviderId);
  const setSelectedProviderId = useSearchProviderStore((state) => state.setSelectedProviderId);
  const returnPath = getReturnPath(location.state);
  const rankedProviders = getRankedSearchProviders();
  const directoryProviderId = getDirectorySearchProvider().id;

  useEffect(() => {
    document.title = `${t('change_provider')} - ${t('archive_search_title')} - 5chan`;
  }, [t]);

  // Voting is not enabled for any directory yet, so the buttons explain that, as the board ones do.
  const handleVoteUnavailable = () => {
    window.alert(`${t('search_directory_voting_unavailable_intro')}\n\n${t('search_directory_voting_unavailable_outro')}`);
  };

  return (
    <div id='top' className={styles.page}>
      <MobileTopControls returnPath={returnPath} />
      <hr className={styles.desktopDivider} />
      <DesktopTopControls returnPath={returnPath} />
      <hr className={styles.divider} />

      <table className={styles.flashListing}>
        <thead>
          <tr>
            <th className={styles.postblock} scope='col'>
              No.
            </th>
            <th className={styles.postblock} scope='col'>
              {t('search_provider')}
            </th>
            <th className={styles.postblock} scope='col'>
              API
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
            <th className={styles.postblock} scope='col'>
              {capitalize(t('use'))}
            </th>
          </tr>
        </thead>
        <tbody>
          {rankedProviders.map((provider, index) => {
            const isPinned = provider.id === selectedProviderId;
            // With nobody pinned, /search/ runs on whichever indexer the directory ranks first.
            const isAnswering = selectedProviderId === null ? provider.id === directoryProviderId : isPinned;

            return (
              <tr key={provider.id} className={`${styles.dirRow} ${index % 2 === 0 ? styles.rowOdd : ''}`}>
                <td className={styles.numberCell}>{index + 1}</td>
                <td className={styles.boardCol}>
                  <a href={provider.siteUrl} target='_blank' rel='noreferrer noopener'>
                    {provider.name}
                  </a>
                </td>
                <td className={styles.ownerCell}>
                  <a href={provider.apiUrl} target='_blank' rel='noreferrer noopener'>
                    {new URL(provider.apiUrl).host}
                  </a>
                </td>
                <td className={styles.statusCell}>{isAnswering ? <span className={styles.statusOnline}>{t('current_provider')}</span> : null}</td>
                <td className={styles.scoreCell}>
                  <span className={styles.scoreValue}>{provider.score ?? DIRECTORY_SCORE_UNAVAILABLE_MARKER}</span>
                </td>
                <td className={styles.actionsCell}>
                  [
                  <button type='button' className={styles.actionButton} onClick={handleVoteUnavailable} aria-label={t('upvote')} title={t('upvote')}>
                    +1
                  </button>
                  ] [
                  <button type='button' className={styles.actionButton} onClick={handleVoteUnavailable} aria-label={t('downvote')} title={t('downvote')}>
                    -1
                  </button>
                  ]
                </td>
                <td className={styles.actionsCell}>
                  {isPinned ? (
                    <>
                      [
                      <button type='button' className={styles.actionButton} onClick={() => setSelectedProviderId(null)} title={t('search_provider_directory_subtitle')}>
                        {t('auto')}
                      </button>
                      ]
                    </>
                  ) : (
                    <>
                      [
                      <button type='button' className={styles.actionButton} onClick={() => setSelectedProviderId(provider.id)}>
                        {t('use')}
                      </button>
                      ]
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <PageFooterDesktop firstRow={<DesktopFooterControls returnPath={returnPath} />} styleRow={<ThreadFooterStyleRow />} />
      <PageFooterMobile>
        <MobileFooterControls returnPath={returnPath} />
      </PageFooterMobile>
    </div>
  );
};

export default SearchDirectory;
