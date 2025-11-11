# AIエージェントとの協業

このドキュメントでは、SHINJU DATEプロジェクトの開発プロセスにおけるAIエージェントの役割と、それらを効果的に活用するためのベストプラクティスを説明します。

## 概要

本プロジェクトの開発では、複数のAIツールを積極的に活用しています。AIエージェントは開発者の生産性を向上させ、コードの品質を高め、より効率的な開発フローを実現するための重要なパートナーです。

## プロジェクト環境のセットアップ

**重要**: 開発環境のセットアップ手順は、[docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md) に集約されています。作業を開始する前に、必ずこのガイドを参照してください。

## AIエージェントの種類と役割

### 対話・計画型エージェント（例: Google Gemini）

対話型AIエージェントは、高レベルの意思決定、設計、戦略立案において開発者をサポートします。

#### 主な用途

* **ブレインストーミング**: 新機能のアイデア出しや問題解決のアプローチを議論
* **アーキテクチャ設計**: システム設計やコンポーネント構成の検討
* **リファクタリング提案**: コードベースの改善や最適化の方針策定
* **ドキュメント作成**: 技術文書、README、Issue、プルリクエストの下書き作成
* **コードレビュー**: 包括的なコードレビューとフィードバックの提供
* **問題の診断**: 複雑なバグやパフォーマンス問題の分析

#### 活用のベストプラクティス

* 具体的な質問や明確なコンテキストを提供する
* 複数の選択肢や代替案を検討する
* AIの提案を批判的に評価し、プロジェクトの要件に照らして検証する
* 大きな決定事項は必ずチームメンバーとレビューする

### コード補完・実装型エージェント（例: GitHub Copilot）

コード補完型AIエージェントは、エディタ内でリアルタイムにコーディング作業を支援します。

#### 主な用途

* **定型コードの生成**: 繰り返しのパターンやボイラープレートコードの自動生成
* **関数の実装**: コメントや関数シグネチャから実装内容を提案
* **テストコードの作成**: 既存のコードに対するユニットテストの生成
* **コメントの自動生成**: コードの意図を説明するコメントの提案
* **リファクタリング**: 既存コードの改善や書き換えの支援
* **APIの活用**: ライブラリやフレームワークの正しい使用方法を提案

#### 活用のベストプラクティス

* 提案されたコードを必ず確認し、理解してから採用する
* プロジェクトのコーディング規約やスタイルガイドに従っているか確認する
* セキュリティ上の問題がないか検証する
* 生成されたテストが適切なカバレッジを持っているか確認する

## AIエージェント活用のベストプラクティス

### 1. 人間によるレビューと検証

**すべてのAI生成コードは、人間による慎重なレビューと検証が必要です。**

* AIの提案は開発の出発点であり、最終的な品質保証は人間の責任です
* コードの意図、ロジック、エッジケースを理解した上で採用する
* セキュリティ、パフォーマンス、保守性の観点から評価する

### 2. テストの実施

AI生成コードに対しても、通常のコードと同様に厳格なテスト基準を適用します。

* ユニットテストを作成し、期待される動作を検証する
* 統合テストで他のコンポーネントとの相互作用を確認する
* エッジケースや異常系のテストも含める

### 3. セキュリティの考慮

AIツールは必ずしもセキュリティベストプラクティスに従うとは限りません。

* 機密情報（APIキー、パスワード、個人情報など）が含まれていないか確認する
* 一般的な脆弱性（インジェクション、XSS、CSRFなど）がないか検証する
* 依存関係の更新や脆弱性スキャンを定期的に実施する

### 4. コンテキストの提供

AIエージェントにより良い提案をしてもらうために、適切なコンテキストを提供します。

* コメントで意図や要件を明確に説明する
* 関連するファイルやコードを参照できるようにする
* プロジェクトのコーディング規約やパターンを共有する

### 5. 継続的な学習

AIツールは常に進化しています。

* 新しい機能やベストプラクティスを積極的に学ぶ
* チーム内でAI活用の知見やTipsを共有する
* 効果的だった使い方や注意すべき点をドキュメント化する

## プロジェクト固有のガイドライン

### コードスタイルと品質チェック

* JavaScript/TypeScript: Biomeによるフォーマットとリンティングを必ず実行する
* Python (Insights API): Ruffによるフォーマットとリンティングを必ず実行する
* AI生成コードも該当する品質チェックツールでチェックする
* プロジェクトの既存のパターンやコンベンションに従う

**重要**: AIエージェントは、コード変更後に必ず品質チェックコマンドを実行することが必須です。このコマンドを実行し忘れると、ビルドエラーやフォーマットの問題が発生し、プルリクエストの品質が低下します。

#### JavaScript/TypeScript の場合:

`pnpm run check --fix` を実行

このコマンドは以下を自動的に実行します：
- Biomeによるコードフォーマット
- リンティングチェックと自動修正
- 未使用インポートの削除
- コードスタイルの統一

#### Python (Insights API) の場合:
```bash
cd apps/insights
uv run poe format
uv run poe lint
```

特に以下の場合は必ず実行してください：

* コードファイルを新規作成・編集した後
* インポート文を追加・削除・変更した後
* 型定義やインターフェイスを変更した後
* リファクタリングを行った後

この作業を怠ると、未使用のインポート、フォーマットの不整合、型エラーなどの問題が蓄積し、開発プロセスを大幅に遅らせる原因となります。

### Next.js Cache Directives（キャッシュディレクティブ）

**🚨 厳格なルール**: Next.js 16のCache Componentsを使用する際、以下のルールを**必ず**守ってください：

1. **`'use cache'` ディレクティブの直後には必ず空行を1行入れる**
2. **`cacheLife()` や `cacheTag()` などのキャッシュ設定関数の後にも必ず空行を1行入れる**
3. **例外なくこのルールを適用する** - AIエージェントは全てのファイルでこのルールを遵守する必要があります

#### ✅ 正しい例：

```typescript
async function MyComponent() {
  'use cache: remote'
  
  cacheLife('hours')
  cacheTag('my-tag')
  
  const data = await fetchData()
  return <div>{data}</div>
}
```

#### ❌ 間違った例：

```typescript
async function MyComponent() {
  'use cache: remote'
  const data = await fetchData() // NG: ディレクティブの後に空行がない
  return <div>{data}</div>
}
```

#### 間違った例：

```typescript
async function MyComponent() {
  'use cache: remote'
  const data = await fetchData() // ❌ ディレクティブの後に空行がない
  return <div>{data}</div>
}
```

#### キャッシュのベストプラクティス：

1. **データ取得関数レベルでキャッシュする**：コンポーネントレベルではなく、データ取得関数でキャッシュすることで、`generateMetadata`とページコンポーネントの両方でキャッシュを再利用できます。

```typescript
// ✅ 正しい：データ取得関数でキャッシュ
async function getTalent(id: string) {
  'use cache: private'
  
  cacheLife('minutes')
  
  const talent = await db.query(...)
  return talent
}

// メタデータとページの両方で再利用
export async function generateMetadata({ params }) {
  const talent = await getTalent(params.id) // キャッシュを再利用
  return { title: talent.name }
}

export default async function Page({ params }) {
  const talent = await getTalent(params.id) // 同じキャッシュを再利用
  return <div>{talent.name}</div>
}
```

2. **重複してキャッシュしない**：関数がすでに`'use cache'`を持っている場合、それを呼び出すコンポーネントで再度キャッシュディレクティブを使用しないでください。

3. **適切なキャッシュタイプを選択**：
   - `'use cache: remote'` - 公開データに使用（VDCに保存）
   - `'use cache: private'` - 認証が必要なデータに使用（ユーザーごと）

### Redisキーの管理 (Redis Key Management)

**重要**: このプロジェクトでは、Redisキーを一元管理し、命名規則を統一するため、以下のルールを定めます。

#### ルール

1. **すべてのRedisキーは`@shinju-date/constants`の`REDIS_KEYS`で管理**
   * Redisキーのプレフィックスや固定キーは、`packages/constants/src/index.ts`の`REDIS_KEYS`オブジェクトに定義してください
   * コード内でハードコーディングせず、必ず`REDIS_KEYS`から参照してください
   * これにより、キーの重複防止、変更時の影響範囲の把握、命名規則の統一が可能になります

2. **日付キーのフォーマット**
   * 日付を含むキーには、`@shinju-date/temporal-fns`の`formatDate`関数を使用してください
   * `formatDate`は`YYYYMMDD`形式（ダッシュなし）を返すため、キーを短く保つことができます
   * 例: `${REDIS_KEYS.SUMMARY_STATS_PREFIX}${formatDate(now)}` → `summary:stats:20251111`

3. **キー命名規則**
   * プレフィックスは用途を明確に示す英語で記述（例: `summary:`, `videos:`, `search:`）
   * 複数の単語はコロン（`:`）で区切る（例: `videos:clicked:`）
   * 末尾にコロンを付けることで、動的な値を追加しやすくする（例: `SUMMARY_STATS_PREFIX: 'summary:stats:'`）

4. **TTL（有効期限）の設定**
   * すべてのRedisキーには適切なTTLを設定してください
   * メモリの肥大化を防ぐため、必ず有効期限を指定してください
   * 例: `{ ex: 30 * 24 * 60 * 60 }` // 30日間

#### コード例

**推奨されない例 (Bad Practice):**

```typescript
// ❌ ハードコーディングされたキー
const key = 'summary:stats:2025-11-11'
await redis.set(key, data)

// ❌ TTLなし
await redis.set('my-key', data)
```

**推奨される例 (Good Practice):**

```typescript
import { REDIS_KEYS } from '@shinju-date/constants'
import { formatDate } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'

// ✅ REDIS_KEYSを使用
const now = Temporal.Now.zonedDateTimeISO(TIME_ZONE)
const dateKey = formatDate(now) // '20251111'（ダッシュなし）
const key = `${REDIS_KEYS.SUMMARY_STATS_PREFIX}${dateKey}`

// ✅ TTLを指定
await redis.set(key, data, { ex: 30 * 24 * 60 * 60 })
```

#### 新しいRedisキーの追加方法

1. `packages/constants/src/index.ts`の`REDIS_KEYS`オブジェクトに追加する
   ```typescript
   export const REDIS_KEYS = {
     // ... 既存のキー
     YOUR_NEW_PREFIX: 'your:new:prefix:',
   } as const
   ```

2. 必要に応じてコメントで用途を説明する
   ```typescript
   // Dashboard summary trend snapshots (format: prefix + YYYYMMDD)
   SUMMARY_ANALYTICS_PREFIX: 'summary:analytics:',
   SUMMARY_STATS_PREFIX: 'summary:stats:',
   ```

3. 使用する側でインポートして参照する
   ```typescript
   import { REDIS_KEYS } from '@shinju-date/constants'
   
   const key = `${REDIS_KEYS.YOUR_NEW_PREFIX}${someId}`
   ```

### 時刻の取り扱い (Date/Time Handling)

**重要**: このプロジェクトでは、Reactのハイドレーションエラーを防ぎ、時刻の計算を正確に行うため、JavaScript標準の`Date`オブジェクトの利用に関して以下のルールを定めます。

#### ルール

1.  **`Date`オブジェクトの原則使用不可**
    * `new Date()`や`Date.now()`は、ハイドレーションエラーの主な原因となるため、**原則として使用を避けてください**。
    * 例外として、ライブラリの互換性など、やむを得ない場合に限り使用を許可しますが、その場合もサーバーとクライアントで値が異なる可能性があることを十分に認識し、慎重に扱う必要があります。

2.  **`Temporal`の使用を推奨**
    * 時刻の管理には、`temporal-polyfill`パッケージが提供する`Temporal`オブジェクトの使用を強く推奨します。
    * **現在時刻の取得**: タイムゾーンに依存しない絶対時刻を取得する場合は`Temporal.Now.instant()`を使用します。
    * **時刻の保存と通信**: データベースへの保存やAPIでの送受信には、`Temporal.Instant`オブジェクトをISO 8601形式の文字列（例: `instant.toString()`）に変換して使用します。
      * **注意**: `instant.toString()` は常にUTC（末尾が `Z` のISO 8601形式、例: `2025-11-01T12:00:00Z`）で出力されます。タイムゾーン付きの文字列（例: `2025-11-01T21:00:00+09:00`）が必要な場合は、`Temporal.ZonedDateTime.toString()` を使用してください。

3.  **タイムゾーンの指定**
    * ユーザーに時刻を表示するなど、タイムゾーンが必要な場合は、ハードコーディング（`'Asia/Tokyo'`など）を**絶対に行わず**、必ず`@shinju-date/constants`パッケージから`TIME_ZONE`定数をインポートして使用してください。

#### コード例

**推奨されない例 (Bad Practice):**

```typescript
const now = new Date();
const tokyoTime = now.toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo' });
```

**推奨される例 (Good Practice):**

```typescript
import { TIME_ZONE } from '@shinju-date/constants';
import { Temporal } from 'temporal-polyfill';

// 現在の絶対時刻 (UTC) を取得
const now = Temporal.Now.instant();

// DB保存やAPI送信用に文字列に変換
const isoString = now.toString();

// 文字列からInstantオブジェクトを復元
const fromString = Temporal.Instant.from('2025-11-01T12:00:00Z');

// 日本時間で表示する場合
const tokyoTime = now.toZonedDateTimeISO(TIME_ZONE);
console.log(tokyoTime.toString());
// > 例: 2025-11-01T21:00:00+09:00[Asia/Tokyo] のような形式 (実際の出力は now の値によって異なります)
```

#### データベースへの日時の保存について

データベースの `TIMESTAMPTZ` 型のカラムに `Temporal.Instant` または `Temporal.ZonedDateTime` オブジェクトの値を保存する際は、**必ず** `@shinju-date/temporal-fns` パッケージの `toDBString` ヘルパー関数を使用してください。

この関数は、タイムスタンプを秒単位に正規化（ミリ秒以下を切り捨て）し、UTCのISO 8601文字列に変換します。これにより、YouTube APIから取得した日時と `Temporal.Now` で生成した日時の精度が統一され、意図しないデータ更新などのバグを防ぎます。

##### 良い例 (`Good`)

```typescript
import { toDBString } from '@shinju-date/temporal-fns';
import { Temporal } from 'temporal-polyfill';

const now = Temporal.Now.instant();

await supabase
  .from('videos')
  .update({
    updated_at: toDBString(now) // 必ずtoDBStringを使用する
  })
  .eq('id', videoId);
````

##### 悪い例 (`Bad`)

```typescript
import { Temporal } from 'temporal-polyfill';

const now = Temporal.Now.instant();

// toDBStringを使わずに直接toString()を呼び出してはいけません。
// ミリ秒以下の精度が残り、データ不整合の原因となります。
await supabase
  .from('videos')
  .update({
    updated_at: now.toString() // NG
  })
  .eq('id', videoId);
```

### コミットメッセージ

* AI支援で作成したコードも、通常通り明確で意味のあるコミットメッセージを記述する
* Conventional Commitsの形式に従う（例: `feat(web): add new feature`、`fix(insights): resolve API issue`、`refactor(admin): improve component`）
  * スコープは`apps/*`や`packages/*`にある各アプリやパッケージを単位とする
  * 1行目はGitHubのUIに収まる平易な英文で記述する
* 大きな変更は小さなコミットに分割する

### Pull Request

* AI生成コードを含むPull Requestでも、通常のレビュープロセスに従う

**🚨 重要: Pull Requestのタイトルについて**

* **Pull Requestのタイトルは必ずConventional Commitsの形式に従った平易な英語で記述してください**
  * Pull Requestのタイトルはgitのコミットメッセージとして使用されるため、この要件は絶対に守る必要があります
  * 例: `feat(admin): renovate dashboard with accurate summary stats`
  * 例: `fix(web): resolve video filtering issue`
  * 例: `refactor(api): improve data processing logic`

* **タイトルの記述ガイドライン:**
  * 必ずConventional Commitsの形式を使用する (`type(scope): description`)
  * GitHubのUIに収まりやすいよう、シンプルで平易な英語を使用する
  * 日本語は使用しない（gitコミットメッセージとして適切でないため）
  * 1行で完結させ、簡潔で明確な表現にする

* 変更内容を明確に説明し、必要に応じてAIツールの使用方法を記載する

## 透明性とドキュメント化

### AIツールの使用を明示する

* 大規模なAI生成コードを含むプルリクエストでは、その旨を明記することを推奨します
* 特殊な使い方や考慮事項があれば、コメントやドキュメントに記載する

### 学習とフィードバック

* AIツールの効果的な使用例や、避けるべきパターンを共有する
* プロジェクトのニーズに合わせて、このドキュメントを更新し続ける

## まとめ

AIエージェントは、SHINJU DATEプロジェクトの開発を加速し、コードの品質を向上させる強力なツールです。しかし、AIは開発者を置き換えるものではなく、補助するものです。最終的な判断、品質保証、セキュリティの責任は常に人間にあります。

このガイドラインに従うことで、AIツールの利点を最大限に活用しながら、高品質で保守可能なコードベースを維持することができます。

---

このドキュメントに関するフィードバックや改善提案は、Issueやプルリクエストでお寄せください。
