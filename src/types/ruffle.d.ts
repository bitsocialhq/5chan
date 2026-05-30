declare module '@ruffle-rs/ruffle' {
  const ruffle: unknown;
  export default ruffle;
}

interface RufflePlayerElement extends HTMLElement {
  ruffle?: () => {
    load: (source: string | Record<string, unknown>) => Promise<void> | void;
  };
}

interface RuffleSource {
  createPlayer?: () => RufflePlayerElement;
}

interface RufflePlayerApi {
  config?: Record<string, unknown>;
  newest?: () => RuffleSource | null;
}

interface Window {
  RufflePlayer?: RufflePlayerApi;
}
