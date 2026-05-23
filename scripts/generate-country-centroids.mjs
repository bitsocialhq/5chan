// Generates src/data/country-centroids.ts: ISO 3166-1 alpha-2 -> approximate
// country centroid, used to place P2P peer markers at the center of the country
// already shown as the peer's flag. Run with `yarn centroids:generate`.
//
// Peer country itself is derived offline (see lib/peer-geo getApproximateCountryCode)
// so no peer IP is ever sent to a geolocation API; this only supplies the static
// "where is country X" centroids the markers snap to.

import { writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const OUTPUT_PATH = resolve(REPO_ROOT, 'src/data/country-centroids.ts');

// Public-domain ISO country centroids (country,latitude,longitude,name).
// Override with COUNTRY_CENTROIDS_CSV_URL.
const CSV_URL =
  process.env.COUNTRY_CENTROIDS_CSV_URL ?? 'https://raw.githubusercontent.com/google/dspl/master/samples/google/canonical/countries.csv';

const log = (message) => process.stdout.write(`[generate-country-centroids] ${message}\n`);

const fetchCsv = async (url) => {
  log(`fetching ${url}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`failed to fetch centroid CSV: ${response.status} ${response.statusText}`);
  return response.text();
};

const round = (value) => Math.round(value * 100) / 100;

const parseCentroids = (csv) => {
  const centroids = {};
  for (const line of csv.trim().split('\n').slice(1)) {
    // Only the first three columns are needed; the trailing name may contain commas.
    const [code, lat, lon] = line.split(',');
    const iso = code?.trim().toLowerCase();
    const latNum = Number(lat);
    const lonNum = Number(lon);
    if (!/^[a-z]{2}$/.test(iso ?? '') || !Number.isFinite(latNum) || !Number.isFinite(lonNum)) continue;
    centroids[iso] = { lat: round(latNum), lon: round(lonNum) };
  }
  return centroids;
};

const renderModule = (centroids) => {
  const entries = Object.keys(centroids)
    .sort()
    .map((iso) => `  ${iso}: { lat: ${centroids[iso].lat}, lon: ${centroids[iso].lon} },`)
    .join('\n');
  return `// GENERATED FILE — do not edit by hand.
// Source: Google DSPL canonical countries.csv (public domain), via
// scripts/generate-country-centroids.mjs. Run \`yarn centroids:generate\` to refresh.
//
// ISO 3166-1 alpha-2 (lowercase) -> approximate country centroid, used to place
// P2P peer markers at the center of the country shown as the peer's flag.
export const COUNTRY_CENTROIDS: Record<string, { lat: number; lon: number }> = {
${entries}
};
`;
};

const main = async () => {
  const csv = await fetchCsv(CSV_URL);
  const centroids = parseCentroids(csv);
  writeFileSync(OUTPUT_PATH, renderModule(centroids));
  log(`wrote ${relative(REPO_ROOT, OUTPUT_PATH)} (${Object.keys(centroids).length} countries)`);
};

main().catch((error) => {
  process.stderr.write(`[generate-country-centroids] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
