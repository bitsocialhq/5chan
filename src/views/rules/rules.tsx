import { useEffect, useState, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCommunity } from '@bitsocial/bitsocial-react-hooks';
import { Footer, HomeLogo } from '../home';
import { useDirectories, DirectoryCommunity, findDirectoryByAddress } from '../../hooks/use-directories';
import { useCommunityIdentifier } from '../../hooks/use-community-identifiers';
import { getCommunityAddress, getBoardPath } from '../../lib/utils/route-utils';
import Markdown from '../../components/markdown';
import LoadingEllipsis from '../../components/loading-ellipsis';
import useStateString from '../../hooks/use-state-string';
import styles from './rules.module.css';
import { useTranslation } from 'react-i18next';
import lowerCase from 'lodash/lowerCase';

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

const BoardRulesDisplay = ({ communityAddress, directories }: { communityAddress: string; directories: DirectoryCommunity[] }) => {
  const { t } = useTranslation();
  const communityIdentifier = useCommunityIdentifier(communityAddress);
  const community = useCommunity(communityIdentifier ? { community: communityIdentifier } : undefined);
  const { rules, state, title, shortAddress } = community || {};
  const stateString = useStateString(community) || t('downloading_board');
  const isLoaded = state === 'succeeded';

  const defaultSub = directories.find((sub) => sub.address === communityAddress);
  let displayTitle: string;
  if (defaultSub?.title) {
    const shortCode = getBoardShortCode(defaultSub.title);
    const boardName = getBoardName(defaultSub.title);
    displayTitle = `Rules for: /${shortCode}/ - ${boardName}`;
  } else if (title) {
    const shortCode = getBoardShortCode(title);
    const boardName = getBoardName(title);
    if (shortCode && boardName && boardName !== title) {
      displayTitle = `Rules for: /${shortCode}/ - ${boardName}`;
    } else {
      displayTitle = `Rules for: ${shortAddress || communityAddress}`;
    }
  } else {
    displayTitle = `Rules for: ${shortAddress || communityAddress}`;
  }

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
              <li key={index}>
                <Markdown content={rule} />
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

const BoardSelector = ({
  directories,
  selectedAddress,
  onSelect,
}: {
  directories: DirectoryCommunity[];
  selectedAddress: string;
  onSelect: (address: string) => void;
}) => {
  const [customAddress, setCustomAddress] = useState('');
  const selectedDefaultBoard = findDirectoryByAddress(directories, selectedAddress);
  const selectedBoardValue = selectedDefaultBoard?.address ?? '';

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) {
      onSelect(value);
      setCustomAddress('');
    }
  };

  const handleCustomSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = customAddress.trim();
    if (trimmed) {
      onSelect(trimmed);
    }
  };

  const { t } = useTranslation();

  return (
    <div className={`${styles.box} ${styles.selectorBox}`}>
      <div className={styles.boxBar}>
        <h2 className={styles.selectorBoxTitle}>Load rules from a board</h2>
      </div>
      <div className={styles.boxContent}>
        <div className={styles.selectorRow}>
          <select value={selectedBoardValue} onChange={handleSelectChange} className={styles.boardSelect}>
            <option value=''>Select board...</option>
            {[...directories]
              .sort((a, b) => getBoardShortCode(a.title).localeCompare(getBoardShortCode(b.title)))
              .map((sub) => {
                const shortCode = getBoardShortCode(sub.title);
                const boardName = getBoardName(sub.title);
                return (
                  <option key={sub.address} value={sub.address}>
                    /{shortCode}/ - {boardName}
                  </option>
                );
              })}
          </select>
          <span className={styles.orSeparator}>or</span>
          <form onSubmit={handleCustomSubmit} className={styles.customAddressForm}>
            <input
              type='text'
              placeholder={lowerCase(t('enter_board_address'))}
              value={customAddress}
              onChange={(e) => setCustomAddress(e.target.value)}
              className={styles.addressInput}
            />
            <button type='submit' className={styles.goButton}>
              Go
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const Rules = () => {
  const { boardIdentifier } = useParams();
  const navigate = useNavigate();
  const directories = useDirectories();

  const selectedAddress = boardIdentifier ? getCommunityAddress(boardIdentifier, directories) : '';

  const handleBoardSelect = (address: string) => {
    const path = getBoardPath(address, directories);
    navigate(`/rules/${path}`, { replace: true });
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Rules - 5chan';
  }, []);

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
            <strong>Each board sets its own rules independently</strong>, determined by the board owner and board admins, and enforced by the board moderators.
            <br />
            <br />
            Please read and respect the rules of whatever board you decide to post to.
          </div>
        </div>
        <BoardSelector directories={directories} selectedAddress={selectedAddress} onSelect={handleBoardSelect} />
        {selectedAddress && <BoardRulesDisplay communityAddress={selectedAddress} directories={directories} />}
        <Footer />
      </div>
    </div>
  );
};

export default Rules;
