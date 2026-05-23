// Offline, approximate peer geolocation for the P2P stats world map.
//
// This intentionally avoids any external geolocation API: 5chan is serverless and
// privacy-focused, so we must not leak the set of peers a user is connected to.
// Instead we map an IPv4 address to its Regional Internet Registry (RIR) region at
// continent resolution, using the coarse IANA /8 allocation table below. Positions
// are therefore approximate ("roughly which continent"), not precise coordinates.

export type LatLon = { lat: number; lon: number };

type Region = 'AF' | 'AS' | 'EU' | 'NA' | 'SA';

const REGION_CENTROIDS: Record<Region, LatLon> = {
  AF: { lat: 4, lon: 21 },
  AS: { lat: 30, lon: 105 },
  EU: { lat: 50, lon: 15 },
  NA: { lat: 39, lon: -97 },
  SA: { lat: -15, lon: -58 },
};

// Approximate first-octet (/8) -> RIR region, applied in order (later wins).
// Coarse and not authoritative; uncovered octets fall back to NA (ARIN-heavy
// legacy space). Good enough for a continent-level dot on a map.
const REGION_RANGES: [number, number, Region][] = [
  // APNIC (Asia / Pacific)
  [1, 1, 'AS'],
  [14, 14, 'AS'],
  [27, 27, 'AS'],
  [36, 36, 'AS'],
  [39, 39, 'AS'],
  [42, 43, 'AS'],
  [49, 49, 'AS'],
  [58, 61, 'AS'],
  [101, 103, 'AS'],
  [106, 106, 'AS'],
  [110, 126, 'AS'],
  [133, 133, 'AS'],
  [150, 153, 'AS'],
  [163, 163, 'AS'],
  [171, 171, 'AS'],
  [175, 175, 'AS'],
  [180, 183, 'AS'],
  [202, 203, 'AS'],
  [210, 211, 'AS'],
  [218, 223, 'AS'],
  // RIPE NCC (Europe / Middle East)
  [2, 2, 'EU'],
  [5, 5, 'EU'],
  [25, 25, 'EU'],
  [31, 31, 'EU'],
  [37, 37, 'EU'],
  [46, 46, 'EU'],
  [51, 51, 'EU'],
  [53, 53, 'EU'],
  [57, 57, 'EU'],
  [62, 62, 'EU'],
  [77, 95, 'EU'],
  [109, 109, 'EU'],
  [141, 141, 'EU'],
  [145, 145, 'EU'],
  [151, 151, 'EU'],
  [176, 176, 'EU'],
  [178, 178, 'EU'],
  [185, 185, 'EU'],
  [188, 188, 'EU'],
  [193, 195, 'EU'],
  [212, 213, 'EU'],
  [217, 217, 'EU'],
  // AFRINIC (Africa)
  [41, 41, 'AF'],
  [102, 102, 'AF'],
  [105, 105, 'AF'],
  [154, 156, 'AF'],
  [196, 197, 'AF'],
  // LACNIC (Latin America / Caribbean)
  [177, 177, 'SA'],
  [179, 179, 'SA'],
  [181, 181, 'SA'],
  [186, 187, 'SA'],
  [189, 191, 'SA'],
  [200, 201, 'SA'],
];

const REGION_BY_OCTET: Region[] = (() => {
  const table: Region[] = Array.from({ length: 256 }, () => 'NA' as Region);
  for (const [start, end, region] of REGION_RANGES) {
    for (let octet = start; octet <= end; octet++) table[octet] = region;
  }
  return table;
})();

export const extractIpv4FromAddress = (address: string): string | null => {
  const direct = /\/ip4\/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/.exec(address);
  if (direct) return direct[1];
  // Some peers are reached via a DNS name that embeds the IPv4 with dashes, e.g.
  // /dns4/91-234-56-78.host.example -> 91.234.56.78
  const dashed = /\/dns[46]?\/[^/]*?(?<!\d)(\d{1,3})-(\d{1,3})-(\d{1,3})-(\d{1,3})(?![\d-])/.exec(address);
  if (dashed) return `${dashed[1]}.${dashed[2]}.${dashed[3]}.${dashed[4]}`;
  return null;
};

const parseOctets = (ip: string): number[] | null => {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return parts;
};

export const isPrivateOrReservedIpv4 = (ip: string): boolean => {
  const parts = parseOctets(ip);
  if (!parts) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true; // this-network, private, loopback
  if (a === 169 && b === 254) return true; // link-local
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast / reserved
  return false;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const hashOctets = (parts: number[]) => {
  let hash = 0;
  for (const part of parts) hash = (Math.imul(hash, 131) + part) | 0;
  return Math.abs(hash);
};

// Maps a peer's multiaddr to an approximate lat/lon, or null when it cannot be
// placed offline (private/reserved IPv4, IPv6, or a DNS address).
export const getApproximateLatLon = (address: string): LatLon | null => {
  const ip = extractIpv4FromAddress(address);
  if (!ip || isPrivateOrReservedIpv4(ip)) return null;
  const parts = parseOctets(ip);
  if (!parts) return null;

  const centroid = REGION_CENTROIDS[REGION_BY_OCTET[parts[0]]];
  const hash = hashOctets(parts);
  // Deterministic intra-region spread so peers don't stack on one point. The
  // region is the meaningful signal; the offset is cosmetic.
  const lonOffset = ((hash % 1000) / 1000 - 0.5) * 24; // +/- 12 deg
  const latOffset = ((Math.floor(hash / 1000) % 1000) / 1000 - 0.5) * 14; // +/- 7 deg
  return { lat: clamp(centroid.lat + latOffset, -85, 85), lon: clamp(centroid.lon + lonOffset, -180, 180) };
};

// Representative countries per region. The RIR table only resolves to a continent,
// so the flag is a deterministic, approximate pick from the region's common
// countries — consistent with the map's "approximate locations" framing, not real
// per-peer country geolocation.
const REGION_COUNTRIES: Record<Region, string[]> = {
  AF: ['za', 'ng', 'eg', 'ke', 'ma', 'dz', 'tn'],
  AS: ['jp', 'cn', 'sg', 'in', 'kr', 'hk', 'id', 'vn', 'th', 'tw'],
  EU: ['de', 'nl', 'fr', 'gb', 'ru', 'se', 'fi', 'pl', 'it', 'es', 'ua', 'ro'],
  NA: ['us', 'us', 'ca', 'us', 'mx'],
  SA: ['br', 'ar', 'cl', 'co', 'pe'],
};

// Approximate 2-letter country code for a peer, or undefined when it cannot be
// placed offline. See REGION_COUNTRIES: this is region-level, not precise.
export const getApproximateCountryCode = (address: string): string | undefined => {
  const ip = extractIpv4FromAddress(address);
  if (!ip || isPrivateOrReservedIpv4(ip)) return undefined;
  const parts = parseOctets(ip);
  if (!parts) return undefined;
  const pool = REGION_COUNTRIES[REGION_BY_OCTET[parts[0]]];
  return pool[hashOctets(parts) % pool.length];
};
