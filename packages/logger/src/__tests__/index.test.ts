import * as Sentry from '@sentry/nextjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { logger } from '../index.js'

// Mock Sentry module
vi.mock('@sentry/nextjs', () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('debug', () => {
    it('should add debug breadcrumb without attributes', () => {
      logger.debug('デバッグメッセージ')

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        level: 'debug',
        message: 'デバッグメッセージ',
      })
    })

    it('should add debug breadcrumb with attributes', () => {
      logger.debug('デバッグメッセージ', { userId: 123, action: 'test' })

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        level: 'debug',
        message: 'デバッグメッセージ',
        data: { userId: 123, action: 'test' },
      })
    })
  })

  describe('info', () => {
    it('should add info breadcrumb without attributes', () => {
      logger.info('情報メッセージ')

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        level: 'info',
        message: '情報メッセージ',
      })
    })

    it('should add info breadcrumb with attributes', () => {
      logger.info('情報メッセージ', { videoId: 'abc123' })

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        level: 'info',
        message: '情報メッセージ',
        data: { videoId: 'abc123' },
      })
    })
  })

  describe('warn', () => {
    it('should add warning breadcrumb without attributes', () => {
      logger.warn('警告メッセージ')

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        level: 'warning',
        message: '警告メッセージ',
      })
    })

    it('should add warning breadcrumb with attributes', () => {
      logger.warn('警告メッセージ', { retryCount: 3 })

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        level: 'warning',
        message: '警告メッセージ',
        data: { retryCount: 3 },
      })
    })
  })

  describe('error', () => {
    it('should add error breadcrumb and capture message when no error object', () => {
      logger.error('エラーメッセージ')

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        level: 'error',
        message: 'エラーメッセージ',
      })
      expect(Sentry.captureMessage).toHaveBeenCalledWith('エラーメッセージ', {
        level: 'error',
        contexts: {
          custom: undefined,
        },
      })
    })

    it('should add error breadcrumb and capture exception when Error object', () => {
      const error = new Error('Test error')
      logger.error('エラーメッセージ', error, { operation: 'fetch' })

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        level: 'error',
        message: 'エラーメッセージ',
        data: { operation: 'fetch' },
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

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        level: 'error',
        message: 'エラーメッセージ',
        data: { source: 'api' },
      })
      expect(Sentry.captureMessage).toHaveBeenCalledWith('エラーメッセージ', {
        level: 'error',
        contexts: {
          custom: { source: 'api', error: { message: 'Custom error' } },
        },
      })
    })

    it('should work with attributes but no error', () => {
      logger.error('エラーメッセージ', undefined, { requestId: 'req-123' })

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        level: 'error',
        message: 'エラーメッセージ',
        data: { requestId: 'req-123' },
      })
      expect(Sentry.captureMessage).toHaveBeenCalledWith('エラーメッセージ', {
        level: 'error',
        contexts: {
          custom: { requestId: 'req-123' },
        },
      })
    })
  })
})
