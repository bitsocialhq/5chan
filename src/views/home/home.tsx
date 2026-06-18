import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import styles from './home.module.css';
import { type DirectoryCommunity, useDirectories, useDirectoryAddresses } from '../../hooks/use-directories';
import { sortDirectoryBoardsByRank, useDirectoryLists } from '../../hooks/use-directory-list';
import { CommunityStatsCollector, useCommunitiesStatsStore } from '../../hooks/use-communities-stats';
import PopularThreadsBox from './popular-threads-box';
import BoardsList from './boards-list';
import SiteLegalMeta from '../../components/site-legal-meta';
import LoadingEllipsis from '../../components/loading-ellipsis';
import Tooltip from '../../components/tooltip';
import useDirectoryModalStore from '../../stores/use-directory-modal-store';
import useHomepageStatsOptionsStore, { type HomepageStatsScope } from '../../stores/use-homepage-stats-options-store';
import DisclaimerModal from '../../components/disclaimer-modal';
import DirectoryModal from '../../components/directory-modal';
import { extractDirectoryFromTitle, getBoardPath } from '../../lib/utils/route-utils';
import { isWebRuntime } from '../../lib/media-hosting/show-upload-controls';
import { useFeedStateString } from '../../hooks/use-state-string';
import lowerCase from 'lodash/lowerCase';

// https://github.com/bitsocialnet/lists/tree/master/5chan-directories

const SearchBar = () => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const directories = useDirectories();

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const searchInput = searchInputRef.current?.value;
    if (searchInput) {
      const boardPath = getBoardPath(searchInput, directories);
      navigate(`/${boardPath}`);
    }
  };

  return (
    <div className={styles.searchBar}>
      <form onSubmit={handleSearchSubmit}>
        <input
          autoCorrect='off'
          autoComplete='off'
          spellCheck='false'
          autoCapitalize='off'
          type='text'
          aria-label={lowerCase(t('enter_board_address'))}
          placeholder={lowerCase(t('enter_board_address'))}
          ref={searchInputRef}
        />
        <button type='submit' className={styles.searchButton}>
          {t('go')}
        </button>
      </form>
    </div>
  );
};

const InfoBox = () => {
  const { t } = useTranslation();
  const isWeb = isWebRuntime();
  return (
    <div className={`${styles.box} ${styles.infoBox}`}>
      <div className={styles.infoboxBar}>
        <h2>{t('what_is_5chan')}</h2>
      </div>
      <div className={styles.boxContent}>
        <Trans
          i18nKey='5chan_description'
          shouldUnescape={true}
          components={{
            1: <Link key='rules-link' to='/rules' />,
            2: <Link key='faqs-link' to='/faq' />,
          }}
        />
        <br />
        <br />
        {isWeb ? (
          <Trans
            i18nKey='no_global_rules_info'
            shouldUnescape={true}
            components={{
              1: (
                <a
                  key='releases-link'
                  href='https://github.com/bitsocialnet/5chan/releases/latest'
                  target='_blank'
                  rel='noopener noreferrer'
                  aria-label='5chan releases'
                />
              ),
            }}
          />
        ) : (
          t('app_p2p_info')
        )}
      </div>
    </div>
  );
};

type HomepageStats = {
  allPostCount?: number;
  weekActiveUserCount?: number;
  state?: string;
};

const getDirectoryCode = (directory: DirectoryCommunity): string | null => directory.directoryCode ?? extractDirectoryFromTitle(directory.title ?? '');

const getUniqueAddresses = (addresses: string[]): string[] => [...new Set(addresses.filter((address) => address.length > 0))];

const hasLoadedStats = (stat: HomepageStats | undefined): stat is HomepageStats & { allPostCount: number } => stat?.allPostCount !== undefined;
const hasFailedStats = (stat: HomepageStats | undefined): boolean => stat?.state === 'failed';
const hasResolvedStats = (stat: HomepageStats | undefined): boolean => hasLoadedStats(stat) || hasFailedStats(stat);

const STATS_SCOPE_OPTIONS: Array<{ scope: HomepageStatsScope; labelKey: string }> = [
  { scope: 'directory', labelKey: 'stats_scope_directory_boards' },
  { scope: 'all', labelKey: 'stats_scope_all_listed_boards' },
];
const EMPTY_STATS_LIST: string[] = [];

const StatsOptionsModal = () => {
  const { t } = useTranslation();
  const [showFilterModal, setShowFilterModal] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const statsScope = useHomepageStatsOptionsStore((state) => state.statsScope);
  const setStatsScope = useHomepageStatsOptionsStore((state) => state.setStatsScope);

  useEffect(() => {
    if (!showFilterModal) return;

    const handleClickOutside = (event: globalThis.MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node) && buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setShowFilterModal(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilterModal]);

  const selectScope = (scope: HomepageStatsScope) => {
    setStatsScope(scope);
    setShowFilterModal(false);
  };

  const handleScopeKey = (event: ReactKeyboardEvent<HTMLButtonElement>, scope: HomepageStatsScope) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectScope(scope);
    }
  };

  return (
    <>
      <button
        type='button'
        ref={buttonRef}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (!showFilterModal) setShowFilterModal(true);
          }
        }}
        onClick={() => !showFilterModal && setShowFilterModal(true)}
      >
        {t('options')} ▼
      </button>
      {showFilterModal && (
        <div ref={modalRef} className={styles.filterModal}>
          {STATS_SCOPE_OPTIONS.map((option) => (
            <button
              key={option.scope}
              type='button'
              className={`${styles.option} ${statsScope === option.scope ? styles.selected : ''}`}
              tabIndex={0}
              onKeyDown={(event) => handleScopeKey(event, option.scope)}
              onClick={() => selectScope(option.scope)}
            >
              {t(option.labelKey)}
            </button>
          ))}
        </div>
      )}
    </>
  );
};

const Stats = ({ directories }: { directories: DirectoryCommunity[] }) => {
  const { t } = useTranslation();
  const statsScope = useHomepageStatsOptionsStore((state) => state.statsScope);
  const communitiesStats = useCommunitiesStatsStore((state) => state.communityStats);
  const defaultDirectoryAddresses = useMemo(() => directories.map((directory) => directory.address), [directories]);
  const allDirectoryCodes = useMemo(
    () =>
      getUniqueAddresses(
        directories.flatMap((directory) => {
          const directoryCode = getDirectoryCode(directory);
          return directoryCode ? [directoryCode] : [];
        }),
      ),
    [directories],
  );

  const { listsByCode } = useDirectoryLists(statsScope === 'all' ? allDirectoryCodes : EMPTY_STATS_LIST);

  const collectorAddresses = useMemo(() => {
    if (statsScope === 'directory') {
      return defaultDirectoryAddresses;
    }

    return getUniqueAddresses(
      directories.flatMap((directory) => {
        const directoryCode = getDirectoryCode(directory);
        const directoryList = directoryCode ? listsByCode[directoryCode] : null;
        const listAddresses = directoryList ? sortDirectoryBoardsByRank(directoryList.boards).map((board) => board.address) : [];
        return listAddresses.length > 0 ? listAddresses : [directory.address];
      }),
    );
  }, [defaultDirectoryAddresses, directories, listsByCode, statsScope]);

  const { totalPosts, currentUsers, boardsLoaded, boardsWithStats } = useMemo(() => {
    let totalPosts = 0;
    let currentUsers = 0;
    let boardsLoaded = 0;
    let boardsWithStats = 0;

    for (const address of collectorAddresses) {
      const stats = communitiesStats[address];
      if (!hasResolvedStats(stats)) {
        continue;
      }

      boardsLoaded++;
      if (hasLoadedStats(stats)) {
        boardsWithStats++;
        totalPosts += stats.allPostCount || 0;
        currentUsers += stats.weekActiveUserCount || 0;
      }
    }

    return {
      totalPosts,
      currentUsers,
      boardsLoaded,
      boardsWithStats,
    };
  }, [collectorAddresses, communitiesStats]);
  const hasDisplayableStats = boardsWithStats > 0 || (collectorAddresses.length > 0 && boardsLoaded === collectorAddresses.length);
  const isStatsLoading = !hasDisplayableStats || boardsLoaded < collectorAddresses.length;
  const loadingStateString = useFeedStateString(isStatsLoading ? collectorAddresses : EMPTY_STATS_LIST) || t('loading');

  return (
    <>
      {/* Render collectors to fetch stats for each community */}
      {collectorAddresses.map((address) => (
        <CommunityStatsCollector key={address} communityAddress={address} />
      ))}
      <div className={styles.box}>
        <div className={`${styles.boxBar} ${styles.color2ColorBar}`}>
          <h2 className={styles.statsTitle}>
            {t('stats')}
            {isStatsLoading && (
              <span className={styles.statsLoadingIconWrapper}>
                <Tooltip content={loadingStateString}>
                  <span className={`${styles.statsLoadingIcon} yellowOfflineIcon`} />
                </Tooltip>
              </span>
            )}
          </h2>
          <StatsOptionsModal />
        </div>
        <div className={`${styles.boxContent} ${styles.stats}`}>
          {hasDisplayableStats ? (
            <>
              <div className={styles.stat}>
                <b>{t('total_posts')}</b> {totalPosts}
              </div>
              <div className={styles.stat}>
                <b>{t('current_users')}</b> {currentUsers}
              </div>
              <div className={styles.stat}>
                <b>{t('boards_loaded')}</b> {boardsLoaded}
              </div>
            </>
          ) : (
            <LoadingEllipsis string={loadingStateString} />
          )}
        </div>
      </div>
    </>
  );
};

export const Footer = () => {
  const { t } = useTranslation();
  return (
    <>
      <ul className={styles.footer}>
        <li>
          <Link to='/'>{t('home')}</Link>
        </li>
        <li>
          <a href='https://bitsocial.net' target='_blank' rel='noopener noreferrer'>
            {t('about')}
          </a>
        </li>
        <li>
          <a href='https://bitsocial.app/blog?q=5chan' target='_blank' rel='noopener noreferrer'>
            Blog
          </a>
        </li>
        <li>
          <Link to='/faq'>FAQ</Link>
        </li>
        <li>
          <Link to='/rules'>Rules</Link>
        </li>
        <li>
          <Link to='/pass'>{t('support_5chan')}</Link>
        </li>
        <li>
          <a href='https://x.com/5chanapp' target='_blank' rel='noopener noreferrer'>
            Twitter/X
          </a>
        </li>
        <li>
          <a href='https://github.com/bitsocialnet/5chan' target='_blank' rel='noopener noreferrer'>
            Source Code
          </a>
        </li>
      </ul>
      <div className={styles.footerInfo}>
        <SiteLegalMeta />
      </div>
    </>
  );
};

export const HomeLogo = () => {
  return (
    <Link to='/'>
      <div className={styles.logo}>
        <img alt='' src='assets/logo/logo-transparent.png' />
      </div>
    </Link>
  );
};

const Home = () => {
  const directories = useDirectories();
  const directoryAddresses = useDirectoryAddresses();
  const { closeDirectoryModal } = useDirectoryModalStore();

  useEffect(() => {
    document.title = '5chan';
  }, []);

  // Close directory modal when navigating away from home
  useEffect(() => {
    return () => {
      closeDirectoryModal();
    };
  }, [closeDirectoryModal]);

  return (
    <>
      <DisclaimerModal />
      <DirectoryModal />
      <div className={styles.content}>
        <HomeLogo />
        <SearchBar />
        <InfoBox />
        <BoardsList multisub={directories} />
        <PopularThreadsBox directories={directories} directoryAddresses={directoryAddresses} />
        <Stats directories={directories} />
        <Footer />
      </div>
    </>
  );
};

export default Home;
