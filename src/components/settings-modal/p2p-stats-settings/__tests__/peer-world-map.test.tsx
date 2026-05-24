import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import PeerWorldMap from '../peer-world-map';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void) => void }).act as (cb: () => void) => void;

let container: HTMLDivElement;
let root: Root;

const render = (element: React.ReactElement) => act(() => root.render(element));

describe('PeerWorldMap', () => {
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('renders the rasterized land backdrop and a marker from a resolved IP location', () => {
    render(
      createElement(PeerWorldMap, {
        peers: [
          {
            address: '/ip4/91.234.199.189/tcp/4001',
            id: 'c1',
            location: { countryCode: 'nl', label: 'Haarlem, North Holland, NL', lat: 52.3874, lon: 4.64622, source: 'geoip' },
            peerId: 'peer-1',
          },
        ],
      }),
    );
    const landPath = container.querySelector('svg path');
    const marker = container.querySelector('svg rect');
    expect(landPath).not.toBeNull();
    // The land mask decodes into a large multi-square path, not a handful of points.
    expect((landPath?.getAttribute('d') ?? '').length).toBeGreaterThan(1000);
    expect(container.querySelectorAll('svg rect')).toHaveLength(1);
    expect(marker?.getAttribute('height')).toBe('3');
    expect(marker?.getAttribute('width')).toBe('3');
    expect(Number(marker?.getAttribute('x'))).toBeCloseTo(183.15, 1);
    expect(Number(marker?.getAttribute('y'))).toBeCloseTo(36.11, 1);
    expect(container.querySelector('svg rect title')?.textContent).toBe('peer-1 - Haarlem, North Holland, NL');
  });

  it('falls back to the offline location estimate for a public peer without GeoIP data', () => {
    render(createElement(PeerWorldMap, { peers: [{ address: '/ip4/8.8.8.8/tcp/4001', id: 'c1', peerId: 'peer-1' }] }));
    expect(container.querySelectorAll('svg rect')).toHaveLength(1);
    expect(container.querySelector('svg rect title')?.textContent).toBe('peer-1');
  });

  it('marks leecher locations for red map styling', () => {
    render(
      createElement(PeerWorldMap, {
        peers: [
          {
            address: '/ip4/117.2.120.113/tcp/4001',
            id: 'self',
            location: { countryCode: 'vn', label: 'Da Nang, Da Nang City, VN', lat: 16.0678, lon: 108.221, source: 'geoip' },
            peerId: 'Your node',
            role: 'leecher',
          },
        ],
      }),
    );
    const marker = container.querySelector('svg rect');
    expect(marker?.getAttribute('data-peer-role')).toBe('leecher');
    expect(container.querySelector('svg rect title')?.textContent).toBe('Your node - Da Nang, Da Nang City, VN');
  });

  it('renders nothing when no peer can be placed offline', () => {
    render(createElement(PeerWorldMap, { peers: [{ address: '/ip4/10.0.0.1/tcp/4001', id: 'c1', peerId: 'peer-1' }] }));
    expect(container.querySelector('svg')).toBeNull();
  });
});
