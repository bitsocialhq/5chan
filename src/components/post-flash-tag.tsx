import { getFlashTagOptionFromComment, isFlashDirectory } from '../lib/flash-tags';
import type { DirectoryCommunity } from '../lib/utils/directory-list-utils';
import styles from '../views/post/post.module.css';

interface PostFlashTagProps {
  comment: unknown;
  directory: DirectoryCommunity | undefined;
}

const PostFlashTag = ({ comment, directory }: PostFlashTagProps) => {
  if (!isFlashDirectory(directory)) return null;

  const tag = getFlashTagOptionFromComment(comment);
  if (!tag) return null;

  return (
    <span className={styles.flashTag} title={tag.label}>
      [{tag.shortLabel}]{' '}
    </span>
  );
};

export default PostFlashTag;
