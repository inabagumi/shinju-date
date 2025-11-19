import * as Sentry from '@sentry/nextjs'

/**
 * 属性オブジェクト: Sentry上での検索性を確保するため、キーと値は英単語または数値のまま
 */
export type LogAttributes = Record<string, unknown>

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
    Sentry.logger.debug(message, attributes)
  },

  /**
   * エラーレベルのログを記録
   * @param message - ログメッセージ（日本語）
   * @param attributes - ログの属性オブジェクト（キーと値は英単語または数値）
   */
  error: (message: string, attributes?: LogAttributes): void => {
    Sentry.logger.error(message, attributes)
  },

  /**
   * 情報レベルのログを記録
   * @param message - ログメッセージ（日本語）
   * @param attributes - ログの属性オブジェクト（キーと値は英単語または数値）
   */
  info: (message: string, attributes?: LogAttributes): void => {
    Sentry.logger.info(message, attributes)
  },

  /**
   * 警告レベルのログを記録
   * @param message - ログメッセージ（日本語）
   * @param attributes - ログの属性オブジェクト（キーと値は英単語または数値）
   */
  warn: (message: string, attributes?: LogAttributes): void => {
    Sentry.logger.warn(message, attributes)
  },
}
