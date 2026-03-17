#!/bin/bash

# afterFileEdit hook: Auto-format files after AI edits them
# Receives JSON via stdin: {"file_path": "...", "edits": [...]}

input=$(cat)
if ! command -v jq >/dev/null 2>&1; then
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
    dir_part="${file_path%/*}"
    base_name="${file_path##*/}"
    if [ "$dir_part" = "$file_path" ]; then
      dir_part="."
    fi

    resolved_dir="$(cd -P -- "$repo_root/$dir_part" 2>/dev/null && pwd -P)" || exit 0
    resolved_path="$resolved_dir/$base_name"
    case "$resolved_path" in
      "$repo_root"/*) npx oxfmt "$resolved_path" 2>/dev/null || true ;;
      *) exit 0 ;;
    esac
    ;;
esac

exit 0
