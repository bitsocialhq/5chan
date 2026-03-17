#!/bin/bash

# afterFileEdit hook: Run yarn install when package.json is changed
# Receives JSON via stdin: {"file_path": "...", "edits": [...]}

input=$(cat)
file_path=$(echo "$input" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*:.*"\([^"]*\)"/\1/')

if [ -z "$file_path" ]; then
  exit 0
fi

if [ "$file_path" = "package.json" ]; then
  repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
  cd "$repo_root" || exit 0
  echo "package.json changed - running yarn install to update yarn.lock..."
  yarn install
fi

exit 0
