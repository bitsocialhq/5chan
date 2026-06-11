// Lazy MathJax entry point: the heavy setup chunk is fetched once, on the first equation that
// actually needs it, and typeset calls are serialized because MathJax's typesetPromise must not
// run concurrently with itself.
interface MathJaxApi {
  startup: { promise: Promise<void> };
  typesetPromise: (elements: HTMLElement[]) => Promise<void>;
  typesetClear: (elements: HTMLElement[]) => void;
}

let mathJaxPromise: Promise<MathJaxApi | undefined> | undefined;
let typesetQueue: Promise<void> = Promise.resolve();

const loadMathJax = (): Promise<MathJaxApi | undefined> => {
  if (!mathJaxPromise) {
    mathJaxPromise = import('./mathjax-setup')
      .then(async () => {
        const mathJax = (window as unknown as { MathJax: MathJaxApi }).MathJax;
        await mathJax.startup.promise;
        return mathJax;
      })
      .catch((error) => {
        // Allow a retry on the next equation (e.g. the chunk failed to download while offline).
        mathJaxPromise = undefined;
        console.error('failed to load MathJax', error);
        return undefined;
      });
  }
  return mathJaxPromise;
};

// Starts fetching the MathJax chunk ahead of the first typeset (e.g. when the TeX Preview modal
// opens), like 4chan loading MathJax as soon as the preview panel is created.
export const preloadMathJax = (): void => {
  loadMathJax();
};

// Resets the element to the raw TeX source, then typesets it in place. Re-running on the same
// element is safe (the source reset makes it idempotent), so re-mounts and StrictMode double
// effects just re-typeset.
export const typesetMathElement = (element: HTMLElement, source: string): Promise<void> => {
  typesetQueue = typesetQueue.then(async () => {
    const mathJax = await loadMathJax();
    if (!mathJax || !element.isConnected) {
      return;
    }
    element.textContent = source;
    try {
      await mathJax.typesetPromise([element]);
    } catch (error) {
      console.error('failed to typeset math', error);
    }
  });
  return typesetQueue;
};

// Drops MathJax's internal bookkeeping for an element that is being unmounted.
export const clearMathElement = (element: HTMLElement): void => {
  if (!mathJaxPromise) {
    return;
  }
  mathJaxPromise.then((mathJax) => mathJax?.typesetClear([element])).catch(() => {});
};
