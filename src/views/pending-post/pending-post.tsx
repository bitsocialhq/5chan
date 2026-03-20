import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAccountComments } from '@bitsocialnet/bitsocial-react-hooks';
import { useDirectories } from '../../hooks/use-directories';
import useSafeAccountComment from '../../hooks/use-safe-account-comment';
import { getBoardPath } from '../../lib/utils/route-utils';
import { Post } from '../post';

const PendingPost = () => {
  const { accountComments } = useAccountComments();
  const { accountCommentIndex } = useParams<{ accountCommentIndex?: string }>();
  const commentIndex = accountCommentIndex ? parseInt(accountCommentIndex, 10) : undefined;
  const post = useSafeAccountComment({ commentIndex });
  const navigate = useNavigate();
  const directories = useDirectories();

  useEffect(() => window.scrollTo(0, 0), []);

  const isValidAccountCommentIndex =
    !accountCommentIndex ||
    (!isNaN(parseInt(accountCommentIndex)) &&
      parseInt(accountCommentIndex) >= 0 &&
      Number.isInteger(parseFloat(accountCommentIndex)) &&
      (accountComments?.length === 0 || parseInt(accountCommentIndex) <= accountComments.length));

  useEffect(() => {
    if (!isValidAccountCommentIndex) {
      navigate('/not-found', { replace: true });
    }
  }, [isValidAccountCommentIndex, navigate]);

  useEffect(() => {
    const postCommunityAddress = post?.communityAddress || post?.subplebbitAddress;
    if (post?.cid && postCommunityAddress) {
      const boardPath = getBoardPath(postCommunityAddress, directories);
      navigate(`/${boardPath}/thread/${post.cid}`, { replace: true });
    }
  }, [post, navigate, directories]);

  return <Post post={post} />;
};

export default PendingPost;
