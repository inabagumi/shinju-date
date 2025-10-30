# Shared Tailwind CSS Configuration

このパッケージには、SHINJU DATE プロジェクト全体で共有される Tailwind CSS テーマ設定が含まれています。

## 内容

- **theme.css**: 共通のカラーパレットとテーマ変数定義
  - 774-nevy カラー（ブランドカラー）
  - 774-pink カラー
  - 774-blue カラー
  - プライマリー/セカンダリーカラー定義

## 使用方法

各アプリケーションの `globals.css` でインポートします：

```css
@import 'tailwindcss';
@import '@shinju-date/tailwind-config/theme.css';
```

これにより、すべてのアプリケーションとパッケージで一貫したカラーパレットを使用できます。
