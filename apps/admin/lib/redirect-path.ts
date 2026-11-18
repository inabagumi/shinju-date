/**
 * ログイン後の戻り先を受け渡すクエリパラメーターの名前。
 */
export const REDIRECT_PARAM = "next";

// 相対パスを解決するためだけに使う仮のオリジン。結果のオリジンがこれと
// 一致しない場合は、外部のホストを指していると判断する。
const BASE_ORIGIN = "http://admin.invalid";

/**
 * 値を仮のオリジンに対して解析し、そのオリジンのままであれば解析結果を返す。
 * 解析できない値や、外部のホストを指す値には `null` を返す。
 */
function parseSameOriginURL(value: string): URL | null {
  let url: URL;

  try {
    url = new URL(value, BASE_ORIGIN);
  } catch {
    return null;
  }

  // URL の解析ではタブや改行が取り除かれ、`\` も `/` として扱われるため、
  // 解析後のオリジンで外部のホストを指していないかを確認する
  return url.origin === BASE_ORIGIN ? url : null;
}

/**
 * 戻り先として受け取った値を、管理画面内のパスに限定して返す。
 *
 * オープンリダイレクトを防ぐため、`/` で始まるパス以外（`https://example.com` の
 * ような絶対 URL、`//example.com` や `/\example.com` のようなプロトコル相対 URL など）や、
 * ログイン画面自身を指す値は `fallback` に置き換える。
 *
 * @param value - クエリパラメーターやフォームから受け取った値
 * @param fallback - 値が使えない場合の戻り先
 * @returns パス・クエリ文字列・フラグメントからなる管理画面内のパス
 */
export function getSafeRedirectPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || !value.startsWith("/")) {
    return fallback;
  }

  const url = parseSameOriginURL(value);

  if (!url) {
    return fallback;
  }

  if (url.pathname === "/login" || url.pathname.startsWith("/login/")) {
    return fallback;
  }

  const redirectPath = `${url.pathname}${url.search}${url.hash}`;

  // `/.//example.com` のような値は、ドットセグメントが取り除かれると
  // `//example.com` になり、プロトコル相対 URL として外部のホストを指してしまう。
  // `/.//` のように、正規化した後は URL として解析できなくなる値もある。
  // 正規化した後の値ももう一度解析し、同じオリジンのままであることを確認する
  if (!parseSameOriginURL(redirectPath)) {
    return fallback;
  }

  return redirectPath;
}
