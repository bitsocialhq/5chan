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
