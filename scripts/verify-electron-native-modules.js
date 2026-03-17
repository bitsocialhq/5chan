import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const electronBinary = require('electron');

if (typeof electronBinary !== 'string' || electronBinary.length === 0) {
  throw new Error('Failed to resolve the Electron executable for native-module verification');
}

const nativeModules = ['better-sqlite3'];
const verificationScript = `
console.log('electron modules', process.versions.modules);
for (const moduleName of ${JSON.stringify(nativeModules)}) {
  try {
    require(moduleName);
    console.log('native-ok', moduleName);
  } catch (error) {
    console.error('native-fail', moduleName);
    console.error(error && error.stack ? error.stack : String(error));
    process.exit(1);
  }
}
`;

const result = spawnSync(electronBinary, ['-e', verificationScript], {
  encoding: 'utf8',
  env: {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
  },
});

if (result.stdout) {
  process.stdout.write(result.stdout);
}

if (result.stderr) {
  process.stderr.write(result.stderr);
}

if (result.status !== 0) {
  throw new Error(`Electron native-module verification failed with exit code ${result.status ?? 'unknown'}`);
}
