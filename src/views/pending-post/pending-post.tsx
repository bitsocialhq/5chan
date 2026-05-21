import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAccountComments } from '@bitsocial/bitsocial-react-hooks';
import { useDirectories } from '../../hooks/use-directories';
import useSafeAccountComment from '../../hooks/use-safe-account-comment';
import { getCommentCommunityAddress } from '../../lib/utils/comment-utils';
import { getBoardPath } from '../../lib/utils/route-utils';
import { Post } from '../post';

type PendingAccountComment = {
  index?: number;
};

const hasPendingAccountCommentIndex = (accountComments: PendingAccountComment[] | undefined, accountCommentIndex: number) => {
  if (!accountComments || accountComments.length === 0) {
    return true;
  }

  let hasExplicitIndices = false;
  for (const accountComment of accountComments) {
    if (typeof accountComment?.index !== 'number') {
      continue;
    }

    hasExplicitIndices = true;
    if (accountComment.index === accountCommentIndex) {
      return true;
    }
  }

  return hasExplicitIndices ? false : accountCommentIndex < accountComments.length;
};

const PendingPost = () => {
  const { accountComments } = useAccountComments();
  const { accountCommentIndex } = useParams<{ accountCommentIndex?: string }>();
  const normalizedAccountCommentIndex = accountCommentIndex === undefined ? undefined : Number(accountCommentIndex);
  const hasNormalizedAccountCommentIndex = normalizedAccountCommentIndex !== undefined && !Number.isNaN(normalizedAccountCommentIndex);
  const post = useSafeAccountComment({ commentIndex: accountCommentIndex });
  const navigate = useNavigate();
  const directories = useDirectories();

  useEffect(() => window.scrollTo(0, 0), []);

  const isValidAccountCommentIndex =
    !accountCommentIndex ||
    (hasNormalizedAccountCommentIndex &&
      normalizedAccountCommentIndex >= 0 &&
      Number.isInteger(normalizedAccountCommentIndex) &&
      hasPendingAccountCommentIndex(accountComments, normalizedAccountCommentIndex));

  useEffect(() => {
    if (!isValidAccountCommentIndex) {
      navigate('/not-found', { replace: true });
    }
  }, [isValidAccountCommentIndex, navigate]);

  useEffect(() => {
    const postCommunityAddress = getCommentCommunityAddress(post);
    if (post?.cid && postCommunityAddress) {
      const boardPath = getBoardPath(postCommunityAddress, directories);
      navigate(`/${boardPath}/thread/${post.cid}`, { replace: true });
    }
  }, [post, navigate, directories]);

  return <Post post={post} />;
};

export default PendingPost;
