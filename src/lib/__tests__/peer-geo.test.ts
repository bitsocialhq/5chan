import { describe, expect, it } from 'vitest';
import { extractIpv4FromAddress, getApproximateCountryCode, getApproximateLatLon, isPrivateOrReservedIpv4 } from '../peer-geo';

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

  it('places addresses in the expected continental region', () => {
    const na = getApproximateLatLon(addr('8.8.8.8'));
    expect(na?.lon).toBeLessThan(-80); // North America
    expect(na?.lat).toBeGreaterThan(30);

    const eu = getApproximateLatLon(addr('80.80.80.80'));
    expect(eu?.lon).toBeGreaterThan(0);
    expect(eu?.lon).toBeLessThan(30);
    expect(eu?.lat).toBeGreaterThan(40);

    const as = getApproximateLatLon(addr('1.1.1.1'));
    expect(as?.lon).toBeGreaterThan(90);

    const af = getApproximateLatLon(addr('41.0.0.1'));
    expect(af?.lon).toBeGreaterThan(8);
    expect(af?.lon).toBeLessThan(34);
    expect(af?.lat).toBeLessThan(12);

    const sa = getApproximateLatLon(addr('200.0.0.1'));
    expect(sa?.lon).toBeLessThan(-45);
    expect(sa?.lat).toBeLessThan(-5);
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
