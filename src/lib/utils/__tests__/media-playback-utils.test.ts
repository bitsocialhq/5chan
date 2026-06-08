import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { observeOffscreenMediaPlayback, restoreSuspendedMediaPlayback } from '../media-playback-utils';

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  callback: IntersectionObserverCallback;
  observedElements = new Set<Element>();

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  disconnect() {
    this.observedElements.clear();
  }

  observe(element: Element) {
    this.observedElements.add(element);
  }

  takeRecords() {
    return [];
  }

  unobserve(element: Element) {
    this.observedElements.delete(element);
  }

  trigger(target: Element, isIntersecting: boolean) {
    this.callback(
      [
        {
          intersectionRatio: isIntersecting ? 1 : 0,
          isIntersecting,
          target,
        } as IntersectionObserverEntry,
      ],
      this as unknown as IntersectionObserver,
    );
  }
}

const nextMicrotask = () => Promise.resolve();

const createExpandedMedia = () => {
  const container = document.createElement('span');
  container.dataset.expandedMedia = 'true';

  const video = document.createElement('video');
  video.src = 'https://cdn.example.com/video.webm';
  const iframe = document.createElement('iframe');
  iframe.src = 'https://player.example.com/embed';
  const srcdocIframe = document.createElement('iframe');
  srcdocIframe.srcdoc = '<p>embedded player</p>';

  container.append(video, iframe, srcdocIframe);

  return { container, iframe, srcdocIframe, video };
};

describe('media-playback-utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    MockIntersectionObserver.instances = [];
    vi.stubGlobal('innerHeight', 600);
    vi.stubGlobal('innerWidth', 800);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('suspends expanded media after it stays offscreen for the delay and restores iframe embeds when it returns', async () => {
    const root = document.createElement('div');
    const { container, iframe, srcdocIframe, video } = createExpandedMedia();
    const pauseMock = vi.spyOn(video, 'pause').mockImplementation(() => {});
    root.append(container);
    document.body.append(root);

    const cleanup = observeOffscreenMediaPlayback(root);
    const observer = MockIntersectionObserver.instances[0];

    expect(observer.observedElements.has(container)).toBe(true);

    observer.trigger(container, false);
    await vi.advanceTimersByTimeAsync(999);

    expect(pauseMock).not.toHaveBeenCalled();
    expect(iframe.getAttribute('src')).toBe('https://player.example.com/embed');
    expect(srcdocIframe.getAttribute('srcdoc')).toBe('<p>embedded player</p>');

    await vi.advanceTimersByTimeAsync(1);

    expect(pauseMock).toHaveBeenCalledTimes(1);
    expect(iframe.getAttribute('src')).toBe('about:blank');
    expect(srcdocIframe.getAttribute('srcdoc')).toBeNull();

    observer.trigger(container, true);

    expect(iframe.getAttribute('src')).toBe('https://player.example.com/embed');
    expect(srcdocIframe.getAttribute('srcdoc')).toBe('<p>embedded player</p>');

    cleanup();
    root.remove();
  });

  it('leaves offscreen iframe embeds suspended during visible-only restore until they intersect', async () => {
    const root = document.createElement('div');
    const { container, iframe, srcdocIframe, video } = createExpandedMedia();
    vi.spyOn(video, 'pause').mockImplementation(() => {});
    vi.spyOn(iframe, 'getBoundingClientRect').mockReturnValue({
      bottom: 900,
      height: 300,
      left: 0,
      right: 400,
      top: 600,
      width: 400,
      x: 0,
      y: 600,
      toJSON: () => '',
    });
    vi.spyOn(srcdocIframe, 'getBoundingClientRect').mockReturnValue({
      bottom: 900,
      height: 300,
      left: 0,
      right: 400,
      top: 600,
      width: 400,
      x: 0,
      y: 600,
      toJSON: () => '',
    });
    root.append(container);
    document.body.append(root);

    const cleanup = observeOffscreenMediaPlayback(root);
    const observer = MockIntersectionObserver.instances[0];

    observer.trigger(container, false);
    await vi.advanceTimersByTimeAsync(1000);

    restoreSuspendedMediaPlayback(container, { visibleOnly: true });

    expect(iframe.getAttribute('src')).toBe('about:blank');
    expect(srcdocIframe.getAttribute('srcdoc')).toBeNull();

    observer.trigger(container, true);

    expect(iframe.getAttribute('src')).toBe('https://player.example.com/embed');
    expect(srcdocIframe.getAttribute('srcdoc')).toBe('<p>embedded player</p>');

    cleanup();
    root.remove();
  });

  it('cancels the offscreen suspend when expanded media returns before the delay passes', async () => {
    const root = document.createElement('div');
    const { container, iframe, video } = createExpandedMedia();
    const pauseMock = vi.spyOn(video, 'pause').mockImplementation(() => {});
    root.append(container);
    document.body.append(root);

    const cleanup = observeOffscreenMediaPlayback(root);
    const observer = MockIntersectionObserver.instances[0];

    observer.trigger(container, false);
    await vi.advanceTimersByTimeAsync(999);
    observer.trigger(container, true);
    await vi.advanceTimersByTimeAsync(1);

    expect(pauseMock).not.toHaveBeenCalled();
    expect(iframe.getAttribute('src')).toBe('https://player.example.com/embed');

    cleanup();
    root.remove();
  });

  it('observes expanded media added after the offscreen observer starts', async () => {
    const root = document.createElement('div');
    document.body.append(root);

    const cleanup = observeOffscreenMediaPlayback(root);
    const observer = MockIntersectionObserver.instances[0];
    const { container } = createExpandedMedia();

    root.append(container);
    await nextMicrotask();

    expect(observer.observedElements.has(container)).toBe(true);

    cleanup();
    root.remove();
  });

  it('observes playable media inserted into an expanded container after startup', async () => {
    const root = document.createElement('div');
    const container = document.createElement('span');
    container.dataset.expandedMedia = 'true';
    root.append(container);
    document.body.append(root);

    const cleanup = observeOffscreenMediaPlayback(root);
    const observer = MockIntersectionObserver.instances[0];
    const video = document.createElement('video');

    expect(observer.observedElements.has(container)).toBe(false);

    container.append(video);
    await nextMicrotask();

    expect(observer.observedElements.has(container)).toBe(true);

    cleanup();
    root.remove();
  });

  it('observes media when an existing playable container becomes expanded', async () => {
    const root = document.createElement('div');
    const { container } = createExpandedMedia();
    container.removeAttribute('data-expanded-media');
    root.append(container);
    document.body.append(root);

    const cleanup = observeOffscreenMediaPlayback(root);
    const observer = MockIntersectionObserver.instances[0];

    expect(observer.observedElements.has(container)).toBe(false);

    container.dataset.expandedMedia = 'true';
    await nextMicrotask();

    expect(observer.observedElements.has(container)).toBe(true);

    cleanup();
    root.remove();
  });
});
