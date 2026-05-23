import { getApproximateLatLon } from '../../../lib/peer-geo';
import styles from './p2p-stats-settings.module.css';

type MapPeer = {
  address: string;
  id: string;
  peerId: string;
};

// Rough continent outlines as [lon, lat] vertices. Deliberately coarse: they are
// only rasterized into a faint dotted backdrop, so approximate shapes are fine.
const CONTINENTS: [number, number][][] = [
  // North America
  [
    [-168, 65],
    [-156, 71],
    [-128, 70],
    [-110, 68],
    [-95, 69],
    [-81, 73],
    [-78, 67],
    [-64, 60],
    [-56, 52],
    [-66, 49],
    [-67, 44],
    [-70, 41],
    [-75, 35],
    [-81, 25],
    [-90, 29],
    [-97, 26],
    [-97, 21],
    [-105, 20],
    [-112, 24],
    [-117, 32],
    [-122, 37],
    [-125, 43],
    [-130, 51],
    [-141, 59],
    [-155, 58],
  ],
  // Greenland
  [
    [-45, 60],
    [-30, 60],
    [-18, 66],
    [-20, 73],
    [-25, 80],
    [-40, 83],
    [-58, 82],
    [-55, 76],
    [-50, 68],
  ],
  // South America
  [
    [-81, 8],
    [-72, 11],
    [-62, 10],
    [-50, 0],
    [-35, -6],
    [-39, -14],
    [-48, -25],
    [-58, -34],
    [-65, -41],
    [-69, -50],
    [-74, -53],
    [-72, -45],
    [-73, -37],
    [-71, -28],
    [-71, -18],
    [-78, -8],
    [-81, -4],
    [-80, 2],
  ],
  // Europe
  [
    [-10, 36],
    [-9, 44],
    [-2, 43],
    [-2, 49],
    [-5, 54],
    [-6, 58],
    [5, 61],
    [8, 58],
    [12, 59],
    [16, 66],
    [24, 71],
    [30, 70],
    [40, 67],
    [46, 60],
    [42, 52],
    [36, 46],
    [28, 45],
    [24, 40],
    [18, 40],
    [12, 38],
    [2, 42],
    [-4, 37],
  ],
  // Africa
  [
    [-17, 15],
    [-16, 21],
    [-10, 27],
    [-6, 32],
    [1, 37],
    [10, 37],
    [11, 33],
    [20, 32],
    [25, 32],
    [32, 31],
    [35, 24],
    [37, 18],
    [43, 12],
    [51, 12],
    [44, 5],
    [48, -3],
    [40, -15],
    [35, -21],
    [31, -26],
    [26, -34],
    [20, -35],
    [16, -29],
    [12, -17],
    [9, -1],
    [8, 4],
    [-4, 5],
    [-9, 5],
    [-13, 9],
  ],
  // Asia
  [
    [42, 48],
    [45, 55],
    [55, 62],
    [68, 68],
    [80, 73],
    [100, 77],
    [115, 74],
    [140, 73],
    [160, 70],
    [170, 66],
    [178, 65],
    [170, 60],
    [158, 53],
    [150, 46],
    [143, 44],
    [140, 50],
    [135, 44],
    [131, 43],
    [127, 37],
    [122, 40],
    [120, 34],
    [122, 30],
    [115, 22],
    [108, 21],
    [106, 11],
    [100, 14],
    [98, 8],
    [100, 2],
    [95, 7],
    [90, 22],
    [88, 22],
    [80, 13],
    [77, 8],
    [73, 17],
    [68, 24],
    [61, 25],
    [57, 37],
    [52, 41],
    [47, 43],
  ],
  // Australia
  [
    [113, -22],
    [121, -19],
    [129, -15],
    [136, -12],
    [142, -11],
    [145, -15],
    [147, -19],
    [153, -25],
    [153, -31],
    [150, -37],
    [143, -39],
    [138, -35],
    [131, -32],
    [123, -34],
    [115, -34],
    [114, -29],
  ],
  // Indonesia
  [
    [96, 5],
    [120, 7],
    [128, 8],
    [131, 1],
    [122, -4],
    [114, -8],
    [103, -8],
    [98, -1],
  ],
  // Japan
  [
    [130, 31],
    [136, 35],
    [141, 41],
    [142, 45],
    [140, 38],
    [135, 34],
    [131, 31],
  ],
];

const pointInPolygon = (lon: number, lat: number, polygon: [number, number][]) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

// Equirectangular projection into the SVG viewBox below: x = lon + 180, y = 90 - lat.
const LAND_STEP = 3.5;
const LAND_DOTS: { x: number; y: number }[] = (() => {
  const dots: { x: number; y: number }[] = [];
  for (let lat = 80; lat >= -56; lat -= LAND_STEP) {
    for (let lon = -178; lon <= 180; lon += LAND_STEP) {
      if (CONTINENTS.some((continent) => pointInPolygon(lon, lat, continent))) dots.push({ x: lon + 180, y: 90 - lat });
    }
  }
  return dots;
})();

const PeerWorldMap = ({ peers }: { peers: MapPeer[] }) => {
  const plotted: { id: string; peerId: string; x: number; y: number }[] = [];
  for (const peer of peers) {
    const location = getApproximateLatLon(peer.address);
    if (location) plotted.push({ id: peer.id, peerId: peer.peerId, x: location.lon + 180, y: 90 - location.lat });
  }

  if (!plotted.length) return null;

  return (
    <div className={styles.peerWorldMap}>
      <svg className={styles.peerWorldMapSvg} viewBox='0 8 360 140' shapeRendering='crispEdges' role='img' aria-label='Approximate peer locations'>
        {LAND_DOTS.map((dot) => (
          <rect className={styles.landDot} height={1.6} key={`${dot.x}-${dot.y}`} width={1.6} x={dot.x - 0.8} y={dot.y - 0.8} />
        ))}
        {plotted.map((peer) => (
          <rect className={styles.peerMarker} height={4.5} key={peer.id} width={4.5} x={peer.x - 2.25} y={peer.y - 2.25}>
            <title>{peer.peerId}</title>
          </rect>
        ))}
      </svg>
      <div className={styles.peerWorldMapCaption}>approximate locations</div>
    </div>
  );
};

export default PeerWorldMap;
