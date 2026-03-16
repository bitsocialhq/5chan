import { downloadIpfsClients } from './electron/before-pack.js';

const config = {
  packagerConfig: {
    name: '5chan',
    executableName: '5chan',
    appBundleId: '5chan.desktop',
    icon: './public/icon', // electron-forge adds the correct extension per platform

    // NOTE: asar is disabled because of a bug where electron-packager silently fails
    // during asar creation with 5chan's large node_modules. The app works fine without it.
    // TODO: investigate and fix the asar creation issue
    asar: false,

    // Exclude unnecessary files from the package
    ignore: [
      /^\/src$/,
      /^\/public$/,
      /^\/android$/,
      /^\/\.github$/,
      /^\/scripts$/,
      /^\/\.git/,
      /^\/\.plebbit$/,
      /^\/out$/,
      /^\/dist$/,
      /^\/squashfs-root$/,
      /\.map$/,
      /\.md$/,
      /\.ts$/,
      /tsconfig\.json$/,
      /\.oxfmtrc/,
      /oxlintrc/,
      /vite\.config/,
      /forge\.config/,
      /capacitor\.config/,
      /\.env$/,
      /\.DS_Store$/,
      /yarn\.lock$/,
      // Exclude build-time scripts from the package
      /electron\/before-pack\.js/,
      // Exclude .bin directories anywhere in node_modules (contain escaping symlinks)
      /node_modules\/.*\/\.bin/,
      /node_modules\/\.bin/,
      /node_modules\/\.cache/,
    ],
  },

  rebuildConfig: {
    force: true,
  },

  hooks: {
    // Download IPFS/Kubo binaries before packaging
    generateAssets: async () => {
      console.log('Downloading IPFS clients...');
      await downloadIpfsClients();
      console.log('IPFS clients downloaded.');
    },
  },

  makers: [
    // macOS
    {
      name: '@electron-forge/maker-dmg',
      platforms: ['darwin'],
      config: {
        name: '5chan',
        icon: './public/icon.icns',
        format: 'ULFO',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    // Windows
    {
      name: '@electron-forge/maker-squirrel',
      platforms: ['win32'],
      config: {
        name: '5chan',
        setupIcon: './public/windows-icon.ico',
      },
    },
    // Linux
    {
      name: '@reforged/maker-appimage',
      platforms: ['linux'],
      config: {
        options: {
          name: '5chan',
          icon: './public/icon.png',
          categories: ['Network'],
        },
      },
    },
  ],
};

export default config;
