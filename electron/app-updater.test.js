import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  app: {},
  shell: {
    openPath: vi.fn(),
  },
}));

const { sanitizeFileName } = await import('./app-updater.js');

describe('app-updater', () => {
  it('falls back for empty and parent-directory file names', () => {
    expect(sanitizeFileName('')).toBe('5chan-update');
    expect(sanitizeFileName('.')).toBe('5chan-update');
    expect(sanitizeFileName('..')).toBe('5chan-update');
    expect(sanitizeFileName('../..')).toBe('5chan-update');
    expect(sanitizeFileName('nested/..')).toBe('5chan-update');
  });

  it('keeps a normal asset name', () => {
    expect(sanitizeFileName('5chan-darwin-arm64-v0.7.3.zip')).toBe('5chan-darwin-arm64-v0.7.3.zip');
  });
});
