import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useHomeFiltersStore from '../../../stores/use-popular-threads-options-store';
import styles from '../home.module.css';

const BoxModal = () => {
  const { t } = useTranslation();
  const [showFilterModal, setShowFilterModal] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { showWorksafeContentOnly, setShowWorksafeContentOnly, showNsfwContentOnly, setShowNsfwContentOnly } = useHomeFiltersStore();

  useEffect(() => {
    if (!showFilterModal) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node) && buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setShowFilterModal(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilterModal]);

  const selectFilter = (filter: 'worksafe' | 'nsfw' | 'all') => {
    if (filter === 'worksafe') {
      if (showNsfwContentOnly) setShowNsfwContentOnly(false);
      setShowWorksafeContentOnly(!showWorksafeContentOnly);
    } else if (filter === 'nsfw') {
      if (showWorksafeContentOnly) setShowWorksafeContentOnly(false);
      setShowNsfwContentOnly(!showNsfwContentOnly);
    } else {
      setShowWorksafeContentOnly(false);
      setShowNsfwContentOnly(false);
    }
    setShowFilterModal(false);
  };

  const handleKey = (e: React.KeyboardEvent, filter: 'worksafe' | 'nsfw' | 'all') => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectFilter(filter);
    }
  };

  return (
    <>
      <button
        type='button'
        ref={buttonRef}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!showFilterModal) setShowFilterModal(true);
          }
        }}
        onClick={() => !showFilterModal && setShowFilterModal(true)}
      >
        {t('options')} ▼
      </button>
      {showFilterModal && (
        <div ref={modalRef} className={styles.filterModal}>
          <button
            type='button'
            className={`${styles.option} ${showWorksafeContentOnly ? styles.selected : ''}`}
            tabIndex={0}
            onKeyDown={(e) => handleKey(e, 'worksafe')}
            onClick={() => selectFilter('worksafe')}
          >
            {t('show_worksafe_content_only')}
          </button>
          <button
            type='button'
            className={`${styles.option} ${showNsfwContentOnly ? styles.selected : ''}`}
            tabIndex={0}
            onKeyDown={(e) => handleKey(e, 'nsfw')}
            onClick={() => selectFilter('nsfw')}
          >
            {t('show_nsfw_content_only')}
          </button>
          <button
            type='button'
            className={`${styles.option} ${!showWorksafeContentOnly && !showNsfwContentOnly ? styles.selected : ''}`}
            tabIndex={0}
            onKeyDown={(e) => handleKey(e, 'all')}
            onClick={() => selectFilter('all')}
          >
            {t('show_all_content')}
          </button>
        </div>
      )}
    </>
  );
};

export default BoxModal;
