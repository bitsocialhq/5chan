import type { Comment } from '@bitsocial/bitsocial-react-hooks';
import getShortAddress from '../get-short-address';

export function getCommentUserID(comment: Comment | undefined): string {
  const { address, shortAddress } = comment?.author || {};
  return (address ? getShortAddress(address) : '') || shortAddress || '';
}
