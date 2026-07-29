# Progress Log

## 2026-07-30 00:04 HKT

- Item: F003
- Summary: Resumed after the permission interruption and completed controlled post-fix `/all` and `/all/catalog` profiling. The selector-scoped loading text fix removes the hidden and visible footer loops while preserving feed ordering, scroll anchoring, exact back/forward restoration, mobile width, and search interaction.
- Files: `src/hooks/use-state-string.ts`, `src/hooks/__tests__/use-state-string.test.tsx`, `src/lib/bitsocial-internals/utils.ts`
- Verification: `./scripts/agent-init.sh --smoke`; fresh Chromium `/all` load and five-second idle profile; `/all` ordering and 15-second anchor check; fresh `/all/catalog` idle and cached back/forward profile; desktop and mobile Firefox/WebKit smoke checks
- Blockers: none
- Next: Complete F004 by making homepage community-stat collectors dormant after resolving the current `statsCid`, then reprofile the loaded homepage.

## 2026-07-30 00:17 HKT

- Item: F004, F005
- Summary: Split homepage stat collection into a CID-selecting wrapper and a request component that unmounts after the current stats CID resolves. A changed CID remounts the request and ignores the previous CID's cached result until the data hook publishes a fresh object. The 64-board homepage is now fully idle instead of continuously committing collector updates.
- Files: `src/hooks/use-communities-stats.ts`, `src/hooks/__tests__/use-communities-stats.test.ts`
- Verification: `corepack yarn test --configLoader runner`; `corepack yarn lint`; `corepack yarn type-check`; `corepack yarn build`; `corepack yarn doctor --scope changed --base master`; React best-practice and effect reviews; code-quality review; fresh Chromium homepage profiling; mid-tier throttled Chromium homepage and `/all`; desktop and 390px mobile Firefox/WebKit homepage smoke checks
- Blockers: none
- Next: Keep acquisition-phase decentralized provider work and cold bundle loading as separate follow-up opportunities; this task's excessive steady-state rerender loops are resolved.

## 2026-07-30 01:06 HKT

- Item: F006
- Summary: Added one shared homepage metadata loader and held each stats request until its stable stats CID exists. This removes the pre-CID request lifecycles and key-driven restarts while preserving refreshes when a CID changes.
- Files: `src/hooks/use-communities-stats.ts`, `src/hooks/__tests__/use-communities-stats.test.ts`, `src/views/home/home.tsx`, `src/views/home/__tests__/home.test.tsx`
- Verification: focused tests; full 1,374-test suite; lint; type-check; build; scoped React Doctor; React best-practice, effect, and code-quality reviews; fresh acquisition profiles; desktop and mobile Chrome, Firefox, and WebKit homepage checks
- Result: First-twenty-second commits improved from 1,211 to 862 (-29%), CommunityStatsRequest renders improved from 1,569 to 491 (-69%), all 64 boards resolved at 21.06s, and the following five seconds were commit-free.
- Blockers: none
- Next: Establish a production-build cold-start baseline before changing startup code.

## 2026-07-30 01:06 HKT

- Item: F007
- Summary: Removed the forced whole-package protocol chunk so the browser can render the homepage from the smaller hook/core graph and load deeper decentralized protocol modules on demand.
- Files: `vite.config.js`
- Verification: controlled Brotli production-build A/B with service workers blocked and identical 4x CPU plus mid-tier network throttling; final production build; lint; type-check; production desktop and mobile checks in Chrome, Firefox, and WebKit
- Result: First content improved from 8.31s to 4.66s, LCP from 8.37s to 4.72s, DOMContentLoaded from 4.97s to 1.07s, load from 5.63s to 1.83s, long-task time from 1.85s to 1.51s, and PWA precache from 4.06 MiB to 439.45 KiB. The full board list remains present while decentralized stats continue resolving.
- Blockers: none
- Next: None; F001-F007 are verified.
