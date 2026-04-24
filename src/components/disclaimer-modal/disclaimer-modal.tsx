import { useLocation, useNavigate } from 'react-router-dom';
import useDisclaimerModalStore from '../../stores/use-disclaimer-modal-store';
import useDirectoryModalStore from '../../stores/use-directory-modal-store';
import styles from './disclaimer-modal.module.css';

const DisclaimerModal = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHomeView = location.pathname === '/';
  const { showModal, closeDisclaimerModal, acceptDisclaimer, targetBoardPath } = useDisclaimerModalStore();
  const { openDirectoryModal } = useDirectoryModalStore();

  if (!showModal) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      closeDisclaimerModal();
    }
  };

  const handleAccept = () => {
    // If there's no board path (placeholder), show directory modal instead
    if (!targetBoardPath) {
      closeDisclaimerModal();
      openDirectoryModal();
    } else {
      acceptDisclaimer(navigate);
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
          closeDisclaimerModal();
        }
      }}
      onClick={handleBackdropClick}
    >
      <div className={styles.disclaimerDialog} role='dialog' aria-modal='true' aria-labelledby='disclaimer-modal-title'>
        <div className={styles.hd}>
          <h2 id='disclaimer-modal-title'>Disclaimer</h2>
          <button className={`${styles.closeButton} ${isHomeView ? styles.closeButtonHome : ''}`} onClick={closeDisclaimerModal} title='Close' aria-label='Close' />
        </div>
        <div className={styles.bd}>
          <p>This web application may contain content for mature audiences only. By clicking &quot;Accept,&quot; you confirm that:</p>
          <br />
          <ol>
            <li>You are at least 18 years old (or the age of majority in your jurisdiction).</li>
            <li>It is legal for you to view such content in your location.</li>
          </ol>
        </div>
        <div className={styles.disclaimerFooter}>
          <button onClick={handleAccept}>Accept</button>
          <button onClick={closeDisclaimerModal}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default DisclaimerModal;
