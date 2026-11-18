# テストガイド

このドキュメントでは、SHINJU DATE プロジェクトにおけるテストの実装方法とベストプラクティスを説明します。

**最終更新日**: 2026-11-18

## 📋 目次

- [テスト環境の概要](#テスト環境の概要)
- [React コンポーネントのテスト](#react-コンポーネントのテスト)
- [JSX Transform と React インポート](#jsx-transform-と-react-インポート)
- [テストの実行](#テストの実行)
- [ベストプラクティス](#ベストプラクティス)

## テスト環境の概要

SHINJU DATE プロジェクトでは、以下のテストフレームワークとツールを使用しています：

### JavaScript/TypeScript テスト

- **Vitest**: 高速なユニットテストフレームワーク
- **Testing Library**: React コンポーネントのテスト用ライブラリ
- **jsdom**: ブラウザ環境のシミュレーション
- **@vitejs/plugin-react**: JSX トランスフォームの処理

## React コンポーネントのテスト

### 基本的なテストの書き方

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import MyComponent from './my-component'

describe('MyComponent', () => {
  test('should render correctly', () => {
    render(<MyComponent title="Test" />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })
})
```

### テスト対象のアプリケーション

以下のアプリケーション/パッケージで React コンポーネントのテストが設定されています：

- **apps/admin**: 管理画面コンポーネント
- **apps/web**: ユーザー向け Web アプリコンポーネント
- **packages/ui**: 共有 UI コンポーネント

これらのプロジェクトの `vitest.config.ts` は、`@shinju-date/config` の `defineVitestConfig.react()` を呼びます。共通の設定（`@vitejs/plugin-react` による JSX トランスフォーム、jsdom、`globals: true`）は `packages/config/vitest.ts` にあり、各プロジェクトには、そのプロジェクトだけの設定を書きます（[`@shinju-date/config` の Vitest](../packages/config/README.md#vitest)）。

```typescript
import { defineVitestConfig } from '@shinju-date/config/vitest'

export default defineVitestConfig.react({
  test: {
    setupFiles: ['./vitest.setup.ts'], // テスト前の初期化
  },
})
```

## JSX Transform と React インポート

### 重要な変更点

**React 17 以降、JSX を使用するファイルで `import React from 'react'` は不要になりました。**

この変更は、React の新しい JSX Transform によって実現されています。詳細は以下を参照してください：

- [React 公式ブログ: Introducing the New JSX Transform](https://legacy.reactjs.org/blog/2020/09/22/introducing-the-new-jsx-transform.html)
- [React v17 リリースノート](https://legacy.reactjs.org/blog/2020/10/20/react-v17.html)

### Vitest での設定

Vitest でこの機能を使用するには、`@vitejs/plugin-react` が設定に必要です。`defineVitestConfig.react()` が追加します：

```typescript
// vitest.config.ts
import { defineVitestConfig } from '@shinju-date/config/vitest'

export default defineVitestConfig.react({
  // ... そのプロジェクトだけの設定
})
```

### ❌ 避けるべき書き方

```tsx
// 不要な React インポート
import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import MyComponent from './my-component'

describe('MyComponent', () => {
  test('should render', () => {
    render(<MyComponent />)
    // ...
  })
})
```

### ✅ 推奨される書き方

```tsx
// React インポートなし
import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import MyComponent from './my-component'

describe('MyComponent', () => {
  test('should render', () => {
    render(<MyComponent />)
    // ...
  })
})
```

### 例外：型のインポート

型定義のインポートは引き続き必要です：

```tsx
import type { ReactNode, ComponentPropsWithoutRef } from 'react'
// または
import { type ReactNode, useState } from 'react'
```

## テストの実行

### すべてのテストを実行

```bash
# ルートディレクトリから
pnpm test

# 特定のアプリ/パッケージのみ
cd apps/admin
pnpm test
```

### データベース（pgTAP）のテストを実行

`supabase/tests/database/` にはスキーマ・RLS・制約を検証するpgTAPのテストがあります。ローカルのSupabaseを起動した状態で実行します。

```bash
pnpm exec supabase test db
```

CI でも、`supabase/`、`packages/database/`、`scripts/generate-types.sh`、`scripts/lib.sh`、ルートの `package.json`（Supabase CLI のバージョン）を変えたプルリクエストでは、`Database` ジョブがこのテストを実行します。このジョブは、次の3つを確かめます。

1. `pnpm exec supabase db start` で、すべてのマイグレーションとシードが空のデータベースに適用できる
2. `pnpm exec supabase test db` で、pgTAP のテストがすべて通る
3. `pnpm db:schema` で生成し直した `packages/database/types/supabase.ts` が、コミットされているものと一致する

マイグレーションを変えたら、`pnpm db:schema` で型を生成し直して、一緒にコミットしてください。

main への push で本番にマイグレーションを適用する `Supabase DB Push on main` ワークフローも、適用の前に 1 と 2 を実行し、失敗したら適用しません。

### ウォッチモードで実行

```bash
cd apps/admin
pnpm vitest
```

### カバレッジレポートの生成

```bash
pnpm vitest --coverage
```

## ベストプラクティス

### 1. テストファイルの配置

テストのファイルは、テストの対象の隣に `<名前>.test.ts` / `<名前>.test.tsx` として置きます。コンポーネント、ページ、関数、フック、Server Action のどれも同じで、`__tests__/` のフォルダーは使いません（Jest の慣習の名残で、Vitest では要りません）。

- テストのファイルの名前は、対象のファイルの名前と同じにする
  - コンポーネントのテストは、そのコンポーネントを描画して確かめる。テストの中で作った値どうしを比べるだけのテストにしない
  - 1つの対象のテストは1つのファイルにまとめ、`describe` で分ける
  - 複数の対象にまたがるテスト（同じ表を使う、複数のウィジェットの判定など）は、確かめる内容を表す名前にする
  - ページ（`page.tsx`）や `error.tsx` のテストも、隣に `page.test.tsx` / `error.test.tsx` として置く
- JSX を含むテストの拡張子は `.test.tsx`、含まないものは `.test.ts` にする。コンポーネントのテストは、すべて `.test.tsx` にする
- 複数のテストで使う補助（モック、フィクスチャ）は、テストの対象の隣ではなく、アプリの `test/` に置く（例: `apps/admin/test/`）

```
components/
├── my-component.tsx
└── my-component.test.tsx
lib/
├── my-function.ts
└── my-function.test.ts
test/
└── factories.ts
```

### 2. 適切なテストの粒度

- **ユニットテスト**: 個別のコンポーネント/関数の動作を検証
- **統合テスト**: 複数のコンポーネントの相互作用を検証
- **E2E テスト**: ユーザーフローを検証（別途 Playwright などを使用）

### 3. Testing Library のベストプラクティス

```tsx
// ✅ 良い例: ユーザーの視点でテスト
test('should submit form when button is clicked', async () => {
  const handleSubmit = vi.fn()
  render(<MyForm onSubmit={handleSubmit} />)

  await userEvent.type(screen.getByLabelText('Email'), 'test@example.com')
  await userEvent.click(screen.getByRole('button', { name: 'Submit' }))

  expect(handleSubmit).toHaveBeenCalledWith({ email: 'test@example.com' })
})

// ❌ 悪い例: 実装の詳細に依存
test('should update state', () => {
  const { result } = renderHook(() => useMyHook())
  act(() => {
    result.current.setState('new value')
  })
  expect(result.current.state).toBe('new value')
})
```

### 4. モックの使用

外部依存をモックする際は、Vitest の `vi.mock()` を使用します：

```tsx
import { vi, describe, test, expect } from 'vitest'

vi.mock('next/navigation', () => ({
  usePathname: () => '/test-path',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}))

describe('MyComponent', () => {
  test('should use mocked navigation', () => {
    // テストコード
  })
})
```

#### 管理画面の Server Action のテスト

`apps/admin` の Server Action のテストでは、共通のモックを `vi.mock()` で書かず、`apps/admin/test/` の補助を使います。

- `action-harness.ts` の `setupActionTest()`: 認証（`@/lib/auth`）、Supabase のクライアント、監査ログ、再検証（`next/cache`、`@shinju-date/web-cache`）、Redis、ロガーのモックを、1回の呼び出しで用意する。各テストの前に、モックをクリアし、管理者としてログインした状態にする
- `supabase.ts`: 本物の Supabase のクライアントを使い、PostgREST へのリクエストを MSW で受ける偽のデータベース。テーブルと操作（`select`、`insert`、`upsert`、`update`、`delete`、`rpc`）ごとに応答を決め、送られたリクエストを確かめる
- `factories.ts`: タレント、動画、チャンネルなどの行のフィクスチャ

`setupActionTest()` のモックは、このモジュールを読み込んだときに登録されます。テストの対象の Action は、`@/test/action-harness` より後に、相対パスで読み込んでください（Biome の並べ替えで、この順になります）。モックしたモジュールは、テストのファイルで読み込まず、`setupActionTest()` の戻り値から使います。

```ts
import { describe, expect, it } from 'vitest'
import { setupActionTest } from '@/test/action-harness'
import { postgresError } from '@/test/supabase'
import { restoreAction } from '../index'

const test = setupActionTest()
const { supabase } = test

describe('restoreAction', () => {
  it('restores the videos', async () => {
    supabase.on('select', 'videos', [
      { id: 'video-1', thumbnail_id: null, title: 'Video' },
    ])

    await expect(restoreAction(['video-1'])).resolves.toEqual({
      success: true,
    })
    expect(supabase.calls('update', 'videos')).toHaveLength(1)
    test.expectAuditLog('VIDEO_RESTORE', 'videos', 'video-1', {
      entityName: 'Video',
    })
    test.expectRevalidated({ paths: ['/videos'], tags: [['videos']] })
  })

  it('reports a database error', async () => {
    supabase.on('select', 'videos', postgresError('XX000', 'Fetch error'))

    await expect(restoreAction(['video-1'])).resolves.toMatchObject({
      success: false,
    })
  })

  it('requires an administrator', async () => {
    test.signOut()

    await expect(restoreAction(['video-1'])).resolves.toMatchObject({
      success: false,
    })
    expect(supabase.requests).toHaveLength(0)
  })
})
```

`toDBString` はモックせず、本物を使います。秒に丸めるので、期待する日時は `2024-11-24T17:00:00Z` のように書きます。

### 5. 非同期処理のテスト

```tsx
import { waitFor } from '@testing-library/react'

test('should load data asynchronously', async () => {
  render(<AsyncComponent />)

  expect(screen.getByText('Loading...')).toBeInTheDocument()

  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeInTheDocument()
  })
})
```

### 6. アクセシビリティを考慮したテスト

Testing Library は、アクセシビリティを考慮したクエリメソッドを推奨しています：

```tsx
// ✅ 推奨: アクセシビリティに基づくクエリ
screen.getByRole('button', { name: 'Submit' })
screen.getByLabelText('Email address')
screen.getByText('Welcome')

// ⚠️ 非推奨: 実装の詳細に依存
screen.getByTestId('submit-button')
screen.getByClassName('email-input')
```

## トラブルシューティング

### JSX が動作しない場合

**症状**: `ReferenceError: React is not defined`

**解決方法**:

1. `@vitejs/plugin-react` がインストールされているか確認（`@shinju-date/config` の依存です）

   ```bash
   pnpm --filter @shinju-date/config list @vitejs/plugin-react
   ```

2. `vitest.config.ts` が `defineVitestConfig()` ではなく `defineVitestConfig.react()` を呼んでいるか確認

   ```typescript
   import { defineVitestConfig } from '@shinju-date/config/vitest'

   export default defineVitestConfig.react({
     // ...
   })
   ```

3. 依存関係を再インストール

   ```bash
   pnpm install
   ```

### テストが遅い場合

- `test.environment: 'node'` が適切か確認（React コンポーネントのテストには `'jsdom'` が必要）
- 不要なグローバルセットアップを削除
- テストの並列実行を検討（Vitest はデフォルトで並列実行）

## CI/CD環境でのテスト実行

### GitHub Actions Reporter

GitHub Actions上でのテスト実行時、自動的に最適化されたレポーターが使用されます。

#### Vitest（ユニットテスト）

Vitestは**GitHub Actionsレポーター**を使用し、以下の機能を提供します：

- **GitHub Annotations**: テストの失敗やエラーがPull Requestの該当行に直接表示されます
- **グループ化されたログ**: テストの出力が見やすくグループ化されます
- **テスト結果のサマリー**: 各テストの実行結果が明確に表示されます

CI環境では以下のように実行されます：

```bash
# GitHub Actionsワークフローで自動的に実行
pnpm test --filter <package-name> -- --reporter=github-actions
```

#### Biome（リント・フォーマット）

Biomeは**GitHubレポーター**を使用し、以下の機能を提供します：

- **GitHub Annotations**: リントエラーやフォーマットの問題がPull Requestの該当行に直接表示されます
- **チェックラン**: Biomeの結果がGitHub Checksに統合され、PRのUIから確認できます
- **問題の分類**: エラー、警告、情報がカテゴリごとに整理されます

CI環境では以下のように実行されます：

```bash
# GitHub Actionsワークフローで自動的に実行
pnpm biome ci --reporter=github .
```

#### Playwright（E2Eテスト）

PlaywrightのGitHub Actionsレポーターについては、[E2E Testing Guide](./e2e-testing.md#github-actions-reporter)を参照してください。

### ローカル環境での動作

ローカル環境では、CI環境変数が設定されていないため、通常のレポーター（デフォルト）が使用されます：

- **Vitest**: デフォルトレポーター（カラフルなコンソール出力）
- **Biome**: デフォルトレポーター（カラフルなコンソール出力）
- **Playwright**: HTMLレポーター（ブラウザで結果を表示）

これにより、ローカルとCIで異なる視覚的体験を提供しながら、両方の環境で最適な結果表示が実現されています。

## 参考リンク

- [Vitest 公式ドキュメント](https://vitest.dev/)
- [Testing Library 公式ドキュメント](https://testing-library.com/)
- [React Testing Library チュートリアル](https://testing-library.com/docs/react-testing-library/intro/)
- [新しい JSX Transform について](https://legacy.reactjs.org/blog/2020/09/22/introducing-the-new-jsx-transform.html)

## 関連ドキュメント

- [CONTRIBUTING.md](../CONTRIBUTING.md) - 開発・貢献ガイド
- [msw-guide.md](./msw-guide.md) - モック環境の設定
