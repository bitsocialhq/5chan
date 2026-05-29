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
    <div className={styles.backdrop}>
      <button type='button' className={styles.backdropButton} aria-label='Close disclaimer modal' onClick={closeDisclaimerModal} />
      <dialog open className={styles.disclaimerDialog} aria-modal='true' aria-labelledby='disclaimer-modal-title'>
        <div className={styles.hd}>
          <h2 id='disclaimer-modal-title'>Disclaimer</h2>
          <button
            type='button'
            className={`${styles.closeButton} ${isHomeView ? styles.closeButtonHome : ''}`}
            onClick={closeDisclaimerModal}
            title='Close'
            aria-label='Close'
          />
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
          <button type='button' onClick={handleAccept}>
            Accept
          </button>
          <button type='button' onClick={closeDisclaimerModal}>
            Cancel
          </button>
        </div>
      </dialog>
    </div>
  );
};

export default DisclaimerModal;
