/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare interface ImportMetaEnv {
  readonly VITE_COMMIT_REF: string;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}
