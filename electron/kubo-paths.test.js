import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getPackagedKuboPaths } from './kubo-paths.js';

describe('getPackagedKuboPaths', () => {
  it.each([
    ['win32', 'win', 'ipfs.exe'],
    ['darwin', 'mac', 'ipfs'],
    ['linux', 'linux', 'ipfs'],
  ])('prefers the unpacked ASAR binary on %s and retains the loose-package fallback', (platform, platformDirectory, binaryName) => {
    const resourcesPath = path.join('/tmp', '5chan', 'resources');

    expect(getPackagedKuboPaths(resourcesPath, platform)).toEqual([
      path.join(resourcesPath, 'app.asar.unpacked', 'bin', platformDirectory, binaryName),
      path.join(resourcesPath, 'app', 'bin', platformDirectory, binaryName),
    ]);
  });
});
