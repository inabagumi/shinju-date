import * as Sentry from '@sentry/nextjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { logger } from '../index.js'

// Mock Sentry module
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('debug', () => {
    it('should call Sentry.logger.debug without attributes', () => {
      logger.debug('デバッグメッセージ')

      expect(Sentry.logger.debug).toHaveBeenCalledWith('デバッグメッセージ')
    })

    it('should call Sentry.logger.debug with attributes', () => {
      logger.debug('デバッグメッセージ', { action: 'test', userId: 123 })

      expect(Sentry.logger.debug).toHaveBeenCalledWith('デバッグメッセージ', {
        action: 'test',
        userId: 123,
      })
    })
  })

  describe('info', () => {
    it('should call Sentry.logger.info without attributes', () => {
      logger.info('情報メッセージ')

      expect(Sentry.logger.info).toHaveBeenCalledWith('情報メッセージ')
    })

    it('should call Sentry.logger.info with attributes', () => {
      logger.info('情報メッセージ', { videoId: 'abc123' })

      expect(Sentry.logger.info).toHaveBeenCalledWith('情報メッセージ', {
        videoId: 'abc123',
      })
    })
  })

  describe('warn', () => {
    it('should call Sentry.logger.warn without attributes', () => {
      logger.warn('警告メッセージ')

      expect(Sentry.logger.warn).toHaveBeenCalledWith('警告メッセージ')
    })

    it('should call Sentry.logger.warn with attributes', () => {
      logger.warn('警告メッセージ', { retryCount: 3 })

      expect(Sentry.logger.warn).toHaveBeenCalledWith('警告メッセージ', {
        retryCount: 3,
      })
    })
  })

  describe('error', () => {
    it('should log and capture message when no error object', () => {
      logger.error('エラーメッセージ')

      expect(Sentry.logger.error).toHaveBeenCalledWith('エラーメッセージ')
      expect(Sentry.captureMessage).toHaveBeenCalledWith('エラーメッセージ', {
        contexts: {
          custom: undefined,
        },
        level: 'error',
      })
    })

    it('should log and capture exception when Error object', () => {
      const error = new Error('Test error')
      logger.error('エラーメッセージ', error, { operation: 'fetch' })

      expect(Sentry.logger.error).toHaveBeenCalledWith('エラーメッセージ', {
        operation: 'fetch',
      })
      expect(Sentry.captureException).toHaveBeenCalledWith(error, {
        contexts: {
          custom: { operation: 'fetch' },
        },
      })
    })

    it('should handle non-Error objects', () => {
      const error = { message: 'Custom error' }
      logger.error('エラーメッセージ', error, { source: 'api' })

      expect(Sentry.logger.error).toHaveBeenCalledWith('エラーメッセージ', {
        error: { message: 'Custom error' },
        source: 'api',
      })
      expect(Sentry.captureMessage).toHaveBeenCalledWith('エラーメッセージ', {
        contexts: {
          custom: { error: { message: 'Custom error' }, source: 'api' },
        },
        level: 'error',
      })
    })

    it('should work with attributes but no error', () => {
      logger.error('エラーメッセージ', undefined, { requestId: 'req-123' })

      expect(Sentry.logger.error).toHaveBeenCalledWith('エラーメッセージ', {
        requestId: 'req-123',
      })
      expect(Sentry.captureMessage).toHaveBeenCalledWith('エラーメッセージ', {
        contexts: {
          custom: { requestId: 'req-123' },
        },
        level: 'error',
      })
    })
  })
})
