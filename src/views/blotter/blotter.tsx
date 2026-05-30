import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import blotterData from '../../data/5chan-blotter.json';
import BlotterMessage from '../../components/blotter-message';
import { formatBlotterDate, isBlotterEntry, sortBlotterEntries } from '../../lib/utils/blotter-utils';
import { Footer } from '../home/home';
import styles from './blotter.module.css';

const Blotter = () => {
  const { t } = useTranslation();
  const entries = (blotterData as { entries?: unknown[] }).entries ?? [];
  const validEntries = entries.filter(isBlotterEntry);
  const sorted = sortBlotterEntries(validEntries);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Blotter - 5chan';
  }, []);

  return (
    <div className={styles.wrapper}>
      <div className={styles.content}>
        <h1>5chan Blotter</h1>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.dateHeader}>{t('date')}</th>
              <th className={styles.messageHeader}>{t('message')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry) => (
              <tr key={entry.id}>
                <td className={styles.dateCell}>{formatBlotterDate(entry.timestamp)}</td>
                <td className={styles.messageCell}>
                  <BlotterMessage entry={entry} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Footer />
      </div>
    </div>
  );
};

export default Blotter;
