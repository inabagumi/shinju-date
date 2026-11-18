import type { VideoKindFilter } from "./video-kind-filter";

interface VideosQueryKeyParams {
  kind: VideoKindFilter;
  query: string;
  talentIds: readonly string[];
}

/**
 * React Query のクエリのキー。キーの文字列はここだけに書き、取得する側と
 * キャッシュを読み書きする側（テストを含む）で同じ関数を使う。
 */
export const queryKeys = {
  /** お知らせのバナー */
  announcement: () => ["announcement"] as const,
  /** ホームの配信中・新着動画・ショート */
  dashboardVideos: () => ["dashboard-videos"] as const,
  /** 検索モーダルのおすすめの検索キーワード */
  searchModalRecommendedQueries: () =>
    ["search-modal", "recommended-queries"] as const,
  /** 検索モーダルのサジェスト。入力の文字ごとにキャッシュする */
  searchModalSuggestions: (query: string) =>
    ["search-modal", "suggestions", query] as const,
  /** 検索モーダルでタレントの候補に使うタレントの一覧 */
  searchModalTalents: () => ["search-modal", "talents"] as const,
  /** ホームの配信予定 */
  upcomingVideos: () => ["upcoming-videos"] as const,
  /** 動画の一覧（検索の結果） */
  videos: ({ kind, query, talentIds }: VideosQueryKeyParams) =>
    ["videos", { kind, query, talentIds }] as const,
};
