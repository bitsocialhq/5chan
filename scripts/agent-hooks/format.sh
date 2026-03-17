#!/bin/bash

# afterFileEdit hook: Auto-format files after AI edits them
# Receives JSON via stdin: {"file_path": "...", "edits": [...]}

input=$(cat)
file_path=$(echo "$input" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*:.*"\([^"]*\)"/\1/')

if [ -z "$file_path" ]; then
  exit 0
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$repo_root" || exit 0

case "$file_path" in
  *.js|*.ts|*.tsx|*.mjs)
    npx oxfmt "$file_path" 2>/dev/null || true
    ;;
esac

exit 0
