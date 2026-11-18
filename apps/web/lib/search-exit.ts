/**
 * 検索の結果を見たあと、動画を開かずに離れたこと（検索からの離脱）を記録する。
 *
 * ページの部品（`SearchExitTracker`）が、結果のある検索を見始めたことを
 * `startSearchExit()` で知らせ、ルートレイアウトの部品（`SearchExitObserver`）が、
 * 別のページへの移動、ページを閉じる・隠す、動画を開くことを知らせる。
 * 状態はタブに1つだけ持つ。
 */

/** 離脱を受け取る Route Handler のパス */
export const SEARCH_EXIT_ENDPOINT = "/api/search-exit";

interface SearchExit {
  /** 検索の結果のページのパス。絞り込みの検索パラメーターは含まない */
  pathname: string;
  query: string;
  /** 動画を開いたか、すでに離脱を送った */
  settled: boolean;
}

let current: SearchExit | null = null;

function send(query: string): void {
  const body = JSON.stringify({ query });

  try {
    if (
      typeof navigator.sendBeacon === "function" &&
      navigator.sendBeacon(SEARCH_EXIT_ENDPOINT, body)
    ) {
      return;
    }
  } catch {
    // `fetch` で送り直す
  }

  fetch(SEARCH_EXIT_ENDPOINT, {
    body,
    keepalive: true,
    method: "POST",
  }).catch(() => {
    // 記録に失敗しても、閲覧には影響させない
  });
}

/** まだ動画を開いていなければ、離脱を1回だけ送る */
function settle(searchExit: SearchExit): void {
  if (searchExit.settled) {
    return;
  }

  searchExit.settled = true;
  send(searchExit.query);
}

/**
 * 結果のある検索を見始めた。同じ検索の結果（絞り込みを変えただけ）なら、
 * 前の状態を引き継ぐ。別の検索なら、前の検索からの離脱を送る。
 */
export function startSearchExit(query: string, pathname: string): void {
  if (current?.pathname === pathname) {
    return;
  }

  if (current) {
    settle(current);
  }

  current = { pathname, query, settled: false };
}

/** 検索の結果から動画を開いた */
export function markSearchExitClicked(): void {
  if (current) {
    current.settled = true;
  }
}

/**
 * 別のページへ移動した。検索語が同じ（パスが同じ）なら、絞り込みを変えただけ
 * なので、離脱として数えない。
 */
export function handleSearchExitNavigation(pathname: string): void {
  if (!current || current.pathname === pathname) {
    return;
  }

  settle(current);
  current = null;
}

/** ページを閉じる、または隠した */
export function handleSearchExitLeave(): void {
  if (current) {
    settle(current);
  }
}
