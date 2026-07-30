import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { getPackagedKuboPaths } from './start-ipfs.js';

vi.mock('electron-is-dev', () => ({ default: false }));

describe('getPackagedKuboPaths', () => {
  it('prefers the unpacked ASAR binary and retains the loose-package fallback', () => {
    const resourcesPath = path.join('/tmp', '5chan', 'resources');
    const binaryName = process.platform === 'win32' ? 'ipfs.exe' : 'ipfs';
    const platformDirectory = process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'mac' : 'linux';

    expect(getPackagedKuboPaths(resourcesPath)).toEqual([
      path.join(resourcesPath, 'app.asar.unpacked', 'bin', platformDirectory, binaryName),
      path.join(resourcesPath, 'app', 'bin', platformDirectory, binaryName),
    ]);
  });
});
