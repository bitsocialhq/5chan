import { WORLD_MAP_DOTS } from '../../../data/world-map-dots';
import { getApproximateLatLon } from '../../../lib/peer-geo';
import styles from './p2p-stats-settings.module.css';

type MapPeer = {
  address: string;
  id: string;
  peerId: string;
};

// Square side per land dot, sized to cover most of a grid cell so the rasterized
// Natural Earth land mask (src/data/world-map-dots.ts) reads as a halftone map.
const DOT_SIZE = WORLD_MAP_DOTS.step * 0.6;

// Equirectangular projection shared with the peer markers below: x = lon + 180,
// y = 90 - lat. Expand the land bitmap into one <path> of small squares so the
// backdrop is a single static node instead of thousands of elements.
const LAND_PATH = (() => {
  const { step, lonMin, latMax, cols, rows, bitmap } = WORLD_MAP_DOTS;
  const binary = atob(bitmap);
  const square = `h${DOT_SIZE}v${DOT_SIZE}h${-DOT_SIZE}z`;
  const fmt = (value: number) => +value.toFixed(2);
  let path = '';
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col;
      if (!((binary.charCodeAt(index >> 3) >> (7 - (index & 7))) & 1)) continue;
      const lon = lonMin + (col + 0.5) * step;
      const lat = latMax - (row + 0.5) * step;
      path += `M${fmt(lon + 180 - DOT_SIZE / 2)} ${fmt(90 - lat - DOT_SIZE / 2)}${square}`;
    }
  }
  return path;
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
        <path className={styles.landDot} d={LAND_PATH} />
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
