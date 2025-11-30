# Redisローカル開発環境ガイド

このドキュメントでは、SHINJU DATEプロジェクトにおけるRedisローカル開発環境の詳細な設定と使用方法について説明します。

## 目次

1. [概要](#概要)
2. [アーキテクチャ](#アーキテクチャ)
3. [初期セットアップ](#初期セットアップ)
4. [使用方法](#使用方法)
5. [トラブルシューティング](#トラブルシューティング)
6. [MSW vs ローカルRedis](#msw-vs-ローカルredis)

## 概要

このプロジェクトでは、[serverless-redis-http](https://github.com/hiett/serverless-redis-http)を使用してローカル開発環境を構築しています。Dev Container（GitHub CodespacesやVS Code Dev Containers）を使用する場合、Redis 8とserverless-redis-httpが自動的に起動します。

以下のメリットが得られます：

- **Upstash互換性**: 本番環境（Upstash Redis）と同じREST APIを使用
- **実際のRedis機能**: MSWモックではなく、本物のRedisの動作を検証
- **データ永続化**: 開発中のデータがDockerボリュームに保存される
- **オフライン開発**: インターネット接続なしでも開発可能
- **コスト削減**: 本番Redisのクォータを消費しない
- **自動起動**: Dev Containerを使用する場合、手動設定不要

**推奨される使用法**:
- **Dev Container（Codespaces/VS Code）**: 自動起動、設定不要
- **ローカル開発マシン（Dev Containerなし）**: 手動でDocker Composeを起動
- **CI/CD環境**: GitHub Actions用の設定済み（copilot-setup-steps.yml）
- **動作しない場合**: MSWにフォールバック（設定済み）

## アーキテクチャ

ローカル環境では、以下のコンポーネントがDockerコンテナとして起動します：

```
┌──────────────────────────────────────────┐
│  Your Application                        │
│  (@upstash/redis client)                 │
└────────────┬─────────────────────────────┘
             │ HTTP REST API
             │ (http://localhost:8079)
             ▼
┌──────────────────────────────────────────┐
│  serverless-redis-http                   │
│  (Upstash REST API compatible proxy)     │
│  Port: 8079                              │
└────────────┬─────────────────────────────┘
             │ Redis Protocol
             │ (redis://redis:6379)
             ▼
┌──────────────────────────────────────────┐
│  Redis                                   │
│  (Standard Redis server)                 │
│  Port: 6379                              │
└──────────────────────────────────────────┘
```

### コンポーネント

- **Redis** (port 6379): 標準のRedisサーバー（Redis 8 Bookworm版）
  - データはDockerボリュームに永続化
  - AOF（Append Only File）モードで起動し、データ永続性を確保
  - 最新の安定版（Redis 8.4.0）を使用
  
- **serverless-redis-http** (port 8079): HTTPプロキシサーバー（バージョン 0.0.10）
  - Upstash REST APIと完全互換
  - RedisプロトコルをHTTP REST APIに変換
  - `@upstash/redis`クライアントとシームレスに連携
  - バージョン固定により安定性を確保

## 初期セットアップ

### 前提条件

**Dev Containerを使用する場合（推奨）:**
- GitHub Codespaces、またはVS Code + Dev Containers拡張機能
- 自動的にセットアップされるため、追加の設定は不要

**Dev Containerを使用しない場合:**
- **Docker**: ローカルマシンにDockerがインストールされ、起動していること
- **Docker Compose**: Docker Composeが利用可能であること（最近のDockerに含まれています）

### 1. Dev Containerでの自動セットアップ（推奨）

Dev Container（GitHub CodespacesまたはVS Code Dev Containers）を使用する場合：

1. Codespacesを開く、またはVS CodeでDev Containerを起動
2. Redis サービスが自動的に起動します
3. 追加の設定は不要です

Redisサービスは`.devcontainer/compose.yml`で定義されており、コンテナ起動時に自動的に開始されます。

### 2. 手動セットアップ（Dev Containerを使用しない場合）

Dev Containerを使用せず、ローカルマシンで直接開発する場合：

```bash
cd .devcontainer
docker compose up -d
```

このコマンドは：
1. Redis 8とserverless-redis-httpを起動
2. ヘルスチェックでサービスの準備完了を待機
3. バックグラウンドで実行

停止する場合：

```bash
cd .devcontainer
docker compose down
```

### 3. 環境変数の設定

#### オプション1: `.env.local`ファイルを編集（推奨）

`apps/web/.env.local`、`apps/admin/.env.local`、`apps/batch/.env.local`ファイルで：

```bash
# ローカルRedisを使用
UPSTASH_REDIS_REST_URL="http://localhost:8079"
UPSTASH_REDIS_REST_TOKEN="local_development_token"
```

#### オプション2: シェルの環境変数として設定

```bash
export UPSTASH_REDIS_REST_URL=http://localhost:8079
export UPSTASH_REDIS_REST_TOKEN=local_development_token
```

### 4. Python環境（`apps/insights`）の設定

`apps/insights/.env`ファイルで：

```bash
UPSTASH_REDIS_URL="http://localhost:8079"
UPSTASH_REDIS_TOKEN="local_development_token"
```

## 使用方法

### Dev Containerでの使用

Dev Containerを使用している場合、Redisサービスは自動的に起動しており、すぐに使用できます。

### ステータス確認

Redisサービスの稼働状況を確認：

```bash
# Dev Containerの場合
docker ps | grep shinju-date-redis

# または、コンテナのヘルスチェック確認
docker inspect shinju-date-redis --format='{{.State.Health.Status}}'
docker inspect shinju-date-redis-http --format='{{.State.Health.Status}}'
```

期待される出力：`healthy`

### アプリケーションでの使用

#### Node.js/TypeScript

`@upstash/redis`クライアントが環境変数から自動的に設定を読み込みます：

```typescript
import { Redis } from '@upstash/redis'

// Redis.fromEnv() は環境変数から設定を読み込む
const redis = Redis.fromEnv()

// 通常通り使用
await redis.set('key', 'value')
const value = await redis.get('key')
```

#### Python (apps/insights)

Pythonアプリでも同様に環境変数から設定を読み込みます。

### Redisサービスの停止と再起動

**Dev Containerを使用している場合:**

サービスはコンテナのライフサイクルと連動しています。コンテナを再起動すると、Redisサービスも自動的に再起動されます。

**手動で起動した場合:**

```bash
# 停止
cd .devcontainer
docker compose down

# 再起動
docker compose up -d
```

### データのクリア

開発データをクリアしたい場合は、Dockerボリュームを削除します：

```bash
# Redisサービスを停止
cd .devcontainer
docker compose down

# ボリュームも含めて削除
docker compose down -v

# 再起動
docker compose up -d
```

## トラブルシューティング

### Redisが起動しない

#### 原因1: Dockerが起動していない

```bash
# Dockerの状態を確認
docker info
```

Dockerが起動していない場合は、Dockerを起動してから再試行してください。

#### 原因2: ポートが既に使用されている

```bash
# ポート8079または6379が使用中か確認
lsof -i :8079
lsof -i :6379

# または (Linuxの場合)
ss -tuln | grep -E ':(8079|6379)'
```

既に使用されている場合は、そのプロセスを停止するか、`docker-compose.redis.yml`でポート番号を変更してください。

### 接続エラー

#### エラー: "Connection refused" または "ECONNREFUSED"

```bash
# サービスの状態を確認
pnpm redis:status

# ログを確認
docker logs shinju-date-redis-http
docker logs shinju-date-redis
```

サービスが`healthy`状態でない場合は、ログを確認してエラーの原因を特定してください。

#### エラー: "SRH: Unable to connect to the Redis server"

**Dev Containerを使用している場合:**

通常この問題は発生しません。`.devcontainer/compose.yml`のDocker Composeネットワーク設定により、サービス間の接続が自動的に解決されます。

**手動で起動した場合で問題が発生する場合:**

環境変数をMSWに切り替えます：

```bash
# .env.localファイルで
UPSTASH_REDIS_REST_URL="https://fake.upstash.test"
UPSTASH_REDIS_REST_TOKEN="fake"
```

MSWは全ての環境で動作する完全なRedisモックを提供します。

#### エラー: "Invalid token"

環境変数のトークンが正しく設定されているか確認してください：

```bash
# .env.localファイルを確認
cat apps/web/.env.local | grep UPSTASH_REDIS_REST_TOKEN

# トークンは "local_development_token" である必要があります
```

### パフォーマンスの問題

#### メモリ不足

Dockerに割り当てられたメモリを増やしてください。Docker Desktopの設定で、最低4GB（推奨8GB）のメモリを割り当ててください。

#### ディスク容量不足

```bash
# Dockerのディスク使用量を確認
docker system df

# 不要なデータをクリーンアップ
docker system prune -a
```

### コンテナが頻繁に再起動する

```bash
# ログを確認
docker logs shinju-date-redis-http --tail 100
docker logs shinju-date-redis --tail 100

# コンテナの詳細情報を確認
docker inspect shinju-date-redis-http
docker inspect shinju-date-redis
```

## MSW vs ローカルRedis

プロジェクトでは、Redis開発に2つのアプローチを提供しています：

### MSW (Mock Service Worker)

**利点:**
- セットアップ不要（追加の依存関係なし）
- 高速（実際のRedis接続なし）
- テストに適している
- CI環境で軽量

**欠点:**
- モックデータのみ（`packages/msw-handlers`で定義）
- 一部のRedisコマンドは実装されていない
- データ永続化なし

**使用場面:**
- ユニットテスト
- E2Eテスト
- CI/CD環境
- 簡単な動作確認

### ローカルRedis (serverless-redis-http)

**利点:**
- 実際のRedisの動作
- 全てのRedisコマンドをサポート
- データ永続化
- 本番環境に近い動作

**欠点:**
- Dockerのセットアップが必要
- 若干のメモリ使用
- 起動/停止の手間

**使用場面:**
- 機能開発
- データ永続化が必要な開発
- Redisの高度な機能を使用する場合
- 本番環境に近い動作確認

### どちらを選ぶべきか？

| シナリオ | 推奨 |
|---------|------|
| 新機能の開発 | ローカルRedis |
| ユニットテスト | MSW |
| E2Eテスト | MSW |
| CI/CD | MSW |
| データ永続化が必要 | ローカルRedis |
| Redisの高度な機能 | ローカルRedis |
| 簡単な動作確認 | MSW |

**ヒント**: 両方を環境変数の切り替えで簡単に使い分けることができます。

```bash
# MSWを使用
export UPSTASH_REDIS_REST_URL="https://fake.upstash.test"
export UPSTASH_REDIS_REST_TOKEN="fake"

# ローカルRedisを使用
export UPSTASH_REDIS_REST_URL="http://localhost:8079"
export UPSTASH_REDIS_REST_TOKEN="local_development_token"
```

## 参考資料

- [serverless-redis-http GitHub](https://github.com/hiett/serverless-redis-http)
- [Upstash Redis 公式ドキュメント](https://upstash.com/docs/redis)
- [Upstash ローカル開発ガイド](https://upstash.com/docs/redis/sdks/ts/developing)
- [Redis コマンドリファレンス](https://redis.io/commands/)
- [Docker Compose ドキュメント](https://docs.docker.com/compose/)
- [既知の問題とトラブルシューティング](./REDIS_KNOWN_ISSUES.md)
