"use client";

import { useTransition } from "react";

import { useActionToast } from "@/components/action-toast";

/** アクションが例外を投げたときにトーストで出す文 */
export const SERVER_ACTION_FALLBACK_ERROR = "処理に失敗しました。";

/**
 * `useServerAction` に渡すアクションの戻り値。
 *
 * TODO: Server Action の共通の戻り値の型（#7005）ができたら、そちらに置き換える。
 */
export interface ServerActionResult {
  success: boolean;
  error?: string | undefined;
  /** 成功したが、一部を処理できなかったときなどに知らせる文 */
  warnings?: readonly string[] | undefined;
}

/**
 * 成功したときの戻り値。`ActionResult` のようなユニオンなら、成功の型だけが残る
 */
export type SuccessfulResult<TResult extends ServerActionResult> = TResult & {
  success: true;
};

function isSuccessful<TResult extends ServerActionResult>(
  result: TResult
): result is SuccessfulResult<TResult> {
  return result.success;
}

export interface UseServerActionOptions<TResult extends ServerActionResult> {
  /**
   * 成功したときにトーストで出す文。戻り値から文を作る関数も渡せる。
   * 省略したときと、関数が `undefined` を返したときは、成功のトーストを出さない
   */
  successText?:
    | string
    | ((result: SuccessfulResult<TResult>) => string | undefined)
    | undefined;
  /** 失敗したが `error` が空のときに出す文。省略時は「処理に失敗しました。」 */
  errorText?: string | undefined;
  /** 成功したときに、トーストを出したあとで呼ばれる */
  onSuccess?: ((result: SuccessfulResult<TResult>) => void) | undefined;
}

export interface UseServerActionReturn<
  TArgs extends unknown[],
  TResult extends ServerActionResult,
> {
  /**
   * アクションを呼び、結果をトーストで知らせる。終わると、アクションの戻り値
   * （例外のときは `undefined`）で解決する
   */
  run: (...args: TArgs) => Promise<TResult | undefined>;
  /** アクションの実行中かどうか */
  isPending: boolean;
}

/**
 * フォームを使わずに Server Action を呼び、結果をトーストで知らせる。
 *
 * - 成功したら `successText` を、失敗したら `result.error` を出す
 * - `result.warnings` があれば、1件ずつ警告のトーストを出す
 * - 例外のときは「処理に失敗しました。」を出す
 *
 * 画面の再取得は、アクションの `revalidatePath` に任せる（`router.refresh()` は呼ばない）。
 */
export function useServerAction<
  TArgs extends unknown[],
  TResult extends ServerActionResult,
>(
  action: (...args: TArgs) => Promise<TResult>,
  {
    errorText = SERVER_ACTION_FALLBACK_ERROR,
    onSuccess,
    successText,
  }: UseServerActionOptions<TResult> = {}
): UseServerActionReturn<TArgs, TResult> {
  const [isPending, startTransition] = useTransition();
  const { showToast } = useActionToast();

  const notify = (result: TResult) => {
    if (isSuccessful(result)) {
      const text =
        typeof successText === "function" ? successText(result) : successText;

      if (text) {
        showToast("success", text);
      }
    } else {
      showToast("danger", result.error || errorText);
    }

    for (const warning of result.warnings ?? []) {
      showToast("warning", warning);
    }

    if (isSuccessful(result)) {
      onSuccess?.(result);
    }
  };

  const run = (...args: TArgs) =>
    new Promise<TResult | undefined>((resolve) => {
      startTransition(async () => {
        let result: TResult;

        try {
          result = await action(...args);
        } catch {
          showToast("danger", SERVER_ACTION_FALLBACK_ERROR);
          resolve(undefined);
          return;
        }

        notify(result);
        resolve(result);
      });
    });

  return { isPending, run };
}
