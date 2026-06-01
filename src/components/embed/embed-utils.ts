const STANDARD_YOUTUBE_HOSTS = new Set<string>(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'www.youtu.be']);

export const youtubeHosts = new Set<string>([
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'www.youtu.be',
  'm.youtube.com',
  'music.youtube.com',
  // working Invidious instances - https://docs.invidious.io/instances/ - https://uptime.invidious.io/
  'yewtu.be',
  'inv.nadeko.net',
  'yt.artemislena.eu',
  'invidious.nerdvpn.de',
]);

export const xHosts = new Set<string>(['twitter.com', 'www.twitter.com', 'x.com', 'www.x.com']);

export const getXTweetId = (parsedUrl: URL): string | undefined => {
  const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
  const statusIndex = pathParts.findIndex((part) => part === 'status' || part === 'statuses');
  const statusId = statusIndex === -1 ? undefined : pathParts[statusIndex + 1];

  return statusId && /^\d+$/.test(statusId) ? statusId : undefined;
};

export const redditHosts = new Set<string>(['reddit.com', 'www.reddit.com', 'old.reddit.com']);
export const twitchHosts = new Set<string>(['twitch.tv', 'www.twitch.tv']);
export const tiktokHosts = new Set<string>(['tiktok.com', 'www.tiktok.com']);
export const instagramHosts = new Set<string>(['instagram.com', 'www.instagram.com']);
export const odyseeHosts = new Set<string>(['odysee.com', 'www.odysee.com']);
export const bitchuteHosts = new Set<string>(['bitchute.com', 'www.bitchute.com']);
export const streamableHosts = new Set<string>(['streamable.com', 'www.streamable.com']);
export const spotifyHosts = new Set<string>(['spotify.com', 'www.spotify.com', 'open.spotify.com']);
export const soundcloudHosts = new Set<string>(['soundcloud.com', 'www.soundcloud.com', 'on.soundcloud.com', 'api.soundcloud.com', 'w.soundcloud.com']);

const canEmbedHosts = new Set<string>([
  ...youtubeHosts,
  ...xHosts,
  ...redditHosts,
  ...twitchHosts,
  ...tiktokHosts,
  ...instagramHosts,
  ...odyseeHosts,
  ...bitchuteHosts,
  ...soundcloudHosts,
  ...streamableHosts,
  ...spotifyHosts,
]);

export const getYouTubeVideoId = (parsedUrl: URL): string | null => {
  if (parsedUrl.searchParams.has('list') && !parsedUrl.searchParams.get('v') && !parsedUrl.host.includes('youtu.be') && !parsedUrl.pathname.includes('/shorts/')) {
    return null;
  }

  const videoIdFromQuery = parsedUrl.searchParams.get('v');
  if (videoIdFromQuery) {
    return videoIdFromQuery;
  }

  if (parsedUrl.host.includes('youtu.be')) {
    return parsedUrl.pathname.slice(1).split('/')[0] || null;
  }

  if (parsedUrl.pathname.includes('/shorts/')) {
    return parsedUrl.pathname.split('/shorts/')[1]?.split('/')[0] || null;
  }

  const isInvidious = !STANDARD_YOUTUBE_HOSTS.has(parsedUrl.host) && (youtubeHosts.has(parsedUrl.host) || parsedUrl.host.startsWith('yt.'));
  if (isInvidious) {
    if (parsedUrl.pathname.startsWith('/watch')) {
      return parsedUrl.searchParams.get('v');
    }
    return parsedUrl.pathname.split('/').filter(Boolean).pop() || null;
  }

  return null;
};

export const canEmbed = (parsedUrl: URL): boolean => {
  if (xHosts.has(parsedUrl.host)) {
    return Boolean(getXTweetId(parsedUrl));
  }

  if (redditHosts.has(parsedUrl.host)) {
    // Reddit posts are not embeddable if the URL does not include '/comments/'
    return parsedUrl.pathname.includes('/comments/');
  }

  return canEmbedHosts.has(parsedUrl.host) || (parsedUrl.host.startsWith('yt.') && parsedUrl.searchParams.has('v'));
};
