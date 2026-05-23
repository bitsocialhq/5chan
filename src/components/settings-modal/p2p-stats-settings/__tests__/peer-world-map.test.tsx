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

  it('renders the rasterized land backdrop and a marker for a placeable peer', () => {
    render(createElement(PeerWorldMap, { peers: [{ address: '/ip4/8.8.8.8/tcp/4001', id: 'c1', peerId: 'peer-1' }] }));
    const landPath = container.querySelector('svg path');
    expect(landPath).not.toBeNull();
    // The land mask decodes into a large multi-square path, not a handful of points.
    expect((landPath?.getAttribute('d') ?? '').length).toBeGreaterThan(1000);
    expect(container.querySelectorAll('svg rect')).toHaveLength(1);
    expect(container.querySelector('svg rect title')?.textContent).toBe('peer-1');
  });

  it('renders nothing when no peer can be placed offline', () => {
    render(createElement(PeerWorldMap, { peers: [{ address: '/ip4/10.0.0.1/tcp/4001', id: 'c1', peerId: 'peer-1' }] }));
    expect(container.querySelector('svg')).toBeNull();
  });
});
