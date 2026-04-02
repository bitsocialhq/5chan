# scripts/AGENTS.md

These rules apply to `scripts/**`. Follow the repo-root `AGENTS.md` first, then use this file for automation and workflow helpers.

- Keep scripts non-interactive and idempotent. Print the command, URL, branch, or path being acted on so failures are diagnosable.
- Use repo-relative paths and environment variables instead of user-specific absolute paths.
- For dev-server helpers, default to `http://5chan.localhost:1355`, but allow a branch-scoped `*.5chan.localhost:1355` route when the launcher is avoiding a Portless name collision. Respect the existing `PORTLESS=0` fallback instead of hard-coding alternate ports. For USB Android preview, `scripts/start-android-usb.mjs` mirrors bitsocial-web: `adb reverse` plus Vite on `127.0.0.1`, then `am start` VIEW to open the default browser when the port is listening (disable with `ANDROID_USB_OPEN_BROWSER=0`).
- Keep shell helpers thin. When logic becomes stateful or cross-platform, prefer a Node script.
- Git and worktree helpers must validate input and default to safe operations.
- If a helper deletes local branches automatically, document the exact eligibility checks and keep the behavior conservative.
