# @shinju-date/youtube-scraper

YouTube データのスクレイピング機能を提供するパッケージ。

## 構成

- **Google YouTube API**: 公式 YouTube API クライアント
- **p-queue**: 非同期キュー処理
- **TypeScript**: 型安全なスクレイピング実装

## 使用方法

```typescript
import { YouTubeScraper } from '@shinju-date/youtube-scraper'

// YouTubeスクレイパーの使用例
const scraper = new YouTubeScraper()

// 動画情報の取得
const videoData = await scraper.getVideoData(videoId)

// タレント情報の取得
const talentData = await scraper.getTalentData(talentId)
```

## 機能

- YouTube 動画メタデータの取得
- タレント情報の取得
- レート制限に対応した効率的なデータ取得
- キューを使用した並行処理制御

## テスト

```bash
pnpm run test
```

## 開発

```bash
# ビルド
pnpm run build

# 開発モード（ウォッチ）
pnpm run dev
```
