import * as Sentry from '@sentry/nextjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { logger } from '../index.js'

// Sentryモジュールをモック化
vi.mock('@sentry/nextjs', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

// 全ログレベル共通のテストケース
const testCases = [
  { label: 'デバッグ', method: 'debug' as const, mock: Sentry.logger.debug },
  { label: '情報', method: 'info' as const, mock: Sentry.logger.info },
  { label: '警告', method: 'warn' as const, mock: Sentry.logger.warn },
  { label: 'エラー', method: 'error' as const, mock: Sentry.logger.error },
]

describe('logger', () => {
  // 各テストの前にモックをクリア
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // --- 全レベル共通のテスト ---
  describe.each(testCases)('$method', ({ method, mock, label }) => {
    const message = `${label}メッセージ`

    it('should call Sentry logger without attributes', () => {
      logger[method](message)

      // 修正点: 2番目の引数としてundefinedが渡されることを期待する
      expect(mock).toHaveBeenCalledWith(message, undefined)
      expect(mock).toHaveBeenCalledTimes(1)
    })

    it('should call Sentry logger with attributes', () => {
      const attributes = { id: 123, key: 'value' }
      logger[method](message, attributes)

      expect(mock).toHaveBeenCalledWith(message, attributes)
      expect(mock).toHaveBeenCalledTimes(1)
    })

    it('should call Sentry logger with an Error object in attributes', () => {
      const error = new Error('Test error')
      const attributes = { error, operation: 'fetch' }
      logger[method](message, attributes)

      expect(mock).toHaveBeenCalledWith(message, attributes)
      expect(mock).toHaveBeenCalledTimes(1)
    })
  })
})
