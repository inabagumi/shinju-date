export interface ActionErrorOptions {
  /**
   * エラーを結び付けるフォームの項目の名前。省くと、項目に結び付かないエラーになる。
   */
  field?: string
}

/**
 * 画面にそのまま見せてよい文を持つ例外（「すでに登録されています。」など）。
 *
 * Server Action から呼ぶ処理は、利用者に理由を伝えたい失敗だけをこの例外で投げる。
 * それ以外の例外の文は、内部の情報を含みうるので、画面には出さない。
 */
export class ActionError extends Error {
  override readonly name = 'ActionError'
  readonly field: string | undefined

  constructor(message: string, { field }: ActionErrorOptions = {}) {
    super(message)

    this.field = field
  }
}
