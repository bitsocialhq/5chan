import { describe, expect, it } from 'vitest';
import {
  formatBytes,
  getConnectedPeersRowFromRecords,
  getTransferStatsFromMetricSnapshot,
  getTransportLabel,
  isLikelyPublicIp,
  mergeTransferSnapshots,
} from '../p2p-stats';

describe('p2p-stats engine', () => {
  describe('formatBytes', () => {
    it('formats byte magnitudes with adaptive units and precision', () => {
      expect(formatBytes(512)).toBe('512 B');
      expect(formatBytes(1024)).toBe('1.00 KB');
      expect(formatBytes(1536)).toBe('1.50 KB');
      expect(formatBytes(10 * 1024 * 1024)).toBe('10.0 MB');
    });

    it('falls back to a readable string for non-numeric input', () => {
      expect(formatBytes('not-a-number')).toBe('not-a-number');
      expect(formatBytes(undefined)).toBe('unknown');
      // Number(null) === 0, so null coerces to a real magnitude rather than the fallback.
      expect(formatBytes(null)).toBe('0 B');
    });
  });

  describe('mergeTransferSnapshots', () => {
    it('prefers primary totals/peer stats and backfills from the fallback', () => {
      const primary = {
        peers: new Map([['peerA', { downloadedBytes: 10 }]]),
        totals: { downloadedBytes: 100 },
      };
      const fallback = {
        peers: new Map([
          ['peerA', { uploadedBytes: 5 }],
          ['peerB', { downloadedBytes: 7 }],
        ]),
        totals: { downloadedBytes: 50, uploadedBytes: 30 },
      };

      const merged = mergeTransferSnapshots(primary, fallback);

      expect(merged.totals).toEqual({ downloadedBytes: 100, uploadedBytes: 30 });
      expect(merged.peers.get('peerA')).toEqual({ downloadedBytes: 10, uploadedBytes: 5 });
      expect(merged.peers.get('peerB')).toEqual({ downloadedBytes: 7 });
    });
  });

  describe('getConnectedPeersRowFromRecords', () => {
    it('normalizes peer records from heterogeneous field names', () => {
      const row = getConnectedPeersRowFromRecords({
        peers: [
          { remotePeer: 'peerA', remoteAddr: '/ip4/1.2.3.4/tcp/4001/p2p/peerA', direction: 'inbound' },
          { peerId: 'peerB', multiaddr: '/ip4/5.6.7.8/udp/4001/quic' },
        ],
      });

      expect(row.type).toBe('connectedPeers');
      expect(row.entries).toHaveLength(2);
      expect(row.entries[0]).toMatchObject({ peerId: 'peerA', address: '/ip4/1.2.3.4/tcp/4001/p2p/peerA', direction: 'inbound', transport: 'TCP' });
      expect(row.entries[1]).toMatchObject({ peerId: 'peerB', address: '/ip4/5.6.7.8/udp/4001/quic', transport: 'QUIC' });
      expect(row.peerCount).toBe(2);
      expect(row.connectionCount).toBe(2);
    });
  });

  describe('getTransportLabel', () => {
    it('detects transports from multiaddr fragments', () => {
      expect(getTransportLabel('/ip4/1.2.3.4/tcp/4001')).toBe('TCP');
      expect(getTransportLabel('/ip4/1.2.3.4/udp/4001/quic-v1')).toBe('QUIC');
      expect(getTransportLabel('/dns4/example.com/tcp/443/wss')).toBe('Secure WebSocket');
      expect(getTransportLabel('/ip4/1.2.3.4/udp/4001/webrtc-direct')).toBe('WebRTC direct');
      expect(getTransportLabel('/ip4/1.2.3.4/tcp/4001/p2p-circuit/p2p/peer')).toBe('TCP through relay');
      expect(getTransportLabel('/ip4/1.2.3.4/onion3/abc')).toBe('Unknown transport');
    });
  });

  describe('isLikelyPublicIp', () => {
    it('treats routable addresses as public and filters private/reserved ones', () => {
      expect(isLikelyPublicIp('8.8.8.8')).toBe(true);
      expect(isLikelyPublicIp('2001:4860:4860::8888')).toBe(true);
      expect(isLikelyPublicIp('192.168.1.1')).toBe(false);
      expect(isLikelyPublicIp('10.0.0.1')).toBe(false);
      expect(isLikelyPublicIp('127.0.0.1')).toBe(false);
      expect(isLikelyPublicIp('::1')).toBe(false);
      expect(isLikelyPublicIp('fe80::1')).toBe(false);
      expect(isLikelyPublicIp('')).toBe(false);
      expect(isLikelyPublicIp('not-an-ip')).toBe(false);
    });
  });

  describe('getTransferStatsFromMetricSnapshot', () => {
    it('extracts download/upload totals from named counters', () => {
      const snapshot = getTransferStatsFromMetricSnapshot({ bytesReceived: 1000, bytesSent: 500 });
      expect(snapshot.totals).toEqual({ downloadedBytes: 1000, uploadedBytes: 500 });
    });

    it('never throws on malformed or non-record snapshots', () => {
      expect(() => getTransferStatsFromMetricSnapshot(undefined)).not.toThrow();
      expect(() => getTransferStatsFromMetricSnapshot(null)).not.toThrow();
      expect(() => getTransferStatsFromMetricSnapshot('nonsense')).not.toThrow();
      expect(() => getTransferStatsFromMetricSnapshot(42)).not.toThrow();
      expect(getTransferStatsFromMetricSnapshot(undefined).totals).toEqual({});

      const circular: Record<string, unknown> = {};
      circular.self = circular;
      expect(() => getTransferStatsFromMetricSnapshot(circular)).not.toThrow();
    });
  });
});
