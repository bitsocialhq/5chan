import styles from './embed.module.css';
import {
  bitchuteHosts,
  getXTweetId,
  instagramHosts,
  odyseeHosts,
  redditHosts,
  soundcloudHosts,
  spotifyHosts,
  streamableHosts,
  tiktokHosts,
  twitchHosts,
  getYouTubeVideoId,
  xHosts,
  youtubeHosts,
} from './embed-utils';

interface EmbedProps {
  url: string;
}

const Embed = ({ url }: EmbedProps) => {
  const parsedUrl = new URL(url);

  if (youtubeHosts.has(parsedUrl.host) || (parsedUrl.host.startsWith('yt.') && parsedUrl.searchParams.has('v'))) {
    return <YoutubeEmbed parsedUrl={parsedUrl} />;
  }
  if (xHosts.has(parsedUrl.host)) {
    return <XEmbed parsedUrl={parsedUrl} />;
  }
  if (redditHosts.has(parsedUrl.host)) {
    return <RedditEmbed parsedUrl={parsedUrl} />;
  }
  if (twitchHosts.has(parsedUrl.host)) {
    return <TwitchEmbed parsedUrl={parsedUrl} />;
  }
  if (tiktokHosts.has(parsedUrl.host)) {
    return <TiktokEmbed parsedUrl={parsedUrl} />;
  }
  if (instagramHosts.has(parsedUrl.host)) {
    return <InstagramEmbed parsedUrl={parsedUrl} />;
  }
  if (odyseeHosts.has(parsedUrl.host)) {
    return <OdyseeEmbed parsedUrl={parsedUrl} />;
  }
  if (bitchuteHosts.has(parsedUrl.host)) {
    return <BitchuteEmbed parsedUrl={parsedUrl} />;
  }
  if (streamableHosts.has(parsedUrl.host)) {
    return <StreamableEmbed parsedUrl={parsedUrl} />;
  }
  if (spotifyHosts.has(parsedUrl.host)) {
    return <SpotifyEmbed parsedUrl={parsedUrl} />;
  }
  if (soundcloudHosts.has(parsedUrl.host)) {
    return <SoundcloudEmbed parsedUrl={parsedUrl} />;
  }
};

interface EmbedComponentProps {
  parsedUrl: URL;
}

const srcDocSandbox = 'allow-scripts allow-popups allow-popups-to-escape-sandbox';
const remoteEmbedSandbox = `${srcDocSandbox} allow-forms allow-presentation allow-same-origin`;

const YoutubeEmbed = ({ parsedUrl }: EmbedComponentProps) => {
  let embedSrc = '';

  if (parsedUrl.searchParams.has('list') && !getYouTubeVideoId(parsedUrl)) {
    const playlistId = parsedUrl.searchParams.get('list');
    embedSrc = `https://www.youtube.com/embed/videoseries?list=${playlistId}`;
  } else {
    const videoId = getYouTubeVideoId(parsedUrl);
    if (videoId) {
      embedSrc = `https://www.youtube.com/embed/${videoId}`;
    }
  }
  if (embedSrc) {
    return (
      <iframe
        className={styles.videoEmbed}
        height='100%'
        width='100%'
        referrerPolicy='origin'
        allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
        allowFullScreen
        sandbox={remoteEmbedSandbox}
        title={parsedUrl.href}
        src={embedSrc}
      />
    );
  }
  return null;
};

const XEmbed = ({ parsedUrl }: EmbedComponentProps) => {
  const tweetId = getXTweetId(parsedUrl);
  if (!tweetId) {
    return null;
  }

  const searchParams = new URLSearchParams({
    id: tweetId,
    theme: 'dark',
    dnt: 'false',
    hideThread: 'false',
    hideCard: 'false',
    lang: 'en',
  });

  return (
    <iframe
      className={styles.xEmbed}
      height='100%'
      width='100%'
      referrerPolicy='no-referrer'
      allow='accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share'
      sandbox={`${srcDocSandbox} allow-same-origin`}
      title={parsedUrl.href}
      src={`https://platform.twitter.com/embed/Tweet.html?${searchParams.toString()}`}
    />
  );
};

const RedditEmbed = ({ parsedUrl }: EmbedComponentProps) => {
  return (
    <iframe
      className={styles.redditEmbed}
      height='100%'
      width='100%'
      referrerPolicy='no-referrer'
      allow='accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share'
      sandbox={srcDocSandbox}
      title={parsedUrl.href}
      srcDoc={`
      <style>
        /* fix reddit iframe being centered */
        iframe {
          margin: 0!important;
        }
      </style>
      <blockquote class="reddit-embed-bq" style="height:240px" data-embed-theme="dark">
        <a href="${parsedUrl.href}"></a>    
      </blockquote>
      <script async src="https://embed.reddit.com/widgets.js" charset="UTF-8"></script>
    `}
    />
  );
};

const TwitchEmbed = ({ parsedUrl }: EmbedComponentProps) => {
  let iframeUrl;
  if (parsedUrl.pathname.startsWith('/videos/')) {
    const videoId = parsedUrl.pathname.replace('/videos/', '');
    iframeUrl = `https://player.twitch.tv/?video=${videoId}&parent=${window.location.hostname}`;
  } else {
    const channel = parsedUrl.pathname.replaceAll('/', '');
    iframeUrl = `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}`;
  }
  return (
    <iframe
      className={styles.videoEmbed}
      height='100%'
      width='100%'
      referrerPolicy='no-referrer'
      allow='accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share'
      allowFullScreen
      sandbox={remoteEmbedSandbox}
      title={parsedUrl.href}
      src={iframeUrl}
    />
  );
};

const TiktokEmbed = ({ parsedUrl }: EmbedComponentProps) => {
  const videoId = parsedUrl.pathname.replace(/.+\/video\//, '').replaceAll('/', '');
  return (
    <iframe
      className={styles.tiktokEmbed}
      height='100%'
      width='100%'
      referrerPolicy='no-referrer'
      allow='accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share'
      sandbox={srcDocSandbox}
      title={parsedUrl.href}
      srcDoc={`
      <blockquote class="tiktok-embed" data-video-id="${videoId}">
        <a></a>
      </blockquote> 
      <script async src="https://www.tiktok.com/embed.js"></script>
    `}
    />
  );
};

const InstagramEmbed = ({ parsedUrl }: EmbedComponentProps) => {
  const pathNames = parsedUrl.pathname.replace(/\/+$/, '').split('/');
  const id = pathNames[pathNames.length - 1];
  return (
    <iframe
      className={styles.instagramEmbed}
      height='100%'
      width='100%'
      referrerPolicy='no-referrer'
      allow='accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share'
      title={parsedUrl.href}
      srcDoc={`
      <blockquote class="instagram-media">
        <a href="https://www.instagram.com/p/${id}/"></a>
      </blockquote>
      <script async src="https://www.instagram.com/embed.js"></script>
    `}
      sandbox={srcDocSandbox}
    />
  );
};

const OdyseeEmbed = ({ parsedUrl }: EmbedComponentProps) => {
  const iframeUrl = `https://odysee.com/$/embed${parsedUrl.pathname}`;
  return (
    <iframe
      className={styles.videoEmbed}
      height='100%'
      width='100%'
      referrerPolicy='no-referrer'
      allow='accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share'
      allowFullScreen
      sandbox={remoteEmbedSandbox}
      title={parsedUrl.href}
      src={iframeUrl}
    />
  );
};

const BitchuteEmbed = ({ parsedUrl }: EmbedComponentProps) => {
  const videoId = parsedUrl.pathname.replace(/\/video\//, '').replaceAll('/', '');
  return (
    <iframe
      className={styles.videoEmbed}
      height='100%'
      width='100%'
      referrerPolicy='no-referrer'
      allow='accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share'
      allowFullScreen
      sandbox={remoteEmbedSandbox}
      title={parsedUrl.href}
      src={`https://www.bitchute.com/embed/${videoId}/`}
    />
  );
};

const StreamableEmbed = ({ parsedUrl }: EmbedComponentProps) => {
  const videoId = parsedUrl.pathname.replaceAll('/', '');
  return (
    <iframe
      className={styles.videoEmbed}
      height='100%'
      width='100%'
      referrerPolicy='no-referrer'
      allow='accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share'
      allowFullScreen
      sandbox={remoteEmbedSandbox}
      title={parsedUrl.href}
      src={`https://streamable.com/e/${videoId}`}
    />
  );
};

const SpotifyEmbed = ({ parsedUrl }: EmbedComponentProps) => {
  const iframeUrl = `https://open.spotify.com/embed${parsedUrl.pathname}?theme=0`;
  return (
    <iframe
      className={styles.audioEmbed}
      height='100%'
      width='100%'
      referrerPolicy='no-referrer'
      allow='accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share'
      allowFullScreen
      sandbox={remoteEmbedSandbox}
      title={parsedUrl.href}
      src={iframeUrl}
    />
  );
};

// not officially documented https://stackoverflow.com/questions/20870270/how-to-get-soundcloud-embed-code-by-soundcloud-com-url
const SoundcloudEmbed = ({ parsedUrl }: EmbedComponentProps) => {
  return (
    <iframe
      className={styles.soundcloudEmbed}
      height='100%'
      width='100%'
      referrerPolicy='no-referrer'
      allow='accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share'
      allowFullScreen
      sandbox={remoteEmbedSandbox}
      title={parsedUrl.href}
      src={`https://w.soundcloud.com/player/?url=${parsedUrl.href}`}
    />
  );
};

export default Embed;
