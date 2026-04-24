import { Link } from 'react-router-dom';
import useCreateBoardModalStore from '../../stores/use-create-board-modal-store';
import styles from './create-board-modal.module.css';

const CreateBoardModal = () => {
  const { showModal, closeCreateBoardModal } = useCreateBoardModalStore();

  if (!showModal) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      closeCreateBoardModal();
    }
  };

  return (
    <div
      className={styles.backdrop}
      role='button'
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          closeCreateBoardModal();
        }
      }}
      onClick={handleBackdropClick}
    >
      <div className={styles.createBoardDialog} role='dialog' aria-modal='true' aria-labelledby='create-board-modal-title'>
        <div className={styles.hd}>
          <h2 id='create-board-modal-title'>Create a Board</h2>
          <button className={styles.closeButton} onClick={closeCreateBoardModal} title='Close' aria-label='Close' />
        </div>
        <div className={styles.bd}>
          <div className={styles.section}>
            <h3>Creating Your Board</h3>
            <p>
              Create a board using the CLI:
              <a href='https://github.com/bitsocialnet/bitsocial-cli' target='_blank' rel='noopener noreferrer'>
                bitsocial-cli
              </a>
              . <strong>Build a following:</strong> Users can subscribe to your board via the &quot;[Subscribe]&quot; button, which adds it to their top bar. You can gain
              subscribers through direct links, word of mouth, or search—no directory assignment or dev approval needed.
            </p>
          </div>

          <div className={styles.section}>
            <h3>Submitting to a Directory</h3>
            <p>
              Open a PR editing{' '}
              <a href='https://github.com/bitsocialnet/lists/blob/master/5chan-directories.json' target='_blank' rel='noopener noreferrer'>
                5chan-directories.json
              </a>{' '}
              with your board&apos;s title, address, and NSFW status. Devs will review and merge if approved. 99% uptime is required.
            </p>
          </div>

          <div className={styles.section}>
            <h3>Future: Directory Voting</h3>
            <p>
              Each directory will have its own voting page listing the boards competing for that slot. Only 5chan users who purchased <Link to='/pass'>5chan Pass</Link>{' '}
              will be able to vote.
            </p>
          </div>

          <div className={styles.section}>
            <h3>Decentralization</h3>
            <p>
              Devs can change directories via commits in the open-source repo. No centralized servers—anyone can fork, modify, and redeploy to their own domain. 5chan is
              adminless with no central authority.
            </p>
          </div>
        </div>
        <div className={styles.createBoardFooter}>
          <button onClick={closeCreateBoardModal}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default CreateBoardModal;
