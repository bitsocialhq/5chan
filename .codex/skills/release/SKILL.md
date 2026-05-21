---
name: release
description: Automate a full 5chan release — analyze commits, update release body and blotter, bump version, generate changelog, commit, tag, and push. Use when the user says "release", "new version", "cut a release", "prepare release", or provides a version number to ship.
---

# Release

End-to-end release automation for 5chan.

## Usage

The user provides a version bump (`patch`, `minor`, `major`, or explicit `x.y.z`).
If omitted, ask which bump level they want.

## Workflow

Copy this checklist and track progress:

```
Release Progress:
- [ ] Step 1: Analyze commits
- [ ] Step 2: Write release body (longer sentence)
- [ ] Step 3: Write blotter message (concise keywords)
- [ ] Step 4: Bump version in package.json
- [ ] Step 5: Generate changelog
- [ ] Step 6: Update blotter file
- [ ] Step 7: Verify blotter
- [ ] Step 8: Commit, tag, push
```

### Step 1 — Analyze commits

```bash
git tag --sort=-creatordate | head -1
```

Then list commits since that tag:

```bash
git log --oneline <tag>..HEAD
```

If there are no new commits, stop — nothing to release.

Categorize by Conventional Commits prefix (`feat:`, `fix:`, `perf:`, `refactor:`, `chore:`, etc.).

### Step 2 — Write the release body one-liner

Edit `oneLinerDescription` in `scripts/release-body.js` (around line 105).

Rules:
- Start with "This version..." or "This release..."
- One sentence, no bullets
- Lead with the biggest features/fixes, group minor ones
- Plain language (user-facing)
- End with a period

Good examples:
- "This version adds backlinks for quoted posts, a copy user ID menu item, and clearer reply previews."
- "This release adds pseudonymity mode support per-reply and fixes timezone display issues."

### Step 3 — Write the blotter message

This is a **separate, shorter** summary used for the in-app blotter banner. **The blotter is read by end users — non-developers — so every highlight must be understandable to someone who has never seen the code.** This rule is non-negotiable even for internal/infrastructure changes that make it into the blotter.

Format rules:
- Comma-separated key highlights, each a short plain-English phrase (not a full sentence)
- Omit "This version..." prefix — the blotter script prepends `vX.Y.Z: ` automatically
- Aim for ~45–70 characters after the version prefix
- **Only genuinely novel or noteworthy items** — things a user would find interesting or exciting
- Skip regression fixes (restoring something that previously worked), routine bug fixes, invisible security/stability work, minor z-index/modal/layout tweaks, test improvements, CI changes, and anything that isn't a new capability or a significant user-facing improvement
- If something was already a known feature and just got fixed/restored, it does not belong in the blotter
- Fewer strong items beat many weak items; 1–3 highlights is ideal
- If there are no genuinely interesting user-facing changes, do not invent filler highlights
- Lead with the most impressive item

Plain-English rules (apply always, no matter what):
- Write for a user who has never read the code. Each highlight must be self-explanatory to a non-dev reader of 5chan.
- No internal library or module names (e.g. "Pretext", "Zustand", "portless", "Vite", "oxlint"). Translate into the user-visible effect.
- No dev shorthand: avoid "perf", "deps", "refactor", "impl", "selector", "reducer", "hook", "a11y", "i18n", "DX", "CI", "CD", "lint", "typecheck".
- No codebase-only identifiers, file paths, component names, or PR numbers.
- Prefer the user-visible *outcome* over the mechanism. Example: "compact account history" (describes the code) → "performant account history" (describes what the user gets).
- Phrases must read as natural plain English. If a highlight needs a developer to explain it, rewrite it.
- Avoid broad maintenance labels like "security fixes", "bug fixes", or "stability fixes"; they are usually invisible, redundant, and dull. Only mention security or stability work when the user can perceive the outcome, and phrase it as that outcome.
- Okay to name concrete user-visible features/areas: "Board pagination", "Video auto-unmute setting", "File upload improvements", "Archive page", "Spoiler tags", "Catalog search".

Good examples (the part **you** write, without the `vX.Y.Z:` prefix):
- "Board pagination, file upload improvements, mod queue redesign, catalog sorting"
- "Video auto-unmute setting, platform info on homepage, faster board previews"
- "In-app desktop updates, opt-in thread auto-refresh, performant account history"
- "Quote references in replies, post backlinks"

Bad examples (and why):
- "Pretext feed sizing" — names an internal library; user has no idea what this is.
- "Mobile scroll perf" — "perf" is dev shorthand; say "smoother mobile scrolling".
- "Compact account history" — describes the implementation; "performant account history" describes what the user gets.
- "Refactor subplebbit selectors" — three dev terms in a row; rewrite or drop.
- "Security fixes" — generic maintenance label; invisible to regular users and not interesting to read.

Save this string — you will pass it to the blotter script in Step 6.

### Step 4 — Bump version

Read `package.json`, compute the new version from the bump level, and update the `"version"` field.

| Bump | Effect |
|------|--------|
| `patch` | `0.6.7` → `0.6.8` |
| `minor` | `0.6.7` → `0.7.0` |
| `major` | `0.6.7` → `1.0.0` |
| `x.y.z` | Set exactly |

### Step 5 — Generate changelog

```bash
yarn changelog
```

This regenerates `CHANGELOG.md` from conventional commits.

### Step 6 — Update blotter

Pass the **blotter message from Step 3** (not the release body):

```bash
node scripts/update-blotter.js release --message "<blotter message>"
```

### Step 7 — Verify blotter

```bash
node scripts/update-blotter.js check
```

If it fails, fix the issue and re-run.

### Step 8 — Commit, tag, push

```bash
git add -A
git commit -m "chore(release): v<version>"
git push
git tag v<version>
git push --tags
```

GitHub Actions triggers on the pushed tag to build release artifacts.

## Dry-run mode

If the user says "dry run" or "preview", execute Steps 1–7 but **skip Step 8** (git operations). Print a summary of what would be committed so the user can review.
