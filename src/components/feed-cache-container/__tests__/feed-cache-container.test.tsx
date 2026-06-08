import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useFeedCacheStore from '../../../stores/use-feed-cache-store';
import FeedCacheContainer from '../feed-cache-container';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

vi.mock('../../../views/catalog/catalog', () => ({
  default: () => createElement('div', { 'data-testid': 'catalog' }),
}));

vi.mock('../../../views/board/board', () => ({
  default: ({ feedCacheKey }: { feedCacheKey: string }) =>
    createElement(
      'div',
      { 'data-testid': `board-${feedCacheKey}` },
      feedCacheKey === '/a'
        ? createElement(
            React.Fragment,
            {},
            createElement('video', { 'data-testid': 'cached-video', src: 'https://cdn.example.com/video.mp4' }),
            createElement('iframe', { 'data-testid': 'cached-iframe', src: 'https://player.example.com/embed', title: 'remote embed' }),
            createElement('iframe', { 'data-testid': 'cached-srcdoc-iframe', srcDoc: '<p>srcdoc embed</p>', title: 'srcdoc embed' }),
          )
        : null,
    ),
}));

let container: HTMLDivElement;
let iframeRectSpy: ReturnType<typeof vi.spyOn>;
let latestPathname = '';
let pauseSpy: ReturnType<typeof vi.spyOn>;
let root: Root;

const NavigateButtons = () => {
  const navigate = useNavigate();
  return createElement(
    React.Fragment,
    {},
    createElement('button', { 'data-testid': 'navigate-a', onClick: () => navigate('/a'), type: 'button' }, 'a'),
    createElement('button', { 'data-testid': 'navigate-b', onClick: () => navigate('/b'), type: 'button' }, 'b'),
  );
};

const LocationProbe = () => {
  latestPathname = useLocation().pathname;
  return null;
};

const flushEffects = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

describe('FeedCacheContainer', () => {
  beforeEach(() => {
    useFeedCacheStore.getState().clearFeeds();
    iframeRectSpy = vi.spyOn(window.HTMLIFrameElement.prototype, 'getBoundingClientRect').mockReturnValue({
      bottom: 240,
      height: 240,
      left: 0,
      right: 320,
      top: 0,
      width: 320,
      x: 0,
      y: 0,
      toJSON: () => '',
    });
    pauseSpy = vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    latestPathname = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    useFeedCacheStore.getState().clearFeeds();
    iframeRectSpy.mockRestore();
    pauseSpy.mockRestore();
  });

  it('suspends playable media while a cached feed is hidden and restores iframe embeds when visible again', async () => {
    await act(async () => {
      root.render(
        createElement(MemoryRouter, { initialEntries: ['/a'] }, createElement(FeedCacheContainer), createElement(NavigateButtons), createElement(LocationProbe)),
      );
    });
    await flushEffects();

    expect(latestPathname).toBe('/a');
    expect(container.querySelector<HTMLVideoElement>('[data-testid="cached-video"]')).toBeTruthy();
    expect(container.querySelector<HTMLIFrameElement>('[data-testid="cached-iframe"]')?.getAttribute('src')).toBe('https://player.example.com/embed');
    expect(container.querySelector<HTMLIFrameElement>('[data-testid="cached-srcdoc-iframe"]')?.getAttribute('srcdoc')).toBe('<p>srcdoc embed</p>');

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="navigate-b"]')?.click();
    });
    await flushEffects();

    expect(latestPathname).toBe('/b');
    expect(pauseSpy).toHaveBeenCalled();
    expect(container.querySelector<HTMLVideoElement>('[data-testid="cached-video"]')).toBeTruthy();
    expect(container.querySelector<HTMLIFrameElement>('[data-testid="cached-iframe"]')?.getAttribute('src')).toBe('about:blank');
    expect(container.querySelector<HTMLIFrameElement>('[data-testid="cached-srcdoc-iframe"]')?.getAttribute('srcdoc')).toBeNull();

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="navigate-a"]')?.click();
    });
    await flushEffects();

    expect(latestPathname).toBe('/a');
    expect(container.querySelector<HTMLIFrameElement>('[data-testid="cached-iframe"]')?.getAttribute('src')).toBe('https://player.example.com/embed');
    expect(container.querySelector<HTMLIFrameElement>('[data-testid="cached-srcdoc-iframe"]')?.getAttribute('srcdoc')).toBe('<p>srcdoc embed</p>');
  });
});
