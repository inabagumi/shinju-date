# GitHub Actions バージョン管理ガイドライン

このドキュメントでは、SHINJU DATEプロジェクトにおけるGitHub Actionsのバージョン管理方針について説明します。

## 基本方針

### コミットハッシュによる固定化

**すべてのGitHub Actionsは、タグではなくコミットハッシュで参照してください。**

これにより、以下のメリットが得られます：

1. **セキュリティの向上**: タグは移動可能であり、悪意のある攻撃者によって変更される可能性があります。コミットハッシュは不変であるため、より安全です。
2. **再現性の保証**: コミットハッシュを使用することで、特定のバージョンのActionが確実に実行されます。
3. **依存関係の透明性**: どのバージョンのActionが使用されているかが明確になります。

### バージョンコメントによるRenovate対応

コミットハッシュの末尾に `# v1.0.0` のような形式でバージョンコメントを付けることで、Renovateによる自動更新が可能になります。

## 記述形式

```yaml
# ✅ 推奨: コミットハッシュ + バージョンコメント
- uses: actions/checkout@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6
- uses: actions/setup-node@395ad3262231945c25e8478fd5baf05154b1d79f # v6
- uses: astral-sh/setup-uv@ed21f2f24f8dd64503750218de024bcf64c7250a # v7

# ❌ 非推奨: タグのみ
- uses: actions/checkout@v6
- uses: actions/setup-node@v6
- uses: astral-sh/setup-uv@v7
```

## 新しいActionを追加する場合

新しいGitHub Actionを追加する際は、以下の手順でコミットハッシュを取得してください：

### 1. git ls-remoteを使用する方法（推奨）

```bash
# 基本形式
git ls-remote https://github.com/[owner]/[repo].git refs/tags/[version]

# 例: actions/checkout@v6 のコミットハッシュを取得
git ls-remote https://github.com/actions/checkout.git refs/tags/v6

# 出力例:
# 8e8c483db84b4bee98b60c0593521ed34d9990e8	refs/tags/v6
```

### 2. アノテーテッドタグの場合

一部のActionはアノテーテッドタグを使用しています。その場合は `^{}` を使用してコミットを取得します：

```bash
# アノテーテッドタグのコミットを取得
git ls-remote https://github.com/[owner]/[repo].git refs/tags/[version]^{}

# 例:
git ls-remote https://github.com/actions/checkout.git refs/tags/v6^{}
```

### 3. GitHub CLIを使用する方法

```bash
# GitHub CLIでタグ情報を取得
gh api repos/[owner]/[repo]/git/ref/tags/[version]

# 例:
gh api repos/actions/checkout/git/ref/tags/v6
```

## 自動更新の仕組み

### Renovateの設定

このプロジェクトではRenovateを使用してGitHub Actionsの自動更新を行っています。

Renovateは以下のパターンを自動的に検出して更新します：

```yaml
# Renovateが検出可能な形式
- uses: owner/repo@<commit-hash> # v1.0.0
```

バージョンコメント（`# v1.0.0`）により、Renovateは以下を実行します：

1. 新しいバージョンのリリースを検出
2. 新しいバージョンのコミットハッシュを取得
3. プルリクエストを作成して更新を提案

### 更新の確認方法

Renovateが作成したプルリクエストでは、以下の情報が表示されます：

- 変更前と変更後のバージョン
- 変更前と変更後のコミットハッシュ
- リリースノート（利用可能な場合）
- 変更履歴

## ベストプラクティス

### 1. 定期的な更新

セキュリティアップデートや機能改善を受けるため、定期的にActionsを更新してください。

### 2. 変更のテスト

Actionsを更新した後は、必ずCIワークフローが正常に動作することを確認してください。

### 3. 破壊的変更の確認

メジャーバージョンアップグレード時は、リリースノートを確認して破壊的変更がないか確認してください。

### 4. セキュリティアドバイザリーの確認

GitHub Security Advisoriesを定期的に確認し、使用しているActionsにセキュリティ上の問題がないか確認してください。

## よくある質問

### Q: なぜタグではなくコミットハッシュを使うのですか？

A: タグは移動可能であり、セキュリティリスクがあります。コミットハッシュは不変であるため、より安全で再現性が高くなります。

### Q: バージョンコメントは必須ですか？

A: はい。バージョンコメントがないと、Renovateが自動更新できません。また、どのバージョンが使用されているかを人間が確認しやすくなります。

### Q: すべてのActionsをコミットハッシュで参照する必要がありますか？

A: はい。一貫性とセキュリティのため、すべてのGitHub Actionsをコミットハッシュで参照してください。

### Q: 既存のワークフローを更新する必要がありますか？

A: 新しいActionsを追加する際や既存のActionsを更新する際に、この形式を使用してください。既存のワークフローも段階的に移行することを推奨します。

## 参考資料

- [GitHub Actions: Security hardening for GitHub Actions](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions#using-third-party-actions)
- [Renovate: GitHub Actions Manager](https://docs.renovatebot.com/modules/manager/github-actions/)
- [Best practices for using third-party actions](https://github.blog/2021-01-19-github-actions-security-best-practices/)

## まとめ

- ✅ コミットハッシュ + バージョンコメントを使用する
- ✅ `git ls-remote` でコミットハッシュを取得する
- ✅ Renovateが自動更新できるようにする
- ❌ タグのみの参照は使用しない
- ❌ バージョンコメントを省略しない

この方針に従うことで、セキュアで管理しやすいCIパイプラインを維持できます。
