const DEFAULT_CHROME_VERSION = '116.0.0.0';

export const getChromeUserAgentVersion = (chromeVersion = process.versions.chrome) => {
  if (typeof chromeVersion !== 'string') {
    return DEFAULT_CHROME_VERSION;
  }

  const majorVersion = chromeVersion.trim().split('.')[0];
  if (!/^\d+$/.test(majorVersion)) {
    return DEFAULT_CHROME_VERSION;
  }

  return `${majorVersion}.0.0.0`;
};

export const createFakeUserAgent = ({ platform = process.platform, chromeVersion = process.versions.chrome } = {}) => {
  const chromeUserAgentVersion = getChromeUserAgentVersion(chromeVersion);
  const browserSuffix = `AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeUserAgentVersion} Safari/537.36`;

  if (platform === 'darwin') {
    return `Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_1) ${browserSuffix}`;
  }

  if (platform === 'linux') {
    return `Mozilla/5.0 (X11; Linux x86_64) ${browserSuffix}`;
  }

  return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) ${browserSuffix}`;
};
