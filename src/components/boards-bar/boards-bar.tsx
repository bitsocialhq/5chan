import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import getShortAddress from '../../lib/get-short-address';
import useAccountsStore from '@bitsocialnet/bitsocial-react-hooks/dist/stores/accounts';
import { isAllView, isCatalogView, isModView, isSubscriptionsView } from '../../lib/utils/view-utils';
import { useAccountCommunityAddresses } from '../../hooks/use-account-community-addresses';
import { useDirectories, useDirectoriesMetadata, DirectoryCommunity } from '../../hooks/use-directories';
import { useBoardPath, useResolvedCommunityAddress } from '../../hooks/use-resolved-community-address';
import useSafeAccountComment from '../../hooks/use-safe-account-comment';
import { getBoardPath, extractDirectoryFromTitle } from '../../lib/utils/route-utils';
import { getCommentCommunityAddress } from '../../lib/utils/comment-utils';
import useCreateBoardModalStore from '../../stores/use-create-board-modal-store';
import useBoardsBarEditModalStore from '../../stores/use-boards-bar-edit-modal-store';
import useBoardsBarVisibilityStore from '../../stores/use-boards-bar-visibility-store';
import useDirectoryModalStore from '../../stores/use-directory-modal-store';
import { BOARD_CODE_GROUPS, getAllBoardCodes } from '../../constants/board-codes';
import styles from './boards-bar.module.css';
import capitalize from 'lodash/capitalize';
import debounce from 'lodash/debounce';
import lowerCase from 'lodash/lowerCase';
import startCase from 'lodash/startCase';

const SearchBar = ({ setShowSearchBar }: { setShowSearchBar: (show: boolean) => void }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const searchBarRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const placeholder = lowerCase(t('enter_board_address'));

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (searchBarRef.current && !searchBarRef.current.contains(event.target as Node)) {
        setShowSearchBar(false);
      }
    },
    [searchBarRef, setShowSearchBar],
  );

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowSearchBar(false);
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [setShowSearchBar]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const searchInput = searchInputRef.current?.value;
    if (searchInput) {
      searchInputRef.current.value = '';
      navigate(`/${searchInput}`);
      setShowSearchBar(false);
    }
  };

  return (
    <div className={styles.searchBar} ref={searchBarRef}>
      <form onSubmit={handleSearchSubmit}>
        <input type='text' autoCorrect='off' autoComplete='off' spellCheck='false' autoCapitalize='off' placeholder={placeholder} ref={searchInputRef} />
      </form>
    </div>
  );
};

// Helper function to find board address by directory code
const findBoardAddressByCode = (code: string, directories: DirectoryCommunity[]): string | null => {
  const entry = directories.find((community) => {
    if (!community.title) return false;
    const directory = extractDirectoryFromTitle(community.title);
    return directory === code;
  });
  return entry?.address || null;
};

const BoardsBarDesktop = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const params = useParams();
  const isInCatalogView = isCatalogView(location.pathname, params);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showAllTemporarily, setShowAllTemporarily] = useState(false);
  const { openCreateBoardModal } = useCreateBoardModalStore();
  const { openBoardsBarEditModal } = useBoardsBarEditModalStore();
  const { openDirectoryModal } = useDirectoryModalStore();
  const { visibleDirectories, showSubscriptionsInBoardsBar } = useBoardsBarVisibilityStore();
  const directories = useDirectories();

  // Memoize allBoardCodes since it's derived from a constant
  const allBoardCodes = useMemo(() => getAllBoardCodes(), []);

  const subscriptions = useAccountsStore(
    (state) => {
      const activeAccountId = state.activeAccountId;
      const activeAccount = activeAccountId ? state.accounts[activeAccountId] : undefined;
      return [...(activeAccount?.subscriptions || [])];
    },
    (prev, next) => {
      if (prev.length !== next.length) return false;
      return prev.every((val, idx) => val === next[idx]);
    },
  );

  const accountCommunityAddresses = useAccountCommunityAddresses();

  // Show all subscriptions when enabled; no separate per-address tracking (avoids drift when subscribing from board-buttons)
  const visibleSubscriptionAddresses = showSubscriptionsInBoardsBar ? subscriptions : [];

  // Check if any directories are hidden
  const hasHiddenDirectories = useMemo(() => {
    return allBoardCodes.some((code) => !visibleDirectories.has(code));
  }, [allBoardCodes, visibleDirectories]);

  // Determine which directories to show (all if temporarily showing all, otherwise only visible ones)
  const directoriesToShow = useMemo(() => {
    if (showAllTemporarily) {
      return new Set(allBoardCodes);
    }
    return visibleDirectories;
  }, [showAllTemporarily, visibleDirectories, allBoardCodes]);

  // Initialize visibility store on mount
  useEffect(() => {
    useBoardsBarVisibilityStore.getState().initialize();
  }, []);

  // Render a board code link or placeholder
  const renderBoardCode = (code: string, isLastInGroup: boolean) => {
    const address = findBoardAddressByCode(code, directories);
    const isPlaceholder = !address;

    const handleClick = (e: React.MouseEvent) => {
      // If no address exists, prevent navigation and open directory modal
      if (!address) {
        e.preventDefault();
        e.stopPropagation();
        openDirectoryModal();
      }
    };

    const linkContent = (
      <>
        {isPlaceholder ? (
          <span
            className={styles.placeholder}
            role='button'
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!address) openDirectoryModal();
              }
            }}
            onClick={handleClick}
            style={{ cursor: 'pointer' }}
          >
            {code}
          </span>
        ) : (
          <Link to={`/${code}${isInCatalogView ? '/catalog' : ''}`} onClick={handleClick}>
            {code}
          </Link>
        )}
      </>
    );

    return (
      <span key={code}>
        {linkContent}
        {!isLastInGroup && ' / '}
      </span>
    );
  };

  // Render a subscription link
  const renderSubscription = (address: string, index: number, total: number) => {
    const boardPath = getBoardPath(address, directories);
    const displayText = address.endsWith('.eth') || address.endsWith('.sol') ? address : getShortAddress(address);

    return (
      <span key={address}>
        {boardPath && boardPath.trim() ? <Link to={`/${boardPath}${isInCatalogView ? '/catalog' : ''}`}>{displayText}</Link> : <span>{displayText}</span>}
        {index !== total - 1 && ' / '}
      </span>
    );
  };

  return (
    <div className={styles.boardNavDesktop}>
      <span className={styles.boardList}>
        [<Link to='/all'>all</Link> / <Link to='/subs'>subs</Link>
        {accountCommunityAddresses.length > 0 && (
          <>
            {' '}
            / <Link to='/mod'>mod</Link>
          </>
        )}
        ]{' '}
        {BOARD_CODE_GROUPS.map((group, groupIndex) => {
          const visibleCodes = group.filter((code) => directoriesToShow.has(code));
          if (visibleCodes.length === 0) return null;

          return <span key={groupIndex}>[{visibleCodes.map((code, codeIndex) => renderBoardCode(code, codeIndex === visibleCodes.length - 1))}] </span>;
        })}
        {hasHiddenDirectories && !showAllTemporarily && (
          <>
            {' '}
            [
            <span
              className={styles.temporaryButton}
              role='button'
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setShowAllTemporarily(true);
                }
              }}
              onClick={() => setShowAllTemporarily(true)}
              style={{ cursor: 'pointer' }}
              title='Show all'
            >
              ...
            </span>
            ]{' '}
          </>
        )}
        {visibleSubscriptionAddresses.length > 0 && (
          <>[{visibleSubscriptionAddresses.map((address: string, index: number) => renderSubscription(address, index, visibleSubscriptionAddresses.length))}] </>
        )}
        [
        <span
          className={styles.temporaryButton}
          role='button'
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openBoardsBarEditModal();
            }
          }}
          onClick={() => openBoardsBarEditModal()}
          style={{ cursor: 'pointer' }}
        >
          {capitalize(t('edit'))}
        </span>
        ] [
        <span
          className={styles.temporaryButton}
          role='button'
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openCreateBoardModal();
            }
          }}
          onClick={() => openCreateBoardModal()}
          style={{ cursor: 'pointer' }}
        >
          {t('create_board')}
        </span>
        ]
      </span>
      <span className={styles.navTopRight}>
        [<Link to={!location.pathname.endsWith('settings') ? location.pathname.replace(/\/$/, '') + '/settings' : location.pathname}>{t('settings')}</Link>] [
        <span
          role='button'
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setShowSearchBar(!showSearchBar);
            }
          }}
          onClick={() => setShowSearchBar(!showSearchBar)}
        >
          {t('search')}
        </span>
        ] [<Link to='/'>{t('home')}</Link>]
      </span>
      {showSearchBar && <SearchBar setShowSearchBar={setShowSearchBar} />}
    </div>
  );
};

const BoardsBarMobile = ({ communityAddress }: { communityAddress?: string }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const directories = useDirectories();
  const directoriesMetadata = useDirectoriesMetadata();
  const displayCommunityAddress = communityAddress && communityAddress.length > 30 ? communityAddress.slice(0, 30).concat('...') : communityAddress;
  const [showSearchBar, setShowSearchBar] = useState(false);

  // Filter to only show directory boards (those with titles)
  const directoryBoards = useMemo(() => directories.filter((sub) => sub.title && extractDirectoryFromTitle(sub.title)), [directories]);

  const location = useLocation();
  const params = useParams();
  const isInAllView = isAllView(location.pathname);
  const isInCatalogView = isCatalogView(location.pathname, params);
  const isInSubscriptionsView = isSubscriptionsView(location.pathname, params);
  const isInModView = isModView(location.pathname);
  const boardPath = useBoardPath(communityAddress);
  const selectValue = isInAllView ? 'all' : isInSubscriptionsView ? 'subs' : isInModView ? 'mod' : boardPath || communityAddress;

  const accountCommunityAddresses = useAccountCommunityAddresses();

  // Check if current community is a directory board
  const currentIsDirectoryBoard = directoryBoards.some((board) => board.address === communityAddress);

  // Build multiboards with full titles, then combine with directory boards and sort alphabetically
  const sortedBoardOptions = useMemo(() => {
    const allTitle = directoriesMetadata?.title || '/all/ - All 5chan Directories';
    const subsTitle = '/subs/ - Subscriptions';
    const modTitle = `/mod/ - ${startCase(t('boards_you_moderate'))}`;

    const multiboards: Array<{ value: string; label: string }> = [
      { value: 'all', label: allTitle },
      { value: 'subs', label: subsTitle },
      ...(accountCommunityAddresses.length > 0 ? [{ value: 'mod', label: modTitle }] : []),
    ];

    const directoryOptions = directoryBoards.map((board) => {
      const directoryCode = extractDirectoryFromTitle(board.title!);
      return { value: directoryCode!, label: board.title! };
    });

    return [...multiboards, ...directoryOptions].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
  }, [directoriesMetadata?.title, t, accountCommunityAddresses.length, directoryBoards]);

  const boardSelect = (
    <select
      value={selectValue}
      onChange={(e) => {
        const value = e.target.value;
        navigate(`/${value}${isInCatalogView ? '/catalog' : ''}`);
      }}
    >
      {!currentIsDirectoryBoard && communityAddress && <option value={communityAddress}>{displayCommunityAddress}</option>}
      {sortedBoardOptions.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );

  // navbar animation on scroll
  const [visible, setVisible] = useState(true);
  const prevScrollPosRef = useRef(0);

  useEffect(() => {
    const debouncedHandleScroll = debounce(() => {
      const currentScrollPos = window.scrollY;
      const prevScrollPos = prevScrollPosRef.current;

      setVisible(prevScrollPos > currentScrollPos || currentScrollPos < 10);
      prevScrollPosRef.current = currentScrollPos;
    }, 50);

    window.addEventListener('scroll', debouncedHandleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', debouncedHandleScroll);
      debouncedHandleScroll.cancel();
    };
  }, []);

  return (
    <div className={styles.boardNavMobile} style={{ transform: visible ? 'translateY(0)' : 'translateY(-23px)' }}>
      <div className={styles.boardSelect}>
        <strong>{t('board')}</strong>
        {boardSelect}
      </div>
      <div className={styles.pageJump}>
        <Link to={location.pathname.replace(/\/$/, '') + '/settings'}>{t('settings')}</Link>
        <span
          role='button'
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setShowSearchBar(!showSearchBar);
            }
          }}
          onClick={() => setShowSearchBar(!showSearchBar)}
        >
          {capitalize(t('search'))}
        </span>
        <Link to='/'>{t('home')}</Link>
        {showSearchBar && <SearchBar setShowSearchBar={setShowSearchBar} />}
      </div>
    </div>
  );
};

const BoardsBar = () => {
  const params = useParams();
  const commentIndex = params?.accountCommentIndex ? parseInt(params.accountCommentIndex, 10) : undefined;
  const accountComment = useSafeAccountComment({ commentIndex });
  const resolvedCommunityAddress = useResolvedCommunityAddress();
  const communityAddress = resolvedCommunityAddress || getCommentCommunityAddress(accountComment);

  return (
    <>
      <BoardsBarDesktop />
      <BoardsBarMobile communityAddress={communityAddress} />
    </>
  );
};

export default BoardsBar;
