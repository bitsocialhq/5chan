import { useTranslation } from 'react-i18next';
import { hasTransferredCommentMarker } from '../lib/comment-transfer';
import styles from './post-transferred-tag.module.css';

interface PostTransferredTagProps {
  comment: unknown;
}

const PostTransferredTag = ({ comment }: PostTransferredTagProps) => {
  const { t } = useTranslation();

  if (!hasTransferredCommentMarker(comment)) return null;

  return (
    <span className={styles.transferredTag} title={t('transferred')}>
      [{t('transferred')}]{' '}
    </span>
  );
};

export default PostTransferredTag;
