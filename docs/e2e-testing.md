# E2E Testing Guide

このドキュメントでは、SHINJU DATEプロジェクトにおけるPlaywrightを使用したE2Eテストの実行方法と構成について説明します。

## 概要

E2EテストはPlaywrightを使用して実装されており、MSW（Mock Service Worker）によるAPIモックと組み合わせることで、実際のバックエンドサービスに接続せずに完全な機能テストを実行できます。

## 対象アプリケーション

以下のTypeScriptアプリケーションに対してE2Eテストが実装されています：

- **apps/web**: 公開Webサイト
- **apps/admin**: 管理ダッシュボード
- **apps/batch**: バッチAPIエンドポイント

`packages/ui` の `test:e2e` は、Playwright ではなく、Vitest のブラウザモードで Storybook のストーリーを検証します（[`packages/ui` の README](../packages/ui/README.md#storybook)を参照）。

## セットアップ

### 1. Playwrightブラウザのインストール

初回のみ、Playwrightのブラウザをインストールする必要があります：

```bash
pnpm exec playwright install chromium
```

### 2. 環境設定

E2Eテストの実行時に必要な環境変数は、`webServer.env` で、Playwright が起動する開発サーバー（`pnpm dev`）に渡されます。`.env` ファイルを用意する必要はありません。3つのアプリに共通の値は `packages/config/playwright.ts` の `definePlaywrightConfig()` が、アプリだけの値は各アプリの `playwright.config.ts` の `env` が持ちます（[`@shinju-date/config` の Playwright](../packages/config/README.md#playwright)）。設定されている値は以下のとおりです：

- `ENABLE_MSW=true`: MSWによるAPIモックを有効化
- 各種APIキー（fake値）: Supabase、Upstash、Google APIなど

ローカル（`CI` を設定しないとき）では `reuseExistingServer` が有効なため、同じポートで開発サーバーがすでに起動していると、Playwright はそのサーバーをそのまま使い、`webServer.env` を適用しません。MSW を有効にしていない開発サーバーが起動している場合は、止めてからテストを実行してください。

## テストの実行

### すべてのアプリのE2Eテストを実行

```bash
pnpm test:e2e
```

このコマンドは、Turboを使用してすべてのアプリケーション（web、admin、batch）のE2Eテストを実行します。

### 個別アプリのテスト実行

特定のアプリケーションのみをテストする場合：

```bash
# Web アプリのテスト
pnpm test:e2e --filter=@shinju-date/web

# Admin アプリのテスト
pnpm test:e2e --filter=@shinju-date/admin

# Batch アプリのテスト
pnpm test:e2e --filter=@shinju-date/batch
```

または、各アプリケーションのディレクトリで直接実行：

```bash
cd apps/web && pnpm test:e2e
cd apps/admin && pnpm test:e2e
cd apps/batch && pnpm test:e2e
```

### UIモードで実行（デバッグに便利）

```bash
cd apps/batch && pnpm exec playwright test --ui
cd apps/web && pnpm exec playwright test --ui
cd apps/admin && pnpm exec playwright test --ui
```

このモードでは、テストの実行をブラウザ上で視覚的に確認でき、デバッグに便利です。

## GitHub Actions での実行

E2EテストはGitHub Actionsでmatrix戦略を使用して並列実行されます。`.github/workflows/ci.yml` の `e2e` ジョブで各アプリケーションが独立してテストされます。

## テストの構成

### apps/web/e2e/

公開Webサイトの動作を、機能ごとのファイル（`home.spec.ts`、`videos.spec.ts` など）で検証します：

- ホームページの読み込みとお知らせバナー
- モバイルのナビゲーション
- 動画ページの表示とタレントによる絞り込み
- 検索モーダル
- 配信予定
- タレントの一覧ページと個別ページ、カレンダー
- お問い合わせページ

### apps/admin/e2e/

管理ダッシュボードの機能を、機能ごとのファイル（`login.spec.ts`、`videos.spec.ts` など）で検証します：

- ログインページ（正しい入力、誤った入力、ログアウト）
- ダッシュボード、アナリティクス、アカウント設定、システムの各ページ
- 動画管理ページ（一覧、詳細、絞り込み、一括操作）
- タレント管理ページ（詳細、作成、状態の変更）
- 用語管理ページ（一覧、類義語の編集）
- 機能要望管理ページ（一覧、詳細、状態の変更）
- お知らせ管理ページ、おすすめクエリ管理ページ
- 存在しないURLの404ページ

ログインは、準備のプロジェクト（`e2e/auth.setup.ts`）で1回だけ行い、Cookie を `playwright/.auth/admin.json` に保存します。`login.spec.ts` 以外のテストは、保存した状態で始まります。`login.spec.ts` は、ログインの画面そのものを確かめるため、保存した状態を使いません。

テストは開発サーバーのモックのデータを共有します。データを変えるテストは、ほかのテストが確かめる値を変えないように、自分で作ったデータを操作するか、変える前の値と比べて確かめます。

### apps/batch/e2e/batch.spec.ts

バッチAPIエンドポイントの動作を検証します：

- ヘルスチェックエンドポイント (`/api/healthz`, `/api/readyz`)
- 動画の更新・確認エンドポイント
- タレント更新エンドポイント
- タレントから動画への反映エンドポイント
- おすすめクエリ更新エンドポイント
- 統計スナップショットエンドポイント
- 存在しないルートの扱い

## MSWによるモッキング

E2Eテスト実行時、以下のAPIがMSWによってモックされます：

- **Supabase API**: データベースクエリ、認証
- **YouTube Data API**: チャンネル情報、動画情報
- **Twitch API**: ユーザー情報、アイコン
- **Upstash Redis**: キャッシュ操作
- **Google Fonts API**: フォント読み込み
- **Resend API**: メール送信

モックデータは `packages/msw-handlers` パッケージで定義されています。

## テストの追加

新しいE2Eテストを追加する場合：

1. 該当するアプリの `e2e` ディレクトリに `.spec.ts` ファイルを作成
2. Playwrightの `test` と `expect` をインポート
3. `test.describe` でテストグループを定義
4. `test` で個別のテストケースを記述

### 例：

```typescript
import { expect, test } from "@playwright/test";

test.describe("新しい機能", () => {
  test("機能Aが動作する", async ({ page }) => {
    await page.goto("http://localhost:3000/new-feature");
    await page.waitForLoadState("networkidle");

    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
  });
});
```

## トラブルシューティング

### テストがタイムアウトする

- Next.jsサーバーの起動に時間がかかる場合があります。`packages/config/playwright.ts` の `webServer.timeout` を調整してください。
- ローカルで既に開発サーバーが起動している場合、Playwrightはそれを再利用します（`reuseExistingServer` オプション）。

### MSWが動作しない

- `ENABLE_MSW=true` が環境変数に設定されているか確認してください。
- 各アプリの `instrumentation.ts` で MSW サーバーが正しく初期化されているか確認してください。

### ブラウザが見つからない

```bash
pnpm exec playwright install chromium
```

でブラウザを再インストールしてください。

## CI/CD統合

CI環境でE2Eテストを実行する場合：

```bash
# CIフラグを設定して実行
CI=true pnpm test:e2e
```

CI環境では以下の動作になります：

- 失敗時に2回リトライ
- ワーカー数が1に制限（並列実行を抑制）
- 既存サーバーの再利用が無効化

### GitHub Actions Reporter

GitHub Actions上でのテスト実行時、Playwrightは自動的に**GitHubレポーター**を使用します。このレポーターは以下の機能を提供します：

- **Annotations（注釈）**: テストの失敗やエラーがPull Requestの該当行に直接表示されます
- **チェックラン**: テスト結果がGitHub Checksに統合され、PRのUIから確認できます
- **HTMLレポート**: 詳細なテストレポートがartifactとしてアップロードされ、後から確認できます

レポーターの設定は、3つのアプリに共通の `packages/config/playwright.ts` で以下のように構成されています：

```typescript
reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'html',
```

この設定により：

- CI環境では `github` レポーター（Annotations用）と `html` レポーター（詳細レポート用）の両方が有効化されます
- ローカル環境では `html` レポーターのみが使用され、テスト完了後にブラウザで結果が開きます

## 参考資料

- [Playwright公式ドキュメント](https://playwright.dev/)
- [MSW公式ドキュメント](https://mswjs.io/)
- [Next.js Instrumentation](https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation)
