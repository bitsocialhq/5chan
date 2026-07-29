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
