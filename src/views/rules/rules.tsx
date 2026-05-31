import { Fragment, useEffect, useRef, useState, FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCommunity } from '@bitsocial/bitsocial-react-hooks';
import { Footer, HomeLogo } from '../home';
import { useDirectories, useDirectoryDefaults, DirectoryCommunity, DirectoryDefaultsData } from '../../hooks/use-directories';
import { useCommunityIdentifier } from '../../hooks/use-community-identifiers';
import { getCommunityAddress, getBoardPath, isDirectoryRoute } from '../../lib/utils/route-utils';
import Markdown from '../../components/markdown';
import LoadingEllipsis from '../../components/loading-ellipsis';
import useStateString from '../../hooks/use-state-string';
import styles from './rules.module.css';
import { useTranslation } from 'react-i18next';
import lowerCase from 'lodash/lowerCase';

interface CategoryGroup {
  key: string;
  label: string;
  communities: DirectoryCommunity[];
}

const getBoardShortCode = (title?: string): string => {
  if (!title) return '';
  const match = title.match(/^\/([^/]+)\//);
  return match ? match[1] : '';
};

const getBoardName = (title?: string): string => {
  if (!title) return '';
  const match = title.match(/^\/[^/]+\/\s*-\s*(.+)$/);
  return match ? match[1] : title;
};

const getDirectoryCode = (community: DirectoryCommunity): string => community.directoryCode ?? getBoardShortCode(community.title);

const getDirectoryDisplayTitle = (community: DirectoryCommunity): string => {
  const shortCode = getDirectoryCode(community);
  const boardName = getBoardName(community.title);
  if (shortCode && boardName) {
    return `/${shortCode}/ - ${boardName}`;
  }
  return community.title ?? community.address;
};

const getDirectoryRules = (defaults: DirectoryDefaultsData, code: string): string[] => (code ? (defaults.directories[code]?.rules ?? []) : []);

// Upload boards (e.g. /f/ - Flash) require post flairs/tagging on uploads; everything else is an image board, mirroring 4chan's split.
const isUploadDirectory = (defaults: DirectoryDefaultsData, code: string): boolean => !!defaults.directories[code]?.features?.postFlairs;

// Split the directories into ordered category groups (image boards first, then upload boards), dropping empty ones.
const groupDirectoriesByCategory = (directories: DirectoryCommunity[], defaults: DirectoryDefaultsData): CategoryGroup[] =>
  [
    { key: 'image', label: 'Image Boards' },
    { key: 'upload', label: 'Upload Boards' },
  ]
    .map(({ key, label }) => ({
      key,
      label,
      communities: directories.filter((community) => (key === 'upload') === isUploadDirectory(defaults, getDirectoryCode(community))),
    }))
    .filter((group) => group.communities.length > 0);

// Resolve a /rules/:boardIdentifier segment (directory code or board address) to a directory code.
const resolveDirectoryCode = (identifier: string, directories: DirectoryCommunity[]): string | null => {
  if (isDirectoryRoute(identifier, directories)) {
    return identifier;
  }
  const code = getBoardPath(getCommunityAddress(identifier, directories), directories);
  return isDirectoryRoute(code, directories) ? code : null;
};

// A single directory's rules (h3 title + ordered rules), anchored by code for deep-link scrolling.
const DirectorySection = ({ community, rules }: { community: DirectoryCommunity; rules: string[] }) => {
  const code = getDirectoryCode(community);
  return (
    <div id={code || undefined}>
      <h3 className={styles.directoryTitle}>{getDirectoryDisplayTitle(community)}</h3>
      {rules.length > 0 ? (
        <ol>
          {rules.map((rule, index) => (
            <li key={`${index}-${rule}`}>
              <Markdown content={rule} parseSpoilers={false} />
            </li>
          ))}
        </ol>
      ) : (
        <p>
          <em>This directory has no specific rules.</em>
        </p>
      )}
    </div>
  );
};

// Directory rules come straight from the directories JSON (defaults), so a whole category renders at once without a P2P fetch.
const CategoryRulesBox = ({ group, defaults }: { group: CategoryGroup; defaults: DirectoryDefaultsData }) => (
  <div className={`${styles.box} ${styles.rulesBox}`} id={`category-${group.key}`}>
    <div className={styles.boxBar}>
      <h2 className={styles.rulesBoxTitle}>{group.label}</h2>
    </div>
    <div className={styles.boxContent}>
      {group.communities.map((community, index) => (
        <Fragment key={community.address}>
          <DirectorySection community={community} rules={getDirectoryRules(defaults, getDirectoryCode(community))} />
          {/* Separator below each entry except the last (matches 4chan's <hr> between board rules). */}
          {index < group.communities.length - 1 && <hr className={styles.directoryDivider} />}
        </Fragment>
      ))}
    </div>
  </div>
);

// Quick-jump nav (left column) grouped by category; clicking a directory insta-scrolls to its rules via /rules/:code.
const DirectoryNav = ({ groups }: { groups: CategoryGroup[] }) => (
  <div className={`${styles.box} ${styles.selectorBox}`}>
    <div className={styles.boxBar}>
      <h2 className={styles.selectorBoxTitle}>Directories</h2>
    </div>
    <div className={styles.boxContent}>
      <nav className={styles.directoryNav}>
        <ul>
          {groups.map((group) => (
            <li key={group.key}>
              {/* Button (not an anchor) so the HashRouter route hash is preserved while still scrolling to the category. */}
              <button type='button' className={styles.directoryNavHeader} onClick={() => document.getElementById(`category-${group.key}`)?.scrollIntoView()}>
                {group.label}
              </button>
              <ul>
                {group.communities.map((community) => {
                  const code = getDirectoryCode(community);
                  return (
                    <li key={community.address}>
                      <Link to={`/rules/${code}`}>{getBoardName(community.title) || getDirectoryDisplayTitle(community)}</Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  </div>
);

// P2P board rules: fetched live from peers for an arbitrary board address.
const BoardRulesDisplay = ({ communityAddress }: { communityAddress: string }) => {
  const { t } = useTranslation();
  const communityIdentifier = useCommunityIdentifier(communityAddress);
  const community = useCommunity(communityIdentifier ? { community: communityIdentifier } : undefined);
  const { rules, state, shortAddress } = community || {};
  const stateString = useStateString(community) || t('downloading_board');
  const isLoaded = state === 'succeeded';

  const displayTitle = `Rules for: ${shortAddress || communityAddress}`;

  return (
    <div className={`${styles.box} ${styles.rulesBox}`}>
      <div className={styles.boxBar}>
        <h2 className={styles.rulesBoxTitle}>{displayTitle}</h2>
      </div>
      <div className={styles.boxContent}>
        {!isLoaded ? (
          <p>
            <em>{state === 'failed' ? t('failed') : <LoadingEllipsis string={stateString} />}</em>
          </p>
        ) : rules && rules.length > 0 ? (
          <ol>
            {rules.map((rule: string, index: number) => (
              <li key={`${index}-${rule}`}>
                <Markdown content={rule} parseSpoilers={false} />
              </li>
            ))}
          </ol>
        ) : (
          <p>
            <em>This board has no rules set by its owner.</em>
          </p>
        )}
      </div>
    </div>
  );
};

// Load any board's own rules live from peers (P2P), separate from the static directory rules below.
// Once a board is loaded the action toggles to "Clear", which drops the result box and empties the input.
const LoadBoardRules = ({ onLoad, onClear, isLoaded }: { onLoad: (address: string) => void; onClear: () => void; isLoaded: boolean }) => {
  const { t } = useTranslation();
  const [customAddress, setCustomAddress] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = customAddress.trim();
    if (trimmed) {
      onLoad(trimmed);
    }
  };

  const handleClear = () => {
    setCustomAddress('');
    onClear();
  };

  return (
    <div className={`${styles.box} ${styles.selectorBox}`}>
      <div className={styles.boxBar}>
        <h2 className={styles.selectorBoxTitle}>Load rules P2P from any board</h2>
      </div>
      <div className={styles.boxContent}>
        <div className={styles.selectorRow}>
          <form onSubmit={handleSubmit} className={styles.customAddressForm}>
            <input
              type='text'
              aria-label={lowerCase(t('enter_board_address'))}
              placeholder={lowerCase(t('enter_board_address'))}
              value={customAddress}
              onChange={(e) => setCustomAddress(e.target.value)}
              className={styles.addressInput}
            />
            {isLoaded ? (
              <button type='button' className={styles.goButton} onClick={handleClear}>
                Clear
              </button>
            ) : (
              <button type='submit' className={styles.goButton}>
                Load
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

const Rules = () => {
  const { boardIdentifier } = useParams();
  const directories = useDirectories();
  const directoryDefaults = useDirectoryDefaults();
  const [loadedAddress, setLoadedAddress] = useState('');
  const scrolledForRef = useRef<string | null>(null);

  // Order directories alphabetically by directory code (e.g. /3/, /a/, /aco/...), like 4chan, not by title.
  const directoriesWithCode = directories.filter((community) => getDirectoryCode(community)).toSorted((a, b) => getDirectoryCode(a).localeCompare(getDirectoryCode(b)));
  const categoryGroups = groupDirectoriesByCategory(directoriesWithCode, directoryDefaults);

  const handleLoad = (address: string) => {
    setLoadedAddress(getCommunityAddress(address, directories));
  };

  useEffect(() => {
    document.title = 'Rules - 5chan';
  }, []);

  useEffect(() => {
    setLoadedAddress('');
    if (!boardIdentifier) {
      scrolledForRef.current = null;
      window.scrollTo(0, 0);
    }
  }, [boardIdentifier]);

  // Deep-link: /rules/:code insta-scrolls to that directory's rules once the matching section is rendered.
  useEffect(() => {
    if (!boardIdentifier || scrolledForRef.current === boardIdentifier) {
      return;
    }
    const code = resolveDirectoryCode(boardIdentifier, directories);
    const element = code ? document.getElementById(code) : null;
    if (element) {
      element.scrollIntoView();
      scrolledForRef.current = boardIdentifier;
    }
  }, [boardIdentifier, directories]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.content}>
        <HomeLogo />
        <div className={`${styles.box} ${styles.infoBox}`}>
          <div className={styles.boxBar}>
            <h2>Rules</h2>
          </div>
          <div className={styles.boxContent}>
            5chan does <i>not</i> have global rules or moderators. It is a serverless, adminless, static tool for browsing and posting to decentralized imageboards.{' '}
            <strong>Each directory sets its own rules</strong>, listed below and expected of the boards that host it; individual board owners and admins may add their
            own.
            <br />
            <br />
            Please read and respect the rules of whatever board you decide to post to.
          </div>
        </div>
        <LoadBoardRules onLoad={handleLoad} onClear={() => setLoadedAddress('')} isLoaded={!!loadedAddress} />
        {loadedAddress && <BoardRulesDisplay communityAddress={loadedAddress} />}
        <div className={styles.columns}>
          <div className={styles.leftColumn}>
            <DirectoryNav groups={categoryGroups} />
          </div>
          <div className={styles.rightColumn}>
            {categoryGroups.map((group) => (
              <CategoryRulesBox key={group.key} group={group} defaults={directoryDefaults} />
            ))}
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
};

export default Rules;
