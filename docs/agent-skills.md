# Next.js の公式スキル

このドキュメントでは、リポジトリに入れている Next.js の公式スキル（AI エージェント向けの手順書）と、その使い方を説明します。

Next.js は、フレームワークの知識を `node_modules/next/dist/docs/` の同梱ドキュメントと `apps/*/AGENTS.md` から得る前提で、複数の手順からなる作業をスキルとして配布しています（同梱ドキュメントの `01-app/02-guides/ai-agents.md`）。スキル本体は [vercel/next.js の `skills/`](https://github.com/vercel/next.js/tree/canary/skills) にあります。

## 入れているスキル

| スキル                               | 使いどころ                                                                                                                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `next-dev-loop`                      | 起動中の `next dev` に対し、MCP（`/_next/mcp`）と `agent-browser` で、編集のたびに動作を確かめる。保留中の Suspense の境界やコンポーネントツリーも見られる。ほかのスキルの検証の土台になる |
| `next-cache-components-optimizer`    | 指定したルートの静的シェルを広げる。先に失敗する `instant()` テストを書き、通るまで直して、テストを回帰テストとして残す                                                                    |
| `next-partial-prefetching-optimizer` | 指定した遷移で、クリック前に用意しておく UI を `instant()` テストで決めて最適化する                                                                                                        |
| `next-bundle-optimizer`              | Turbopack のバンドル分析から、初期ロードを重くしているクライアントバンドルを特定する。既定は変更を加えない監査だけのモードで、レポートを返す                                               |

エージェントには、次のように頼みます。

```prompt
編集のたびに next-dev-loop スキルで apps/web の動作を確かめてください。
```

```prompt
next-cache-components-optimizer スキルで /talents/[id] の静的シェルを最適化してください。最初の読み込みで、パンくずリストとタレント名の見出しがすぐに表示されるようにします。
```

```prompt
/talents から /talents/[id] へ遷移したとき、タレント名がすぐに表示されるようにしてください。next-partial-prefetching-optimizer スキルを使います。
```

```prompt
next-bundle-optimizer スキルで apps/web の初期ロードのレポートを作ってください。
```

## 入れていないスキル

- `next-cache-components-adoption` と `next-partial-prefetching-adoption`: 移行用のスキルです。`apps/web` と `apps/admin` はどちらの機能（`cacheComponents` と `partialPrefetching`）もすでに有効で、`prefetch=` を付けた `<Link>` も残っていません。`apps/batch` で Cache Components を有効にするときに、あらためて検討します
- `vercel-react-view-transitions`（`vercel-labs/agent-skills`）: Next.js 本体のスキルではなく、View Transitions も使っていないため対象外です

## ファイルの置き場所と更新

スキルは [`skills`](https://github.com/vercel-labs/skills) CLI で入れ、実体を `.agents/skills/` にコミットしています。`.agents/skills/` は Codex、Cursor、GitHub Copilot、Gemini CLI などが読む共通の置き場所です。Claude Code は `.claude/skills/` しか読まないため、そこから `.agents/skills/` へシンボリックリンクを張っています。入れたスキルとその内容のハッシュは `skills-lock.json` に記録されます。

```bash
pnpm dlx skills add vercel/next.js --skill next-dev-loop --skill next-cache-components-optimizer --skill next-partial-prefetching-optimizer --skill next-bundle-optimizer -a universal -a claude-code -y
```

- ルートの `package.json` に `devEngines` があるため、`npx` は使えません。`pnpm dlx` を使ってください
- `-a universal` で `.agents/skills/` に実体を置き、`-a claude-code` で `.claude/skills/` にシンボリックリンクを張ります。`-a claude-code` だけを指定すると、`.claude/skills/` にコピーが置かれるので注意してください
- `.agents/skills/next-*` と `skills-lock.json` は、上流のファイルをそのまま置くために Biome の対象から外しています。手で編集しないでください
- 更新するときは `pnpm dlx skills update` を実行し、差分を確認してコミットしてください

## agent-browser

`next-dev-loop` は、ブラウザを操作する CLI の [`agent-browser`](https://github.com/vercel-labs/agent-browser) を `PATH` から直接呼びます（0.31.1 以上が必要です）。エージェントしか使わない道具なので、`devDependencies` には入れず、使う人がグローバルに入れます。CI や `pnpm install` のたびに、ネイティブのバイナリ（約 20 MB）を取得させないためです。

- ローカルでは、スキルの手順どおり次のコマンドで入れます。ブラウザは `agent-browser install` で Chrome for Testing を入れるか、`AGENT_BROWSER_EXECUTABLE_PATH` で手元の Chrome を指定します

```bash
npm install --global agent-browser@latest
```

```bash
agent-browser install
```

- クラウドセッションでは、`.claude/hooks/session-start.sh` が `agent-browser` を pnpm の bin（`PATH` に入っています）に入れ、`AGENT_BROWSER_EXECUTABLE_PATH` でコンテナにある Chromium を指定します。追加の設定は要りません
- フックで入れるバージョンは、`# renovate:` のコメントの次の行に `AGENT_BROWSER_VERSION="0.43.0"` のような `_VERSION` で終わる大文字の変数（先頭に `export` があってもよい）で固定しています。コメントの書き方は `.devcontainer/Dockerfile` と同じです。共有プリセットが使っている公式のプリセット（`customManagers:dockerfileVersions` と `customManagers:githubActionsVersions`）はシェルスクリプトを読まないため、`.github/renovate.json5` の `customManagers` でこのフックを読ませ、Renovate が更新の Pull Request を作ります
- 使い方は `agent-browser skills get core` で読めます

## next-dev-loop で apps/web を確かめる

MSW を有効にして開発サーバーを起動します（環境変数は [setup-guide.md](setup-guide.md#52-aiエージェントおよびci環境msw使用時) と同じです）。依存パッケージを先にビルドしておく必要があります。

```bash
pnpm build --filter=@shinju-date/web^...
```

```bash
ENABLE_MSW=true \
NEXT_PUBLIC_BASE_URL=http://localhost:3000 \
NEXT_PUBLIC_SUPABASE_ANON_KEY=fake \
NEXT_PUBLIC_SUPABASE_URL=https://fake.supabase.test \
SUPABASE_SERVICE_ROLE_KEY=fake \
UPSTASH_REDIS_REST_TOKEN=fake \
UPSTASH_REDIS_REST_URL=https://fake.upstash.test \
pnpm --filter @shinju-date/web dev
```

あとはスキルの手順に従って、`/_next/mcp` の `tools/list` と `get_compilation_issues` を確かめてから、`agent-browser --enable react-devtools open http://localhost:3000/` でページを開きます。

- `next dev` の起動中は `.next` を消したり移したりしないでください。本番ビルドが必要な場合は、別の `distDir` を使います
- 開いた直後はルートのコンパイル中で、リンクをクリックしても遷移が遅れることがあります。`wait --load networkidle` のあとに URL を確かめてください

## 2つの optimizer を初めて使うとき

`next-cache-components-optimizer` と `next-partial-prefetching-optimizer` は、`next dev` ではなく本番ビルドで `@next/playwright` の `instant()` テストを回します。リポジトリにはまだその仕組みがないため、最初に使うときにスキルの手順（phase 0）で次を用意し、`instant-nav.rig.md` に記録してコミットします。

- `@next/playwright` を、`next` と同じバージョンで対象のアプリの `devDependencies` に入れる
- `next.config.ts` の `experimental` に `exposeTestingApiInProductionBuild` を足す。本番のビルドで有効にならないよう、環境変数（例: `EXPOSE_TESTING_API=1`）で切り替える
- `playwright.config.ts` の `webServer` は `pnpm dev` を起動しているため、そのままでは使えません。`build:msw` でビルドして `next start` で起動するプロジェクトや設定を別に用意する（[msw-guide.md](msw-guide.md#ビルド方法)）
- 開発サーバーとポート（3000）がぶつからないようにする

`next-bundle-optimizer` は、対象のアプリのディレクトリで `next analyze --output` を実行するだけで、テストの仕組みは要りません。
