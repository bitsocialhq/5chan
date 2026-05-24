import { getCommentFlagFlairs, getAuthorFlagViewModels } from '../lib/comment-flags';
import styles from '../views/post/post.module.css';

interface PostAuthorFlagsProps {
  author: unknown;
  comment: unknown;
  enabled: boolean;
}

const getBackgroundPosition = (x: number, y: number) => `${x === 0 ? 0 : -x}px ${y === 0 ? 0 : -y}px`;

const PostAuthorFlags = ({ author, comment, enabled }: PostAuthorFlagsProps) => {
  if (!enabled) return null;

  const flags = getAuthorFlagViewModels(getCommentFlagFlairs(comment, author));
  if (flags.length === 0) return null;

  return (
    <span className={styles.authorFlags}>
      {flags.map((flag) => (
        <span
          key={flag.key}
          aria-label={flag.label}
          className={styles.authorFlag}
          role='img'
          style={{
            backgroundImage: `url("${flag.spritePath}")`,
            backgroundPosition: getBackgroundPosition(flag.x, flag.y),
            width: flag.width,
            height: flag.height,
          }}
          title={flag.label}
        />
      ))}
    </span>
  );
};

export default PostAuthorFlags;
