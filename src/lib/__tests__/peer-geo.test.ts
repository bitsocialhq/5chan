import { describe, expect, it, vi } from 'vitest';
import { COUNTRY_CENTROIDS } from '../../data/country-centroids';
import {
  extractIpFromAddress,
  extractIpv4FromAddress,
  extractIpv6FromAddress,
  fetchOwnIpCountryCode,
  fetchOwnPublicEndpoint,
  getApproximateCountryCode,
  getApproximateLatLon,
  getFirstPublicIpFromAddresses,
  isPrivateOrReservedIpv4,
} from '../peer-geo';

const addr = (ip: string) => `/ip4/${ip}/tcp/4001/ws/p2p/12D3KooWExample`;

describe('extractIpv4FromAddress', () => {
  it('extracts the IPv4 from a multiaddr', () => {
    expect(extractIpv4FromAddress('/ip4/147.75.84.175/tcp/4001/ws')).toBe('147.75.84.175');
  });

  it('returns null for IPv6 and plain DNS multiaddrs', () => {
    expect(extractIpv4FromAddress('/ip6/2606:4700::1111/tcp/4001')).toBeNull();
    expect(extractIpv4FromAddress('/dns4/relay.example.org/tcp/443/wss')).toBeNull();
  });

  it('extracts an IPv4 embedded with dashes in a DNS hostname', () => {
    expect(extractIpv4FromAddress('/dns4/91-234-56-78.host.example/tcp/443/wss')).toBe('91.234.56.78');
    expect(extractIpv4FromAddress('/dns4/ip-203-0-113-9.provider.net/tcp/443/wss')).toBe('203.0.113.9');
  });
});

describe('extractIpv6FromAddress', () => {
  it('extracts the IPv6 from a multiaddr', () => {
    expect(extractIpv6FromAddress('/ip6/2001:4860:4860::8888/tcp/4001/ws')).toBe('2001:4860:4860::8888');
    expect(extractIpFromAddress('/ip6/2001:4860:4860::8888/tcp/4001/ws')).toBe('2001:4860:4860::8888');
  });
});

describe('isPrivateOrReservedIpv4', () => {
  it('flags private and reserved ranges', () => {
    for (const ip of ['10.0.0.1', '172.16.5.4', '192.168.1.10', '127.0.0.1', '169.254.1.1', '100.64.0.1', '0.0.0.0', '239.255.0.1']) {
      expect(isPrivateOrReservedIpv4(ip)).toBe(true);
    }
  });

  it('treats public addresses as routable', () => {
    for (const ip of ['8.8.8.8', '147.75.84.175', '1.1.1.1', '80.80.80.80']) {
      expect(isPrivateOrReservedIpv4(ip)).toBe(false);
    }
  });
});

describe('getApproximateLatLon', () => {
  it('returns null when the peer cannot be placed offline', () => {
    expect(getApproximateLatLon('/ip4/192.168.1.5/tcp/4001')).toBeNull();
    expect(getApproximateLatLon('/dns4/relay.example.org/tcp/443/wss')).toBeNull();
    expect(getApproximateLatLon('/ip6/2606:4700::1111/tcp/4001')).toBeNull();
  });

  it('is deterministic for the same address', () => {
    expect(getApproximateLatLon(addr('8.8.8.8'))).toEqual(getApproximateLatLon(addr('8.8.8.8')));
  });

  it('snaps a peer to the centroid of its flag country', () => {
    for (const ip of ['8.8.8.8', '80.80.80.80', '1.1.1.1', '41.0.0.1', '200.0.0.1', '194.110.247.146', '91.234.199.189']) {
      const country = getApproximateCountryCode(addr(ip));
      expect(country).toBeDefined();
      const centroid = COUNTRY_CENTROIDS[country!];
      expect(centroid).toBeDefined();
      const loc = getApproximateLatLon(addr(ip))!;
      // Marker sits at the country centroid, within the small placement jitter.
      expect(Math.abs(loc.lat - centroid.lat)).toBeLessThanOrEqual(1);
      expect(Math.abs(loc.lon - centroid.lon)).toBeLessThanOrEqual(1.3);
    }
  });

  it('stays within valid coordinate bounds', () => {
    const loc = getApproximateLatLon(addr('203.0.113.7'));
    expect(loc).not.toBeNull();
    expect(loc!.lat).toBeGreaterThanOrEqual(-85);
    expect(loc!.lat).toBeLessThanOrEqual(85);
    expect(loc!.lon).toBeGreaterThanOrEqual(-180);
    expect(loc!.lon).toBeLessThanOrEqual(180);
  });
});

describe('getFirstPublicIpFromAddresses', () => {
  it('returns the first public IP from multiaddrs', () => {
    expect(getFirstPublicIpFromAddresses(['/ip4/127.0.0.1/tcp/4001', '/ip4/147.75.84.175/tcp/4001/ws'])).toBe('147.75.84.175');
    expect(getFirstPublicIpFromAddresses(['/ip4/127.0.0.1/tcp/4001', '/ip6/2001:4860:4860::8888/tcp/443'])).toBe('2001:4860:4860::8888');
  });

  it('returns undefined when only private addresses are present', () => {
    expect(getFirstPublicIpFromAddresses(['/ip4/127.0.0.1/tcp/4001', '/ip4/10.0.0.5/tcp/4001', '/ip6/fd00::1/tcp/4001'])).toBeUndefined();
  });
});

describe('fetchOwnPublicEndpoint', () => {
  it('caches the fetched public endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ country: 'US', ip: '2001:4860:4860::8888' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchOwnPublicEndpoint()).resolves.toEqual({ countryCode: 'us', ip: '2001:4860:4860::8888' });
    await expect(fetchOwnPublicEndpoint()).resolves.toEqual({ countryCode: 'us', ip: '2001:4860:4860::8888' });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });
});

describe('fetchOwnIpCountryCode', () => {
  it("resolves and caches the accurate country for the node's own ip", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ country: 'VN', ip: '172.225.56.8' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchOwnIpCountryCode('172.225.56.8')).resolves.toBe('vn');
    await expect(fetchOwnIpCountryCode('172.225.56.8')).resolves.toBe('vn');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.country.is/172.225.56.8');

    vi.unstubAllGlobals();
  });
});

describe('getApproximateCountryCode', () => {
  it('returns undefined when the peer cannot be placed offline', () => {
    expect(getApproximateCountryCode('/ip4/10.0.0.1/tcp/4001')).toBeUndefined();
    expect(getApproximateCountryCode('/dns4/relay.example.org/tcp/443/wss')).toBeUndefined();
    expect(getApproximateCountryCode('/ip6/2606:4700::1111/tcp/4001')).toBeUndefined();
  });

  it('is deterministic and returns a known 2-letter code for public peers', () => {
    const code = getApproximateCountryCode(addr('8.8.8.8'));
    expect(code).toBe(getApproximateCountryCode(addr('8.8.8.8')));
    expect(code).toMatch(/^[a-z]{2}$/);
  });

  it('derives a code from an IPv4 embedded in a DNS hostname', () => {
    expect(getApproximateCountryCode('/dns4/91-234-56-78.host.example/tcp/443/wss')).toMatch(/^[a-z]{2}$/);
  });
});
