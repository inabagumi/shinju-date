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
    if (attributes) {
      Sentry.logger.debug(message, attributes)
    } else {
      Sentry.logger.debug(message)
    }
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
    if (error instanceof Error) {
      // Log error with attributes using Sentry.logger
      if (attributes) {
        Sentry.logger.error(message, attributes)
      } else {
        Sentry.logger.error(message)
      }
      // Also capture the exception for notification
      Sentry.captureException(error, {
        contexts: {
          custom: attributes,
        },
      })
    } else if (error) {
      // Log with error object in attributes
      const errorAttributes = { ...attributes, error }
      Sentry.logger.error(message, errorAttributes)
      Sentry.captureMessage(message, {
        contexts: {
          custom: errorAttributes,
        },
        level: 'error',
      })
    } else {
      // Log without error object
      if (attributes) {
        Sentry.logger.error(message, attributes)
      } else {
        Sentry.logger.error(message)
      }
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
    if (attributes) {
      Sentry.logger.info(message, attributes)
    } else {
      Sentry.logger.info(message)
    }
  },

  /**
   * 警告レベルのログを記録
   * @param message - ログメッセージ（日本語）
   * @param attributes - ログの属性オブジェクト（キーと値は英単語または数値）
   */
  warn: (message: string, attributes?: LogAttributes): void => {
    if (attributes) {
      Sentry.logger.warn(message, attributes)
    } else {
      Sentry.logger.warn(message)
    }
  },
}
