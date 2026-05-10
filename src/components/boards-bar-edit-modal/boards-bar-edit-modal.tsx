import { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAccount } from '@bitsocial/bitsocial-react-hooks';
import useBoardsBarEditModalStore from '../../stores/use-boards-bar-edit-modal-store';
import useBoardsBarVisibilityStore from '../../stores/use-boards-bar-visibility-store';
import { getAllBoardCodes } from '../../constants/board-codes';
import styles from './boards-bar-edit-modal.module.css';

const directoriesToString = (dirs: Set<string>): string => Array.from(dirs).sort().join(' ');

const stringToDirectories = (str: string): Set<string> => {
  const codes = str
    .trim()
    .split(/\s+/)
    .reduce<string[]>((items, code) => {
      if (code.length > 0) {
        items.push(code.toLowerCase());
      }
      return items;
    }, []);
  return new Set(codes);
};

// Form component keyed by store values so it remounts with fresh state when modal reopens
const BoardsBarEditModalForm = ({
  visibleDirectories,
  showSubscriptionsInBoardsBar,
  setDirectoryVisibility,
  setShowSubscriptionsInBoardsBar,
  closeBoardsBarEditModal,
  subscriptions,
  location,
}: {
  visibleDirectories: Set<string>;
  showSubscriptionsInBoardsBar: boolean;
  setDirectoryVisibility: (code: string, visible: boolean) => void;
  setShowSubscriptionsInBoardsBar: (show: boolean) => void;
  closeBoardsBarEditModal: () => void;
  subscriptions: string[];
  location: { pathname: string };
}) => {
  const allBoardCodes = useMemo(() => getAllBoardCodes(), []);
  const allVisible = allBoardCodes.every((code) => visibleDirectories.has(code));

  const [localDirectoryInput, setLocalDirectoryInput] = useState(() => (allVisible ? '' : directoriesToString(visibleDirectories)));
  const [showSubscriptions, setShowSubscriptions] = useState(() => showSubscriptionsInBoardsBar);

  const handleSave = () => {
    if (localDirectoryInput.trim() === '') {
      allBoardCodes.forEach((code) => setDirectoryVisibility(code, true));
    } else {
      const inputDirectories = stringToDirectories(localDirectoryInput);
      allBoardCodes.forEach((code) => setDirectoryVisibility(code, inputDirectories.has(code)));
    }
    setShowSubscriptionsInBoardsBar(showSubscriptions);
    closeBoardsBarEditModal();
  };

  return (
    <>
      <div className={styles.section}>
        <input
          type='text'
          className={styles.directoryInput}
          placeholder='Example: jp tg mu'
          aria-label='Directory codes'
          value={localDirectoryInput}
          onChange={(e) => setLocalDirectoryInput(e.target.value)}
        />
      </div>
      {subscriptions.length > 0 && (
        <div className={styles.section}>
          <div className={styles.checkboxItem}>
            <input type='checkbox' id='show-subscriptions' checked={showSubscriptions} onChange={(e) => setShowSubscriptions(e.target.checked)} />
            <label htmlFor='show-subscriptions'>show subscriptions</label>
            <span className={styles.editSubscriptionsWrapper}>
              (
              <Link
                to={location.pathname.replace(/\/$/, '') + '/settings#subscriptions-settings'}
                className={styles.editSubscriptionsLink}
                onClick={(e) => {
                  e.stopPropagation();
                  closeBoardsBarEditModal();
                }}
              >
                edit subscriptions
              </Link>
              )
            </span>
          </div>
        </div>
      )}
      <div className={styles.boardsbarEditFooter}>
        <button onClick={handleSave}>Save</button>
      </div>
    </>
  );
};

const BoardsBarEditModal = () => {
  const { showModal, closeBoardsBarEditModal } = useBoardsBarEditModalStore();
  const { visibleDirectories, showSubscriptionsInBoardsBar, setDirectoryVisibility, setShowSubscriptionsInBoardsBar } = useBoardsBarVisibilityStore();
  const account = useAccount();
  const subscriptions = useMemo(() => account?.subscriptions || [], [account?.subscriptions]);
  const location = useLocation();

  if (!showModal) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      closeBoardsBarEditModal();
    }
  };

  const formKey = `${directoriesToString(visibleDirectories)}-${showSubscriptionsInBoardsBar}`;

  return (
    <div
      className={styles.backdrop}
      role='button'
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          closeBoardsBarEditModal();
        }
      }}
      onClick={handleBackdropClick}
    >
      <div className={styles.boardsbarEditDialog} role='dialog' aria-modal='true' aria-labelledby='boards-bar-edit-modal-title'>
        <div className={styles.hd}>
          <h2 id='boards-bar-edit-modal-title'>Custom Board List</h2>
          <button type='button' className={styles.closeButton} onClick={closeBoardsBarEditModal} title='Close' aria-label='Close' />
        </div>
        <div className={styles.bd}>
          <BoardsBarEditModalForm
            key={formKey}
            visibleDirectories={visibleDirectories}
            showSubscriptionsInBoardsBar={showSubscriptionsInBoardsBar}
            setDirectoryVisibility={setDirectoryVisibility}
            setShowSubscriptionsInBoardsBar={setShowSubscriptionsInBoardsBar}
            closeBoardsBarEditModal={closeBoardsBarEditModal}
            subscriptions={subscriptions}
            location={location}
          />
        </div>
      </div>
    </div>
  );
};

export default BoardsBarEditModal;
