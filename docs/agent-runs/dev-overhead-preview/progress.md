# Progress Log

Append one entry per session.

## 2026-05-28 23:31

- Item: F001
- Summary: Created the `codex/chore/dev-overhead-preview` worktree, read the dev-overhead handoff, and confirmed the baseline smoke flow passes before implementation.
- Files: `docs/agent-runs/dev-overhead-preview/feature-list.json`, `docs/agent-runs/dev-overhead-preview/progress.md`
- Verification: `./scripts/agent-init.sh --smoke`
- Blockers: none
- Next: Add the preview launcher and verify both dev and preview startup paths.

## 2026-05-28 23:44

- Item: F001
- Summary: Added `yarn start:preview`, refactored shared Portless launcher helpers, and added a concise `yarn start` terminal note that points performance checks to the preview launcher.
- Files: `package.json`, `scripts/start-dev.js`, `scripts/start-preview.js`, `scripts/local-server-utils.mjs`, `docs/agent-runs/dev-overhead-preview/feature-list.json`, `docs/agent-runs/dev-overhead-preview/progress.md`
- Verification: `corepack yarn install`; `node --check scripts/start-dev.js && node --check scripts/start-preview.js && node --check scripts/local-server-utils.mjs`; `BROWSER=none corepack yarn start`; `BROWSER=none corepack yarn start:preview`; `curl -k -I https://codex-chore-dev-overhead-preview.5chan.localhost`; `SMOKE_BASE_URL=https://codex-chore-dev-overhead-preview.5chan.localhost/#/ node scripts/smoke-web-app.js`; `playwright-cli` Chrome `/pol` thread/back timing (back: 170ms, 125ms, 120ms); `playwright-cli` Firefox/WebKit `/pol` load checks; `corepack yarn build`; `corepack yarn lint`; `corepack yarn type-check`; `corepack yarn knip`; `PORTLESS=0 BROWSER=none PORT=4990 corepack yarn start:preview`; `curl -I http://127.0.0.1:4990`
- Blockers: none
- Next: Review the diff and decide whether to also make dev-only `react-scan`/`element-source` opt-in in a separate, workflow-synced change.
