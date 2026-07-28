import { useTranslation } from 'react-i18next';
import { hasTransferredCommentMarker } from '../lib/comment-transfer';
import { getSpecialBoardByAddress, TRASH_BOARD_CODE } from '../lib/special-boards';
import { getCommentCommunityAddress } from '../lib/utils/comment-utils';
import styles from './post-transferred-tag.module.css';

interface PostTransferredTagProps {
  comment: unknown;
}

const PostTransferredTag = ({ comment }: PostTransferredTagProps) => {
  const { t } = useTranslation();

  if (!hasTransferredCommentMarker(comment)) return null;
  if (getSpecialBoardByAddress(getCommentCommunityAddress(comment))?.directoryCode === TRASH_BOARD_CODE) {
    return null;
  }

  return (
    <span className={styles.transferredTag} title={t('transferred')}>
      [{t('transferred')}]{' '}
    </span>
  );
};

export default PostTransferredTag;
