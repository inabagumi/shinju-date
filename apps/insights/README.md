# Insights API

SHINJU DATE の動画タイトルから頻出用語を抽出・分析するための Python API です。

## 技術スタック

- **Python**: ^3.12
- **FastAPI**: Web フレームワーク
- **Poetry**: 依存関係管理
- **Ruff**: リンティング・フォーマッティング
- **Janome**: 日本語形態素解析
- **Supabase**: データベース接続

## セットアップ

### 前提条件

- Python 3.12 以上
- Poetry

### Poetry のインストール

```bash
pip install poetry
```

### 依存関係のインストール

```bash
poetry install
```

## 開発

### 環境変数

`.env` ファイルを作成し、以下の環境変数を設定してください：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### サーバー起動

```bash
poetry run poe dev
```

API は `http://localhost:8000` で起動します。

### コード品質

#### リンティング

```bash
poetry run poe lint
```

#### フォーマット

```bash
poetry run poe format
```

#### フォーマットチェック

```bash
poetry run poe format-check
```

## API エンドポイント

### GET /

ヘルスチェック用エンドポイント

### POST /api/v1/terms/analysis

Supabase から動画タイトルを取得し、頻出用語を抽出します。

**レスポンス例:**

```json
{
  "status": "success",
  "message": "25 terms were extracted from 100 titles.",
  "extracted_terms": [
    {
      "term": "React",
      "reading": "リアクト",
      "count": 15
    }
  ]
}
```

## プロジェクト構造

```
apps/insights/
├── api/
│   └── index.py          # FastAPI アプリケーション
├── services/
│   └── term_extractor.py # 用語抽出ロジック
├── pyproject.toml        # Poetry 設定
├── poetry.lock           # 依存関係ロック
└── README.md
```
