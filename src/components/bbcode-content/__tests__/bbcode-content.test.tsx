import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BbcodeContent from '../bbcode-content';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  directories: [
    { address: 'site-feedback.bso', directoryCode: 'q', title: '/q/ - 5chan Feedback' },
    { address: 'technology-posting.bso', directoryCode: 'g', title: '/g/ - Technology' },
    { address: 'music-posting.eth', directoryCode: 'mu', title: '/mu/ - Music' },
  ],
}));

vi.mock('../../../hooks/use-directories', () => ({
  useDirectories: () => testState.directories,
}));

let container: HTMLDivElement;
let root: Root;

const renderBbcodeContent = async ({
  communityAddress = 'site-feedback.bso',
  content,
  route = '/q/thread/post-1',
}: {
  communityAddress?: string;
  content: string;
  route?: string;
}) => {
  await act(async () => {
    root.render(createElement(MemoryRouter, { initialEntries: [route] }, createElement(BbcodeContent, { communityAddress, content, postCid: 'post-1' })));
  });
};

describe('BbcodeContent', () => {
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('renders [code] blocks literally on /q/ while preserving normal BBCode outside them', async () => {
    await renderBbcodeContent({
      content: '[b]test[/b] [code]>not a quote\n[b]bitsocial[/b][/code]',
    });

    const code = container.querySelector('code');
    expect(container.querySelector('strong')?.textContent).toBe('test');
    expect(code?.textContent).toBe('>not a quote\n[b]bitsocial[/b]');
    expect(code?.querySelectorAll('span').length).toBeGreaterThan(0);
    expect(container.textContent).not.toContain('[code]');
  });

  it('keeps [code] literal off non-code-enabled boards', async () => {
    await renderBbcodeContent({
      communityAddress: 'music-posting.eth',
      content: 'test [code]bitsocial[/code]',
      route: '/mu/thread/post-1',
    });

    expect(container.querySelector('code')).toBeNull();
    expect(container.textContent).toBe('test [code]bitsocial[/code]');
  });
});
