import { beforeEach, describe, expect, it, vi } from 'vitest';
import { orchestrateElectronUpload } from '../upload-orchestrator';
import { uploadToCatbox } from '../../utils/catbox-utils';
import type { ProviderId } from '../types';

vi.mock('../../utils/catbox-utils', () => ({
  uploadToCatbox: vi.fn(),
}));

// Minimal JPEG: SOI + COM segment ("gps!") + SOS with entropy data.
const jpegWithComment = [0xff, 0xd8, 0xff, 0xfe, 0x00, 0x06, 0x67, 0x70, 0x73, 0x21, 0xff, 0xda, 0x00, 0x02, 0x11, 0x22];
const jpegWithoutComment = [0xff, 0xd8, 0xff, 0xda, 0x00, 0x02, 0x11, 0x22];

function createElectronApiMock() {
  return {
    isElectron: true,
    copyToClipboard: vi.fn(async () => ({ success: true })),
    getPlatform: vi.fn(async () => ({ platform: 'darwin' as NodeJS.Platform, arch: 'x64', version: 'v20.0.0' })),
    automateUploadMedia: vi.fn(async (options: { provider: ProviderId }) => ({ url: 'https://i.imgur.com/abc.png', provider: options.provider })),
    automateUploadGeneratedMedia: vi.fn(async (options: { provider: ProviderId }) => ({ url: 'https://i.imgur.com/generated.png', provider: options.provider })),
    getPathForFile: vi.fn((): string | null => '/tmp/image.png'),
  };
}

describe('orchestrateElectronUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.electronApi = undefined;
    window.isElectron = false;
  });

  it('uploads via catbox provider directly', async () => {
    vi.mocked(uploadToCatbox).mockResolvedValue('https://files.catbox.moe/a.png');
    const file = new File(['a'], 'a.png', { type: 'image/png' });

    const url = await orchestrateElectronUpload(file, ['catbox']);

    expect(url).toBe('https://files.catbox.moe/a.png');
    expect(uploadToCatbox).toHaveBeenCalledWith(file);
  });

  it('strips image metadata before uploading to catbox', async () => {
    vi.mocked(uploadToCatbox).mockResolvedValue('https://files.catbox.moe/b.jpg');
    const file = new File([new Uint8Array(jpegWithComment)], 'photo.jpg', { type: 'image/jpeg' });

    await orchestrateElectronUpload(file, ['catbox']);

    const uploaded = vi.mocked(uploadToCatbox).mock.calls[0][0];
    expect(uploaded).not.toBe(file);
    expect(uploaded.name).toBe('photo.jpg');
    expect(Array.from(new Uint8Array(await uploaded.arrayBuffer()))).toEqual(jpegWithoutComment);
  });

  it('strips image metadata before generated media automation', async () => {
    const electronApi = createElectronApiMock();
    electronApi.getPathForFile = vi.fn((): string | null => null);
    window.electronApi = electronApi;

    const file = new File([new Uint8Array(jpegWithComment)], 'photo.jpg', { type: 'image/jpeg' });
    await orchestrateElectronUpload(file, ['imgur']);

    expect(electronApi.automateUploadGeneratedMedia).toHaveBeenCalledWith({
      provider: 'imgur',
      fileName: 'photo.jpg',
      mimeType: 'image/jpeg',
      bytes: jpegWithoutComment,
    });
  });

  it('uses electronApi.getPathForFile when File.path is unavailable', async () => {
    const electronApi = createElectronApiMock();
    window.electronApi = electronApi;

    const file = new File(['x'], 'x.png', { type: 'image/png' });
    const url = await orchestrateElectronUpload(file, ['imgur']);

    expect(url).toBe('https://i.imgur.com/abc.png');
    expect(electronApi.getPathForFile).toHaveBeenCalledWith(file);
    expect(electronApi.automateUploadMedia).toHaveBeenCalledWith({
      provider: 'imgur',
      filePath: '/tmp/image.png',
    });
  });

  it('routes ImgBB through Electron automation', async () => {
    const electronApi = createElectronApiMock();
    electronApi.automateUploadMedia = vi.fn(async () => ({ url: 'https://i.ibb.co/example/image.png', provider: 'imgbb' as const }));
    window.electronApi = electronApi;

    const file = new File(['x'], 'x.png', { type: 'image/png' });
    const url = await orchestrateElectronUpload(file, ['imgbb']);

    expect(url).toBe('https://i.ibb.co/example/image.png');
    expect(electronApi.automateUploadMedia).toHaveBeenCalledWith({
      provider: 'imgbb',
      filePath: '/tmp/image.png',
    });
  });

  it('fails with provider attempt details if no file path can be resolved', async () => {
    const electronApi = createElectronApiMock();
    electronApi.getPathForFile = vi.fn((): string | null => null);
    electronApi.automateUploadGeneratedMedia = undefined as unknown as typeof electronApi.automateUploadGeneratedMedia;
    window.electronApi = electronApi;

    const file = new File(['z'], 'z.png', { type: 'image/png' });

    try {
      await orchestrateElectronUpload(file, ['imgur']);
      throw new Error('Expected orchestrateElectronUpload to throw');
    } catch (error) {
      const typedError = error as Error & {
        attempts?: Array<{ provider: string; error?: string; elapsedMs?: number; stage?: string }>;
      };
      expect(typedError.message).toBe('All providers failed');
      expect(typedError.attempts?.[0]?.provider).toBe('imgur');
      expect(typedError.attempts?.[0]?.error).toContain('File path unavailable and automateUploadGeneratedMedia is not available');
      expect(typedError.attempts?.[0]?.elapsedMs).toBeGreaterThanOrEqual(0);
      expect(typedError.attempts?.[0]?.stage).toBeDefined();
    }
  });

  it('uses generated media automation when no file path can be resolved', async () => {
    const electronApi = createElectronApiMock();
    electronApi.getPathForFile = vi.fn((): string | null => null);
    window.electronApi = electronApi;

    const file = new File(['abc'], 'tegaki.png', { type: 'image/png' });
    const url = await orchestrateElectronUpload(file, ['imgur']);

    expect(url).toBe('https://i.imgur.com/generated.png');
    expect(electronApi.automateUploadGeneratedMedia).toHaveBeenCalledWith({
      provider: 'imgur',
      fileName: 'tegaki.png',
      mimeType: 'image/png',
      bytes: [97, 98, 99],
    });
    expect(electronApi.automateUploadMedia).not.toHaveBeenCalled();
  });

  it('includes stage and matchedSelectors when provider throws block/file-input errors', async () => {
    const electronApi = createElectronApiMock();
    electronApi.automateUploadMedia = vi.fn().mockRejectedValue(new Error('No file input found for imgur. Tried: input[type="file"], #upload'));
    window.electronApi = electronApi;

    const file = new File(['x'], 'x.png', { type: 'image/png' });

    try {
      await orchestrateElectronUpload(file, ['imgur']);
      throw new Error('Expected orchestrateElectronUpload to throw');
    } catch (error) {
      const typedError = error as Error & {
        attempts?: Array<{ provider: string; error?: string; stage?: string; elapsedMs?: number; matchedSelectors?: string[] }>;
      };
      expect(typedError.attempts?.[0]?.provider).toBe('imgur');
      expect(typedError.attempts?.[0]?.stage).toBe('file_input');
      expect(typedError.attempts?.[0]?.matchedSelectors).toEqual(['input[type="file"]', '#upload']);
      expect(typedError.attempts?.[0]?.elapsedMs).toBeGreaterThanOrEqual(0);
    }
  });

  it('parses submit selector failure with matchedSelectors', async () => {
    const electronApi = createElectronApiMock();
    electronApi.automateUploadMedia = vi
      .fn()
      .mockRejectedValue(new Error('No submit button found for imgur. Tried: button[type="submit"], [data-action="upload"], .upload-btn'));
    window.electronApi = electronApi;

    const file = new File(['x'], 'x.png', { type: 'image/png' });

    try {
      await orchestrateElectronUpload(file, ['imgur']);
      throw new Error('Expected orchestrateElectronUpload to throw');
    } catch (error) {
      const typedError = error as Error & {
        attempts?: Array<{ provider: string; stage?: string; matchedSelectors?: string[] }>;
      };
      expect(typedError.attempts?.[0]?.provider).toBe('imgur');
      expect(typedError.attempts?.[0]?.stage).toBe('submit');
      expect(typedError.attempts?.[0]?.matchedSelectors).toEqual(['button[type="submit"]', '[data-action="upload"]', '.upload-btn']);
    }
  });

  it('parses timeout stage when upload or URL extraction times out', async () => {
    const electronApi = createElectronApiMock();
    electronApi.automateUploadMedia = vi.fn().mockRejectedValue(new Error('Upload timeout or no direct URL extracted for imgur (elapsed: 45000ms, timeout: 45000ms)'));
    window.electronApi = electronApi;

    const file = new File(['x'], 'x.png', { type: 'image/png' });

    try {
      await orchestrateElectronUpload(file, ['imgur']);
      throw new Error('Expected orchestrateElectronUpload to throw');
    } catch (error) {
      const typedError = error as Error & {
        attempts?: Array<{ provider: string; stage?: string }>;
      };
      expect(typedError.attempts?.[0]?.provider).toBe('imgur');
      expect(typedError.attempts?.[0]?.stage).toBe('timeout');
    }
  });

  it('parses page_load stage when page fails to load', async () => {
    const electronApi = createElectronApiMock();
    electronApi.automateUploadMedia = vi.fn().mockRejectedValue(new Error('Page load failed: -3 net::ERR_ABORTED'));
    window.electronApi = electronApi;

    const file = new File(['x'], 'x.png', { type: 'image/png' });

    try {
      await orchestrateElectronUpload(file, ['imgur']);
      throw new Error('Expected orchestrateElectronUpload to throw');
    } catch (error) {
      const typedError = error as Error & {
        attempts?: Array<{ provider: string; stage?: string }>;
      };
      expect(typedError.attempts?.[0]?.provider).toBe('imgur');
      expect(typedError.attempts?.[0]?.stage).toBe('page_load');
    }
  });

  it('parses blocked stage when captcha or challenge detected', async () => {
    const electronApi = createElectronApiMock();
    electronApi.automateUploadMedia = vi.fn().mockRejectedValue(new Error('Provider blocked: captcha, login, or challenge detected (imgur), selector: .g-recaptcha'));
    window.electronApi = electronApi;

    const file = new File(['x'], 'x.png', { type: 'image/png' });

    try {
      await orchestrateElectronUpload(file, ['imgur']);
      throw new Error('Expected orchestrateElectronUpload to throw');
    } catch (error) {
      const typedError = error as Error & {
        attempts?: Array<{ provider: string; stage?: string }>;
      };
      expect(typedError.attempts?.[0]?.provider).toBe('imgur');
      expect(typedError.attempts?.[0]?.stage).toBe('blocked');
    }
  });
});
