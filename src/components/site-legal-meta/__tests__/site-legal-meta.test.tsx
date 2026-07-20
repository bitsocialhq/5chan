import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SiteLegalMeta from '../site-legal-meta';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        site_legal_meta_license_text: '5chan is FOSS under GPL-3.0-or-later.',
        site_legal_meta_powered_by: 'Powered by',
        site_legal_meta_contributors_link: 'Contributors',
      })[key] ?? key,
  }),
}));

vi.mock('../../version/version', () => ({
  default: () => createElement('span', null, 'v1.0.0'),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

let root: Root;
let container: HTMLDivElement;

describe('SiteLegalMeta', () => {
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('shows the Bitsocial attribution with the official logo', () => {
    act(() => {
      root.render(createElement(MemoryRouter, null, createElement(SiteLegalMeta, { order: 'license-first' })));
    });

    expect(container.textContent).toContain('5chan is FOSS under GPL-3.0-or-later. Powered by Bitsocial');

    const bitsocialLink = container.querySelector<HTMLAnchorElement>('a[href="https://bitsocial.net"]');
    expect(bitsocialLink?.textContent).toBe('');
    expect(bitsocialLink?.previousSibling?.textContent).toContain('Bitsocial');
    expect(bitsocialLink?.querySelector('img')?.getAttribute('src')).toBe('assets/logo/bitsocial.png');
    expect(bitsocialLink?.querySelector('img')?.getAttribute('width')).toBe('18');
  });
});
