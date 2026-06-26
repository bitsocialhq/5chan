const BLANK_IFRAME_SRC = 'about:blank';
const EXPANDED_MEDIA_ATTRIBUTE = 'data-expanded-media';
const EXPANDED_MEDIA_SELECTOR = `[${EXPANDED_MEDIA_ATTRIBUTE}="true"]`;
const PLAYABLE_MEDIA_SELECTOR = 'video, audio, iframe';
const OFFSCREEN_MEDIA_SUSPEND_DELAY_MS = 1000;

interface SuspendedIframeState {
  src: string | null;
  srcdoc: string | null;
}

export interface SuspendedMediaPlaybackStats {
  audioVideoCount: number;
  iframeCount: number;
  iframeSrcClearedCount: number;
  iframeSrcdocClearedCount: number;
}

interface OffscreenMediaPlaybackOptions {
  delayMs?: number;
  selector?: string;
}

interface RestoreSuspendedMediaPlaybackOptions {
  visibleOnly?: boolean;
}

const suspendedIframes = new WeakMap<HTMLIFrameElement, SuspendedIframeState>();

const getPlayableMediaElements = (element: Element): Element[] => [...element.querySelectorAll(PLAYABLE_MEDIA_SELECTOR)];

const isVideoElement = (target: EventTarget | null): target is HTMLVideoElement => typeof HTMLVideoElement !== 'undefined' && target instanceof HTMLVideoElement;

const isElementInViewport = (element: Element): boolean => {
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;

  return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < viewportHeight && rect.left < viewportWidth;
};

export const suspendMediaPlayback = (container: ParentNode | null): SuspendedMediaPlaybackStats => {
  const stats = {
    audioVideoCount: 0,
    iframeCount: 0,
    iframeSrcClearedCount: 0,
    iframeSrcdocClearedCount: 0,
  };

  if (!container) {
    return stats;
  }

  for (const media of container.querySelectorAll<HTMLMediaElement>('video, audio')) {
    stats.audioVideoCount += 1;
    media.pause();
  }

  for (const iframe of container.querySelectorAll<HTMLIFrameElement>('iframe')) {
    stats.iframeCount += 1;
    const src = iframe.getAttribute('src');
    const srcdoc = iframe.getAttribute('srcdoc');

    if (!suspendedIframes.has(iframe)) {
      suspendedIframes.set(iframe, { src, srcdoc });
    }

    if (src && src !== BLANK_IFRAME_SRC) {
      iframe.setAttribute('src', BLANK_IFRAME_SRC);
      stats.iframeSrcClearedCount += 1;
    }

    if (srcdoc) {
      iframe.removeAttribute('srcdoc');
      stats.iframeSrcdocClearedCount += 1;
    }
  }

  return stats;
};

export const restoreSuspendedMediaPlayback = (container: ParentNode | null, options: RestoreSuspendedMediaPlaybackOptions = {}) => {
  if (!container) {
    return;
  }

  for (const iframe of container.querySelectorAll<HTMLIFrameElement>('iframe')) {
    if (options.visibleOnly && !isElementInViewport(iframe)) {
      continue;
    }

    const suspendedState = suspendedIframes.get(iframe);
    if (!suspendedState) {
      continue;
    }

    if (suspendedState.src) {
      iframe.setAttribute('src', suspendedState.src);
    } else {
      iframe.removeAttribute('src');
    }

    if (suspendedState.srcdoc) {
      iframe.setAttribute('srcdoc', suspendedState.srcdoc);
    } else {
      iframe.removeAttribute('srcdoc');
    }

    suspendedIframes.delete(iframe);
  }
};

const hasPlayableMedia = (element: Element): boolean => getPlayableMediaElements(element).length > 0;

const hasVisiblePlayableMedia = (element: Element): boolean => getPlayableMediaElements(element).some(isElementInViewport);

export const observeOffscreenMediaPlayback = (root: ParentNode | null, options: OffscreenMediaPlaybackOptions = {}) => {
  if (!root || typeof window === 'undefined' || !window.IntersectionObserver || !window.MutationObserver) {
    return () => {};
  }

  const delayMs = options.delayMs ?? OFFSCREEN_MEDIA_SUSPEND_DELAY_MS;
  const selector = options.selector ?? EXPANDED_MEDIA_SELECTOR;
  const observedElements = new Set<Element>();
  const pendingSuspends = new WeakMap<Element, ReturnType<typeof setTimeout>>();

  const clearPendingSuspend = (element: Element) => {
    const timeout = pendingSuspends.get(element);
    if (timeout === undefined) {
      return;
    }

    clearTimeout(timeout);
    pendingSuspends.delete(element);
  };

  const intersectionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const target = entry.target;
      clearPendingSuspend(target);

      if (hasVisiblePlayableMedia(target)) {
        restoreSuspendedMediaPlayback(target);
        continue;
      }

      const timeout = setTimeout(() => {
        pendingSuspends.delete(target);
        if (target.isConnected && !hasVisiblePlayableMedia(target)) {
          suspendMediaPlayback(target);
        }
      }, delayMs);
      pendingSuspends.set(target, timeout);
    }
  });

  const observeElement = (element: Element) => {
    if (observedElements.has(element) || !hasPlayableMedia(element)) {
      return;
    }

    observedElements.add(element);
    intersectionObserver.observe(element);
  };

  const syncElementObservation = (element: Element) => {
    if (element.matches(selector) && hasPlayableMedia(element)) {
      observeElement(element);
      return;
    }

    unobserveElement(element);
  };

  const syncClosestMediaContainer = (element: Element) => {
    const mediaElement = element.matches(selector) ? element : element.closest(selector);
    if (mediaElement) {
      syncElementObservation(mediaElement);
    }
  };

  const observeTree = (node: ParentNode) => {
    if (node instanceof Element && node.matches(selector)) {
      observeElement(node);
    }

    for (const element of node.querySelectorAll(selector)) {
      observeElement(element);
    }
  };

  const unobserveElement = (element: Element) => {
    clearPendingSuspend(element);
    if (!observedElements.delete(element)) {
      return;
    }

    intersectionObserver.unobserve(element);
  };

  const unobserveTree = (node: ParentNode) => {
    if (node instanceof Element && node.matches(selector)) {
      unobserveElement(node);
    }

    for (const element of node.querySelectorAll(selector)) {
      unobserveElement(element);
    }
  };

  observeTree(root);

  const mutationObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.target instanceof Element) {
        syncElementObservation(mutation.target);
        continue;
      }

      for (const node of mutation.addedNodes) {
        if (node instanceof Element) {
          observeTree(node);
          syncClosestMediaContainer(node);
        }
      }

      for (const node of mutation.removedNodes) {
        if (node instanceof Element) {
          unobserveTree(node);
        }
      }

      if (mutation.target instanceof Element) {
        syncClosestMediaContainer(mutation.target);
      }
    }
  });
  mutationObserver.observe(root, { attributeFilter: [EXPANDED_MEDIA_ATTRIBUTE], attributes: true, childList: true, subtree: true });

  return () => {
    mutationObserver.disconnect();
    for (const element of observedElements) {
      clearPendingSuspend(element);
      intersectionObserver.unobserve(element);
    }
    observedElements.clear();
    intersectionObserver.disconnect();
  };
};

export const observeExclusiveVideoPlayback = (root: EventTarget | null) => {
  if (!root || typeof window === 'undefined') {
    return () => {};
  }

  let activeVideo: HTMLVideoElement | null = null;

  const handlePlay = (event: Event) => {
    const video = isVideoElement(event.target) ? event.target : null;
    if (!video) {
      return;
    }

    if (activeVideo && activeVideo !== video && !activeVideo.paused) {
      activeVideo.pause();
    }

    activeVideo = video;
  };

  const handleInactive = (event: Event) => {
    if (event.target === activeVideo) {
      activeVideo = null;
    }
  };

  root.addEventListener('play', handlePlay, true);
  root.addEventListener('pause', handleInactive, true);
  root.addEventListener('ended', handleInactive, true);

  return () => {
    root.removeEventListener('play', handlePlay, true);
    root.removeEventListener('pause', handleInactive, true);
    root.removeEventListener('ended', handleInactive, true);
    activeVideo = null;
  };
};
