import { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Comment, useCommunities } from '@bitsocial/bitsocial-react-hooks';
import styles from '../home.module.css';
import usePopularPosts, { getRevealedPopularPosts } from '../../../hooks/use-popular-posts';
import { useFeedStateString } from '../../../hooks/use-state-string';
import usePopularThreadsOptionsStore from '../../../stores/use-popular-threads-options-store';
import { getCommentMediaInfo } from '../../../lib/utils/media-utils';
import { CatalogPostMedia } from '../../../components/catalog-row';
import LoadingEllipsis from '../../../components/loading-ellipsis';
import BoxModal from '../box-modal';
import { DirectoryCommunity, findDirectoryByAddress } from '../../../hooks/use-directories';
import { useCommunityIdentifiers } from '../../../hooks/use-community-identifiers';
import { getCommentCommunityAddress } from '../../../lib/utils/comment-utils';
import { getBoardPath } from '../../../lib/utils/route-utils';
import { removeMarkdown } from '../../../lib/utils/post-utils';

interface PopularThreadProps {
  post: Comment;
  boardTitle: string;
  boardPath: string;
}

const PopularThreadsLoading = ({ boardAddresses }: { boardAddresses: string[] }) => {
  const { t } = useTranslation();
  const loadingStateString = useFeedStateString(boardAddresses) || t('loading');

  return <LoadingEllipsis string={loadingStateString} />;
};

const ContentPreview = ({ content, maxLength = 99 }: { content: string; maxLength?: number }) => {
  const plainText = removeMarkdown(content).trim().replaceAll('&nbsp;', '').replace(/\n\n/g, '\n').replaceAll('\n\n', '');
  const truncatedText = plainText.length > maxLength ? `${plainText.substring(0, maxLength).trim()}...` : plainText;

  return truncatedText;
};

const PopularThreadCard = memo(
  ({ post, boardTitle, boardPath }: PopularThreadProps) => {
    const { cid, content, link, linkHeight, linkWidth, thumbnailUrl, title } = post || {};
    const commentMediaInfo = getCommentMediaInfo(link, thumbnailUrl, linkWidth, linkHeight);

    return (
      <div className={styles.popularThread} key={cid}>
        <div className={styles.title}>{boardTitle}</div>
        <div className={styles.mediaContainer}>
          <Link to={`/${boardPath}/thread/${cid}`}>
            <CatalogPostMedia commentMediaInfo={commentMediaInfo} isOutOfFeed={true} cid={cid} linkWidth={linkWidth} linkHeight={linkHeight} />
          </Link>
        </div>
        <div className={styles.threadContent}>
          {title && (
            <>
              <b>{title.trim()}</b>
              {content && ': '}
            </>
          )}
          {content && <ContentPreview content={content} maxLength={99} />}
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => prevProps.post?.cid === nextProps.post?.cid && prevProps.boardTitle === nextProps.boardTitle && prevProps.boardPath === nextProps.boardPath,
);

const PopularThreadsBox = ({ directories, directoryAddresses }: { directories: DirectoryCommunity[]; directoryAddresses: string[] }) => {
  const { t } = useTranslation();
  const showWorksafeContentOnly = usePopularThreadsOptionsStore((state) => state.showWorksafeContentOnly);
  const showNsfwContentOnly = usePopularThreadsOptionsStore((state) => state.showNsfwContentOnly);

  const filteredBoardAddresses = useMemo(() => {
    return directoryAddresses.flatMap((address) => {
      const directoryEntry = findDirectoryByAddress(directories, address);
      if (showWorksafeContentOnly && directoryEntry?.nsfw) {
        return [];
      }
      if (showNsfwContentOnly && !directoryEntry?.nsfw) {
        return [];
      }

      return [address];
    });
  }, [directories, directoryAddresses, showNsfwContentOnly, showWorksafeContentOnly]);

  const revealedPopularPosts = getRevealedPopularPosts(filteredBoardAddresses);
  const shouldLoadPopularPosts = !revealedPopularPosts;
  const directoryCommunities = useCommunityIdentifiers(shouldLoadPopularPosts ? filteredBoardAddresses : []);
  const { communities } = useCommunities({ communities: directoryCommunities });

  const { popularPosts, isLoading } = usePopularPosts(shouldLoadPopularPosts ? communities : [], filteredBoardAddresses);

  return (
    <div className={styles.box}>
      <div className={`${styles.boxBar} ${styles.color2ColorBar}`}>
        <h2 className='capitalize'>{t('popular_threads')}</h2>
        <BoxModal />
      </div>
      <div className={`${styles.boxContent} ${styles.popularThreads} ${isLoading ? styles.popularThreadsLoading : ''}`}>
        {isLoading ? (
          <PopularThreadsLoading boardAddresses={filteredBoardAddresses} />
        ) : (
          popularPosts.map((post: Comment) => {
            const communityAddress = getCommentCommunityAddress(post);
            const directoryEntry = findDirectoryByAddress(directories, communityAddress);
            const boardTitle = directoryEntry?.title?.replace(/^\/[^/]+\/\s*-\s*/, '') || '';
            const boardPath = communityAddress ? getBoardPath(communityAddress, directories) : '';
            return <PopularThreadCard key={post.cid} post={post} boardTitle={boardTitle} boardPath={boardPath} />;
          })
        )}
      </div>
    </div>
  );
};

export default PopularThreadsBox;
