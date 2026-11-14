#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# コンテナにある pnpm v10 は devEngines に対応していないため入れ直す
export PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}"
export PATH="$PNPM_HOME/bin:$PATH"

pnpm_version="$(node -p 'require("./package.json").devEngines.packageManager.version')"

if [ "$("$PNPM_HOME/bin/pnpm" -v 2>/dev/null || true)" != "$pnpm_version" ]; then
  if ! curl -fsSL https://get.pnpm.io | PNPM_VERSION="$pnpm_version" PNPM_NO_MODIFY_PATH=1 sh -; then
    echo "Could not install pnpm with get.pnpm.io. Installing it from the npm registry instead." >&2
    npm install --global --prefix "$PNPM_HOME" "pnpm@$pnpm_version"
  fi
fi

hashes=node_modules/.session-start.sha256
if ! sha256sum --check --status "$hashes" 2>/dev/null; then
  rm -f "$hashes"

  pnpm install --frozen-lockfile

  sha256sum .claude/hooks/session-start.sh package.json pnpm-lock.yaml pnpm-workspace.yaml \
    apps/*/package.json packages/*/package.json > "$hashes" || rm -f "$hashes"
fi

if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  {
    echo "export PNPM_HOME=\"$PNPM_HOME\""
    echo "export PATH=\"$PNPM_HOME/bin:\$PATH\""
  } >> "$CLAUDE_ENV_FILE"
fi
