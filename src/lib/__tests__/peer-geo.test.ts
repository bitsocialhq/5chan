import { describe, expect, it, vi } from 'vitest';
import { COUNTRY_CENTROIDS } from '../../data/country-centroids';
import {
  extractIpFromAddress,
  extractIpv4FromAddress,
  extractIpv6FromAddress,
  fetchOwnIpCountryCode,
  fetchOwnPublicEndpoint,
  fetchPeerMapLocation,
  getApproximateCountryCode,
  getApproximateLatLon,
  getCountryConsistentLocation,
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

  it('extracts an IPv6 embedded with dashes in a DNS hostname', () => {
    const address = '/dns6/2a11-6100-0-5e9f--0.k51qzi5uqu5djg5pdoi9a98.example/tcp/443/wss/p2p/12D3KooWExample';

    expect(extractIpv6FromAddress(address)).toBe('2a11:6100:0:5e9f::0');
    expect(extractIpFromAddress(address)).toBe('2a11:6100:0:5e9f::0');
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

describe('getCountryConsistentLocation', () => {
  it('falls back to the selected country centroid when GeoIP databases disagree', () => {
    expect(
      getCountryConsistentLocation('VN', {
        countryCode: 'ca',
        label: 'Toronto, Ontario, CA',
        lat: 43.6532,
        lon: -79.3832,
        source: 'geoip',
      }),
    ).toEqual({
      ...COUNTRY_CENTROIDS.vn,
      countryCode: 'vn',
      label: 'VN',
      source: 'coarse',
    });
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
  it('prefers and caches the fetched IPv4 public endpoint', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const requestUrl = String(url);
      if (requestUrl === 'https://api.ipify.org?format=json') {
        return {
          ok: true,
          json: async () => ({ ip: '104.28.68.171' }),
        };
      }
      if (requestUrl === 'https://api.country.is/104.28.68.171') {
        return {
          ok: true,
          json: async () => ({ country: 'VN', ip: '104.28.68.171' }),
        };
      }
      if (requestUrl === 'https://free.freeipapi.com/api/json/104.28.68.171') {
        return {
          ok: true,
          json: async () => ({
            cityName: 'Toronto',
            countryCode: 'CA',
            latitude: 43.6532,
            longitude: -79.3832,
            regionName: 'Ontario',
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({ country: 'US', ip: '2001:4860:4860::8888' }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchOwnPublicEndpoint()).resolves.toMatchObject({
      countryCode: 'vn',
      ip: '104.28.68.171',
      location: {
        countryCode: 'vn',
        label: 'VN',
        source: 'coarse',
      },
    });
    await expect(fetchOwnPublicEndpoint()).resolves.toMatchObject({ countryCode: 'vn', ip: '104.28.68.171' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).not.toHaveBeenCalledWith('https://api.country.is', expect.anything());

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

  it('does not cache a result from an aborted lookup', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ country: 'VN', ip: '203.0.113.50' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const controller = new AbortController();
    controller.abort();
    // An aborted request is cancellation, not a real result, so it must not be cached.
    await fetchOwnIpCountryCode('203.0.113.50', controller.signal);
    // A later non-aborted call must perform a fresh lookup instead of a cached blank.
    await expect(fetchOwnIpCountryCode('203.0.113.50')).resolves.toBe('vn');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    vi.unstubAllGlobals();
  });
});

describe('fetchPeerMapLocation', () => {
  it('resolves and caches a city-level peer location', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        cityName: 'Haarlem',
        countryCode: 'NL',
        ipAddress: '91.234.199.189',
        latitude: 52.3874,
        longitude: 4.64622,
        regionName: 'North Holland',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchPeerMapLocation('/ip4/91.234.199.189/tcp/4001')).resolves.toMatchObject({
      countryCode: 'nl',
      label: 'Haarlem, North Holland, NL',
      lat: 52.3874,
      lon: 4.64622,
      source: 'geoip',
    });
    await expect(fetchPeerMapLocation('/ip4/91.234.199.189/tcp/4001')).resolves.toMatchObject({
      lat: 52.3874,
      lon: 4.64622,
      source: 'geoip',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://free.freeipapi.com/api/json/91.234.199.189');

    vi.unstubAllGlobals();
  });

  it('falls back to the offline country estimate when lookup fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal('fetch', fetchMock);

    const location = await fetchPeerMapLocation(addr('80.80.80.80'));
    const centroid = COUNTRY_CENTROIDS[location!.countryCode!];

    expect(location).toMatchObject({ source: 'coarse' });
    expect(centroid).toBeDefined();
    expect(Math.abs(location!.lat - centroid.lat)).toBeLessThanOrEqual(1);
    expect(Math.abs(location!.lon - centroid.lon)).toBeLessThanOrEqual(1.3);

    vi.unstubAllGlobals();
  });

  it('does not call GeoIP for private peer addresses', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchPeerMapLocation('/ip4/10.0.0.1/tcp/4001')).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('resolves a peer location from a DNS6 hostname with an embedded IPv6', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        cityName: 'Reykjavik',
        countryCode: 'IS',
        ipAddress: '2a11:6100:0:5e9f::0',
        latitude: 64.1466,
        longitude: -21.9426,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchPeerMapLocation('/dns6/2a11-6100-0-5e9f--0.k51qzi5uqu5djg5pdoi9a98.example/tcp/443/wss')).resolves.toMatchObject({
      countryCode: 'is',
      label: 'Reykjavik, IS',
      lat: 64.1466,
      lon: -21.9426,
      source: 'geoip',
    });
    expect(fetchMock.mock.calls[0][0]).toBe('https://free.freeipapi.com/api/json/2a11%3A6100%3A0%3A5e9f%3A%3A0');

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
