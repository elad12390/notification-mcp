#!/bin/sh
#
# Installs git hooks from the hooks/ directory.
# Run: npm run hooks:install
#

set -e

HOOKS_DIR="$(git rev-parse --show-toplevel)/hooks"
GIT_HOOKS_DIR="$(git rev-parse --git-dir)/hooks"

for hook in pre-commit pre-push; do
  src="$HOOKS_DIR/$hook"
  dest="$GIT_HOOKS_DIR/$hook"

  if [ -f "$src" ]; then
    cp "$src" "$dest"
    chmod +x "$dest"
    echo "installed: $hook"
  fi
done

echo "git hooks installed"
