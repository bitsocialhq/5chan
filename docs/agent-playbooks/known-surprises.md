# Known Surprises

This file tracks repository-specific confusion points that caused agent mistakes.

## Entry Criteria

Add an entry only if all are true:

- It is specific to this repository (not generic advice).
- It is likely to recur for future agents.
- It has a concrete mitigation that can be followed.

If uncertain, ask the developer before adding an entry.

## Entry Template

```md
### [Short title]

- **Date:** YYYY-MM-DD
- **Observed by:** agent name or contributor
- **Context:** where/when it happened
- **What was surprising:** concrete unexpected behavior
- **Impact:** what went wrong or could go wrong
- **Mitigation:** exact step future agents should take
- **Status:** confirmed | superseded
```

## Entries

### Portless breaks Windows installs

- **Date:** 2026-03-04
- **Observed by:** Codex
- **Context:** GitHub Actions `Test Windows` dependency install on `windows-2022`
- **What was surprising:** `portless@0.5.2` is a local dev-only tool, but keeping it in `devDependencies` makes `yarn install` fail on Windows because the package declares `win32` unsupported.
- **Impact:** Windows CI fails before build steps run, even though the app does not need `portless` there.
- **Mitigation:** Keep `portless` in `optionalDependencies` and make `yarn start` fall back to direct `vite` startup when `portless` is unavailable.
- **Status:** confirmed

### Do not add plebbit-js directly for Electron RPC

- **Date:** 2026-03-07
- **Observed by:** Codex
- **Context:** Adding `knip` exposed `electron/start-plebbit-rpc.js` importing `@plebbit/plebbit-js/rpc` as an unlisted dependency.
- **What was surprising:** Even though that file imports `@plebbit/plebbit-js` directly, repository policy is to depend only on `@bitsocialnet/bitsocial-react-hooks` and use its transitive copy of `plebbit-js`.
- **Impact:** Agents may “fix” the unlisted import by adding `@plebbit/plebbit-js` to `package.json`, which violates project policy.
- **Mitigation:** Do not add `@plebbit/plebbit-js` to `package.json` for this repo. If `knip` flags `electron/start-plebbit-rpc.js`, handle it with a targeted `ignoreIssues` entry instead.
- **Status:** confirmed

### Electron packaging can ship a broken `better-sqlite3` binary

- **Date:** 2026-03-17
- **Observed by:** Codex
- **Context:** Investigating the `v0.7.1` macOS arm64 DMG after the app showed a live IPFS node but never loaded boards or comments.
- **What was surprising:** The packaged app can start IPFS successfully while `electron/start-plebbit-rpc.js` loops forever because `/Applications/5chan.app/.../better_sqlite3.node` was built for plain Node 22 (`NODE_MODULE_VERSION 127`) instead of Electron 36 (`NODE_MODULE_VERSION 135`).
- **Impact:** The local RPC server on `ws://localhost:9138` never starts, so the desktop app cannot load boards, posts, or comments even though node stats look healthy.
- **Mitigation:** Before any Electron package/build job, run `yarn electron:prepare-package` so `better-sqlite3` is rebuilt for Electron and immediately verified via `ELECTRON_RUN_AS_NODE=1 electron`.
- **Status:** confirmed
