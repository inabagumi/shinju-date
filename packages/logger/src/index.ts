// Support both @sentry/nextjs and @sentry/node
let Sentry: typeof import('@sentry/nextjs') | typeof import('@sentry/node')

try {
  // Try importing @sentry/nextjs first (for Next.js apps)
  Sentry = await import('@sentry/nextjs')
} catch {
  try {
    // Fall back to @sentry/node (for Node.js apps like batch)
    Sentry = await import('@sentry/node')
  } catch {
    // If neither is available, create a fallback logger
    console.warn(
      'No Sentry SDK found. Logger will fall back to console logging.',
    )
  }
}

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
    if (Sentry?.logger) {
      Sentry.logger.debug(message, attributes)
    } else {
      console.debug(message, attributes)
    }
  },

  /**
   * エラーレベルのログを記録
   * @param message - ログメッセージ（日本語）
   * @param attributes - ログの属性オブジェクト（キーと値は英単語または数値）
   */
  error: (message: string, attributes?: LogAttributes): void => {
    if (Sentry?.logger) {
      Sentry.logger.error(message, attributes)
    } else {
      console.error(message, attributes)
    }
  },

  /**
   * 情報レベルのログを記録
   * @param message - ログメッセージ（日本語）
   * @param attributes - ログの属性オブジェクト（キーと値は英単語または数値）
   */
  info: (message: string, attributes?: LogAttributes): void => {
    if (Sentry?.logger) {
      Sentry.logger.info(message, attributes)
    } else {
      console.info(message, attributes)
    }
  },

  /**
   * 警告レベルのログを記録
   * @param message - ログメッセージ（日本語）
   * @param attributes - ログの属性オブジェクト（キーと値は英単語または数値）
   */
  warn: (message: string, attributes?: LogAttributes): void => {
    if (Sentry?.logger) {
      Sentry.logger.warn(message, attributes)
    } else {
      console.warn(message, attributes)
    }
  },
}
