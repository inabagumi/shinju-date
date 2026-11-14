#!/bin/bash
# Claude Code のクラウドセッションの開始時に、pnpm と依存パッケージをインストールする。
# ローカルの Claude Code では何もしない。
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# コンテナにあらかじめ入っている pnpm（v10）は devEngines による切り替えに対応していないため、
# package.json の devEngines.packageManager と同じバージョンを PNPM_HOME に入れる。
export PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}"
export PATH="$PNPM_HOME/bin:$PATH"

pnpm_version="$(node -p 'require("./package.json").devEngines.packageManager.version')"

if [ "$("$PNPM_HOME/bin/pnpm" -v 2>/dev/null || true)" != "$pnpm_version" ]; then
  # 公式のスクリプトは get.pnpm.io から取得する。ネットワークの設定でこのホストを
  # 許可していない環境では、npm レジストリから入れる。
  if ! curl -fsSL https://get.pnpm.io | PNPM_VERSION="$pnpm_version" PNPM_NO_MODIFY_PATH=1 sh -; then
    echo "Could not install pnpm with get.pnpm.io. Installing it from the npm registry instead." >&2
    npm install --global --prefix "$PNPM_HOME" "pnpm@$pnpm_version"
  fi
fi

# 依存パッケージを決めるファイルが前回のインストールから変わったときだけインストールする。
hashes=node_modules/.session-start.sha256
if ! sha256sum --check --status "$hashes" 2>/dev/null; then
  # 失敗したときに次回やり直すよう、先に古いハッシュを消す
  rm -f "$hashes"

  # devEngines.runtime の Node.js もここで取得される
  pnpm install --frozen-lockfile

  sha256sum .claude/hooks/session-start.sh package.json pnpm-lock.yaml pnpm-workspace.yaml \
    apps/*/package.json packages/*/package.json > "$hashes" || rm -f "$hashes"
fi

# セッション中のコマンドでも同じ pnpm を使う
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  {
    echo "export PNPM_HOME=\"$PNPM_HOME\""
    echo "export PATH=\"$PNPM_HOME/bin:\$PATH\""
  } >> "$CLAUDE_ENV_FILE"
fi
