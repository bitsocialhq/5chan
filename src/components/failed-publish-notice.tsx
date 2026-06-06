import styles from '../views/post/post.module.css';
import useIsMobile from '../hooks/use-is-mobile';

interface FailedPublishNoticeProps {
  isDeleting: boolean;
  isRetrying?: boolean;
  onDelete: () => void;
  onRetry?: () => void;
}

const FailedPublishNotice = ({ isDeleting, isRetrying = false, onDelete, onRetry }: FailedPublishNoticeProps) => {
  const isMobile = useIsMobile();
  const isBusy = isDeleting || isRetrying;

  return (
    <span className={styles.failedPublishNotice}>
      This post failed to publish, it's not visible to other users.{' '}
      {isMobile && (
        <>
          <br />
          <br />
        </>
      )}
      {onRetry && (
        <span className={styles.failedDeletePostAction}>
          <span className={styles.failedDeletePostBracket}>[</span>
          <button type='button' className={styles.failedDeletePostButton} disabled={isBusy} onClick={onRetry}>
            Retry Publish
          </button>
          <span className={styles.failedDeletePostBracket}>]</span>
        </span>
      )}{' '}
      <span className={styles.failedDeletePostAction}>
        <span className={styles.failedDeletePostBracket}>[</span>
        <button type='button' className={styles.failedDeletePostButton} disabled={isBusy} onClick={onDelete}>
          Delete Post
        </button>
        <span className={styles.failedDeletePostBracket}>]</span>
      </span>
    </span>
  );
};

export default FailedPublishNotice;
