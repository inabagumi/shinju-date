# Mock Data Factory Implementation - Improvement Summary

## 概要

`@faker-js/faker`を使用したファクトリーベースのモックデータ生成を実装し、MSW ハンドラーの保守性、型安全性、拡張性を大幅に向上させました。

## 削減されたコード量

### 合計: **560行以上のハードコーディングを削減**

#### supabase.ts
- **削減前**: 約1,000行（大量の手動オブジェクト定義）
- **削減後**: 約530行
- **削減量**: **470行以上**

例：
```typescript
// Before: 140行の手動定義
const mockVideos: Tables<'videos'>[] = [
  {
    created_at: '2023-01-01T00:00:00.000Z',
    deleted_at: null,
    duration: 'PT10M30S',
    id: '750e8400-e29b-41d4-a716-446655440001',
    platform: null,
    published_at: '2023-01-01T12:00:00.000Z',
    status: 'PUBLISHED',
    talent_id: '550e8400-e29b-41d4-a716-446655440001',
    thumbnail_id: '650e8400-e29b-41d4-a716-446655440001',
    title: 'Analytics Test Video #1',
    updated_at: '2023-01-01T00:00:00.000Z',
    visible: true,
  },
  // ... 9個のオブジェクトが続く
]

// After: 7行
const mockVideos: Tables<'videos'>[] = createManyVideos(10).map(
  (video, idx) => ({
    ...video,
    id: `750e8400-e29b-41d4-a716-44665544000${idx + 1}`,
    talent_id: mockTalents[idx % mockTalents.length]?.id ?? mockTalents[0]?.id ?? '',
    thumbnail_id: mockThumbnails[idx % mockThumbnails.length]?.id ?? mockThumbnails[0]?.id ?? '',
  }),
)
```

#### upstash.ts
- **削減前**: 約310行
- **削減後**: 約220行
- **削減量**: **90行以上**

例：
```typescript
// Before: 60行の初期化コード
const initializeRedisData = () => {
  const today = Temporal.Now.plainDateISO()
  const dates = []
  for (let i = 6; i >= 0; i--) {
    const date = today.subtract({ days: i })
    const dateStr = date.toString().replace(/-/g, '')
    dates.push(dateStr)
  }
  
  dates.forEach((dateStr, index) => {
    mockRedisStore.set(`videos:clicked:${dateStr}`, [
      { member: '1', score: 100 + index * 10 },
      { member: '2', score: 80 + index * 8 },
      // ... 繰り返し
    ])
    // ... 他のキーも同様
  })
}

// After: 1行
const mockRedisStore = createRedisDataFactory(7)
```

## 改善された保守性

### Before（手動定義）
- 新しいフィールドの追加: 10個のオブジェクトを全て更新する必要がある
- データの変更: 各オブジェクトを個別に編集
- 関連データの作成: IDの整合性を手動で管理

### After（ファクトリー）
- 新しいフィールドの追加: ファクトリー関数を1箇所更新するだけ
- データの変更: ファクトリーの引数で簡単にカスタマイズ
- 関連データの作成: IDを自動的に関連付け

## 型安全性の向上

### 1. コンパイル時の型チェック

```typescript
// ファクトリーは必ずテーブル型と一致
export function createVideoFactory(
  overrides: Partial<Tables<'videos'>> = {},
): Tables<'videos'> {
  // TypeScriptが全フィールドの存在をチェック
  return {
    created_at: faker.date.past().toISOString(),
    deleted_at: faker.helpers.arrayElement([null, null, null, null, faker.date.recent().toISOString()]),
    // ... 全フィールドが定義される
    ...overrides,
  }
}
```

### 2. 実行時の型安全性

型アサーションから型ガードへの変更：

```typescript
// Before: 型アサーション（実行時チェックなし）
const data = (mockRedisStore.get(key) as Array<{ member: string; score: number }>) || []

// After: 型ガード（実行時チェックあり）
const rawData = mockRedisStore.get(key)
const data = Array.isArray(rawData) ? rawData : []
```

## データの多様性

### Before
```typescript
// 固定値のみ
const mockVideos = [
  { id: '1', title: 'Video 1', duration: 'PT10M30S' },
  { id: '2', title: 'Video 2', duration: 'PT15M45S' },
  // ... 全て手動で定義
]
```

### After
```typescript
// Fakerによるリアルで多様なデータ
const videos = createManyVideos(100)
// 毎回異なるタイトル、日付、UUID、期間などが生成される
// - タイトル例: "Practical Strategic Video", "How to calculate protocol", "42 Ways to parse"
// - 日付: ランダムな過去1年以内
// - UUID: 適切なフォーマット
// - 期間: バリエーション豊富
```

## 拡張性の向上

### 新しいテーブルの追加が簡単

```typescript
// 1. ファクトリーを作成（10行程度）
export function createNewTableFactory(
  overrides: Partial<Tables<'new_table'>> = {},
): Tables<'new_table'> {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    created_at: faker.date.past().toISOString(),
    ...overrides,
  }
}

// 2. エクスポート（1行）
export { createNewTableFactory } from './factories/supabase/new-table.js'

// 3. ハンドラーで使用（3行）
const mockNewTable = createManyNewTable(10)
// ... ハンドラー実装
```

## 利用可能なファクトリー

### Supabase Tables
- `createVideoFactory()` / `createManyVideos(count)`
- `createTalentFactory()` / `createManyTalents(count)`
- `createThumbnailFactory()` / `createManyThumbnails(count)`
- `createChannelFactory()` / `createManyChannels(count)`
- `createTermFactory()` / `createManyTerms(count)`
- `createAnnouncementFactory()` / `createManyAnnouncements(count)`
- `createYoutubeChannelFactory()` / `createManyYoutubeChannels(count)`
- `createYoutubeVideoFactory()` / `createManyYoutubeVideos(count)`

### Redis Data
- `createRedisDataFactory(dateCount)` - 日付ベースのデータ生成
- `createCustomRedisData(data)` - カスタムキー/値ペア

### YouTube API
- `createYoutubeAPIChannelFactory()`
- `createYoutubeAPIVideoFactory()`
- `createYoutubeAPIPlaylistItemFactory()`

## テスト結果

✅ **All tests passing (15/15)**
✅ **Build successful**
✅ **No linting errors**
✅ **No TypeScript errors**

## 技術選択の理由

### なぜ @msw/data を使わなかったか

- **非推奨**: `@mswjs/data@0.16.2`はdeprecatedとしてマークされている
- **シンプル性**: `@faker-js/faker`のみで十分な機能を実現できる
- **柔軟性**: ファクトリー関数により細かい制御が可能
- **学習コスト**: 追加のライブラリAPIを学ぶ必要がない

### @faker-js/faker の利点

- **活発なメンテナンス**: 最新バージョンで常に更新されている
- **豊富なデータ型**: 名前、日付、UUID、URL、住所など多様
- **ローカライズ対応**: 日本語データの生成も可能
- **軽量**: 必要な機能のみをインポート可能

## まとめ

この実装により、以下の大きな改善を達成しました：

1. **560行以上のコード削減** - 保守コストの大幅な削減
2. **型安全性の向上** - コンパイル時と実行時の両方で型を保証
3. **データの多様性** - よりリアルなテストケース
4. **拡張性の向上** - 新機能追加が容易に
5. **ドキュメント整備** - 使い方と改善点を明記

これらの改善により、MSW ハンドラーの品質、保守性、開発効率が大幅に向上しました。
