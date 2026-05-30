import type { ProviderAttempt, ProviderId, UploadAttemptStage } from './types';
import { uploadToCatbox } from '../utils/catbox-utils';

/** Attempt metadata inferred or parsed from plugin rejection. Used when plugins throw plain errors. */
function parseAttemptMetadata(errorMessage: string): {
  stage: UploadAttemptStage;
  matchedSelectors?: string[];
} {
  const msg = errorMessage.toLowerCase();
  if (msg.includes('blocked') || msg.includes('captcha') || msg.includes('challenge')) {
    return { stage: 'blocked' };
  }
  if (msg.includes('no file input') || msg.includes('file input')) {
    const tried = errorMessage.match(/Tried:\s*(.+)$/)?.[1];
    const selectors = tried
      ? tried
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;
    return { stage: 'file_input', matchedSelectors: selectors };
  }
  if (msg.includes('no submit') || msg.includes('submit button')) {
    const tried = errorMessage.match(/Tried:\s*(.+)$/)?.[1];
    const selectors = tried
      ? tried
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;
    return { stage: 'submit', matchedSelectors: selectors };
  }
  if (msg.includes('timeout') || msg.includes('upload timeout')) {
    return { stage: 'timeout' };
  }
  if (msg.includes('page load failed')) {
    return { stage: 'page_load' };
  }
  return { stage: 'unknown' };
}

function resolveElectronFilePath(file: File): string | null {
  const fileWithPath = file as File & { path?: string };
  if (typeof fileWithPath.path === 'string' && fileWithPath.path.length > 0) {
    return fileWithPath.path;
  }

  const getPathForFile = window.electronApi?.getPathForFile;
  if (typeof getPathForFile === 'function') {
    const resolvedPath = getPathForFile(file);
    if (typeof resolvedPath === 'string' && resolvedPath.length > 0) {
      return resolvedPath;
    }
  }

  return null;
}

async function fileToByteArray(file: File): Promise<number[]> {
  return Array.from(new Uint8Array(await file.arrayBuffer()));
}

/**
 * Uploads a file via a single provider. Catbox uses the web API;
 * imgur/imgbb use Electron automation when available.
 */
async function uploadViaProvider(provider: ProviderId, file: File): Promise<string> {
  if (provider === 'catbox') return uploadToCatbox(file);
  if (provider === 'imgur' || provider === 'imgbb') {
    const fn = typeof window !== 'undefined' && window.electronApi?.automateUploadMedia;
    if (fn) {
      const filePath = resolveElectronFilePath(file);
      if (filePath) {
        const { url } = await fn({ provider, filePath });
        return url;
      }

      const generatedFn = window.electronApi?.automateUploadGeneratedMedia;
      if (!generatedFn) {
        throw new Error('File path unavailable and automateUploadGeneratedMedia is not available');
      }
      const { url } = await generatedFn({
        provider,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        bytes: await fileToByteArray(file),
      });
      return url;
    }
    throw new Error(`Provider ${provider} requires Electron (automateUploadMedia not available)`);
  }
  throw new Error(`Unsupported provider: ${provider}`);
}

/** Rejection shape for plugin errors that include structured metadata (future Electron/Android) */
interface PluginRejectionMeta {
  stage?: UploadAttemptStage;
  matchedSelectors?: string[];
}

/**
 * Orchestrates Electron upload: tries each provider in order, returns URL on first success.
 * Collects attempt errors with deterministic metadata (provider, stage, elapsedMs, matchedSelectors).
 * Throws with attempts if all fail.
 */
export async function orchestrateElectronUpload(file: File, providerOrder: ProviderId[]): Promise<string> {
  const attempts: ProviderAttempt[] = [];

  for (const provider of providerOrder) {
    const start = Date.now();
    try {
      const url = await uploadViaProvider(provider, file);
      return url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const elapsedMs = Date.now() - start;
      const meta = err && typeof err === 'object' && 'stage' in err ? (err as PluginRejectionMeta) : null;
      const parsed = parseAttemptMetadata(msg);
      attempts.push({
        provider,
        success: false,
        error: msg,
        stage: meta?.stage ?? parsed.stage,
        elapsedMs,
        matchedSelectors: meta?.matchedSelectors ?? parsed.matchedSelectors,
      });
    }
  }

  const err = new Error('All providers failed') as Error & { attempts: ProviderAttempt[] };
  err.attempts = attempts;
  throw err;
}
