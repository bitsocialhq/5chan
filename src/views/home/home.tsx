import { useEffect, useMemo, useRef, FormEvent } from 'react';
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
import useDirectoryModalStore from '../../stores/use-directory-modal-store';
import DisclaimerModal from '../../components/disclaimer-modal';
import DirectoryModal from '../../components/directory-modal';
import { extractDirectoryFromTitle, getBoardPath } from '../../lib/utils/route-utils';
import { isWebRuntime } from '../../lib/media-hosting/show-upload-controls';
import lowerCase from 'lodash/lowerCase';
import useCommunitiesLoadingStartTimestamps from '../../stores/use-communities-loading-start-timestamps-store';
import { useNowSeconds } from '../../hooks/use-now-seconds';

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
          placeholder={lowerCase(t('enter_board_address'))}
          ref={searchInputRef}
        />
        <button className={styles.searchButton}>{t('go')}</button>
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
              1: <a key='releases-link' href='https://github.com/bitsocialnet/5chan/releases/latest' target='_blank' rel='noopener noreferrer' />,
            }}
          />
        ) : (
          t('app_p2p_info')
        )}
      </div>
    </div>
  );
};

interface StatValueProps {
  isLoaded: boolean;
  loadingLabel: string;
  value: number;
}

type HomepageStats = {
  allPostCount?: number;
  weekActiveUserCount?: number;
  state?: string;
};

const StatValue = ({ isLoaded, loadingLabel, value }: StatValueProps) => (isLoaded ? <>{value}</> : <LoadingEllipsis string={loadingLabel} />);

const STATS_DIRECTORY_FALLBACK_DELAY_SECONDS = 30;

const getDirectoryCode = (directory: DirectoryCommunity): string | null => directory.directoryCode ?? extractDirectoryFromTitle(directory.title ?? '');

const getUniqueAddresses = (addresses: string[]): string[] => [...new Set(addresses.filter((address) => address.length > 0))];

const hasLoadedStats = (stat: HomepageStats | undefined): stat is HomepageStats & { allPostCount: number } => stat?.allPostCount !== undefined;
const hasFailedStats = (stat: HomepageStats | undefined): boolean => stat?.state === 'failed';

const Stats = ({ directories }: { directories: DirectoryCommunity[] }) => {
  const { t } = useTranslation();
  const communitiesStats = useCommunitiesStatsStore((state) => state.communityStats);
  const defaultDirectoryAddresses = useMemo(() => directories.map((directory) => directory.address), [directories]);
  const loadingStartTimestamps = useCommunitiesLoadingStartTimestamps(defaultDirectoryAddresses);
  const nowSeconds = useNowSeconds(defaultDirectoryAddresses.length > 0);

  const fallbackDirectoryCodes = useMemo(
    () =>
      directories.flatMap((directory, index) => {
        const defaultStats = communitiesStats[directory.address];
        if (hasLoadedStats(defaultStats)) {
          return [];
        }

        const loadingStartTimestamp = loadingStartTimestamps[index];
        if (!loadingStartTimestamp || nowSeconds - loadingStartTimestamp < STATS_DIRECTORY_FALLBACK_DELAY_SECONDS) {
          return [];
        }

        const directoryCode = getDirectoryCode(directory);
        return directoryCode ? [directoryCode] : [];
      }),
    [communitiesStats, directories, loadingStartTimestamps, nowSeconds],
  );

  const { listsByCode } = useDirectoryLists(fallbackDirectoryCodes);

  const { collectorAddresses, totalPosts, currentUsers, boardsTracked, allDirectoryStatsLoaded } = useMemo(() => {
    const collectorAddressSet = new Set(defaultDirectoryAddresses);
    let totalPosts = 0;
    let currentUsers = 0;
    let boardsTracked = 0;
    let allDirectoryStatsLoaded = directories.length > 0;

    for (const directory of directories) {
      const directoryCode = getDirectoryCode(directory);
      const directoryList = directoryCode ? listsByCode[directoryCode] : null;
      const rankedAddresses = directoryList ? sortDirectoryBoardsByRank(directoryList.boards).map((board) => board.address) : [directory.address];
      const candidateAddresses = getUniqueAddresses(rankedAddresses.length > 0 ? rankedAddresses : [directory.address]);

      candidateAddresses.forEach((address) => collectorAddressSet.add(address));

      let stat: HomepageStats | undefined;
      let failedStat: HomepageStats | undefined;
      let allCandidateStatsResolved = candidateAddresses.length > 0;
      for (const address of candidateAddresses) {
        const candidateStats = communitiesStats[address];
        if (hasLoadedStats(candidateStats)) {
          stat = candidateStats;
          break;
        }
        if (hasFailedStats(candidateStats)) {
          failedStat ??= candidateStats;
          continue;
        }
        allCandidateStatsResolved = false;
      }

      if (!stat && allCandidateStatsResolved) {
        stat = failedStat;
      }

      if (!stat || (!hasLoadedStats(stat) && !hasFailedStats(stat))) {
        allDirectoryStatsLoaded = false;
        continue;
      }

      totalPosts += stat.allPostCount || 0;
      currentUsers += stat.weekActiveUserCount || 0;
      boardsTracked++;
    }

    return {
      collectorAddresses: [...collectorAddressSet],
      totalPosts,
      currentUsers,
      boardsTracked,
      allDirectoryStatsLoaded,
    };
  }, [communitiesStats, defaultDirectoryAddresses, directories, listsByCode]);

  const loadingLabel = t('loading');

  return (
    <>
      {/* Render collectors to fetch stats for each community */}
      {collectorAddresses.map((address) => (
        <CommunityStatsCollector key={address} communityAddress={address} />
      ))}
      <div className={styles.box}>
        <div className={`${styles.boxBar} ${styles.color2ColorBar}`}>
          <h2 className='capitalize'>{t('stats')}</h2>
        </div>
        <div className={`${styles.boxContent} ${styles.stats}`}>
          <div className={styles.stat}>
            <b>{t('total_posts')}</b> <StatValue isLoaded={allDirectoryStatsLoaded} loadingLabel={loadingLabel} value={totalPosts} />
          </div>
          <div className={styles.stat}>
            <b>{t('current_users')}</b> <StatValue isLoaded={allDirectoryStatsLoaded} loadingLabel={loadingLabel} value={currentUsers} />
          </div>
          <div className={styles.stat}>
            <b>{t('boards_tracked')}</b> <StatValue isLoaded={allDirectoryStatsLoaded} loadingLabel={loadingLabel} value={boardsTracked} />
          </div>
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
          <a href='https://bitsocial.net' target='_blank' rel='noopener noreferrer'>
            {t('about')}
          </a>
        </li>
        <li>
          <Link to='/faq'>FAQ</Link>
        </li>
        <li>
          <Link to='/rules'>Rules</Link>
        </li>
        <li>
          <a href='https://x.com/5chanapp' target='_blank' rel='noopener noreferrer'>
            Twitter/X
          </a>
        </li>
        <li>
          <a href='https://t.me/bitsocialnet' target='_blank' rel='noopener noreferrer'>
            Telegram
          </a>
        </li>
        <li>
          <Link to='/pass'>{t('support_5chan')}</Link>
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
