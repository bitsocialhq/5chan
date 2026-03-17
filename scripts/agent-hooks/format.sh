#!/bin/bash

# afterFileEdit hook: Auto-format files after AI edits them
# Receives JSON via stdin: {"file_path": "...", "edits": [...]}

input=$(cat)
if ! command -v jq >/dev/null 2>&1 || ! command -v realpath >/dev/null 2>&1; then
  exit 0
fi

file_path=$(printf '%s' "$input" | jq -r '.file_path // empty' 2>/dev/null)

if [ -z "$file_path" ]; then
  exit 0
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$repo_root" || exit 0

case "$file_path" in
  *.js|*.ts|*.tsx|*.mjs)
    resolved_path="$(realpath -m "$repo_root/$file_path" 2>/dev/null || true)"
    case "$resolved_path" in
      "$repo_root"/*) npx oxfmt "$resolved_path" 2>/dev/null || true ;;
      *) exit 0 ;;
    esac
    ;;
esac

exit 0
