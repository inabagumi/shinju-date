/** 同期する動画の ID（`syncVideoAction` の引数） */
export { uuidSchema as videoIdSchema } from "@/lib/schemas";

/**
 * 表示の切り替え・削除・復元をまとめて行う動画の ID の並び
 * （`toggleVisibilityAction`、`softDeleteAction`、`restoreAction` の引数）
 */
export { uuidListSchema as videoIdsSchema } from "@/lib/schemas";
