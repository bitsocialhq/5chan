# Progress Log

Append one entry per session.

## 2026-03-30 15:07

- Item: F001
- Summary: Built a production-path benchmark harness for real thread replies, fixed multiple estimator mismatches, and collected final desktop/mobile `dom` vs `item-size` measurements.
- Files: `src/components/post-desktop/post-desktop.tsx`, `src/components/post-mobile/post-mobile.tsx`, `src/e2e/pretext-benchmark-harness.tsx`, `src/hooks/use-reply-height-estimates.ts`, `src/lib/utils/pretext-height-estimates.ts`, `src/views/post/post.tsx`
- Verification: `./scripts/agent-init.sh --smoke`, `corepack yarn build`, `corepack yarn lint`, `corepack yarn type-check`, `corepack yarn doctor`, `corepack yarn test --run src/lib/utils/__tests__/pretext-height-estimates.test.ts src/components/__tests__/post-community-address-compat.test.tsx`, Playwright benchmark runs on desktop and mobile for `dom`, `estimates`, and `item-size`
- Blockers: Reply virtualization now reduces DOM measurement reads substantially, but the user-visible performance gain is only modest on desktop and still not accurate enough to call mobile safe by default.
- Next: Start F002 by wiring a benchmarkable board-feed path and compare `dom` vs Pretext sizing on feed cards rather than thread replies.

## 2026-03-30 16:00

- Item: F002
- Summary: Added a board-feed benchmark surface, calibrated feed-card estimates from sampled DOM error, and wired the real board Virtuoso behind `pretextFeed=item-size` with hash-router query parsing support.
- Files: `src/components/post-desktop/post-desktop.tsx`, `src/components/post-mobile/post-mobile.tsx`, `src/e2e/pretext-benchmark-harness.tsx`, `src/hooks/use-reply-height-estimates.ts`, `src/lib/utils/__tests__/pretext-height-estimates.test.ts`, `src/lib/utils/pretext-height-estimates.ts`, `src/views/board/board.tsx`, `src/views/post/post.tsx`
- Verification: `corepack yarn type-check`, `corepack yarn lint`, `corepack yarn build`, `corepack yarn doctor`, `corepack yarn test --run src/lib/utils/__tests__/pretext-height-estimates.test.ts src/components/__tests__/post-community-address-compat.test.tsx`, Playwright board benchmark runs on desktop/mobile for `dom`, `estimates`, and `item-size`, real-route smoke test on `#/mu?pretextFeed=item-size`
- Blockers: The synthetic board benchmark is now clearly better than the reply path, but the live `/mu` route only loaded about 15 cards in this dev environment, so the production-route perf comparison is still too small and noisy to justify default-on rollout.
- Next: Continue F004 by profiling larger live board feeds with `pretextFeed=item-size` and decide whether board feed can ship default-on, mobile-first, or stay flag-gated while catalog/reply work continues.

## 2026-03-30 17:08

- Item: F001, F003, F004
- Summary: Finished catalog row sizing, removed catalog matched-filter render-time store writes, calibrated thread-reply estimates for the real Virtuoso path, extended the benchmark harness to cover catalog, and flipped board/catalog/reply virtualization defaults to `item-size`.
- Files: `docs/agent-runs/pretext-feed-sizing/feature-list.json`, `src/components/catalog-row/__tests__/catalog-row.test.tsx`, `src/components/catalog-row/catalog-row.tsx`, `src/e2e/pretext-benchmark-harness.tsx`, `src/hooks/use-reply-height-estimates.ts`, `src/lib/utils/__tests__/pretext-height-estimates.test.ts`, `src/lib/utils/pretext-height-estimates.ts`, `src/views/board/board.tsx`, `src/views/catalog/__tests__/catalog.test.tsx`, `src/views/catalog/catalog.tsx`
- Verification: `corepack yarn type-check`, `corepack yarn test --run`, `corepack yarn build`, `corepack yarn lint` (existing warnings only), `corepack yarn doctor` (baseline `86/100`), `corepack yarn knip`, Playwright benchmark matrices for board/catalog/replies on desktop and mobile, live-route smoke checks on `#/mu`, `#/mu/catalog`, and `#/mu/thread/QmWSMcz1TirxAcVJ9qKr8jygttVbXZ3bZ9mMpZyek5iu3n`
- Blockers: Live-route perf deltas remain hard to observe in this dev environment because feeds are shallow and RPC noise is high, but the production-path benchmark harness now shows clear wins on all three surfaces and the real routes render correctly with the new defaults.
- Next: Keep the URL overrides (`?pretextFeed=off`, `?pretextCatalog=off`, `?pretextReplies=off`) available for rollback while gathering post-merge feedback on deeper live boards and threads.

## 2026-03-30 18:10

- Item: F002, F004
- Summary: Reproduced the user's `/all` board-feed regression against cached live data from a copied Helium Chromium profile, identified that reply-preview cards were massively overestimated in the strict board `item-size` path, and switched the board rollout to a hybrid strategy that only keeps cached Pretext heights on simple cards without preview replies.
- Files: `src/components/__tests__/post-community-address-compat.test.tsx`, `src/components/post-desktop/post-desktop.tsx`, `src/components/post-mobile/post-mobile.tsx`, `src/lib/utils/pretext-height-estimates.ts`
- Verification: `corepack yarn test --run`, `corepack yarn build`, `corepack yarn lint` (existing warnings only), `corepack yarn type-check`, `corepack yarn doctor` (baseline `86/100`), Helium-profile Playwright probes on `#/biz` and `#/all` for master vs worktree plus desktop/mobile geometry checks on the worktree
- Blockers: Catalog remains the only clearly dramatic live win. Board feeds are now layout-safe and at least slightly smoother, but the hybrid fallback means the board path is a correctness-first improvement rather than a large DOM-read reduction.
- Next: Keep catalog and replies on the current Pretext default path, and continue iterating on a lower-error preview-reply estimator if we want a bigger board-feed win than the new hybrid mode provides.

## 2026-03-30 19:10

- Item: F001, F002, F004
- Summary: Removed the board-feed fallback again, separated preview-reply sizing from thread-reply sizing, preserved real line breaks in Pretext input, recalibrated desktop thread replies, compressed the `itemSize` lookup path, and reran deterministic desktop/mobile benchmark matrices. The board surface is now strict Pretext again with close geometry, desktop replies are materially better, and mobile replies remain the last blocker.
- Files: `docs/agent-runs/pretext-feed-sizing/feature-list.json`, `src/components/__tests__/post-community-address-compat.test.tsx`, `src/components/post-desktop/post-desktop.tsx`, `src/components/post-mobile/post-mobile.tsx`, `src/hooks/use-reply-height-estimates.ts`, `src/lib/utils/pretext-height-estimates.ts`, `src/views/board/board.tsx`
- Verification: `corepack yarn build`, `corepack yarn lint` (existing warnings only), `corepack yarn type-check`, `corepack yarn doctor` (`85/100`, one point below the earlier baseline because the repo still carries existing React Doctor findings), `corepack yarn test --run src/lib/utils/__tests__/pretext-height-estimates.test.ts src/components/__tests__/post-community-address-compat.test.tsx src/views/board/__tests__/board.test.tsx`, deterministic Playwright benchmark runs on desktop and mobile for board/catalog/replies `dom` vs `item-size`
- Blockers: Mobile thread replies still have a bad aggregate scroll-height estimate in the benchmark harness even after the latest calibration passes. Desktop board sizing is now accurate enough, but its deterministic benchmark is measurement-cheaper rather than obviously faster, so the strongest “clear win” story remains catalog, mobile board, and desktop replies.
- Next: Either keep iterating specifically on the mobile thread reply estimator or stop forcing `item-size` on that one surface while shipping the surfaces that are already clearly better.

## 2026-03-31 15:45

- Item: F001, F004
- Summary: Re-profiled mobile thread replies, replaced the broken blanket `-350px` mobile thread calibration with a feature-based mobile thread model, and disabled `content-visibility:auto` on the virtualized reply roots only when the Pretext `item-size` path is active. The key follow-up was a row-by-row mobile audit across the full 1200-reply benchmark: the sampled `item-size` reply tree sums to `722411px` estimated vs `726218px` actual, so the Pretext reply sizing is now within about `0.5%` of the rendered total even though the old DOM Virtuoso path still reports a much smaller overall scroll height.
- Files: `docs/agent-runs/pretext-feed-sizing/feature-list.json`, `src/components/post-desktop/post-desktop.tsx`, `src/components/post-mobile/post-mobile.tsx`, `src/lib/utils/pretext-height-estimates.ts`, `src/views/post/post.module.css`
- Verification: `corepack yarn type-check`, `corepack yarn lint` (existing warnings only), `corepack yarn test --run src/lib/utils/__tests__/pretext-height-estimates.test.ts src/components/__tests__/post-community-address-compat.test.tsx src/views/board/__tests__/board.test.tsx`, `corepack yarn build`, `corepack yarn doctor` (`86/100`, repo baseline), `corepack yarn knip`, Playwright production-path reply benchmarks on mobile and desktop plus row-level mobile geometry sampling
- Blockers: Live deep-thread route verification is still limited by RPC/cached-feed availability in this dev environment, so the strongest proof remains the deterministic production-path harness rather than a real cached thread with thousands of replies.
- Next: If the user wants to ship, prepare the branch for commit/PR with the rollback query flags kept in place (`?pretextFeed=off`, `?pretextCatalog=off`, `?pretextReplies=off`) and do one more live-route smoke pass when cached live data is available.
