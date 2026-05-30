import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import FileUploader from '../plugins/file-uploader';
import { formatAggregatedError, formatPreferredModeError, type ProviderAttempt } from '../lib/media-hosting/error-format';
import { getProviderOrder } from '../lib/media-hosting/provider-order';
import { getMediaHostingRuntime, isElectronRuntime } from '../lib/media-hosting/show-upload-controls';
import { orchestrateElectronUpload } from '../lib/media-hosting/upload-orchestrator';
import { ensureProviderAvailability } from '../lib/media-hosting/provider-availability';
import useMediaHostingStore from '../stores/use-media-hosting-store';
import type { ProviderId, UploadAttemptStage } from '../lib/media-hosting/types';

/** Maps Android plugin stage strings to UploadAttemptStage (avoids unsafe cast). Includes pass-through for valid stages. */
const ANDROID_STAGE_MAP: Record<string, UploadAttemptStage> = {
  input_not_found: 'file_input',
  chooser_not_triggered: 'file_input',
  upload_timed_out: 'timeout',
  blocked_detected: 'blocked',
  provider_error: 'provider_error',
  no_recipe: 'unknown',
  page_loaded: 'page_load',
  blocked: 'blocked',
  file_input: 'file_input',
  submit: 'submit',
  timeout: 'timeout',
  page_load: 'page_load',
  unknown: 'unknown',
};

const FILE_SELECTION_CANCELLED_ERROR = 'File selection cancelled';

const VALID_PROVIDERS: ProviderId[] = ['catbox', 'imgur', 'imgbb'];

/** Raw attempt shape from Android plugin rejection payload */
interface RawAttempt {
  provider?: unknown;
  success?: unknown;
  error?: unknown;
  stage?: unknown;
  elapsedMs?: unknown;
  matchedSelectors?: unknown;
}

/**
 * Normalizes Android Capacitor rejection payload. The plugin may reject with
 * `{ message, code, data: { attempts: [...] } }` where attempts contain
 * provider, error, stage, elapsedMs, matchedSelectors. We extract and attach
 * attempts to the error so formatAggregatedError can surface them.
 */
function normalizeAndroidRejection(error: unknown): Error & { attempts?: ProviderAttempt[] } {
  const err = error as Error & { data?: { attempts?: unknown[] } };
  const raw = err?.data?.attempts;
  if (!Array.isArray(raw) || raw.length === 0) return err;

  const attempts: ProviderAttempt[] = raw
    .map((a: unknown): ProviderAttempt | null => {
      const item = a as RawAttempt;
      const provider = item?.provider;
      if (typeof provider !== 'string' || !VALID_PROVIDERS.includes(provider as ProviderId)) return null;
      const ms = typeof item?.elapsedMs === 'number' ? item.elapsedMs : undefined;
      let sel: string[] | undefined;
      if (Array.isArray(item?.matchedSelectors)) {
        sel = (item.matchedSelectors as unknown[]).filter((s): s is string => typeof s === 'string');
      } else if (typeof item?.matchedSelectors === 'string' && item.matchedSelectors.trim()) {
        sel = item.matchedSelectors
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);
      }
      const attempt: ProviderAttempt = {
        provider: provider as ProviderId,
        success: Boolean(item?.success),
        error: typeof item?.error === 'string' ? item.error : undefined,
        stage: typeof item?.stage === 'string' && item.stage ? (ANDROID_STAGE_MAP[item.stage] ?? 'unknown') : undefined,
        elapsedMs: ms,
        matchedSelectors: sel?.length ? sel : undefined,
      };
      return attempt;
    })
    .filter((a): a is ProviderAttempt => a !== null);

  if (attempts.length > 0) {
    (err as Error & { attempts?: ProviderAttempt[] }).attempts = attempts;
  }
  return err as Error & { attempts?: ProviderAttempt[] };
}

interface UseFileUploadOptions {
  onUploadComplete: (url: string, fileName: string) => void;
}

function selectFileViaInput(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,video/mp4,video/webm,.swf,application/x-shockwave-flash,application/vnd.adobe.flash.movie';
    input.style.display = 'none';
    let resolved = false;
    let focusTimeoutId: number | null = null;

    const cleanup = () => {
      if (focusTimeoutId !== null) {
        window.clearTimeout(focusTimeoutId);
        focusTimeoutId = null;
      }
      input.remove();
      window.removeEventListener('focus', onFocusFallback);
      input.removeEventListener('change', onChange);
      input.removeEventListener('cancel', onCancel);
    };

    const finalize = (file: File | null) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(file);
    };

    const onChange = () => {
      const file = input.files && input.files.length > 0 ? input.files[0] : null;
      finalize(file);
    };

    const onCancel = () => finalize(null);

    // Fallback: some environments don't reliably emit `cancel`.
    const onFocusFallback = () => {
      if (resolved) return;
      if (focusTimeoutId !== null) {
        window.clearTimeout(focusTimeoutId);
      }
      focusTimeoutId = window.setTimeout(() => {
        if (resolved) return;
        const file = input.files && input.files.length > 0 ? input.files[0] : null;
        finalize(file);
      }, 800);
    };

    input.addEventListener('change', onChange);
    input.addEventListener('cancel', onCancel);
    window.addEventListener('focus', onFocusFallback);
    document.body.appendChild(input);
    input.click();
  });
}

export function useFileUpload(options: UseFileUploadOptions) {
  const { t } = useTranslation();
  const { onUploadComplete } = options;
  const uploadMode = useMediaHostingStore((s) => s.uploadMode);
  const preferredProvider = useMediaHostingStore((s) => s.preferredProvider);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const handleUpload = useCallback(async () => {
    if (uploadMode === 'none') return;

    const runtime = getMediaHostingRuntime();
    try {
      setIsUploading(true);
      setUploadedFileName(null);
      const supportedOrder = getProviderOrder({ mode: uploadMode, preferredProvider, runtime });
      const availability = await ensureProviderAvailability(runtime);
      const order = getProviderOrder({ mode: uploadMode, preferredProvider, runtime, availability });

      if (order.length === 0) {
        if (runtime === 'web') {
          window.alert(t('upload_not_supported_web'));
          return;
        }
        if (supportedOrder.length > 0) {
          const message =
            uploadMode === 'preferred' && availability[preferredProvider] === 'unavailable'
              ? `${preferredProvider} is unavailable from this network`
              : 'No reachable upload providers are available from this network';
          throw new Error(message);
        }
        throw new Error(`${preferredProvider} is not supported on ${runtime}`);
      }

      if (runtime === 'android') {
        const result = await FileUploader.pickAndUploadMedia({ providerOrder: order });
        if (result.url) {
          if (result.fileName) setUploadedFileName(result.fileName);
          onUploadComplete(result.url, result.fileName);
        }
        return;
      }

      if (isElectronRuntime()) {
        const file = await selectFileViaInput();
        if (!file) {
          throw new Error(FILE_SELECTION_CANCELLED_ERROR);
        }

        const url = await orchestrateElectronUpload(file, order);
        setUploadedFileName(file.name);
        onUploadComplete(url, file.name);
        return;
      }

      window.alert(t('upload_not_supported_web'));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage === FILE_SELECTION_CANCELLED_ERROR) return;

      const err = normalizeAndroidRejection(error) as Error & { attempts?: ProviderAttempt[] };
      if (err.attempts && err.attempts.length > 0) {
        window.alert(formatAggregatedError(err.attempts, t));
      } else if (uploadMode === 'preferred') {
        window.alert(formatPreferredModeError(errorMessage, t));
      } else {
        window.alert(`${t('upload_failed')}: ${errorMessage}`);
      }
    } finally {
      setIsUploading(false);
    }
  }, [onUploadComplete, t, uploadMode, preferredProvider]);

  return {
    isUploading,
    uploadedFileName,
    handleUpload,
  };
}
