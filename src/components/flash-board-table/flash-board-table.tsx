import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Comment } from '@bitsocial/bitsocial-react-hooks';
import capitalize from 'lodash/capitalize';
import { getFlashTagOptionFromComment } from '../../lib/flash-tags';
import { removeMarkdown } from '../../lib/utils/post-utils';
import { getFormattedDate } from '../../lib/utils/time-utils';
import { getPublishURLFilename } from '../../lib/utils/url-utils';
import { truncateWithEllipsisInMiddle } from '../../lib/utils/string-utils';
import LoadingEllipsis from '../loading-ellipsis';
import styles from './flash-board-table.module.css';

type FlashBoardComment = Comment & {
  postNumber?: number | string;
};

interface FlashBoardTableProps {
  boardBasePath: string;
  isLoading?: boolean;
  posts: FlashBoardComment[];
}

const CELL_COUNT = 9;
const MAX_CELL_TEXT_LENGTH = 40;
const MAX_SUBJECT_LENGTH = 55;

const getThreadPath = (boardBasePath: string, comment: FlashBoardComment) => {
  const threadCid = comment.postCid || comment.cid;
  return threadCid ? `${boardBasePath.replace(/\/$/, '')}/thread/${threadCid}` : undefined;
};

const getPostNumber = (comment: FlashBoardComment) => comment.number || comment.postNumber || '?';

const getDisplayName = (comment: FlashBoardComment, anonymousLabel: string) => comment.author?.displayName?.trim() || anonymousLabel;

const getFileLabel = (link: string | undefined) => {
  if (!link) {
    return '';
  }

  return truncateWithEllipsisInMiddle(getPublishURLFilename(link) || link, MAX_CELL_TEXT_LENGTH);
};

const getSubjectLabel = (comment: FlashBoardComment) => {
  const title = typeof comment.title === 'string' ? removeMarkdown(comment.title).trim() : '';
  const content = typeof comment.content === 'string' ? removeMarkdown(comment.content).trim() : '';
  return truncateWithEllipsisInMiddle(title || content, MAX_SUBJECT_LENGTH);
};

const getReplyCount = (comment: FlashBoardComment) => (typeof comment.replyCount === 'number' ? comment.replyCount : 0);

const FlashBoardTable = ({ boardBasePath, isLoading = false, posts }: FlashBoardTableProps) => {
  const { t } = useTranslation();
  const anonymousLabel = capitalize(t('anonymous'));

  return (
    <div className={styles.wrapper}>
      <table id='flash-list' className={styles.flashListing}>
        <thead>
          <tr>
            <th scope='col' className={styles.postblock}>
              No.
            </th>
            <th scope='col' className={styles.postblock}>
              {capitalize(t('name'))}
            </th>
            <th scope='col' className={styles.postblock}>
              {capitalize(t('file'))}
            </th>
            <th scope='col' className={styles.postblock}>
              {capitalize(t('embed'))}
            </th>
            <th scope='col' className={styles.postblock}>
              {capitalize(t('tag'))}
            </th>
            <th scope='col' className={styles.postblock}>
              {capitalize(t('subject'))}
            </th>
            <th scope='col' className={styles.postblock}>
              {capitalize(t('date'))}
            </th>
            <th scope='col' className={styles.postblock}>
              {capitalize(t('replies'))}
            </th>
            <th scope='col' className={styles.postblock} aria-label={capitalize(t('reply'))}></th>
          </tr>
        </thead>
        <tbody>
          {posts.length === 0 && isLoading ? (
            <tr className={styles.row}>
              <td colSpan={CELL_COUNT} className={styles.emptyCell}>
                <LoadingEllipsis string={t('downloading_board')} />
              </td>
            </tr>
          ) : posts.length === 0 ? (
            <tr className={styles.row}>
              <td colSpan={CELL_COUNT} className={styles.emptyCell}>
                no posts
              </td>
            </tr>
          ) : (
            posts.map((post, index) => {
              const threadPath = getThreadPath(boardBasePath, post);
              const fileLabel = getFileLabel(post.link);
              const flashTag = getFlashTagOptionFromComment(post);
              const subjectLabel = getSubjectLabel(post);
              const rowClassName = `${styles.row} ${index % 2 === 0 ? styles.rowOdd : ''}`;

              return (
                <tr key={post.cid || `flash-post-${index}`} className={rowClassName}>
                  <td className={styles.numberCell}>
                    {threadPath ? (
                      <Link to={threadPath} className={styles.link}>
                        {getPostNumber(post)}
                      </Link>
                    ) : (
                      getPostNumber(post)
                    )}
                  </td>
                  <td>{getDisplayName(post, anonymousLabel)}</td>
                  <td className={styles.fileCell} title={post.link || fileLabel}>
                    {post.link ? (
                      <a href={post.link} target='_blank' rel='noopener noreferrer' className={styles.link}>
                        {fileLabel}
                      </a>
                    ) : null}
                  </td>
                  <td className={styles.embedCell}>
                    {post.link ? (
                      <>
                        [
                        <a href={post.link} target='_blank' rel='noopener noreferrer' className={styles.link}>
                          {capitalize(t('embed'))}
                        </a>
                        ]
                      </>
                    ) : null}
                  </td>
                  <td className={styles.tagCell} title={flashTag?.label}>
                    {flashTag ? `[${flashTag.shortLabel}]` : ''}
                  </td>
                  <td className={styles.subjectCell} title={subjectLabel}>
                    {subjectLabel}
                  </td>
                  <td className={styles.dateCell}>{typeof post.timestamp === 'number' ? getFormattedDate(post.timestamp) : ''}</td>
                  <td className={styles.repliesCell}>{getReplyCount(post)}</td>
                  <td className={styles.replyCell}>
                    {threadPath ? (
                      <>
                        [
                        <Link to={threadPath} className={styles.link}>
                          {capitalize(t('reply'))}
                        </Link>
                        ]
                      </>
                    ) : null}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default FlashBoardTable;
