# Agent Hooks Setup

If your AI coding assistant supports lifecycle hooks, configure these for this repo.

## Recommended Hooks

| Hook | Command | Purpose |
|---|---|---|
| `afterFileEdit` | `scripts/agent-hooks/format.sh` | Auto-format files after AI edits |
| `afterFileEdit` | `scripts/agent-hooks/yarn-install.sh` | Run `yarn install` when `package.json` changes |
| `stop` | `scripts/agent-hooks/sync-git-branches.sh` | Prune stale refs and delete integrated temporary task branches |
| `stop` | `scripts/agent-hooks/verify.sh` | Hard-gate build, lint, and type-check; keep `yarn audit` informational |

## Why

- Consistent formatting
- Lockfile stays in sync
- Build/lint/type issues caught early
- Security visibility via `yarn audit`
- One shared hook implementation for both Codex and Cursor
- Temporary task branches stay aligned with the repo's worktree workflow

## Example Hook Scripts

### Format Hook

```bash
#!/bin/bash
# Auto-format JS/TS files after AI edits
# Hook receives JSON via stdin with file_path

input=$(cat)
file_path=$(echo "$input" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*:.*"\([^"]*\)"/\1/')

case "$file_path" in
  *.js|*.ts|*.tsx|*.mjs) npx oxfmt "$file_path" 2>/dev/null ;;
esac
exit 0
```

### Verify Hook

```bash
#!/bin/bash
# Run build, lint, type-check, and security audit when agent finishes

cat > /dev/null  # consume stdin
status=0
yarn build || status=1
yarn lint || status=1
yarn type-check || status=1
echo "=== yarn audit ===" && (yarn audit || true)  # informational
exit $status
```

By default, `scripts/agent-hooks/verify.sh` exits non-zero when `yarn build`, `yarn lint`, or `yarn type-check` fails. Set `AGENT_VERIFY_MODE=advisory` only when you intentionally need signal from a broken tree without blocking the hook.

### Yarn Install Hook

```bash
#!/bin/bash
# Run yarn install when package.json is changed
# Hook receives JSON via stdin with file_path

input=$(cat)
file_path=$(echo "$input" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*:.*"\([^"]*\)"/\1/')

if [ -z "$file_path" ]; then
  exit 0
fi

if [ "$file_path" = "package.json" ]; then
  cd "$(dirname "$0")/../.." || exit 0
  echo "package.json changed - running yarn install to update yarn.lock..."
  yarn install
fi

exit 0
```

Configure hook wiring according to your agent tool docs (`hooks.json`, equivalent, etc.).

In this repo, `.codex/hooks/*.sh` and `.cursor/hooks/*.sh` should stay as thin wrappers that delegate to the shared implementations under `scripts/agent-hooks/`.
