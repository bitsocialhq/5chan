declare global {
  interface Window {
    isElectron: boolean;
    defaultPkcOptions?: Record<string, unknown>;
  }
}

import type { ProviderId } from './lib/media-hosting/types';

declare global {
  interface Window {
    electronApi?: {
      isElectron: boolean;
      copyToClipboard: (text: string) => Promise<{ success: boolean; error?: string }>;
      getPlatform: () => Promise<{ platform: NodeJS.Platform; arch: string; version: string }>;
      automateUploadMedia: (options: { provider: ProviderId; filePath: string }) => Promise<{ url: string; provider: ProviderId }>;
      automateUploadGeneratedMedia?: (options: {
        provider: ProviderId;
        fileName: string;
        mimeType: string;
        bytes: number[];
      }) => Promise<{ url: string; provider: ProviderId }>;
      downloadAndInstallUpdate?: (options: { url: string; fileName: string }) => Promise<void>;
      getPathForFile?: (file: File) => string | null;
    };
  }
}

export {};
