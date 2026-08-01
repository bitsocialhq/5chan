import path from 'node:path';

export const getIpfsBinaryName = (platform = process.platform) => (platform === 'win32' ? 'ipfs.exe' : 'ipfs');

const getPlatformDirectory = (platform) => {
  if (platform === 'win32') return 'win';
  if (platform === 'darwin') return 'mac';
  return 'linux';
};

export const getBundledKuboPath = (rootPath, platform = process.platform) => path.join(rootPath, 'bin', getPlatformDirectory(platform), getIpfsBinaryName(platform));

export const getPackagedKuboPaths = (resourcesPath, platform = process.platform) => [
  getBundledKuboPath(path.join(resourcesPath, 'app.asar.unpacked'), platform),
  getBundledKuboPath(path.join(resourcesPath, 'app'), platform),
];
