# テストガイド

このドキュメントでは、SHINJU DATE プロジェクトにおけるテストの実装方法とベストプラクティスを説明します。

**最終更新日**: 2025-11-11

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

### Python テスト (Insights API)

- **pytest**: Python のテストフレームワーク
- 詳細は `apps/insights/README.md` を参照

## React コンポーネントのテスト

### 基本的なテストの書き方

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import MyComponent from '../my-component'

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

これらのプロジェクトでは、`vitest.config.ts` で以下の設定がされています：

```typescript
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()], // JSX トランスフォームを有効化
  test: {
    environment: 'jsdom', // ブラウザ環境をシミュレート
    globals: true, // describe, test, expect をグローバルに使用可能
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

Vitest でこの機能を使用するには、`@vitejs/plugin-react` を設定に追加する必要があります：

```typescript
// vitest.config.ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()], // この行を追加
  test: {
    environment: 'jsdom',
    // ... その他の設定
  },
})
```

### ❌ 避けるべき書き方

```tsx
// 不要な React インポート
import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import MyComponent from '../my-component'

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
import MyComponent from '../my-component'

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

テストファイルは以下の規則に従って配置します：

- コンポーネントと同じディレクトリに `__tests__` フォルダを作成
- ファイル名は `*.test.ts` または `*.test.tsx`

```
components/
├── my-component.tsx
└── __tests__/
    └── my-component.test.tsx
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

1. `@vitejs/plugin-react` がインストールされているか確認
   ```bash
   pnpm list @vitejs/plugin-react
   ```

2. `vitest.config.ts` で plugin が設定されているか確認
   ```typescript
   import react from '@vitejs/plugin-react'
   
   export default defineConfig({
     plugins: [react()], // この行が必要
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
- [AGENTS.md](../AGENTS.md) - AI エージェント活用ガイド
- [msw-guide.md](./msw-guide.md) - モック環境の設定
