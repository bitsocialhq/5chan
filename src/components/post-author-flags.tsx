import { useTranslation } from 'react-i18next';
import { getCommentFlagFlairs, getAuthorFlagViewModels } from '../lib/comment-flags';
import { hasTransferredCommentMarker } from '../lib/comment-transfer';
import styles from '../views/post/post.module.css';

interface PostAuthorFlagsProps {
  author: unknown;
  comment: unknown;
  enabled: boolean;
}

const getBackgroundPosition = (x: number, y: number) => `${x === 0 ? 0 : -x}px ${y === 0 ? 0 : -y}px`;
const transparentPixelSrc = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1" height="1"%3E%3C/svg%3E';

const PostAuthorFlags = ({ author, comment, enabled }: PostAuthorFlagsProps) => {
  const { t } = useTranslation();

  if (!enabled || hasTransferredCommentMarker(comment)) return null;

  const flags = getAuthorFlagViewModels(getCommentFlagFlairs(comment, author));
  if (flags.length === 0) return null;

  return (
    <span className={styles.authorFlags}>
      {flags.map((flag) => {
        const label = flag.labelKey ? t(flag.labelKey, flag.label) : flag.label;
        return (
          <img
            key={flag.key}
            alt={label}
            className={styles.authorFlag}
            src={transparentPixelSrc}
            style={{
              backgroundImage: `url("${flag.spritePath}")`,
              backgroundPosition: getBackgroundPosition(flag.x, flag.y),
              width: flag.width,
              height: flag.height,
            }}
            title={label}
          />
        );
      })}
    </span>
  );
};

export default PostAuthorFlags;
