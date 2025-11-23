# E2E Testing Guide

このドキュメントでは、SHINJU DATEプロジェクトにおけるPlaywrightを使用したE2Eテストの実行方法と構成について説明します。

## 概要

E2EテストはPlaywrightを使用して実装されており、MSW（Mock Service Worker）によるAPIモックと組み合わせることで、実際のバックエンドサービスに接続せずに完全な機能テストを実行できます。

## 対象アプリケーション

以下のTypeScriptアプリケーションに対してE2Eテストが実装されています：

- **apps/web**: 公開Webサイト
- **apps/admin**: 管理ダッシュボード
- **apps/batch**: バッチAPIエンドポイント

Note: apps/insights（Python製）はMSWのモックが使えないため対象外です。

## セットアップ

### 1. Playwrightブラウザのインストール

初回のみ、Playwrightのブラウザをインストールする必要があります：

```bash
pnpm exec playwright install chromium
```

### 2. 環境設定

各アプリケーションには `.env.test` ファイルが用意されており、E2Eテスト実行時に自動的に読み込まれます。これらのファイルには以下が設定されています：

- `ENABLE_MSW=true`: MSWによるAPIモックを有効化
- 各種APIキー（fake値）: Supabase、Upstash、Google APIなど

## テストの実行

### すべてのE2Eテストを実行

```bash
pnpm test:e2e
```

### UIモードで実行（インタラクティブ）

```bash
pnpm test:e2e:ui
```

このモードでは、テストの実行をブラウザ上で視覚的に確認でき、デバッグに便利です。

### 特定のアプリのテストのみ実行

```bash
# Web アプリのテストのみ
pnpm exec playwright test apps/web/e2e

# Admin アプリのテストのみ
pnpm exec playwright test apps/admin/e2e

# Batch アプリのテストのみ
pnpm exec playwright test apps/batch/e2e
```

## テストの構成

### apps/web/e2e/web.spec.ts

公開Webサイトの基本的な動作を検証します：

- ホームページの読み込み
- ナビゲーション要素の表示
- 動画ページの表示とフィルタリング
- 検索機能
- お問い合わせページ

### apps/admin/e2e/admin.spec.ts

管理ダッシュボードの機能を検証します：

- ログイン機能（MSWモックによる認証）
- ダッシュボードの表示
- 動画管理ページ
- タレント管理ページ
- 用語管理ページ
- アナリティクスページ

### apps/batch/e2e/batch.spec.ts

バッチAPIエンドポイントの動作を検証します：

- ヘルスチェックエンドポイント (`/api/healthz`, `/api/readyz`)
- 動画更新エンドポイント
- タレント更新エンドポイント
- おすすめクエリ更新エンドポイント
- 統計スナップショットエンドポイント

## MSWによるモッキング

E2Eテスト実行時、以下のAPIがMSWによってモックされます：

- **Supabase API**: データベースクエリ、認証
- **YouTube Data API**: チャンネル情報、動画情報
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
import { expect, test } from '@playwright/test'

test.describe('新しい機能', () => {
  test('機能Aが動作する', async ({ page }) => {
    await page.goto('http://localhost:3000/new-feature')
    await page.waitForLoadState('networkidle')

    const heading = page.locator('h1')
    await expect(heading).toBeVisible()
  })
})
```

## トラブルシューティング

### テストがタイムアウトする

- Next.jsサーバーの起動に時間がかかる場合があります。`playwright.config.ts` の `timeout` 設定を調整してください。
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

## 参考資料

- [Playwright公式ドキュメント](https://playwright.dev/)
- [MSW公式ドキュメント](https://mswjs.io/)
- [Next.js Instrumentation](https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation)
