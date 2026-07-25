import styles from './loading-ellipsis.module.css';

interface LoadingEllipsisProps {
  centered?: boolean;
  string: string;
}

const TRAILING_ELLIPSIS_PATTERN = /\s*(?:\.\.\.|\u2026)\s*$/;

const LoadingEllipsis = ({ centered = false, string }: LoadingEllipsisProps) => {
  const normalizedString = string.replace(TRAILING_ELLIPSIS_PATTERN, '');
  const words = normalizedString.split(' ');
  const lastWord = words.pop();
  const restOfString = words.join(' ');

  if (centered) {
    return (
      <span className={styles.centeredTrack}>
        {normalizedString}
        <span className={`${styles.ellipsis} ${styles.centeredEllipsis}`} />
      </span>
    );
  }

  return (
    <span>
      {restOfString}
      {restOfString && ' '}
      <span className={styles.nowrap}>
        {lastWord}
        <span className={styles.ellipsis} />
      </span>
    </span>
  );
};

export default LoadingEllipsis;
