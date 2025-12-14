# Docker Image Security Enhancement - Implementation Summary

## 実施内容 (Implementation Details)

このPRでは、プロジェクト全体のDockerイメージ参照を **タグ＋ダイジェスト併記形式** (`image:tag@sha256:digest`) に統一しました。

### 変更されたファイル

1. **`compose.yml`** (ルート) - 14個のイメージを更新
2. **`.devcontainer/compose.yml`** - 1個のイメージを更新
3. **`.github/workflows/copilot-setup-steps.yml`** - 1個のイメージを更新
4. **`docs/docker-image-digest-management.md`** - 新規作成（管理ドキュメント）

合計 **16個のDockerイメージ参照** を更新しました。

## セキュリティ上の利点 (Security Benefits)

### 1. イメージの不変性保証 (Image Immutability)

**従来の問題点:**
```yaml
# タグのみの指定
image: redis:8.4.0-bookworm
```

この方法では、誰かが同じタグで異なる内容のイメージをプッシュすると、意図しないイメージを使用してしまう可能性があります。

**改善後:**
```yaml
# タグ＋ダイジェスト形式
image: redis:8.4.0-bookworm@sha256:3906b477e4b60250660573105110c28bfce93b01243eab37610a484daebceb04
```

ダイジェスト（SHA256ハッシュ）により、イメージの内容が完全に固定されます。

### 2. サプライチェーン攻撃の防止

攻撃者がDockerレジストリに不正アクセスしてイメージを差し替えた場合でも、ダイジェストが一致しないため、異なるイメージは使用されません。

### 3. 再現性の向上

異なる環境や時期でも、全く同じイメージが使用されることが保証されます。これにより：
- 開発環境とCI環境の一貫性が保たれる
- 問題の再現が容易になる
- デバッグが効率的になる

## 更新されたイメージ一覧 (Updated Images)

| イメージ名 | タグ | 用途 | 更新場所 |
|----------|------|------|---------|
| redis | 8.4.0-bookworm | キャッシュ・セッション管理 | compose.yml, copilot-setup-steps.yml |
| hiett/serverless-redis-http | 0.0.10 | Redis HTTP API | compose.yml |
| supabase/postgres | 17.6.1.064 | PostgreSQLデータベース | compose.yml |
| kong | 2.8.5 | APIゲートウェイ | compose.yml |
| supabase/gotrue | v2.184.0 | 認証サービス | compose.yml |
| postgrest/postgrest | v13.0.8 | REST APIサービス | compose.yml |
| supabase/realtime | v2.68.4 | リアルタイムサービス | compose.yml |
| supabase/storage-api | v1.33.0 | ストレージAPIサービス | compose.yml |
| axllent/mailpit | v1.28.0 | メールテスト | compose.yml |
| supabase/studio | 2025.12.09-sha-434634f | Supabase Studio | compose.yml |
| supabase/postgres-meta | v0.95.1 | DBイントロスペクション | compose.yml |
| supabase/edge-runtime | v1.69.28 | Edge Functions実行環境 | compose.yml |
| supabase/logflare | 1.27.0 | 分析サービス | compose.yml |
| timberio/vector | 0.51.1-alpine | ログ集約 | compose.yml |
| mcr.microsoft.com/devcontainers/typescript-node | 4-24-bookworm | Dev Container | .devcontainer/compose.yml |

## 今後の運用 (Future Operations)

### イメージ更新時の手順

1. **新しいバージョンの確認**
   - Renovateからの更新通知を確認
   - または上流のリリースノートを確認

2. **ダイジェストの取得**
   ```bash
   # 方法1: docker buildxコマンドを使用
   docker buildx imagetools inspect IMAGE:TAG --format '{{json .Manifest}}' | jq -r '.digest'
   
   # 方法2: docker pullコマンドを使用
   docker pull IMAGE:TAG 2>&1 | grep -i digest
   ```

3. **ファイルの更新**
   - 該当ファイルのイメージ参照を `image:tag@sha256:digest` 形式に更新

4. **ローカルでのテスト**
   ```bash
   docker compose up -d
   # または
   devcontainer up --workspace-folder .
   ```

5. **コミット**
   ```bash
   git commit -m "chore: update IMAGE_NAME to VERSION"
   ```

詳細は `docs/docker-image-digest-management.md` を参照してください。

## 検証結果 (Verification)

- ✅ 全16個のDockerイメージ参照がタグ＋ダイジェスト形式に更新されました
- ✅ YAMLシンタックス検証に合格
- ✅ Docker Compose設定の妥当性を確認
- ✅ コードレビューで問題なし
- ✅ CodeQL セキュリティスキャンで問題なし

## チームへの周知事項 (Team Communication)

### 重要なポイント

1. **タグだけの指定は推奨されません**
   - 今後、新しいDockerイメージを追加する際は、必ずダイジェストも含めてください

2. **Renovateの設定**
   - Renovateは自動的にタグとダイジェストの両方を更新できるように設定可能です
   - `.github/renovate.json` の設定を確認してください

3. **既存のイメージ更新**
   - イメージを更新する際は、必ず新しいダイジェストを取得してください
   - 手順書: `docs/docker-image-digest-management.md`

4. **セキュリティの向上**
   - この変更により、サプライチェーン攻撃のリスクが大幅に低減されます
   - 外部リポジトリがコミットハッシュで管理されているように、Dockerイメージも不変性が保証されます

## 参考資料 (References)

- [Docker Content Trust](https://docs.docker.com/engine/security/trust/)
- [Docker Image Digests](https://docs.docker.com/engine/reference/commandline/pull/#pull-an-image-by-digest-immutable-identifier)
- [OWASP Docker Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
- プロジェクト内ドキュメント: `docs/docker-image-digest-management.md`
