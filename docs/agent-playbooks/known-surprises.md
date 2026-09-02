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

### Yarn Berry never runs `pre*`/`post*` hooks on user-defined scripts

- **Date:** 2026-09-02
- **Observed by:** Tommaso + Claude
- **Context:** Investigating why the vendored directory mirror in `src/data/5chan-directories/` went stale (it lacked `/r/` until a manual `yarn sync:directories`) even though `package.json` had `prebuild`/`prestart` entries that called `sync:directories` and `generate:assets`.
- **What was surprising:** This repo uses Corepack-managed Yarn 4 (Berry), which by design does not run npm-style `pre<script>`/`post<script>` hooks for user-defined scripts; it only honours `preinstall`/`install`/`postinstall`, `prepack`/`postpack`, and `prepublish`. `yarn build` went straight to `vite build` and `yarn start` straight to the dev server, so the "automatic" sync and asset generation never ran locally, in CI, on Vercel, or in Electron/Android builds. The entries still work when invoked by name (`yarn run prebuild`), which makes them look alive.
- **Impact:** The committed mirror is exactly what ships; upstream directory changes only reached users when someone ran the sync by hand. Any future `pre*`/`post*` entry for a custom script is silently ignored the same way.
- **Mitigation:** Compose lifecycle intent explicitly: `refresh:generated` runs `sync:directories` and `generate:assets`, and `build` and `start` invoke it as their first step (`corepack yarn refresh:generated && ...`); `scripts/start-android-usb.mjs` calls the same script. Never add `pre*`/`post*` entries for custom scripts in this repo; chain the step into the script itself or into the orchestrating Node script.
- **Status:** confirmed

### Agent verification can saturate contributor laptops

- **Date:** 2026-08-26
- **Observed by:** Tommaso + Codex
- **Context:** Verifying a reply-loading fix while multiple 5chan worktrees already had Vite servers running.
- **What was surprising:** The full Vitest suite started a coordinator plus four Node workers, and subsequent build and React Doctor work ran while existing dev servers remained active. Even sequential heavy commands can saturate several CPU cores when they stack on long-lived worktree servers.
- **Impact:** The contributor laptop became nearly unresponsive for a short period, with several Node processes each consuming close to or more than one CPU core.
- **Mitigation:** Before heavy verification, inspect existing repo processes; remember that `create-task-worktree.sh` automatically installs dependencies; reuse or stop only agent-owned dev servers; cap agent-invoked Vitest at two workers; run worktree creation/installs, full tests, coverage, builds, React Doctor, Electron/Android work, and browser/profiler checks sequentially across all agents; and clean up every process/session the agent starts.
- **Status:** confirmed

### GitHub Projects are not used for repository workflow

- **Date:** 2026-07-23
- **Observed by:** Tommaso + Claude
- **Context:** porting the `review-and-merge-pr` skill fix from `bitsocial-react-hooks` after a merged PR was finalized against a project board
- **What was surprising:** the `review-and-merge-pr` and `make-closed-issue` skills still referenced an organization project and project item even though this repository no longer uses GitHub Projects.
- **Impact:** agents can waste time querying a nonexistent project or report a successful merge as incomplete.
- **Mitigation:** keep pull-request review and merge workflows independent of GitHub issues and Projects; only create or manage an issue when the user explicitly requests one.
- **Status:** confirmed

### react-doctor score reflects React-Compiler coverage, not code health — do not chase it

- **Date:** 2026-06-05
- **Observed by:** Tommaso + Claude
- **Context:** Trying to raise the `yarn doctor` (react-doctor) score to 90 (PR #1155).
- **What was surprising:** The score is overwhelmingly driven by React-Compiler *optimizability* diagnostics, not code quality. Most of the ~92 "errors" are the `react-hooks-js` plugin flagging valid, idiomatic code the React Compiler (v1.0) cannot optimize *yet* — `refs` (the deliberate latest-ref idiom for a stable callback) and `todo` (`try/finally` and throw-in-`try/catch` the compiler can't lower). The score also saturates on the *fraction of files with zero diagnostics*: removing 150 warnings moved it +1; suppressing all 76 compiler-bailout errors reached only 63; only suppressing essentially every rule reaches 90.
- **Impact:** Agents/contributors can burn large effort (and risk real regressions) "fixing" the score by rewriting correct code into compiler-friendly-but-worse shapes, or by suppressing rules until the badge is meaningless. ~63 is the honest, no-regression ceiling.
- **Mitigation:** Do NOT treat the aggregate react-doctor score as a target to grind up (the README badge was removed for this reason). Use react-doctor as a PR-diff reviewer — `yarn doctor --scope changed --base <base> --annotations`, already wired in `.github/workflows/react-doctor.yml` (releases use `yarn doctor --diff <previous tag>` in `release.yml`) — to catch *newly introduced* issues. `doctor.config.jsonc` deliberately does not enforce the `react-hooks-js` rules or `react-compiler-no-manual-memoization` (intentional patterns / current compiler limits). Only fix genuine bugs (e.g. clean `no-adjust-state-on-prop-change` cases). Full reasoning: `docs/agent-runs/react-doctor-score/`.
- **Status:** confirmed

### Portless 0.11 reuses legacy proxy state unless the launcher forces HTTPS

- **Date:** 2026-04-28
- **Observed by:** Tommaso + Codex
- **Context:** Upgrading the normal `yarn start` flow from the old `http://5chan.localhost:1355` proxy URL to `https://5chan.localhost`.
- **What was surprising:** Even with `portless@0.11.1` installed, Portless reused the existing `~/.portless/proxy.port = 1355` HTTP proxy and printed the legacy `:1355` URL.
- **Impact:** Updating package versions and docs is not enough; `yarn start` can still advertise and use the old URL when a contributor has legacy Portless state running.
- **Mitigation:** Keep `scripts/start-dev.js` explicitly starting the Portless HTTPS proxy on port `443` before registering the app route, so the runtime flow migrates away from persisted `1355` state instead of inheriting it.
- **Status:** confirmed

### Android release signing still uses legacy keystore names

- **Date:** 2026-04-23
- **Observed by:** Codex
- **Context:** Cutting the `v0.8.0` release after the core terminology rename changed release workflow signing references.
- **What was surprising:** The tracked Android release keystore and its GitHub secret still carried pre-rebrand names; changing only the workflow references to the rebranded names made the Android release artifact fail at signing.
- **Impact:** Tag releases can pass the Android build and then fail before publishing because `apksigner` cannot find the keystore or password secret.
- **Mitigation:** The tracked keystore is now `android/bitsocial.keystore` and the workflow reads `BITSOCIAL_KEYSTORE_PASSWORD`. The matching GitHub secret must exist before the next tag release, or `apksigner` fails. The lesson generalises: migrate the tracked file, the workflow path, and the GitHub secret in one change, never the references alone.
- **Status:** resolved

### 5chan consumes a pinned hooks tarball instead of using the local hooks repo

- **Date:** 2026-04-15
- **Observed by:** Codex
- **Context:** Debugging strict `{name, publicKey}` community refs after upstream fixes landed in `bitsocial-react-hooks`
- **What was surprising:** 5chan does not consume the nearby `/Users/Tommaso/Desktop/bitsocial/bitsocial-react-hooks` checkout by default; `package.json` installs a pinned GitHub tarball of `@bitsocialnet/bitsocial-react-hooks`.
- **Impact:** Agents can wrongly assume local hooks source changes are already active in 5chan, or debug the wrong package build when the app is really running a tarball revision from GitHub.
- **Mitigation:** Before debugging hooks behavior from 5chan, check `package.json` to see whether the app points at a tarball commit or a local path. If you need fresh hooks behavior, update the tarball commit or temporarily switch 5chan to a local path intentionally.
- **Status:** superseded — `package.json` now installs `@bitsocial/bitsocial-react-hooks` from npm (e.g. `0.1.26`), not a GitHub tarball. The general advice (check `package.json` before assuming local hooks changes are active) still applies.

### Hooks source commits can land before the generated tarball payload

- **Date:** 2026-04-18
- **Observed by:** Codex
- **Context:** 5chan CI failed after `expandTimeWindow` landed in `bitsocial-react-hooks` because the app was pinned to the feature source commit.
- **What was surprising:** `bitsocial-react-hooks` uses `dist/` as its published entrypoint, and the repo's CI writes that generated payload in a follow-up `chore(ci): update dist and coverage badge` commit after the source commit lands on `master`.
- **Impact:** Pinning 5chan to the feature source SHA can install a tarball whose runtime and typings still omit the new API, causing downstream type errors even though the hooks repo's source and CI look green.
- **Mitigation:** When updating 5chan to a new hooks change, verify whether hooks `master` has a newer follow-up `chore(ci): update dist and coverage badge` commit and pin 5chan to that dist-synced SHA rather than the source-only SHA.
- **Status:** superseded — 5chan now consumes `@bitsocial/bitsocial-react-hooks` as a published npm version, so tarball-SHA pinning mechanics no longer apply.

### Portless breaks Windows installs

- **Date:** 2026-03-04
- **Observed by:** Codex
- **Context:** GitHub Actions `Test Windows` dependency install on `windows-2022`
- **What was surprising:** `portless@0.5.2` is a local dev-only tool, but keeping it in `devDependencies` makes `yarn install` fail on Windows because the package declares `win32` unsupported.
- **Impact:** Windows CI fails before build steps run, even though the app does not need `portless` there.
- **Mitigation:** Keep `portless` in `optionalDependencies` and make `yarn start` fall back to direct `vite` startup when `portless` is unavailable.
- **Status:** confirmed

### Electron RPC uses direct pkc-js imports

- **Date:** 2026-03-07
- **Observed by:** Codex
- **Context:** The desktop bootstrap now imports `@pkcprotocol/pkc-js/rpc` directly from `electron/start-pkc-rpc.js`.
- **What was surprising:** Most app data access still goes through `@bitsocialnet/bitsocial-react-hooks`, but the Electron-local RPC bootstrap is intentionally a direct `pkc-js` integration.
- **Impact:** Agents may try to route Electron RPC back through hooks, or reintroduce the legacy protocol package name while fixing dependency/tooling warnings.
- **Mitigation:** Keep Electron RPC on direct `@pkcprotocol/pkc-js` imports. If `knip` flags `electron/start-pkc-rpc.js`, audit the actual dependency graph before adding ignores or legacy packages.
- **Status:** confirmed

### Electron packaging can ship a broken `better-sqlite3` binary

- **Date:** 2026-03-17
- **Observed by:** Codex
- **Context:** Investigating the `v0.7.1` macOS arm64 DMG after the app showed a live IPFS node but never loaded boards or comments.
- **What was surprising:** The packaged app can start IPFS successfully while `electron/start-pkc-rpc.js` loops forever because `/Applications/5chan.app/.../better_sqlite3.node` was built for plain Node 22 (`NODE_MODULE_VERSION 127`) instead of Electron 36 (`NODE_MODULE_VERSION 135`).
- **Impact:** The local RPC server on `ws://localhost:9138` never starts, so the desktop app cannot load boards, posts, or comments even though node stats look healthy.
- **Mitigation:** Before any Electron package/build job, run `yarn electron:prepare-package` so `better-sqlite3` is rebuilt for Electron and immediately verified via `ELECTRON_RUN_AS_NODE=1 electron`.
- **Status:** confirmed

### Plain Vite fallback used to hard-fail on port 1355

- **Date:** 2026-03-30
- **Observed by:** Codex
- **Context:** Running `PORTLESS=0 yarn start` while another local service already owned port `3000`
- **What was surprising:** The non-Portless dev fallback forced Vite onto `5chan.localhost` with `--strictPort`, so the fallback path could fail immediately even though the main Portless flow is collision-safe.
- **Impact:** Contributors could lose the fallback dev path or interrupt their startup flow when `3000` was already busy.
- **Mitigation:** Keep the fallback behind `scripts/start-dev.js`, which now probes from `3000` upward and starts Vite on the next free port instead of exiting.
- **Status:** confirmed

### Fixed Portless app names collide across 5chan worktrees

- **Date:** 2026-03-30
- **Observed by:** Codex
- **Context:** Starting `yarn start` in one 5chan worktree while another 5chan worktree was already serving through Portless
- **What was surprising:** Using the literal Portless app name `5chan` in every worktree makes the route itself collide, even when the backing ports are different, so the second process fails with `"5chan.localhost" is already registered`.
- **Impact:** Parallel 5chan branches can block each other even though Portless is meant to let them coexist safely.
- **Mitigation:** Keep Portless startup behind `scripts/start-dev.js`, which now uses a branch-scoped `*.5chan.localhost` route outside the canonical case and automatically increments a `-2`, `-3`, ... suffix when that branch-scoped route is already occupied.
- **Status:** confirmed

### Toolchain model names and inheritance are not interchangeable

- **Date:** 2026-04-08
- **Updated:** 2026-07-10
- **Observed by:** contributor + Codex
- **Context:** Reviewing repo-managed agent configs under `.codex/agents`, `.cursor/agents`, and `.claude/agents`
- **What was surprising:** Model names remain harness-specific, while Codex custom-agent `model` and `model_reasoning_effort` settings are optional and inherit from the parent when omitted; Codex does not document a `latest` alias for these files.
- **Impact:** Hard-coded Codex model or reasoning-effort settings can become stale or unsupported and prevent subagents from following the contributor's current parent configuration.
- **Mitigation:** Keep `.cursor` agents on Cursor-supported models, never use `composer-2` in `.claude`, and omit `model` and `model_reasoning_effort` from committed custom-agent TOMLs under `.codex/**/agents/*.toml`; `yarn ai-workflow:check` rejects pins so Codex agents keep inheriting parent settings.
- **Status:** confirmed

### codesign parses "5chan.app" as process ID 5

- **Date:** 2026-06-12
- **Observed by:** contributor + Claude
- **Context:** Running the first signed + notarized mac Electron build (`yarn electron:build:mac:arm64` with Apple credentials set)
- **What was surprising:** `@electron/notarize` 2.x runs its pre-upload signature check as `codesign -dv 5chan.app` from the bundle's parent directory, and `codesign` accepts a process ID in place of a path — so it parses the digit-leading basename as PID 5 and fails with `5chan.app: No such process` even though the app is signed correctly.
- **Impact:** Notarization aborts after a successful signing pass; the error message looks like a signing failure and invites debugging the certificate/keychain instead of the real cause. Any tool that shells out to `codesign` with a bare relative path can hit this because the app is literally named `5chan`.
- **Mitigation:** Keep the yarn patch `.yarn/patches/@electron-notarize-npm-2.5.0-*.patch` (backport of electron/notarize#245, prefixes the basename with `./`) until electron-forge depends on `@electron/notarize` >= 3.x. When invoking `codesign` manually on the app bundle, always use an absolute or `./`-prefixed path.
- **Status:** confirmed

### react-scan's `getReport()` is dead API and can never return data

- **Date:** 2026-07-27
- **Observed by:** contributor + Claude
- **Context:** Running the `profile-browsing` skill against a branch to measure excessive rerenders, and getting no component data back
- **What was surprising:** Three independent failures stacked up silently. (1) `getReport()` returns `Store.legacyReportData`, which react-scan 0.5.3 initializes as an empty `Map` and never writes to anywhere in the bundle. (2) The live `Store.reportData` is only populated inside `if (options.showToolbar !== false && Store.inspectState.value.kind === 'focused')` — but the profiler sets `__PROFILING__=true`, which sets `showToolbar: false`, and `'focused'` requires a human clicking the inspector onto one component, so it is unreachable under automation. (3) `getReport()` returns a `Map`, and `JSON.stringify(new Map())` is `"{}"` regardless of contents, so the skill's collection line would have printed `{}` even if data existed. The skill and profiler agent additionally claimed the app was configured with `report: true`; react-scan 0.5.3 has no `report` option at all, and passing one logs `[React Scan] Invalid options: - Unknown option "report"`.
- **Impact:** Every profiling run reported zero react-scan component data without erroring, so rerender hotspots looked invisible and profiling silently degraded to raw commit counts.
- **Mitigation:** `src/lib/react-scan.ts` now accumulates render data through react-scan's `onRender` option, which is only skipped when `isPaused && inspectorInactive` (verified `isPaused: false` with the toolbar off). It exposes `window.__getReactScanReport()` returning a plain, JSON-serializable object and `window.__resetReactScanReport()`. Never reintroduce `getReport()`, and never `JSON.stringify` a `Map`. Set `window.__PROFILING_UNNECESSARY__ = true` to opt into `trackUnnecessaryRenders`; it is off by default because it adds overhead that skews the `time` field.
- **Status:** confirmed
