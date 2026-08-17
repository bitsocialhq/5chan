# Progress Log

Append one entry per session.

## 2026-07-29 — Session 1: research and setup

- Item: (setup, pre-F001)
- Summary: Traced the full pubsub-voting stack before writing code. The library, the criteria
  manifest, and the seeder are all live and mutually consistent; 5chan is the only missing
  consumer. Confirmed the single hard blocker is that 5chan has no interactive signer — the
  existing crypto-wallets setting stores a pasted, static EIP-191 ownership claim, not a
  connected wallet, and pubsub-voting requires on-demand EIP-712 ballot signing.
- Risks investigated and cleared:
  - `better-sqlite3` native dep — **not a new burden**, already arrives via pkc-js 0.0.72.
  - RPC historical depth — **cleared**. `https://sepolia.base.org` served a real `eth_call`
    against multicall3 at exactly 1,296,000 blocks back (the full 30-day expiry window).
    An early `0x` result was a red herring: the Pass contract is only ~11 days old, so it
    genuinely had no code at that depth. `base-sepolia-rpc.publicnode.com` rejects archive
    requests outright, so RPC choice does matter.
  - Board data shape — **cleared**. All 65 boards carry both a `.bso` name and a `publicKey`.
  - Contest/directory alignment — **cleared**. Diffed the published manifest against the
    directory codes: 63 contests, exact 1:1, no drift, no per-contest rule overrides.
- Decisions taken (user): injected EIP-6963 first with a WalletConnect fallback; all three
  phases in scope; testnet only, deriving contests from the published manifest at runtime so
  the eventual mainnet manifest needs no code change.
- Files: `docs/agent-runs/pubsub-directory-voting/feature-list.json`, this file
- Verification: `./scripts/agent-init.sh --smoke` — passed (desktop + mobile)
- Blockers: none
- Next: F001 (add deps + viem resolution), then immediately F002 — the browser
  `PubsubVoter` construction spike is the highest-risk unknown and everything downstream
  assumes it succeeds.

## 2026-07-29 — Session 1 (cont.): F001 + criteria mirroring

- Item: F001 (done), F003 (partial), F015 (new)
- Summary: Landed dependencies and proved the library works against the live published
  manifest — 63 criteria documents derived, real topic CIDs computed, republish cadence
  confirmed at exactly 15 days. Extended `scripts/sync-directories.js` to also mirror
  `5chan-directory-criteria.jsonc` byte-for-byte into `src/data/`, matching the existing
  vendored-directories pattern, so the app has an offline fallback and 5chan derives from
  the same bytes the seeder does.
- Upstream gap found: the fresh mirror pulled 65 directory files against only 63 contests.
  `/trash/` is correctly excluded (special board, absent from the defaults file), but `/r/`
  **is** in `5chan-directories-defaults.json` (64 codes) and still has no contest — the
  published manifest looks generated from a defaults snapshot predating the 2026-07-24
  "adult requests board" commit. Worth regenerating upstream in `bitsocialnet/lists`.
  Tracked locally as F015 so the UI degrades cleanly either way.
- Files: `package.json`, `yarn.lock`, `scripts/sync-directories.js`,
  `src/data/5chan-directory-criteria.jsonc` (new mirror)
- Verification: `corepack yarn install`, `yarn build` (passes), `yarn sync:directories`
  (mirrored 63 contests), library smoke script against the live manifest
- Blockers: none
- Next: F002 — the browser `PubsubVoter` construction spike against the pkc Helia node.

### Notes for the next session

- The library never reads the bitsocial account. Identity is the wallet that signs the
  ballot: *"the address recovered from the ballot signature IS the voter"*. The stored
  account wallet is only a default-address hint and a mismatch warning.
- The criteria is upvote-only (`voteSchema {min:1, max:1}`, `maxVotesPerAddress: 1`). The
  `-1` button in `src/views/directory/directory.tsx` cannot be represented and must be
  removed; withdrawing is publishing an empty ballot.
- Gateway-mode browsers have no Helia node. Voting must degrade cleanly there rather than
  throwing a construction error.

## 2026-08-09 — Session 2: master sync + pubsub-voting 0.4.0

- Item: task-state refresh before F002
- Summary: Fast-forwarded `codex/feature/pubsub-directory-voting` by 23 commits to
  `origin/master` while preserving and reapplying the uncommitted feature slice. Updated
  `@bitsocial/pubsub-voting` from 0.1.5 to the current 0.4.0 release and refreshed the
  vendored criteria manifest from the canonical lists repository.
- Compatibility update: 0.4.0 registers the soulbound `erc5192-min-balance` gate instead of
  the old transferable-token gate. The canonical manifest moved with it to Pass contract
  `0xA8e0155E0e7d014EAF3917982db6a9A4dF98C852` and now derives 64 contests, including `/r/`.
- Files: `package.json`, `yarn.lock`, `src/data/5chan-directory-criteria.jsonc`,
  `docs/agent-runs/pubsub-directory-voting/feature-list.json`, this file
- Verification: `./scripts/agent-init.sh --smoke`, `corepack yarn install`,
  `corepack yarn sync:directories`, `corepack yarn why viem`, 0.4.0 library smoke
  (64 valid criteria and 64 unique topics), `corepack yarn build`, `corepack yarn lint`,
  `corepack yarn type-check`, `corepack yarn test` (1,419 tests), `corepack yarn llms:generate`
- Advisory: `corepack yarn knip` reports `@bitsocial/pubsub-voting` and
  `strip-json-comments` as unused. The former is intentionally staged for F002; the latter is
  imported by `scripts/sync-directories.js`, which Knip does not treat as an app entry.
- Blockers: none
- Next: F002 — the browser `PubsubVoter` construction spike against the pkc Helia node.

## 2026-08-15 — Session 3: master sync before F002

- Item: task-state refresh before F002
- Summary: Merged current `origin/master` into the published WIP branch. Resolved the
  `package.json` overlap by preserving the voting dependencies and viem dedupe while
  taking master’s hooks 0.1.37, pkc-js 0.0.81, React Router 7.18.2, Kubo 0.43.0 packaging,
  and current security resolutions.
- Package decision: npm still reports `@bitsocial/pubsub-voting@0.4.1` as latest. Its
  immutable package delta from 0.4.0 is terminology/documentation plus equivalent
  declaration comments, with no runtime, API, protocol, or dependency change, so the
  branch remains on 0.4.0.
- Verification: pre-merge and post-merge `./scripts/agent-init.sh --smoke`; `corepack
  yarn install`; `corepack yarn build`; `corepack yarn lint`; `corepack yarn
  type-check`; `corepack yarn why` for pubsub-voting, hooks, pkc-js, and viem; full
  `corepack yarn test --run` (169 files, 1,425 tests).
- Test note: the first full-suite run hit the existing intermittent
  `directory-list-lookup-utils.test.ts` module-mock isolation failure. The exact file
  passed 5/5, and the unchanged full-suite retry passed. No feature code was changed for it.
- Advisory: `corepack yarn knip` still reports pubsub-voting and strip-json-comments as
  unused because F002 has not imported them into app code yet.
- Blockers: none
- Next: F002 — construct `PubsubVoter` against the shared browser Helia node and prove
  clean unavailable behavior in gateway mode.

## 2026-08-15 — Session 3 (cont.): F002 shared-Helia construction spike

- Item: F002 (done)
- Summary: Added a small read-only `PubsubVoter` lifecycle hook that reaches pkc-js through
  the public `account.pkc.clients.libp2pJsClients['libp2pjs'].heliaNode` accessor. The
  directory route exposes a nonvisual construction-state marker for runtime verification.
  Browser-libp2p mode constructs successfully; gateway mode has no Helia node and reports
  unavailable without throwing. The hook uses in-memory voter storage and no chain clients
  by design; F004 will replace those spike settings with the shared production singleton,
  Base Sepolia/mainnet clients, `.bso` resolvers, and IndexedDB persistence.
- Reference check: Inspected `Rinse12/pubsub-voting-website`,
  `bso-board-vote.netlify.app`, and the testnet 5chan Pass faucet. The reference voting app
  confirms the same one-PKC-node architecture and currently runs pubsub-voting 0.4.0 with
  pkc-js 0.0.76, reinforcing that 5chan's existing pubsub-voting 0.4.0 and newer pkc-js
  0.0.81 need no package upgrade for this integration.
- Files: `src/hooks/use-pubsub-voter.ts`,
  `src/hooks/__tests__/use-pubsub-voter.test.tsx`,
  `src/views/directory/directory.tsx`,
  `src/views/directory/__tests__/directory.test.tsx`, feature list, this file
- Verification: focused tests (11), full suite (170 files / 1,429 tests), production build,
  lint, type-check, changed-files React Doctor, Chrome/Firefox/WebKit `ready` checks, fresh
  Chrome gateway-mode `unavailable` check, and browser bundle scan with no
  `better-sqlite3`/`node-gyp-build` references.
- Advisory: repo-wide React Doctor still reports pre-existing findings outside this diff;
  Knip now recognizes pubsub-voting as used and retains only the known false positive for
  `strip-json-comments` imported by `scripts/sync-directories.js`.
- Blockers: none
- Next: F003 — finish the runtime criteria manifest loader and its 64-contest mapping tests,
  then F004 — turn the proven construction seam into the shared production voter singleton.

## 2026-08-15 — Session 3 (cont.): F003 runtime criteria loader

- Item: F003 (done)
- Summary: Added a framework-independent JSONC loader for the published directory voting
  manifest. It derives criteria through pubsub-voting's canonical helper, builds both
  directory-code and contest-id indexes, rejects malformed or duplicate slot mappings, and
  validates a remote response before replacing the last good local copy. Consumers can read
  the cached/vendored snapshot immediately and request one deduplicated runtime refresh; a
  successful response is reused for one hour, while failures retry after one minute.
- Live evidence: The canonical raw GitHub manifest and vendored fallback have the same
  SHA-256 (`35e1bb1772e37a456912ea3958588eb2ffa0a534209ace21e969d4b4d9145d25`).
  A live derivation produced 64 criteria with 64 unique contest ids.
- Files: `src/lib/directory-vote-criteria.ts`,
  `src/lib/__tests__/directory-vote-criteria.test.ts`, feature list, this file
- Verification: six focused tests covering the 64-contest set, `/b/` and `/r/` mappings,
  intentional `/trash/` absence, JSONC stripping, invalid and duplicate mappings, validated
  remote caching, cache reuse, and offline fallback; full suite (171 files / 1,435 tests),
  production build, changed-files React Doctor, lint, and type-check pass.
- Blockers: none
- Next: F004 — production voter singleton with Base Sepolia/mainnet chain clients, `.bso`
  resolvers, and browser IndexedDB persistence, using the F002 Helia seam and F003 criteria.
