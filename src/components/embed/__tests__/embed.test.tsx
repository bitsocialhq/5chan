import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Embed from '../embed';
import { canEmbed, getYouTubeVideoId } from '../embed-utils';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

let container: HTMLDivElement;
let root: Root;

const renderEmbed = async (url: string) => {
  await act(async () => {
    root.render(createElement(Embed, { url }));
  });
};

describe('Embed', () => {
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('renders youtube and twitch embeds with the expected iframe sources', async () => {
    await renderEmbed('https://youtu.be/video123');

    expect(container.querySelector<HTMLIFrameElement>('iframe')?.getAttribute('src')).toBe('https://www.youtube.com/embed/video123');

    await renderEmbed('https://www.twitch.tv/videos/987654321');

    expect(container.querySelector<HTMLIFrameElement>('iframe')?.getAttribute('src')).toContain('video=987654321');
    expect(container.querySelector<HTMLIFrameElement>('iframe')?.getAttribute('src')).toContain(`parent=${window.location.hostname}`);
  });

  it('renders x as a direct tweet iframe, renders reddit through iframe markup, and leaves unsupported urls empty', async () => {
    await renderEmbed('https://x.com/test/status/123');

    expect(container.querySelector<HTMLIFrameElement>('iframe')?.getAttribute('src')).toBe(
      'https://platform.twitter.com/embed/Tweet.html?id=123&theme=dark&dnt=false&hideThread=false&hideCard=false&lang=en',
    );

    await renderEmbed('https://www.reddit.com/r/test/comments/abc123/example/');

    expect(container.querySelector<HTMLIFrameElement>('iframe')?.getAttribute('srcdoc')).toContain('reddit-embed-bq');

    await renderEmbed('https://example.com/plain-link');

    expect(container.innerHTML).toBe('');
  });

  it('extracts youtube video ids for standard, short, and invidious urls', () => {
    expect(getYouTubeVideoId(new URL('https://www.youtube.com/watch?v=abc123'))).toBe('abc123');
    expect(getYouTubeVideoId(new URL('https://youtu.be/short123'))).toBe('short123');
    expect(getYouTubeVideoId(new URL('https://www.youtube.com/shorts/short456'))).toBe('short456');
    expect(getYouTubeVideoId(new URL('https://yewtu.be/invidious789'))).toBe('invidious789');
    expect(getYouTubeVideoId(new URL('https://www.youtube.com/playlist?list=PL123'))).toBeNull();
  });

  it('reports embeddable hosts through canEmbed and rejects unsupported reddit pages', () => {
    expect(canEmbed(new URL('https://www.youtube.com/watch?v=abc123'))).toBe(true);
    expect(canEmbed(new URL('https://yt.example/watch?v=abc123'))).toBe(true);
    expect(canEmbed(new URL('https://x.com/test/status/123'))).toBe(true);
    expect(canEmbed(new URL('https://x.com/test'))).toBe(false);
    expect(canEmbed(new URL('https://www.reddit.com/r/test/comments/abc123/example/'))).toBe(true);
    expect(canEmbed(new URL('https://www.reddit.com/r/test/'))).toBe(false);
    expect(canEmbed(new URL('https://example.com/plain-link'))).toBe(false);
  });
});
