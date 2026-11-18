import { logger } from "@shinju-date/logger";
import { unstable_rethrow } from "next/navigation";
import type * as z from "zod";

import {
  type AuthenticatedContext,
  requireAuthenticatedUser,
  unauthenticatedFormState,
  unauthenticatedResult,
} from "@/lib/auth";
import {
  actionErrorToFormState,
  parseFormData,
  type ZodErrorToFormStateOptions,
} from "@/lib/form";
import { INVALID_INPUT_ERROR_MESSAGE } from "@/lib/schemas";

/**
 * 予期しない例外で Server Action が失敗したときに、画面に見せる文。
 * 例外の文は内部の情報を含みうるので、画面には出さない。
 */
export const ACTION_FAILED_ERROR_MESSAGE =
  "処理に失敗しました。時間をおいて、もう一度お試しください。";

/**
 * `{ success, error }` 形式の Server Action の戻り値。
 *
 * 成功したが、利用者に知らせたいことがある（一部の処理を飛ばしたなど）ときは、
 * `success: true` のまま `warnings` に文を入れる。
 */
export type ActionResult<T = void> =
  | { success: true; data?: T; warnings?: string[] }
  | { success: false; error: string };

/**
 * `useActionState` 用の Server Action の戻り値。
 */
export interface FormState {
  /**
   * 項目ごとのエラー。項目に結び付かないエラーは `generic` に入れる。
   */
  errors?: Record<string, string[]>;
  /**
   * 項目に結び付かないエラー。
   */
  error?: string;
  success?: boolean;
}

export interface ActionErrorOptions {
  /**
   * エラーを結び付けるフォームの項目の名前。省くと、項目に結び付かないエラーになる。
   */
  field?: string;
}

/**
 * 画面にそのまま見せてよい文を持つ例外（「すでに登録されています。」など）。
 *
 * Server Action から呼ぶ処理は、利用者に理由を伝えたい失敗だけをこの例外で投げる。
 * それ以外の例外の文は、内部の情報を含みうるので、画面には出さない。
 */
export class ActionError extends Error {
  override readonly name = "ActionError";
  readonly field: string | undefined;

  constructor(message: string, { field }: ActionErrorOptions = {}) {
    super(message);

    this.field = field;
  }
}

/**
 * フォームを使わない Server Action の引数を `schema` で検証し、検証した値を返す。
 *
 * TypeScript の型は、ブラウザから届く値を保証しない。`adminAction` の `handler` の
 * 先頭（認証の確認のあと、データを読み書きする前）で呼ぶ。失敗したら、
 * `INVALID_INPUT_ERROR_MESSAGE` の `ActionError` を投げる（`adminAction` が
 * `{ success: false, error }` にして返す）。
 *
 * @example
 * ```ts
 * export const deleteSomethingAction = adminAction(
 *   'deleteSomethingAction',
 *   async ({ supabaseClient }, id: string): Promise<ActionResult> => {
 *     const somethingId = parseActionInput(uuidSchema, id)
 *
 *     // ...
 *   },
 * )
 * ```
 */
export function parseActionInput<TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown
): z.output<TSchema> {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new ActionError(INVALID_INPUT_ERROR_MESSAGE);
  }

  return result.data;
}

/**
 * `{ success, error }` 形式を返す Server Action を作る。
 *
 * 1. `requireAuthenticatedUser()` で認証を確かめ、未認証なら `handler` を呼ばずに
 *    `unauthenticatedResult()` を返す
 * 2. `handler` を、認証に使った Supabase のクライアントとユーザーを付けて呼び、
 *    その戻り値をそのまま返す
 * 3. `handler` が `ActionError` を投げたら、その文を返す。それ以外の例外は
 *    `name` と引数を付けて記録し、決まった文（`ACTION_FAILED_ERROR_MESSAGE`）を返す
 *
 * `redirect()` や `notFound()` などの Next.js の制御用の例外は、そのまま投げ直す。
 *
 * @example
 * ```ts
 * 'use server'
 *
 * export const deleteSomethingAction = adminAction(
 *   'deleteSomethingAction',
 *   async ({ supabaseClient }, id: string): Promise<ActionResult> => {
 *     const { error } = await supabaseClient.from('...').delete().eq('id', id)
 *
 *     if (error) {
 *       throw error
 *     }
 *
 *     return { success: true }
 *   },
 * )
 * ```
 */
export function adminAction<TArgs extends unknown[], TData = void>(
  name: string,
  handler: (
    context: AuthenticatedContext,
    ...args: TArgs
  ) => Promise<ActionResult<TData>>
): (...args: TArgs) => Promise<ActionResult<TData>> {
  return async (...args) => {
    const auth = await requireAuthenticatedUser();

    if (!auth) {
      return unauthenticatedResult();
    }

    try {
      return await handler(auth, ...args);
    } catch (error) {
      unstable_rethrow(error);

      if (error instanceof ActionError) {
        return { error: error.message, success: false };
      }

      logger.error("Server Action が失敗しました", {
        action: name,
        args,
        error,
      });

      return { error: ACTION_FAILED_ERROR_MESSAGE, success: false };
    }
  };
}

/**
 * `adminFormAction` のオプション。`hiddenFields` には、画面に入力欄がない項目
 * （隠しフィールドなど）の名前を入れる。これらの項目の検証のエラーは、
 * 項目に結び付かないエラー（`generic`）にする。
 */
export type AdminFormActionOptions = ZodErrorToFormStateOptions;

/**
 * `useActionState` 用の、`FormState` を返す Server Action を作る。
 *
 * 1. `requireAuthenticatedUser()` で認証を確かめ、未認証なら `handler` を呼ばずに
 *    `unauthenticatedFormState()` を返す
 * 2. `FormData` を `schema` で検証し、失敗したら `handler` を呼ばずに
 *    項目ごとのエラーを返す（`options.hiddenFields` の項目のエラーは `generic` にする）
 * 3. `handler` を、認証に使った Supabase のクライアントとユーザー、検証した値を
 *    付けて呼ぶ。`handler` が何も返さなければ `{ success: true }` を返す
 * 4. `handler` が `ActionError` を投げたら、その文を（`field` があればその項目の
 *    エラーとして）返す。それ以外の例外は `name` を付けて記録し、決まった文
 *    （`ACTION_FAILED_ERROR_MESSAGE`）を `FormState.error` に入れて返す
 *
 * フォームの値はパスワードなどを含みうるので、記録しない。
 * `redirect()` や `notFound()` などの Next.js の制御用の例外は、そのまま投げ直す。
 *
 * @example
 * ```ts
 * 'use server'
 *
 * export const createSomethingAction = adminFormAction(
 *   'createSomethingAction',
 *   z.object({ name: z.string().min(1, '名前を入力してください。') }),
 *   async ({ supabaseClient }, { name }) => {
 *     const { error } = await supabaseClient.from('...').insert({ name })
 *
 *     if (error?.code === '23505') {
 *       throw new ActionError('すでに登録されています。', { field: 'name' })
 *     }
 *
 *     if (error) {
 *       throw error
 *     }
 *   },
 * )
 * ```
 */
export function adminFormAction<TSchema extends z.ZodType>(
  name: string,
  schema: TSchema,
  handler: (
    context: AuthenticatedContext,
    data: z.output<TSchema>
  ) => Promise<FormState | undefined>,
  options: AdminFormActionOptions = {}
): (currentState: FormState, formData: FormData) => Promise<FormState> {
  return async (_currentState, formData) => {
    const auth = await requireAuthenticatedUser();

    if (!auth) {
      return unauthenticatedFormState();
    }

    const result = parseFormData(schema, formData, options);

    if (!result.success) {
      return result.state;
    }

    try {
      return (await handler(auth, result.data)) ?? { success: true };
    } catch (error) {
      unstable_rethrow(error);

      if (error instanceof ActionError) {
        return actionErrorToFormState(error);
      }

      logger.error("Server Action が失敗しました", {
        action: name,
        error,
      });

      return { error: ACTION_FAILED_ERROR_MESSAGE };
    }
  };
}
