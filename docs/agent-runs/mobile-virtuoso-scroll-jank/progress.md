# Progress Log

Append one entry per session.

## 2026-03-31 19:10

- Item: F001
- Summary: Created a dedicated fix worktree, loaded the profiling workflow, and installed dependencies in the fresh checkout after the required smoke bootstrap initially failed to resolve `playwright`.
- Files: `docs/agent-runs/mobile-virtuoso-scroll-jank/feature-list.json`, `docs/agent-runs/mobile-virtuoso-scroll-jank/progress.md`
- Verification: `./scripts/create-task-worktree.sh fix mobile-virtuoso-scroll-jank`, `corepack yarn install`
- Blockers: `./scripts/agent-init.sh --smoke` failed before install because the fresh worktree had no local dependency install yet.
- Next: Start a branch-scoped dev server, rerun the smoke flow against that URL, then profile the mobile /all feed with the custom RPC.

## 2026-03-31 19:24

- Item: F001
- Summary: Profiled mobile `/all` with the custom RPC, confirmed Virtuoso row-height mismatch on mobile multiboards, then raised the mobile board-feed default item height and viewport buffer while making the board scroll-state listener passive.
- Files: `src/views/board/board.tsx`, `src/views/board/__tests__/board.test.tsx`, `docs/agent-runs/mobile-virtuoso-scroll-jank/feature-list.json`, `docs/agent-runs/mobile-virtuoso-scroll-jank/progress.md`
- Verification: `AGENT_APP_URL=http://127.0.0.1:1356 ./scripts/agent-init.sh --smoke`, `yarn test src/views/board/__tests__/board.test.tsx`, `yarn test`, `yarn build`, `yarn lint`, `yarn type-check`, `yarn doctor`, `playwright-cli` mobile `/all` load-and-scroll check, Playwright mobile `/all` profiling probe
- Blockers: Fresh desktop comparator sessions intermittently failed to hydrate `/all` rows, so desktop scroll-jank comparison stayed inconclusive even though mobile evidence was sufficient to isolate the board-feed issue.
- Next: Ready for user review on `codex/fix/mobile-virtuoso-scroll-jank`.

## 2026-03-31 19:44

- Item: F001
- Summary: After the first pass still reproduced reverse-scroll stutter, shifted the board feed off the per-scroll `getState()` path, increased mobile multiboard reverse overscan, and removed duplicate GIF first-frame work inside `CommentMedia`.
- Files: `src/views/board/board.tsx`, `src/views/board/__tests__/board.test.tsx`, `src/components/comment-media/comment-media.tsx`, `docs/agent-runs/mobile-virtuoso-scroll-jank/feature-list.json`, `docs/agent-runs/mobile-virtuoso-scroll-jank/progress.md`
- Verification: `yarn test src/views/board/__tests__/board.test.tsx`, `playwright-cli` mobile `/all` repro with the custom RPC on `http://127.0.0.1:1356`, `yarn test`, `yarn type-check`, `yarn lint`, `yarn build`, `yarn doctor`
- Blockers: Headless scripted scroll traces are noisy for long-task timing, so browser evidence is strongest on reduced remount churn and removal of duplicate GIF thumbnail work rather than a perfectly stable synthetic benchmark.
- Next: Have the user retry the exact mobile `/all` reverse-scroll path on this branch and confirm whether the remaining hitch is gone or narrow any residual stutter further.
