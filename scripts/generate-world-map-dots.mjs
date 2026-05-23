// Generates src/data/world-map-dots.ts: a compact dotted-world-map backdrop for
// the P2P stats panel, rasterized from Natural Earth 1:110m land polygons
// (public domain). Run with `yarn map:generate`.
//
// The map is decorative ("approximate locations"), so we only need a recognizable
// land/sea mask. We rasterize the real land polygons onto a regular lon/lat grid
// and pack the result into a 1-bit-per-cell bitmap (base64). At runtime the panel
// expands set bits into square dots using the same equirectangular projection the
// peer markers use, so dots and markers stay aligned without shipping a geo lib.

import { Buffer } from 'node:buffer';
import { writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const OUTPUT_PATH = resolve(REPO_ROOT, 'src/data/world-map-dots.ts');

// Natural Earth 1:110m land (public domain). Override with WORLD_MAP_GEOJSON_URL.
const GEOJSON_URL =
  process.env.WORLD_MAP_GEOJSON_URL ??
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson';

// Equirectangular grid. STEP is the cell size in degrees; smaller = finer/more
// dots. The latitude band excludes Antarctica and trims the very top of the map.
const STEP = 2;
const LON_MIN = -180;
const LAT_MAX = 84;
const LAT_MIN = -56;
const COLS = Math.round((180 - LON_MIN) / STEP);
const ROWS = Math.round((LAT_MAX - LAT_MIN) / STEP);

const log = (message) => process.stdout.write(`[generate-world-map-dots] ${message}\n`);

const fetchGeoJson = async (url) => {
  log(`fetching ${url}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`failed to fetch land GeoJSON: ${response.status} ${response.statusText}`);
  return response.json();
};

// Flatten Polygon/MultiPolygon features into rings plus a bounding box for a fast
// reject before the per-edge ray cast.
const collectPolygons = (geojson) => {
  const polygons = [];
  for (const feature of geojson.features ?? []) {
    const geometry = feature.geometry;
    if (!geometry) continue;
    const coordinateSets =
      geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
    for (const rings of coordinateSets) {
      let minLon = Infinity;
      let minLat = Infinity;
      let maxLon = -Infinity;
      let maxLat = -Infinity;
      for (const ring of rings) {
        for (const [lon, lat] of ring) {
          if (lon < minLon) minLon = lon;
          if (lon > maxLon) maxLon = lon;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        }
      }
      polygons.push({ bbox: [minLon, minLat, maxLon, maxLat], rings });
    }
  }
  return polygons;
};

// Even-odd ray casting across every ring of a polygon, so interior holes (lakes)
// correctly read as sea. Natural Earth cuts geometry at the antimeridian, so no
// polygon wraps past +/-180 and a plain lon-space ray cast is sound.
const isInsidePolygon = (lon, lat, rings) => {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0];
      const yi = ring[i][1];
      const xj = ring[j][0];
      const yj = ring[j][1];
      if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
};

const isLand = (lon, lat, polygons) => {
  for (const { bbox, rings } of polygons) {
    if (lon < bbox[0] || lon > bbox[2] || lat < bbox[1] || lat > bbox[3]) continue;
    if (isInsidePolygon(lon, lat, rings)) return true;
  }
  return false;
};

const rasterize = (polygons) => {
  const bits = new Uint8Array(Math.ceil((COLS * ROWS) / 8));
  let landCount = 0;
  for (let row = 0; row < ROWS; row++) {
    const lat = LAT_MAX - (row + 0.5) * STEP;
    for (let col = 0; col < COLS; col++) {
      const lon = LON_MIN + (col + 0.5) * STEP;
      if (isLand(lon, lat, polygons)) {
        const index = row * COLS + col;
        bits[index >> 3] |= 1 << (7 - (index & 7));
        landCount++;
      }
    }
  }
  return { bits, landCount };
};

const renderModule = (base64) =>
  `// GENERATED FILE — do not edit by hand.
// Source: Natural Earth 1:110m land (public domain), rasterized by
// scripts/generate-world-map-dots.mjs. Run \`yarn map:generate\` to refresh.
//
// Row-major land/sea grid for the P2P stats world map. \`bitmap\` is a base64
// 1-bit-per-cell mask (MSB first, 1 = land). Cell (col,row) centers on
// lon = lonMin + (col + 0.5) * step, lat = latMax - (row + 0.5) * step.
export const WORLD_MAP_DOTS = {
  step: ${STEP},
  lonMin: ${LON_MIN},
  latMax: ${LAT_MAX},
  cols: ${COLS},
  rows: ${ROWS},
  bitmap: '${base64}',
} as const;
`;

const main = async () => {
  const geojson = await fetchGeoJson(GEOJSON_URL);
  const polygons = collectPolygons(geojson);
  log(`rasterizing ${polygons.length} land polygons onto a ${COLS}x${ROWS} grid (step ${STEP}°)`);
  const { bits, landCount } = rasterize(polygons);
  const base64 = Buffer.from(bits).toString('base64');
  writeFileSync(OUTPUT_PATH, renderModule(base64));
  log(`wrote ${relative(REPO_ROOT, OUTPUT_PATH)} (${landCount} land cells, ${base64.length} base64 chars)`);
};

main().catch((error) => {
  process.stderr.write(`[generate-world-map-dots] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
