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
      logger.debug('デバッグメッセージ', { action: 'test', userId: 123 })

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        data: { action: 'test', userId: 123 },
        level: 'debug',
        message: 'デバッグメッセージ',
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
        data: { videoId: 'abc123' },
        level: 'info',
        message: '情報メッセージ',
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
        data: { retryCount: 3 },
        level: 'warning',
        message: '警告メッセージ',
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
        contexts: {
          custom: undefined,
        },
        level: 'error',
      })
    })

    it('should add error breadcrumb and capture exception when Error object', () => {
      const error = new Error('Test error')
      logger.error('エラーメッセージ', error, { operation: 'fetch' })

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        data: { operation: 'fetch' },
        level: 'error',
        message: 'エラーメッセージ',
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
        data: { source: 'api' },
        level: 'error',
        message: 'エラーメッセージ',
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

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        data: { requestId: 'req-123' },
        level: 'error',
        message: 'エラーメッセージ',
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
