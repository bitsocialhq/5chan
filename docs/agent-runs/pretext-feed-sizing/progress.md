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

## 2026-04-02 16:48

- Item: F002, F004
- Summary: Tightened the desktop board-feed height model by matching the actual OP body render path more closely. The board estimator now adds the desktop blockquote padding, models the board-view truncated-comment notice, exposes an explicit multiboard board-label height hook for `/all`-style feeds, and applies a small desktop preview-reply calibration instead of treating preview replies like full thread rows. That moved the board benchmark from “measurement-cheaper but visibly off” to near-parity runtime with much lower DOM reads.
- Files: `docs/agent-runs/pretext-feed-sizing/feature-list.json`, `src/components/post-desktop/post-desktop.tsx`, `src/lib/utils/__tests__/pretext-height-estimates.test.ts`, `src/lib/utils/pretext-height-estimates.ts`
- Verification: `corepack yarn type-check`, `corepack yarn test --run src/lib/utils/__tests__/pretext-height-estimates.test.ts`, `corepack yarn build`, `corepack yarn lint` (existing warnings only), `corepack yarn doctor` (`86/100`, repo baseline), `corepack yarn test --run`, Playwright desktop board benchmark at `http://127.0.0.1:1356/?e2e=pretext-benchmark&surface=board&variant=production&count=800&seed=42&mode=dom` and `mode=item-size`, fresh-route Playwright smoke on `#/all` and `#/biz`
- Blockers: Fresh browser route smoke still cannot validate deep live `/all` content because RPC/cached-feed availability is inconsistent in this environment, and `./scripts/agent-init.sh --smoke` is not yet worktree-aware because it waits for the canonical `http://5chan.localhost:1355` URL instead of the branch-scoped Portless route.
- Next: Re-test cached live `/all` and `/biz` against the current branch to confirm the board-feed geometry feels better in real browsing, then decide whether the board path is finally strong enough to merge along with catalog/replies.

## 2026-04-02 17:23

- Item: F002, F004
- Summary: Reprofiled live `/all` with the private Node RPC, found that desktop board cards were still underestimating almost exactly `14px` per preview reply, removed that stale feed-level subtraction, and added a regression test so desktop feed cards now add the preview reply estimates directly. The live result changed materially: a 99-card `/all` sample went from `39.7px` mean absolute error before the fix to `7.1px` after the fix, with the controlled board benchmark regaining a cleaner `item-size` win.
- Files: `docs/agent-runs/pretext-feed-sizing/feature-list.json`, `src/lib/utils/__tests__/pretext-height-estimates.test.ts`, `src/lib/utils/pretext-height-estimates.ts`
- Verification: `corepack yarn type-check`, `corepack yarn build`, `corepack yarn lint` (existing warnings only), `corepack yarn doctor` (`86/100`, repo baseline), `corepack yarn test --run src/lib/utils/__tests__/pretext-height-estimates.test.ts`, `corepack yarn test --run`, live Playwright `/all` sampling on `http://codex-feature-pretext-feed-sizing.5chan.localhost:1355/#/all`, live same-branch A/B on `#/all` vs `#/all?pretextFeed=off`, controlled Playwright board benchmark on `?e2e=pretext-benchmark&surface=board&variant=production&count=800&seed=42&mode=dom` and `mode=item-size`
- Blockers: Live `/all` now looks much healthier, but the route-level perf delta versus `pretextFeed=off` is still modest/noisy rather than a dramatic blowout, and the master-origin comparison is not trustworthy yet because the master session is not loading the same feed depth as the worktree even after the settings pass.
- Next: Do another user-driven real-feed pass on `/all` and `/biz` with the new desktop board fix in place, then decide whether the remaining work should focus on squeezing a larger live-route win or on preparing the branch for merge with the current measurable improvement.

## 2026-04-02 17:27

- Item: F002, F004
- Summary: Confirmed that the remaining single-board feed glitching was not primarily a bad Pretext formula. Desktop board preview replies were still rendering under `content-visibility:auto` with the `120px` intrinsic placeholder while the feed card itself was relying on Pretext sizing. I disabled deferred layout for board preview replies when the feed estimate path is active, added dev-only preview reply audit attributes on desktop, and reran live `/biz` sampling. That change dropped `/biz` from `52px` mean absolute feed-card error to `6.7px`.
- Files: `docs/agent-runs/pretext-feed-sizing/feature-list.json`, `src/components/post-desktop/post-desktop.tsx`, `src/components/post-mobile/post-mobile.tsx`
- Verification: `corepack yarn type-check`, `corepack yarn build`, `corepack yarn lint` (existing warnings only), `corepack yarn doctor` (`86/100`, repo baseline), `corepack yarn test --run src/lib/utils/__tests__/pretext-height-estimates.test.ts`, `corepack yarn test --run`, live Playwright `/biz` sampling before and after the deferred-layout fix on `http://codex-feature-pretext-feed-sizing.5chan.localhost:1355/#/biz`
- Blockers: The branch is now much closer to “merge-ready on real feeds,” but the strongest user-facing proof is still the live geometry/jank sampling plus the deterministic harness rather than a clean master-origin A/B, because the master session is still not consuming the same feed depth reliably.
- Next: Do one more human-eye browsing pass on `/all`, `/biz`, and catalog with the current branch. If the route now feels consistently better than production, prepare the branch for merge with the rollback query flags retained.

## 2026-04-02 18:02

- Item: F002, F004
- Summary: Tracked the mobile `/all` stutter to two separate regressions. First, the Pretext worktree was missing `master` commit `99c0bbfac perf(board): reduce mobile reverse-scroll jank`, so `board.tsx` was still snapshotting Virtuoso state on every `scroll` tick and `comment-media.tsx` was double-running the GIF first-frame hook per card. After porting that, live mobile `/all` audits still showed huge feed-card misses on preview-heavy media posts, so I reprofiled the live cards and found the mobile board preview calibration was stale: cards with five preview replies were underestimating by `+371px` / `+367.9px`. I replaced the old aggressive polynomial calibration with a bounded per-preview-count table, then skipped the full thread-reply estimate hook on board previews and memoized the expensive derived reply maps. That collapsed the live mobile `/all` mean absolute feed-card error from about `135px` to about `18.8px` and pulled the reverse-scroll probe much closer to master.
- Files: `docs/agent-runs/pretext-feed-sizing/feature-list.json`, `src/components/comment-media/comment-media.tsx`, `src/components/post-desktop/post-desktop.tsx`, `src/components/post-mobile/post-mobile.tsx`, `src/hooks/use-reply-height-estimates.ts`, `src/lib/utils/__tests__/pretext-height-estimates.test.ts`, `src/lib/utils/pretext-height-estimates.ts`, `src/views/board/board.tsx`
- Verification: `corepack yarn type-check`, `corepack yarn test --run src/lib/utils/__tests__/pretext-height-estimates.test.ts src/components/__tests__/post-community-address-compat.test.tsx src/views/board/__tests__/board.test.tsx`, `corepack yarn build`, `corepack yarn lint` (existing warnings only), `corepack yarn doctor` (`86/100`, repo baseline), live Playwright mobile `/all` geometry audit on `http://codex-feature-pretext-feed-sizing.5chan.localhost:1355/#/all`, live mobile reverse-scroll probe on `http://codex-feature-pretext-feed-sizing.5chan.localhost:1355/#/all`, and matched master control probe on `http://5chan.localhost:1355/#/all`
- Blockers: Mobile `/all` is no longer catastrophically wrong, but the worktree still trails the current master control in the dev reverse-scroll probe. Latest matched sample: worktree `seenCount=23`, `scrollHeight=18209`, `maxFrameMs=133.3`, `slowFrames16=11`, `slowFrames32=9`; master `seenCount=23`, `scrollHeight=17735`, `maxFrameMs=108.3`, `slowFrames16=8`, `slowFrames32=6`.
- Next: Keep tuning the mobile board path until the reverse-scroll probe and human-eye feel are at least on par with master, likely by profiling rerender/commit churn on mobile `/all` now that the geometry bug is fixed.

## 2026-04-02 18:40

- Item: F002, F004
- Summary: Found the remaining mobile `/all` board regression in the board-level Virtuoso prop wiring rather than the Pretext formula. In `off` mode the worktree was still rendering `<Virtuoso itemSize={undefined} />`, which overrides React Virtuoso's internal default DOM measurer. That left mobile multiboard cards stuck on the `defaultItemHeight` fallback (`420px`) instead of reconciling to real DOM sizes, which explained the bad `data-known-size` values, wrong scroll height, and the remaining stutter. I changed board and catalog to only pass `itemSize` when the explicit `item-size` mode is active.
- Files: `docs/agent-runs/pretext-feed-sizing/feature-list.json`, `src/views/board/board.tsx`, `src/views/catalog/catalog.tsx`
- Verification: `corepack yarn type-check`, `corepack yarn build`, `corepack yarn lint` (existing warnings only), `corepack yarn doctor` (`86/100`, repo baseline), `corepack yarn test --run src/views/board/__tests__/board.test.tsx src/lib/utils/__tests__/pretext-height-estimates.test.ts`, fresh Playwright mobile `/all` load on `http://codex-feature-pretext-feed-sizing.5chan.localhost:1355/#/all`, and persistent-session Playwright checks on `http://codex-feature-pretext-feed-sizing.5chan.localhost:1355/#/all`
- Blockers: The biggest correctness bug is fixed, but the live mobile `/all` scroll probe in this noisy dev environment is still not a clean proof of parity versus master. The good signal is that board cards now reconcile correctly again: on the persistent RPC-backed session the first mobile `/all` card went from stale `data-known-size=420` before the fix to `data-known-size=413` after the fix, matching the real measured height.
- Next: Re-run human-eye A/B on mobile `/all` and `/biz` against master. If the feel issue is gone, the branch is much closer to merge-ready; if not, the remaining work is runtime churn rather than height reconciliation.

## 2026-04-02 18:46

- Item: F002, F004
- Summary: Re-ran matched live mobile A/B probes against `master` after the Virtuoso prop fix and confirmed the branch is no longer trailing on the board routes that mattered. On the persistent RPC-backed `/all` sessions, the worktree now renders the same visible card heights as `master` while posting slightly better reverse-scroll numbers in the probe (`maxFrameMs 83.3` vs `99.1`, `slowFrames16 6` vs `7`, `slowFrames32 2` vs `3`). On `/biz`, the branch keeps the Pretext path active (`data-pretext-height` nodes present) while matching the same visible card heights and total scroll height as `master`; probe timing is now in the same range instead of the clear regression the user saw earlier. I also added an inline comment in board/catalog so the `itemSize={undefined}` pitfall is documented in code.
- Files: `docs/agent-runs/pretext-feed-sizing/feature-list.json`, `src/views/board/board.tsx`, `src/views/catalog/catalog.tsx`
- Verification: `corepack yarn type-check`, `corepack yarn build`, `corepack yarn lint` (existing warnings only), `corepack yarn doctor` (`86/100`, repo baseline), `corepack yarn test --run`, matched Playwright mobile A/B on `http://codex-feature-pretext-feed-sizing.5chan.localhost:1355/#/all` vs `http://5chan.localhost:1355/#/all`, matched Playwright mobile A/B on `http://codex-feature-pretext-feed-sizing.5chan.localhost:1355/#/biz` vs `http://5chan.localhost:1355/#/biz`, and catalog smoke on both origins at `#/all/catalog`
- Blockers: None in the implementation itself. Remaining work before merge is review/commit/PR hygiene, plus the follow-up GitHub issue about future custom virtualization once this branch lands.
- Next: Prepare the branch for merge, keep `FeedCacheContainer`, and open the deferred “Pretext unlocks custom virtualization” issue only after the Pretext rollout is merged into `master`.
