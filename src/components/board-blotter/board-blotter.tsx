import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import blotterData from '../../data/5chan-blotter.json';
import BlotterMessage from '../blotter-message';
import { formatBlotterDate, getBlotterPreview, isBlotterEntry, sortBlotterEntries } from '../../lib/utils/blotter-utils';
import useBlotterVisibilityStore from '../../stores/use-blotter-visibility-store';
import styles from './board-blotter.module.css';

const BoardBlotter = () => {
  const { t } = useTranslation();
  const { isHidden, toggleVisibility } = useBlotterVisibilityStore();

  const entries = (blotterData as { entries?: unknown[] }).entries ?? [];
  const validEntries = entries.filter(isBlotterEntry);
  const sorted = sortBlotterEntries(validEntries);
  const preview = getBlotterPreview(sorted);

  return (
    <div className={`${styles.content} ${styles.show}`}>
      <table className={styles.blotter}>
        <thead>
          <tr aria-label='Blotter separator'>
            <td aria-label='Blotter divider'>
              <hr />
            </td>
          </tr>
        </thead>
        {!isHidden && (
          <tbody>
            {preview.map((entry) => (
              <tr key={entry.id}>
                <td>
                  {formatBlotterDate(entry.timestamp)} <BlotterMessage entry={entry} />
                </td>
              </tr>
            ))}
          </tbody>
        )}
        <tfoot>
          <tr>
            <td>
              [
              <button
                type='button'
                className={styles.hideButton}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleVisibility();
                  }
                }}
                onClick={() => toggleVisibility()}
              >
                {isHidden ? t('show_blotter') : t('hide')}
              </button>
              ]
              {!isHidden && (
                <>
                  {' '}
                  [
                  <Link to='/blotter' className={styles.actionLink}>
                    {t('show_all')}
                  </Link>
                  ]
                </>
              )}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default BoardBlotter;
