import React, { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CommentMediaInfo, getDisplayMediaInfoType, getHasThumbnail, getMediaDimensions } from '../../lib/utils/media-utils';
import { getHostname, parseHttpUrl } from '../../lib/utils/url-utils';
import useExpandedMediaStore from '../../stores/use-expanded-media-store';
import useFetchGifFirstFrame from '../../hooks/use-fetch-gif-first-frame';
import useIsMobile from '../../hooks/use-is-mobile';
import styles from './comment-media.module.css';
import Embed, { canEmbed } from '../embed';
import RufflePlayer from './ruffle-player';

interface MediaProps {
  commentMediaInfo?: CommentMediaInfo;
  deleted?: boolean;
  disableToggle?: boolean;
  displayHeight?: string;
  displayWidth?: string;
  isFloatingEmbed?: boolean;
  isOutOfFeed?: boolean;
  isReply?: boolean;
  linkHeight?: number;
  linkWidth?: number;
  parentCid?: string;
  purged?: boolean;
  removed?: boolean;
  spoiler?: boolean;
  showThumbnail?: boolean;
  setShowThumbnail: (showThumbnail: boolean) => void;
  onMediaLoadFailureChange?: (url: string | undefined) => void;
}

type GifFrameState = ReturnType<typeof useFetchGifFirstFrame>;

const getMediaLoadFailureLabels = (url: string | undefined, t: ReturnType<typeof useTranslation>['t']) => {
  const hostname = url ? getHostname(url) : undefined;
  const label = t('media_failed_to_load');
  const source = hostname ? t('media_failed_to_load_source', { host: hostname }) : t('media_failed_to_load_source_unknown');
  const hint = t('media_failed_to_load_hint');
  const openSourceLabel = t('media_failed_to_load_open_source');
  const inline = hostname ? t('media_failed_to_load_inline', { host: hostname }) : t('media_failed_to_load_inline_unknown');
  const statusLabel = url ? `${label}. ${source}. ${hint}. ${openSourceLabel}.` : `${label}. ${source}. ${hint}.`;

  return { inline, openSourceLabel, statusLabel };
};

const MediaLoadFailure = ({ compact = false, url }: { compact?: boolean; url?: string }) => {
  const { t } = useTranslation();
  const { inline, openSourceLabel, statusLabel } = getMediaLoadFailureLabels(url, t);

  if (compact) {
    return (
      <>
        <img className={styles.fileDeleted} src='assets/filedeleted-res.gif' alt='' aria-hidden='true' />
        <output className={styles.mediaLoadFailureStatus} aria-label={statusLabel} title={statusLabel} />
      </>
    );
  }

  return (
    <output className={styles.mediaLoadFailure} aria-label={statusLabel} title={statusLabel}>
      <img className={styles.fileDeleted} src='assets/filedeleted-res.gif' alt='' aria-hidden='true' />
      <span className={styles.mediaLoadFailureSource}>{inline}</span>
      {url && (
        <a className={styles.mediaLoadFailureLink} href={url} target='_blank' rel='noopener noreferrer'>
          {openSourceLabel}
        </a>
      )}
    </output>
  );
};

export const MediaLoadFailureInfo = ({ url }: { url?: string }) => {
  const { t } = useTranslation();
  const { inline, openSourceLabel, statusLabel } = getMediaLoadFailureLabels(url, t);

  return (
    <div className={styles.mediaLoadFailureInfo} title={statusLabel}>
      {inline}
      {url && (
        <>
          {' '}
          <a href={url} target='_blank' rel='noopener noreferrer'>
            {openSourceLabel}
          </a>
        </>
      )}
    </div>
  );
};

const Thumbnail = ({
  commentMediaInfo,
  deleted,
  displayHeight,
  gifFrameState,
  displayWidth,
  isFloatingEmbed,
  isOutOfFeed,
  isReply,
  purged,
  removed,
  spoiler,
  setShowThumbnail,
}: MediaProps & { gifFrameState: GifFrameState }) => {
  const isMobile = useIsMobile();
  const { patternThumbnailUrl, thumbnail, type, url } = commentMediaInfo || {};

  let thumbnailComponent: React.ReactNode = null;
  const thumbnailDimensions = { '--width': displayWidth, '--height': displayHeight } as React.CSSProperties;
  const iframeThumbnail = patternThumbnailUrl || thumbnail;
  const { frameUrl: gifFrameUrl, status: gifFrameStatus } = gifFrameState;
  const hasThumbnail = getHasThumbnail(commentMediaInfo, url);
  const handleOpenMedia = () => setShowThumbnail(false);

  if (type === 'gif') {
    thumbnailComponent =
      gifFrameStatus === 'loading' ? (
        <button type='button' className={`${styles.gifPlaceholder} ${styles.mediaToggleButton}`} aria-label='Loading GIF thumbnail' onClick={handleOpenMedia} />
      ) : (
        <button type='button' className={styles.mediaToggleButton} aria-label='Open GIF' onClick={handleOpenMedia}>
          <img src={gifFrameUrl || url} alt='' />
        </button>
      );
  } else if (type === 'video') {
    thumbnailComponent = thumbnail ? (
      <img src={thumbnail} alt='Video thumbnail' />
    ) : (
      // show first frame of the video, as a workaround for Safari not loading thumbnails
      <button type='button' className={styles.mediaToggleButton} aria-label='Open video' onClick={handleOpenMedia}>
        <video src={`${url}#t=0.001`} aria-label='Video thumbnail' />
      </button>
    );
  } else if (type === 'webpage') {
    thumbnailComponent = (
      <button type='button' className={styles.mediaToggleButton} aria-label='Open webpage preview' onClick={handleOpenMedia}>
        <img src={thumbnail} alt='' />
      </button>
    );
  } else if (type === 'iframe') {
    thumbnailComponent = iframeThumbnail ? (
      <button type='button' className={styles.mediaToggleButton} aria-label='Open embedded media preview' onClick={handleOpenMedia}>
        <img src={iframeThumbnail} alt='' />
      </button>
    ) : null;
  } else if (type === 'audio') {
    thumbnailComponent = <audio src={url} aria-label='Audio preview' controls />;
  } else if (type === 'swf') {
    thumbnailComponent = (
      <button type='button' className={styles.swfPlaceholder} onClick={() => setShowThumbnail(false)}>
        [SWF]
      </button>
    );
  }

  const thumbnailSmallPadding = isMobile ? styles.thumbnailMobile : styles.thumbnailReplyDesktop;

  const linkWithoutThumbnail = url ? parseHttpUrl(url) : null;
  const fallbackLinkLabel = url ? getHostname(url) || (url.length > 30 ? `${url.slice(0, 30)}...` : url) : '';
  const noThumbnailLink =
    !hasThumbnail && linkWithoutThumbnail ? (
      canEmbed(linkWithoutThumbnail) ? (
        <button
          type='button'
          className={styles.noThumbnailButton}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setShowThumbnail(false);
            }
          }}
          onClick={() => setShowThumbnail(false)}
        >
          {fallbackLinkLabel}
        </button>
      ) : (
        <a href={url} target='_blank' rel='noopener noreferrer'>
          {fallbackLinkLabel}
        </a>
      )
    ) : null;

  return deleted || removed || purged ? (
    <img className={styles.fileDeleted} src='assets/filedeleted-res.gif' alt='File deleted' />
  ) : spoiler ? (
    <button type='button' className={styles.mediaToggleButton} aria-label='Open spoiler media' onClick={handleOpenMedia}>
      <img className={styles.spoiler} src='assets/spoiler.png' alt='' />
    </button>
  ) : isOutOfFeed ? (
    <span className={`${isFloatingEmbed ? styles.floatingEmbed : styles.communityAvatar}`}>{thumbnailComponent}</span>
  ) : isMobile || isReply ? (
    <span className={`${styles.thumbnailSmall} ${thumbnailSmallPadding}`} style={thumbnailDimensions}>
      {thumbnailComponent}
      {noThumbnailLink}
    </span>
  ) : (
    <span className={styles.thumbnailBig} style={thumbnailDimensions}>
      {thumbnailComponent}
      {noThumbnailLink}
    </span>
  );
};

const Media = ({ commentMediaInfo, disableToggle, isReply, setShowThumbnail }: MediaProps) => {
  const { t } = useTranslation();
  const { thumbnail, type, url } = commentMediaInfo || {};
  const isMobile = useIsMobile();
  const fitExpandedImagesToScreen = useExpandedMediaStore((s) => s.fitExpandedImagesToScreen);
  const unmuteExpandedVideoSound = useExpandedMediaStore((s) => s.unmuteExpandedVideoSound);
  const mediaClass = `${isMobile ? styles.mediaMobile : isReply ? styles.mediaDesktopReply : styles.mediaDesktopOp} ${
    fitExpandedImagesToScreen ? styles.fitToScreen : ''
  }`;
  const mediaDimensions = getMediaDimensions(commentMediaInfo);

  return (
    <span className={mediaClass} data-expanded-media='true'>
      {type === 'iframe' && url ? (
        <Embed url={url} />
      ) : type === 'gif' ? (
        disableToggle ? (
          <img src={url} alt='' />
        ) : (
          <button type='button' className={styles.mediaToggleButton} aria-label='Collapse GIF' onClick={() => setShowThumbnail(true)}>
            <img src={url} alt='' />
          </button>
        )
      ) : type === 'video' ? (
        <video src={url} aria-label={t('video')} controls autoPlay loop muted={!unmuteExpandedVideoSound} />
      ) : type === 'swf' && url ? (
        <RufflePlayer url={url} />
      ) : type === 'webpage' ? (
        disableToggle ? (
          <img src={thumbnail} alt='' />
        ) : (
          <button type='button' className={styles.mediaToggleButton} aria-label='Collapse webpage preview' onClick={() => setShowThumbnail(true)}>
            <img src={thumbnail} alt='' />
          </button>
        )
      ) : null}
      {isMobile && type && (
        <div className={styles.fileInfo}>
          <a href={url} target='_blank' rel='noopener noreferrer'>
            {url && url.length > 30 ? url.slice(0, 30) + '...' : url}
          </a>{' '}
          ({getDisplayMediaInfoType(type, t)}
          {mediaDimensions && `, ${mediaDimensions}`})
        </div>
      )}
      {isMobile && (type === 'iframe' || type === 'video' || type === 'audio' || type === 'swf') && (
        <div className={styles.closeButton}>
          <button
            type='button'
            className='button'
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setShowThumbnail(true);
              }
            }}
            onClick={() => setShowThumbnail(true)}
          >
            {t('close')}
          </button>
        </div>
      )}
    </span>
  );
};

interface ImageProps {
  commentMediaInfo: CommentMediaInfo;
  disableToggle?: boolean;
  displayHeight: string;
  displayWidth: string;
  initialExpanded?: boolean;
  isOutOfFeed: boolean;
  onMediaLoadFailureChange?: (url: string | undefined) => void;
  parentCid?: string;
  spoiler?: boolean;
}

const Image = ({
  commentMediaInfo,
  disableToggle = false,
  displayHeight,
  displayWidth,
  initialExpanded = false,
  isOutOfFeed,
  onMediaLoadFailureChange,
  parentCid,
  spoiler,
}: ImageProps) => {
  const { t } = useTranslation();
  const { type, url } = commentMediaInfo || {};
  const isReply = parentCid;
  const isMobile = useIsMobile();
  const [isImageExpanded, setIsImageExpanded] = useState(initialExpanded);
  const fitExpandedImagesToScreen = useExpandedMediaStore((s) => s.fitExpandedImagesToScreen);
  const mediaDimensions = getMediaDimensions(commentMediaInfo);
  const mediaClass = `${isMobile ? styles.mediaMobile : isReply ? styles.mediaDesktopReply : styles.mediaDesktopOp} ${
    fitExpandedImagesToScreen ? styles.fitToScreen : ''
  }`;
  const thumbnailSmallPadding = isMobile ? styles.thumbnailMobile : styles.thumbnailReplyDesktop;
  const thumbnailDimensions = { '--width': displayWidth, '--height': displayHeight } as React.CSSProperties;
  const expandedMediaAttribute = isImageExpanded ? 'true' : undefined;
  const imageMediaStyle = isImageExpanded ? undefined : thumbnailDimensions;

  const [failedUrl, setFailedUrl] = useState<string | undefined>();
  const hasError = failedUrl === url;
  const handleError = () => {
    setFailedUrl(url);
    onMediaLoadFailureChange?.(url);
  };
  const handleLoad = () => {
    setFailedUrl((currentFailedUrl) => (currentFailedUrl === url ? undefined : currentFailedUrl));
    onMediaLoadFailureChange?.(undefined);
  };

  if (spoiler && !isImageExpanded) {
    const spoilerDimensions = { '--width': '150px', '--height': '150px' } as React.CSSProperties;
    return (
      <span
        className={`${isOutOfFeed ? styles.communityAvatar : styles.thumbnailBig} ${styles.thumbnail} ${isImageExpanded && isMobile ? styles.removeFloat : ''}`}
        style={spoilerDimensions}
      >
        <button type='button' className={styles.mediaToggleButton} aria-label='Open spoiler media' onClick={() => setIsImageExpanded(true)}>
          <img className={styles.spoiler} src='assets/spoiler.png' alt='' />
        </button>
      </span>
    );
  }

  return isMobile ? (
    <span className={`${styles.thumbnail} ${isImageExpanded && isMobile ? styles.removeFloat : ''}`}>
      <span
        className={isImageExpanded ? mediaClass : `${isOutOfFeed ? styles.communityAvatar : styles.thumbnailSmall} ${thumbnailSmallPadding}`}
        data-expanded-media={expandedMediaAttribute}
        style={imageMediaStyle}
      >
        {hasError ? (
          <MediaLoadFailure compact url={url} />
        ) : disableToggle ? (
          <img src={url} onError={handleError} onLoad={handleLoad} alt='' />
        ) : (
          <button
            type='button'
            className={styles.mediaToggleButton}
            aria-label={isImageExpanded ? 'Collapse image' : 'Expand image'}
            onClick={() => setIsImageExpanded(!isImageExpanded)}
          >
            <img src={url} onError={handleError} onLoad={handleLoad} alt='' />
          </button>
        )}
      </span>
      {isImageExpanded && type && (
        <div className={styles.fileInfo}>
          <a href={url} target='_blank' rel='noopener noreferrer'>
            {url && url.length > 30 ? url.slice(0, 30) + '...' : url}
          </a>{' '}
          ({getDisplayMediaInfoType(type, t)}
          {mediaDimensions && `, ${mediaDimensions}`})
        </div>
      )}
      {type && !isImageExpanded && <div className={styles.fileInfo}>{`${spoiler ? `${t('spoiler')} - ` : ''} ${getDisplayMediaInfoType(type, t)}`}</div>}
    </span>
  ) : (
    <span
      className={isImageExpanded ? mediaClass : `${isOutOfFeed ? styles.communityAvatar : styles.thumbnailBig} ${styles.thumbnail}`}
      data-expanded-media={expandedMediaAttribute}
      style={imageMediaStyle}
    >
      {hasError ? (
        <MediaLoadFailure url={url} />
      ) : disableToggle ? (
        <img src={url} onError={handleError} onLoad={handleLoad} alt='' />
      ) : (
        <button
          type='button'
          className={styles.mediaToggleButton}
          aria-label={isImageExpanded ? 'Collapse image' : 'Expand image'}
          onClick={() => setIsImageExpanded(!isImageExpanded)}
        >
          <img src={url} onError={handleError} onLoad={handleLoad} alt='' />
        </button>
      )}
    </span>
  );
};

const CommentMedia = ({
  commentMediaInfo,
  deleted,
  disableToggle,
  isFloatingEmbed,
  linkHeight,
  linkWidth,
  parentCid,
  purged,
  removed,
  showThumbnail,
  setShowThumbnail,
  spoiler,
  onMediaLoadFailureChange,
}: MediaProps) => {
  const isReply = parentCid;
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { thumbnailHeight, thumbnailWidth, url } = commentMediaInfo || {};
  const gifFrameState = useFetchGifFirstFrame(commentMediaInfo?.type === 'gif' ? url : undefined);
  let type = commentMediaInfo?.type;
  const { status: gifFrameStatus } = gifFrameState;

  if (type === 'gif' && gifFrameStatus === 'ready') {
    type = 'animated gif';
  } else if (type === 'gif' && gifFrameStatus === 'failed') {
    type = 'static gif';
  }

  let displayWidth, displayHeight;
  const maxThumbnailSize = isMobile || isReply ? 125 : 250;

  if (linkWidth && linkHeight) {
    // use the dimensions from the pkc-js API
    let scale = Math.min(1, maxThumbnailSize / Math.max(linkWidth, linkHeight));
    displayWidth = `${linkWidth * scale}px`;
    displayHeight = `${linkHeight * scale}px`;
  } else if (thumbnailHeight && thumbnailWidth) {
    // use the dimensions from the thumbnail fetched by useCommentMediaInfo
    let scale = Math.min(1, maxThumbnailSize / Math.max(thumbnailWidth, thumbnailHeight));
    displayWidth = `${thumbnailWidth * scale}px`;
    displayHeight = `${thumbnailHeight * scale}px`;
  } else {
    // use the default size
    displayWidth = `${maxThumbnailSize}px`;
    displayHeight = `${maxThumbnailSize}px`;
  }

  if (type === 'audio') {
    displayWidth = '100%';
    displayHeight = '100%';
  }
  const isOutOfFeed = isFloatingEmbed || spoiler || false; // virtuoso wrapper unneeded

  return (
    <span className={styles.content}>
      {commentMediaInfo?.type === 'image' ? (
        // images just enlarge when clicked, so they don't need two separate components
        // when showThumbnail is explicitly false (e.g., from embed button), start expanded
        <Image
          commentMediaInfo={commentMediaInfo}
          disableToggle={disableToggle}
          displayHeight={displayHeight}
          displayWidth={displayWidth}
          initialExpanded={showThumbnail === false}
          isOutOfFeed={isOutOfFeed}
          onMediaLoadFailureChange={onMediaLoadFailureChange}
          parentCid={parentCid}
          spoiler={spoiler}
        />
      ) : (
        <>
          <span className={`${showThumbnail ? styles.show : styles.hide} ${styles.thumbnail}`}>
            {url && (
              <Thumbnail
                commentMediaInfo={commentMediaInfo}
                displayHeight={displayHeight}
                gifFrameState={gifFrameState}
                displayWidth={displayWidth}
                isFloatingEmbed={isFloatingEmbed}
                isOutOfFeed={isOutOfFeed}
                deleted={deleted}
                purged={purged}
                removed={removed}
                spoiler={spoiler}
                setShowThumbnail={setShowThumbnail}
              />
            )}
            {isMobile && type && <div className={styles.fileInfo}>{`${spoiler ? `${t('spoiler')} - ` : ''} ${getDisplayMediaInfoType(type, t)}`}</div>}
          </span>
          {!showThumbnail && <Media commentMediaInfo={commentMediaInfo} disableToggle={disableToggle} isReply={!!parentCid} setShowThumbnail={setShowThumbnail} />}
        </>
      )}
    </span>
  );
};

export default memo(CommentMedia, (prev, next) => {
  return (
    prev.commentMediaInfo === next.commentMediaInfo &&
    prev.deleted === next.deleted &&
    prev.disableToggle === next.disableToggle &&
    prev.isFloatingEmbed === next.isFloatingEmbed &&
    prev.isOutOfFeed === next.isOutOfFeed &&
    prev.isReply === next.isReply &&
    prev.linkHeight === next.linkHeight &&
    prev.linkWidth === next.linkWidth &&
    prev.onMediaLoadFailureChange === next.onMediaLoadFailureChange &&
    prev.parentCid === next.parentCid &&
    prev.purged === next.purged &&
    prev.removed === next.removed &&
    prev.showThumbnail === next.showThumbnail &&
    prev.setShowThumbnail === next.setShowThumbnail &&
    prev.spoiler === next.spoiler
  );
});
