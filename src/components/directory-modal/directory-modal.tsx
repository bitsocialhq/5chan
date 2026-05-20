import { useLocation } from 'react-router-dom';
import useDirectoryModalStore from '../../stores/use-directory-modal-store';
import styles from './directory-modal.module.css';

const DirectoryModal = () => {
  const { showModal, closeDirectoryModal } = useDirectoryModalStore();
  const location = useLocation();
  const isHomeView = location.pathname === '/';

  if (!showModal) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      closeDirectoryModal();
    }
  };

  return (
    <div
      className={`${styles.backdrop} ${isHomeView ? styles.backdropHome : ''}`}
      role='button'
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          closeDirectoryModal();
        }
      }}
      onClick={handleBackdropClick}
    >
      <div className={styles.directoryDialog} role='dialog' aria-modal='true' aria-labelledby='directory-modal-title'>
        <div className={styles.hd}>
          <h2 id='directory-modal-title'>Submit a Board to a Directory</h2>
          <button className={`${styles.closeButton} ${isHomeView ? styles.closeButtonHome : ''}`} onClick={closeDirectoryModal} title='Close' aria-label='Close' />
        </div>
        <div className={styles.bd}>
          <p className={styles.introMessage}>
            <strong>The board you clicked on doesn&apos;t exist yet, but it can be yours!</strong>
          </p>

          <div className={styles.section}>
            <h3>Creating Your Board</h3>
            <p>
              <strong>Anyone can create a board</strong> using{' '}
              <a href='https://github.com/bitsocialnet/5chan-board-manager' target='_blank' rel='noopener noreferrer'>
                5chan Board Manager
              </a>
              . Users can access it anytime via the search bar, direct links, or by subscribing with the &quot;[Subscribe]&quot; button;{' '}
              <strong>no directory assignment or dev approval needed</strong>. Directory boards are simply featured in homepage categories (like &quot;Anime &
              Manga&quot;) and are handpicked by devs until directory voting is available.
            </p>
          </div>

          <div className={styles.section}>
            <h3>Directory Submission</h3>
            <p>
              To submit your board, open a PR editing the relevant file in the{' '}
              <a href='https://github.com/bitsocialnet/lists/tree/master/5chan-directories' target='_blank' rel='noopener noreferrer'>
                5chan-directories folder
              </a>{' '}
              with your board&apos;s title, address, and NSFW status. Requirements: 99% uptime (they&apos;re P2P nodes), active, well-moderated, and relevant to the
              category. Devs will review and approve/reject based on these criteria.
            </p>
          </div>

          <div className={styles.section}>
            <h3>Future: Directory Voting</h3>
            <p>
              Each directory will have its own voting page listing the boards competing for that slot. 5chan Pass holders will be able to participate in directory voting,
              while final governance mechanics are still being designed to include BSO-holder alignment.
            </p>
          </div>
        </div>
        <div className={styles.directoryFooter}>
          <button onClick={closeDirectoryModal}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default DirectoryModal;
