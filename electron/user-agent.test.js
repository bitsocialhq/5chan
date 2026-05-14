import { describe, expect, it } from 'vitest';
import { createFakeUserAgent, getChromeUserAgentVersion } from './user-agent.js';

describe('Electron user agent', () => {
  it('uses the bundled Chromium major version for Linux iframe navigation', () => {
    const userAgent = createFakeUserAgent({
      platform: 'linux',
      chromeVersion: '142.0.7444.52',
    });

    expect(userAgent).toBe('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36');
    expect(userAgent).not.toContain('Chrome/116.0.0.0');
  });

  it('uses the same Chrome version for each desktop platform shell', () => {
    const chromeVersion = '142.0.7444.52';

    expect(createFakeUserAgent({ platform: 'win32', chromeVersion })).toContain('Chrome/142.0.0.0');
    expect(createFakeUserAgent({ platform: 'darwin', chromeVersion })).toContain('Chrome/142.0.0.0');
    expect(createFakeUserAgent({ platform: 'linux', chromeVersion })).toContain('Chrome/142.0.0.0');
  });

  it('falls back to the previous hardcoded version when Chromium version is unavailable', () => {
    expect(getChromeUserAgentVersion(undefined)).toBe('116.0.0.0');
    expect(getChromeUserAgentVersion('not-a-version')).toBe('116.0.0.0');
  });
});
