import * as Sentry from '@sentry/nextjs'

/**
 * 属性オブジェクト: Sentry上での検索性を確保するため、キーと値は英単語または数値のまま
 */
export type LogAttributes = Record<string, string | number | boolean | null>

/**
 * 共有ロガー - Sentryと統合し、構造化されたログを提供
 *
 * ログメッセージは日本語で記述し、属性は英単語または数値のキー/値を使用します。
 */
export const logger = {
  /**
   * デバッグレベルのログを記録
   * @param message - ログメッセージ（日本語）
   * @param attributes - ログの属性オブジェクト（キーと値は英単語または数値）
   */
  debug: (message: string, attributes?: LogAttributes): void => {
    Sentry.addBreadcrumb({
      level: 'debug',
      message,
      ...(attributes && { data: attributes }),
    })
  },

  /**
   * エラーレベルのログを記録
   * @param message - ログメッセージ（日本語）
   * @param error - エラーオブジェクト（オプション）
   * @param attributes - ログの属性オブジェクト（キーと値は英単語または数値）
   */
  error: (
    message: string,
    error?: Error | unknown,
    attributes?: LogAttributes,
  ): void => {
    Sentry.addBreadcrumb({
      level: 'error',
      message,
      ...(attributes && { data: attributes }),
    })

    if (error instanceof Error) {
      Sentry.captureException(error, {
        contexts: {
          custom: attributes,
        },
      })
    } else if (error) {
      Sentry.captureMessage(message, {
        contexts: {
          custom: { ...attributes, error },
        },
        level: 'error',
      })
    } else {
      Sentry.captureMessage(message, {
        contexts: {
          custom: attributes,
        },
        level: 'error',
      })
    }
  },

  /**
   * 情報レベルのログを記録
   * @param message - ログメッセージ（日本語）
   * @param attributes - ログの属性オブジェクト（キーと値は英単語または数値）
   */
  info: (message: string, attributes?: LogAttributes): void => {
    Sentry.addBreadcrumb({
      level: 'info',
      message,
      ...(attributes && { data: attributes }),
    })
  },

  /**
   * 警告レベルのログを記録
   * @param message - ログメッセージ（日本語）
   * @param attributes - ログの属性オブジェクト（キーと値は英単語または数値）
   */
  warn: (message: string, attributes?: LogAttributes): void => {
    Sentry.addBreadcrumb({
      level: 'warning',
      message,
      ...(attributes && { data: attributes }),
    })
  },
}
