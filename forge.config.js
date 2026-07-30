import { downloadIpfsClients } from './electron/before-pack.js';
import path from 'node:path';

// Sign and notarize the mac app only when Apple credentials are present (CI release
// builds); local builds without the certificate stay unsigned and keep working.
const shouldSignMac = process.platform === 'darwin' && !!process.env.APPLE_ID && !!process.env.APPLE_APP_SPECIFIC_PASSWORD && !!process.env.APPLE_TEAM_ID;

const config = {
  packagerConfig: {
    name: '5chan',
    executableName: '5chan',
    appBundleId: '5chan.desktop',
    icon: './public/icon', // electron-forge adds the correct extension per platform

    // Keep Squirrel from processing the deeply nested dependency tree as loose files.
    // Executables and native modules still need real filesystem paths at runtime.
    asar: {
      unpackDir: path.join('{bin,node_modules/better-sqlite3}', '**', '*'),
    },

    // Exclude unnecessary files from the package
    ignore: [
      /^\/src$/,
      /^\/public$/,
      /^\/android$/,
      /^\/\.github$/,
      /^\/scripts$/,
      /^\/\.git/,
      /^\/\.pkc$/,
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

    ...(shouldSignMac && {
      osxSign: {
        // identity is auto-discovered from the keychain (the only Developer ID
        // Application identity present, both locally and in the CI temp keychain)
        optionsForFile: () => ({
          hardenedRuntime: true,
          entitlements: './electron/entitlements.plist',
        }),
      },
      osxNotarize: {
        appleId: process.env.APPLE_ID,
        appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
        teamId: process.env.APPLE_TEAM_ID,
      },
    }),
  },

  rebuildConfig: {
    // Only better-sqlite3 is intentionally prepared and verified before packaging.
    // Using `onlyModules` prevents Forge from rebuilding unrelated optional addons
    // that inflate Windows package times.
    onlyModules: ['better-sqlite3'],
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
