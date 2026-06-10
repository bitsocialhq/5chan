import { useEffect, useRef } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { typesetMathElement } from '../../lib/mathjax/mathjax-typeset';
import TexLogo from '../tex-logo/tex-logo';
import styles from './tex-preview-modal.module.css';

const TYPESET_DEBOUNCE_MS = 50;

// Live TeX preview opened from the reply modal's TeX button: a textarea over a preview area that
// re-typesets what you type, so equations can be checked before posting.
const TexPreviewModal = ({ closeModal }: { closeModal: () => void }) => {
  const { t } = useTranslation();
  const outputRef = useRef<HTMLDivElement>(null);
  const typesetTimeoutRef = useRef<number>(undefined);

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = event.target;
    window.clearTimeout(typesetTimeoutRef.current);
    typesetTimeoutRef.current = window.setTimeout(() => {
      if (outputRef.current) {
        typesetMathElement(outputRef.current, value);
      }
    }, TYPESET_DEBOUNCE_MS);
  };

  useEffect(() => {
    return () => window.clearTimeout(typesetTimeoutRef.current);
  }, []);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closeModal();
      }
    };

    // Capture phase so Escape closes this modal before the reply modal's own Escape handler.
    document.addEventListener('keydown', closeOnEscape, true);
    return () => document.removeEventListener('keydown', closeOnEscape, true);
  }, [closeModal]);

  return (
    <div className={styles.overlay} role='dialog' aria-modal='true' aria-labelledby='tex-preview-title'>
      <button type='button' className={styles.overlayButton} aria-label={t('close')} onClick={closeModal} />
      <div className={styles.panel}>
        <div id='tex-preview-title' className={styles.header}>
          <Trans
            i18nKey='tex_preview_title'
            components={{
              tex: <TexLogo />,
            }}
          />
          <button type='button' className={styles.closeIcon} title={t('close')} aria-label={t('close')} onClick={closeModal} />
        </div>
        <div className={styles.protip}>{t('tex_preview_protip')}</div>
        <textarea className={styles.input} aria-label={t('tex_preview_input_label')} spellCheck={false} onChange={handleInputChange} />
        <div className={styles.output} ref={outputRef} />
      </div>
    </div>
  );
};

export default TexPreviewModal;
