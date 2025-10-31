# メンテナンスモード機能

## 概要

メンテナンスモード機能は、データベース移行やシステムメンテナンスなどの重要な作業中に、一般ユーザーのアクセスとバッチ処理を安全に停止させるための機能です。

この機能は以下の特徴を持ちます：

- 再デプロイ不要でリアルタイムにON/OFF切り替えが可能
- 管理画面（`apps/admin`）からワンクリックで操作
- `@upstash/redis`をバックエンドとして使用
- 監査ログへの自動記録

## アーキテクチャ

### Redis キー

- **キー名**: `maintenance_mode`
- **値**: 文字列 `'true'`（有効時）または 存在しない（無効時）

### コンポーネント

#### 1. 管理画面 (`apps/admin`)

**ファイル**:
- `app/(dashboard)/_lib/maintenance-mode-actions.ts` - サーバーアクション
- `app/(dashboard)/_components/maintenance-mode-widget.tsx` - UIコンポーネント
- `app/(dashboard)/page.tsx` - ダッシュボードページ（ウィジェット統合）

**機能**:
- 現在のメンテナンスモード状態の表示（ON/OFF）
- トグルスイッチによる有効化/無効化
- 操作時の確認ダイアログ
- 監査ログへの記録（`MAINTENANCE_MODE_ENABLE` / `MAINTENANCE_MODE_DISABLE`）

#### 2. 公開Webサイト (`apps/web`)

**ファイル**:
- `proxy.ts` - Edge Middleware
- `public/maintenance.html` - 静的メンテナンスページ

**動作**:
1. すべてのリクエストに対してRedisの`maintenance_mode`キーをチェック
2. 値が`true`の場合、静的な`/maintenance.html`ページへリライト
3. 静的HTMLファイルのため、Next.jsのレイアウトやルーティングの影響を受けない

#### 3. バッチ処理 (`apps/batch`)

**ファイル**:
- `proxy.ts` - Edge Middleware

**動作**:
1. すべてのCron Jobリクエストに対してRedisの`maintenance_mode`キーをチェック
2. 値が`'true'`の場合、`503 Service Unavailable`を返す
3. バッチ処理の実行を完全にブロック

## 使用方法

### メンテナンスモードの有効化

1. 管理画面（`https://admin.shinju.date`）にログイン
2. ダッシュボードの「メンテナンスモード」ウィジェットを確認
3. トグルスイッチをONに切り替え
4. 確認ダイアログで「確認」をクリック

**結果**:
- 一般ユーザーは自動的にメンテナンスページにリダイレクトされます
- すべてのバッチ処理が停止します
- 管理画面は通常通りアクセス可能です
- 監査ログに操作が記録されます

### メンテナンスモードの無効化

1. 管理画面のダッシュボードで「メンテナンスモード」ウィジェットを確認
2. トグルスイッチをOFFに切り替え
3. 確認ダイアログで「確認」をクリック

**結果**:
- 一般ユーザーは通常通りサイトにアクセスできるようになります
- バッチ処理が再開されます
- 監査ログに操作が記録されます

## 環境変数

### 必須環境変数

すべてのアプリ（`admin`、`web`、`batch`）で以下の環境変数が必要です：

```bash
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

### 設定方法

1. Vercelプロジェクトの環境変数として設定
2. ローカル開発では各アプリの`.env.local`ファイルに設定

## 監査ログ

メンテナンスモードの操作は自動的に監査ログに記録されます：

### アクション

- `MAINTENANCE_MODE_ENABLE`: メンテナンスモードを有効化
- `MAINTENANCE_MODE_DISABLE`: メンテナンスモードを無効化

### ログ形式

```typescript
{
  action: 'MAINTENANCE_MODE_ENABLE' | 'MAINTENANCE_MODE_DISABLE',
  user_id: string,
  details: {
    message: string
  },
  created_at: timestamp
}
```

## トラブルシューティング

### メンテナンスモードが有効にならない

1. Redis環境変数が正しく設定されているか確認
2. Redisサービスが稼働しているか確認
3. ブラウザのキャッシュをクリア

### バッチ処理が停止しない

1. `apps/batch/proxy.ts`が正しくデプロイされているか確認
2. Redis接続が正常か確認
3. Vercelのログで`maintenance_mode`キーのチェック結果を確認

### 管理画面からアクセスできない

管理画面は常にアクセス可能です。もしアクセスできない場合：

1. 管理画面のURL（`https://admin.shinju.date`）が正しいか確認
2. 認証情報が正しいか確認
3. Supabaseの認証サービスが稼働しているか確認

## 注意事項

- メンテナンスモードは管理画面には影響しません
- 作業完了後は必ずメンテナンスモードを無効化してください
- Redisが利用できない場合、システムは通常通り動作します（フェイルオープン）
- メンテナンスモードの操作はすべて監査ログに記録されます

## 技術的詳細

### Edge Runtime

`apps/web/proxy.ts`と`apps/batch/proxy.ts`はEdge Runtimeで動作するため：

- `@upstash/redis`のEdge互換クライアントを使用
- 低レイテンシーでリクエストごとにメンテナンス状態をチェック
- グローバルに分散配置されたエッジロケーションで実行

### Redis操作

**有効化**:
```typescript
await redisClient.set('maintenance_mode', 'true')
```

**無効化**:
```typescript
await redisClient.del('maintenance_mode')
```

**状態確認**:
```typescript
const value = await redisClient.get<string>('maintenance_mode')
const isEnabled = value === 'true'
```

## 将来的な改善案

- メンテナンス予定時刻の事前通知機能
- メンテナンスページのカスタマイズ可能なメッセージ
- 自動的なメンテナンス時間のスケジュール設定
- より詳細な監査ログ情報（IPアドレス、実行時間など）
