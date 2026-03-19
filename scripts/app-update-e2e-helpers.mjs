import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, '..');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createTempWorkspace = async (prefix) => fs.promises.mkdtemp(path.join(os.tmpdir(), `${prefix}-`));

const logStep = (message) => {
  console.log(`[app-update-e2e] ${message}`);
};

const runCommand = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    logStep(`$ ${command} ${args.join(' ')}`);

    const child = spawn(command, args, {
      cwd: options.cwd || repoRoot,
      env: {
        ...process.env,
        ...options.env,
      },
      stdio: options.captureOutput ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    });

    let stdout = '';
    let stderr = '';

    if (options.captureOutput) {
      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({
          stdout,
          stderr,
        });
        return;
      }

      reject(new Error(stderr.trim() || `${command} exited with code ${code}`));
    });
  });

const waitFor = async (predicate, { timeoutMs = 120000, intervalMs = 1000, description = 'condition' } = {}) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const result = await predicate();
    if (result) {
      return result;
    }
    await sleep(intervalMs);
  }

  throw new Error(`Timed out waiting for ${description}`);
};

const findFirstMatchingPath = async (rootPath, matcher) => {
  const entries = await fs.promises.readdir(rootPath, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    const entryPath = path.join(rootPath, entry.name);
    if (matcher(entryPath, entry)) {
      return entryPath;
    }

    if (entry.isDirectory()) {
      const nestedMatch = await findFirstMatchingPath(entryPath, matcher);
      if (nestedMatch) {
        return nestedMatch;
      }
    }
  }

  return null;
};

const copyPath = async (sourcePath, targetPath) => {
  await fs.promises.rm(targetPath, {
    recursive: true,
    force: true,
  });
  await fs.promises.mkdir(path.dirname(targetPath), {
    recursive: true,
  });

  if (process.platform === 'darwin' && sourcePath.endsWith('.app')) {
    await runCommand('/usr/bin/ditto', [sourcePath, targetPath]);
    return;
  }

  await fs.promises.cp(sourcePath, targetPath, {
    recursive: true,
  });
};

const startFixtureServer = async () => {
  const state = {
    version: null,
    assets: [],
  };

  const server = http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`);

    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Headers', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }

    if (requestUrl.pathname === '/releases/latest') {
      if (!state.version || state.assets.length === 0) {
        response.writeHead(503, {
          'Content-Type': 'application/json; charset=utf-8',
        });
        response.end(JSON.stringify({ error: 'fixture release not configured' }));
        return;
      }

      response.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      response.end(
        JSON.stringify({
          tag_name: `v${state.version}`,
          html_url: `${requestUrl.origin}/releases/v${state.version}`,
          assets: state.assets.map((asset) => ({
            name: asset.name,
            browser_download_url: `${requestUrl.origin}/assets/${asset.name}`,
          })),
        }),
      );
      return;
    }

    if (requestUrl.pathname.startsWith('/releases/')) {
      response.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
      });
      response.end('<!doctype html><title>Fixture Release</title><p>Fixture release page</p>');
      return;
    }

    if (requestUrl.pathname.startsWith('/assets/')) {
      const assetName = decodeURIComponent(requestUrl.pathname.slice('/assets/'.length));
      const matchedAsset = state.assets.find((asset) => asset.name === assetName);

      if (!matchedAsset) {
        response.writeHead(404, {
          'Content-Type': 'text/plain; charset=utf-8',
        });
        response.end('asset not found');
        return;
      }

      response.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      try {
        await pipeline(fs.createReadStream(matchedAsset.filePath), response);
      } catch (error) {
        logStep(`fixture asset stream failed for ${matchedAsset.filePath}: ${error instanceof Error ? error.message : String(error)}`);
        if (!response.headersSent) {
          response.writeHead(500, {
            'Content-Type': 'text/plain; charset=utf-8',
          });
        }
        if (!response.writableEnded) {
          response.end('asset stream failed');
        }
      }
      return;
    }

    response.writeHead(404, {
      'Content-Type': 'text/plain; charset=utf-8',
    });
    response.end('not found');
  });

  await new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '0.0.0.0', resolve);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Could not resolve fixture server port');
  }

  logStep(`fixture server listening at http://127.0.0.1:${address.port} (android emulator: http://10.0.2.2:${address.port})`);

  return {
    port: address.port,
    setRelease(version, assets) {
      state.version = version;
      state.assets = assets;
      logStep(`fixture server release set to v${version} with assets: ${assets.map((asset) => asset.name).join(', ')}`);
    },
    async close() {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
};

export { copyPath, createTempWorkspace, findFirstMatchingPath, logStep, repoRoot, runCommand, sleep, startFixtureServer, waitFor };
