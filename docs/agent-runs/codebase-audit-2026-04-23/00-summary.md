# Codebase Audit — Summary

**Date:** 2026-04-23
**Branch:** `codex/chore/codebase-audit`
**Scope:** `src/` (~50k LOC, 364 files)
**Method:** 7 parallel read-only agents, each focused on a distinct angle. No source files were modified.

## Reports

| # | Angle | File | Headline |
|---|---|---|---|
| 01 | React anti-patterns | [01-react-anti-patterns.md](01-react-anti-patterns.md) | Moderate-to-good; effect cascades and copy-paste clusters are the main cost |
| 02 | State management | [02-state-management.md](02-state-management.md) | `use-catalog-filters-store` is seriously broken; no `useShallow` anywhere |
| 03 | Security | [03-security.md](03-security.md) | RNG polyfill is a critical latent bug; no CSP; embed iframes are under-sandboxed |
| 04 | Dead code & duplication | [04-dead-code-duplication.md](04-dead-code-duplication.md) | Codebase is remarkably clean; duplication is the real issue |
| 05 | Accessibility | [05-accessibility.md](05-accessibility.md) | Posting/reply surfaces are unlabeled; modals aren't real dialogs |
| 06 | Performance | [06-performance.md](06-performance.md) | Three critical re-render hotspots; zero lazy-loaded images in feeds |
| 07 | Type safety | [07-type-safety.md](07-type-safety.md) | Good overall; 4 realistic runtime-crash `!` assertions and a `PostProps.post?: any` leak |

## Criticals Across All Reports

The 11 findings worth fixing first, consolidated:

1. **RNG polyfill backed by `Math.random()`** — `src/polyfills.js:20-29`. Catastrophic for keypair/signature derivation if ever hit. _Security._
2. **`use-catalog-filters-store` stores a closure in state, mutates during render via `setTimeout`, primes before persist rehydration** — `src/stores/use-catalog-filters-store.ts`. _State mgmt._
3. **No Content-Security-Policy** anywhere in `vercel.json` / `index.html`. _Security._
4. **Third-party embed scripts inherit 5chan origin** — Twitter/Reddit/TikTok/Instagram widgets in `src/components/embed/embed.tsx` load into `about:srcdoc` iframes without `sandbox` or SRI. _Security._
5. **Peer-supplied media URLs pass without a protocol/host allow-list** — only `new URL(url)` validation. _Security._
6. **Mod-queue derived-state-via-effect cascade** — `src/views/mod-queue/mod-queue.tsx:672-772`, `ModQueueCountItem` renders null just to lift state upward through effects per feed item. _React patterns._
7. **`reply-modal` has 8 `useEffect`s with explicit infinite-loop guard refs** — `src/components/reply-modal/reply-modal.tsx:104-288`. Author's own comments acknowledge the problem. _React patterns._
8. **Reply-modal & post-form inputs have no programmatic labels** — placeholders only; not inside `<form>`; close buttons are empty `<button title='Close'>`. _A11y._
9. **`useWindowWidth` has no throttling** and fires per-consumer listeners on every resize. _Performance._
10. **Four non-null assertions reachable from user input that can realistically throw** — `src/lib/utils/media-utils.ts:182/195/201` and `src/components/settings-modal/account-settings/account-settings.tsx:123`. _Type safety._
11. **`PostProps.post?: any` / `reply?: any`** — leaks `any` into the two hottest files (`post-desktop.tsx`, `post-mobile.tsx`). _Type safety._

## Cross-Cutting Themes

Patterns that surfaced across multiple audits and likely share a fix:

- **`post-desktop.tsx` + `post-mobile.tsx`** appear in four of the seven reports (React patterns, state mgmt, dead code, perf, type safety). They share ~500 LOC of effect/memo logic verbatim. **Extracting shared post logic into a hook would move the needle on five audits at once.**
- **Whole-store Zustand subscriptions** appear in every reader-of-state audit. Introducing `useShallow` is a two-line import that immediately reduces re-render pressure in `GlobalLayout`, `Catalog`, `PopularThreads`, `BoardsBar`, `FeedCacheContainer`.
- **Copy-paste effect patterns** — 10 views each re-implement `document.title` + `window.scrollTo(0,0)`; escape-to-close, click-outside, focus-on-mount, resize-listener, `isAccountMod`, approve/reject moderation handler appear 6+ times each. These become ~5 tiny shared hooks.
- **Modal infra is unfinished** — the a11y audit wants `role="dialog"` + focus traps; the React-patterns audit finds orchestration-via-effects; the state-mgmt audit finds three duplicate modal stores (`directory`, `create-board`, `boards-bar-edit`). One proper `<Dialog>` primitive would address all three.
- **Peer-content boundary is under-defended** — shows up in security (URL schemes, embeds, ReDoS), perf (regex compilation per comment), and type safety (`any` in `challenge-utils.ts`). A typed `PeerContent` boundary layer would help all three.

## Confirmed Clean

Things the audits expected might be problems but weren't:

- **Zero `dangerouslySetInnerHTML`, zero `document.write`, zero `eval`/`new Function`, zero production `innerHTML =`.** All `target="_blank"` links carry `rel`.
- **Zero `@ts-ignore` / `@ts-nocheck`** in production code. One justified test-only `@ts-expect-error`.
- **Zero TODO/FIXME/HACK/XXX markers** in `src/` (excluding `generated/` and `e2e/`). No `@deprecated` tags, no commented-out blocks.
- **Prior perf audits are fully absorbed** — findings from `popular-threads-rerenders`, `mobile-virtuoso-scroll-jank`, `pretext-feed-sizing` are all present on master; the perf audit avoids re-litigating them.
- **Knip output is genuinely short** — only 7 real dead exports across the whole codebase.
- **No `useState` used for shared state** in the anti-patterns audit's spot-check. Zustand adoption is consistent.

## Recommended Order of Operations

If you want to fix a subset, the cheapest-per-impact ordering:

1. **Quick wins (1-2 hrs each):** polyfill RNG removal, CSP header, `loading="lazy"`/`width`/`height` on feed `<img>`, `useShallow` introduction, delete the 7 knip-flagged dead exports.
2. **Medium cleanups (half-day each):** throttle `useWindowWidth`, fix the 4 runtime-crash `!` assertions, label posting/reply form controls, add `role="dialog"` + focus trap primitive, extract `useApproveRejectModeration` hook.
3. **Bigger refactors (1-2 days each):** rewrite `use-catalog-filters-store`, extract `post-desktop`/`post-mobile` shared logic, split `use-mod-queue-store` into data vs UI, retype `challenge-utils.ts` + `PostProps`, harden peer-URL validation at the boundary.

Everything else in the per-report "Top 5 Actions" sections is fair game once the above are done.

## Next Steps

- No code changes yet — this branch (`codex/chore/codebase-audit`) only contains these audit reports under `docs/agent-runs/codebase-audit-2026-04-23/`.
- Merging the reports to master is optional; they're useful as a snapshot even if no fixes land.
- When ready to act on findings, spin off per-report task branches so review PRs stay focused.
