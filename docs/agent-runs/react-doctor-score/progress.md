# React Doctor Score → 90 — Progress Log

Goal: react-doctor **product-code** score ≥ 90 with zero UI/UX regressions.
Branch: `codex/chore/react-doctor-score`. Tracking: `feature-list.json` (this dir).

## Key facts

- React Compiler IS enabled (`babel-plugin-react-compiler`, [vite.config.ts](../../../vite.config.ts)). Deleting manual memo in files the compiler optimizes is safe — it re-memoizes automatically.
- Score is **density-based**: excluding test files moved it only 54→55. No config shortcut to 90; must clear most of the 607 product diagnostics.
- Baseline (after F001 config fix): **55** — 92 errors, 515 warnings, 607 total, 118 product files.
- Verification gate per phase: `yarn type-check && yarn lint && yarn test && yarn build && yarn doctor:score`, plus playwright-cli e2e across Blink/Gecko/WebKit + mobile on touched surfaces. Never mark a phase done without re-measuring doctor AND confirming no new diagnostics + no UX regression.

## 2026-06-05 — F001 done

- Item: F001 (config fix)
- Summary: react-doctor was scoring 82 test files because the intended ignore in `react-doctor.config.json` was shadowed by a `reactDoctor` package.json key, and `ignore.files` is broken in rd 0.4.0 (collapses scope, drops product files). Switched to a single canonical `doctor.config.json` using `ignore.overrides`, which correctly excludes only test files.
- Files: `doctor.config.json` (new), `package.json` (removed reactDoctor key), `react-doctor.config.json` (deleted).
- Verification: `yarn doctor:score` == 55; 0 test-file diagnostics; all 118 product files still scored; `yarn lint` clean. Committed `928784aa3`.
- Next: F002 Phase 1 safe bulk (memo deletions in non-bailout files + barrel imports + small mechanical) via workflow, one agent per file.

## 2026-06-05 — F002 Phase 1 pilot (9 files) + scaled run launched

- Item: F002. Piloted 9 representative files via a fix+verify workflow, then launched the scaled run (47 files).
- **Calibration (critical):** ~12–13 warning fixes moved the score only 55→56. Score is steeply density-based and integer-rounded. Reaching 90 means clearing the large majority of the 607 product issues; errors (92) likely weigh more than warnings.
- **Two hazard classes the pilot caught (rules now baked into the workflow):**
  1. `react-compiler-no-manual-memoization` is NOT always safe. A `useMemo` whose factory reads EXTERNAL MUTABLE STATE (DOM/getComputedStyle/theme/refs) with deps NOT referenced in the factory body is load-bearing — deleting it makes the value stale (no recompute on theme/resize). Signature: deps array lists vars unused in the body; the `void dep;` pattern marks deliberate retention. Reference: `catalog.tsx` catalogMetrics. The pilot's `use-reply-height-estimates.ts` metrics memo was wrongly deleted and restored.
  2. `no-barrel-import` rewrites BREAK `vi.mock('<barrel>')` test mocks (board-buttons→catalog-filters, board-header→tooltip). **Decision: barrel fixes are DROPPED from Phase 1** (low value for a tree-shaken Vite bundle, high test-breakage risk). Revisit later only if score-points require it, with matching mock updates.
- Verification: pilot type-check/lint clean; 3 tests failed (barrel-mock breakage) → reverted 2 barrel changes → 18 tests pass. Score 56. Net kept ~12 safe fixes (memo deletions, pure-fn hoists, regex/cache).
- Files committed/changed so far in working tree (pilot, not yet committed): board-blotter, board-buttons, code-block, crypto-address-setting, reply-quote-utils, use-popular-threads-options-store, use-reply-height-estimates.
- Next: process scaled-run results (fix flagged regressions), run full gate (type-check/lint/test/build/doctor) + browser e2e, commit Phase 1, re-measure, then STRATEGIC CHECKPOINT with user on cost/risk of pushing to 90.

## 2026-06-05 — PIVOTAL FINDING: score is error-dominated; warnings are inert

- The scaled 45-file memo-deletion run **removed 150 warnings and fully cleaned 30 files but moved the score only 55→56 (+1)**. Definitive proof: react-doctor's score is overwhelmingly weighted on ERRORS, not warnings. The 515 warnings (memo/barrel/structural) are nearly irrelevant to the number.
- **The 92 errors are essentially the entire gap from 90.** Breakdown (30 files): refs 37, no-adjust-state-on-prop-change 17, todo(compiler-syntax) 14, set-state-in-effect 13, preserve-manual-memoization 7, immutability 2, hooks 1, purity 1. ALL are behavioral / compiler-structural — the high-regression-risk tier.
- Consequence: there is **no low-risk path to 90**. Memo/warning cleanup (Phase 1) cannot move the score. Reaching 90 requires carefully fixing ~all 92 behavioral error-sites — real bug fixes, but each carries execution/regression risk. This directly tensions the "no UI/UX regressions" constraint.
- The scaled run was REVERTED: it added risk (external-number-quote-link useCallback deletion → useEffect loop → test worker timeout) and a workflow reliability problem (45/47 fix agents edited files but failed to return StructuredOutput, so the verify stage never ran) — all for ~zero score gain.
- Workflow lesson: fix agents doing heavy multi-edit work + a complex output schema frequently skip the final StructuredOutput call. Future error-fixing batches must be SMALL (few files), simpler schema, and verify must run.
- State after revert: working tree = validated pilot only (7 files), 1051 tests pass, type-check/lint clean, score 56.
- DECISION REQUIRED from user before proceeding: pursue 90 via the 92 risky error fixes (high cost+risk), fix safe-only errors and report the ceiling, or reassess the target.

## 2026-06-05 — RESOLUTION: 90 is unreachable honestly; landed at 63

- Calibration proved the score is NOT count-based — it saturates on **fraction of files with zero diagnostics**. Suppressing all 76 compiler-bailout errors only reached 63; suppressing the 76 errors + 289 biggest warnings still only 63 (85 files affected); suppressing ALL rules = 100. So 90 requires ~all files diagnostic-free, i.e. effectively disabling react-doctor — a meaningless badge.
- Most of the 92 "errors" flag legitimate, correct patterns the React Compiler can't optimize: `refs` (37) = the deliberate latest-ref idiom; `todo` (14) = try/finally & throw-in-try/catch the compiler can't lower; rewriting them degrades working code.
- The only genuine bugs are `no-adjust-state-on-prop-change` (17), but ~15 of them are entangled with legitimate side effects (navigate(), ref.cancel(), async fetch orchestration) that belong in effects — not cleanly movable to render without restructuring critical/media flows.
- User chose (after full disclosure): **honest high-60s, no regressions.** Final approach:
  1. `doctor.config.jsonc` (replaces .json): documented policy to NOT enforce the React-Compiler lint rules (`react-hooks-js/*` + `react-compiler-no-manual-memoization`) — they flag intentional patterns/compiler limits, not bugs. Keeps all real code-quality/a11y/perf rules enforced.
  2. Fixed the one cleanly-safe state-sync bug (`use-now-seconds`, render-time refresh).
  3. Left the other 15 no-adjust bugs documented as real-but-entangled (follow-up), not force-fixed (would risk regressions in publish/media flows).
- Result: score **63** (from broken-config 54 / real-baseline 55). type-check 0, lint 0/0, 1051 tests pass. Committed: config-fix 928784aa3, memo-cleanup d72190164; pending: config policy + use-now-seconds.
- NOTE: /goal was set to >=90 which is not honestly achievable — user to `/goal clear`.
