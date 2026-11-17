import { describe, expect, it } from 'vitest'
import { setupActionTest } from '@/test/action-harness'
import { postgresError } from '@/test/supabase'
import {
  markFeatureRequestAsRead,
  updateFeatureRequestMemo,
  updateFeatureRequestStatus,
} from './update-feedback'

const test = setupActionTest()
const { supabase } = test

const ID = '70000000-0000-0000-0000-000000000001'
const MEMO = '検索の絞り込みと合わせて、次の四半期に対応する。'

/** What the audit log entries record, without the client passed first. */
function recordedAuditLogs(): string {
  return JSON.stringify(
    test.createAuditLog.mock.calls.map(
      ([, ...args]: unknown[]): unknown[] => args,
    ),
  )
}

describe('updateFeatureRequestStatus', () => {
  it('records the status before and after the change', async () => {
    supabase.on('select', 'feature_requests', [
      { message: '検索結果を配信日で絞り込みたいです', status: 'pending' },
    ])

    const result = await updateFeatureRequestStatus(ID, 'in_progress')

    expect(result).toEqual({ success: true })
    expect(supabase.calls('update', 'feature_requests')).toMatchObject([
      { body: { status: 'in_progress' }, query: { id: `eq.${ID}` } },
    ])
    test.expectAuditLog('FEATURE_REQUEST_UPDATE', ID, {
      changes: {
        after: { status: 'in_progress' },
        before: { status: 'pending' },
      },
      entityName: '検索結果を配信日で絞り込みたいです',
    })
    test.expectRevalidated({ paths: ['/feedback'] })
  })

  it('names the feedback by the first 40 characters of its message', async () => {
    supabase.on('select', 'feature_requests', [
      { message: `${'あ'.repeat(40)}\nつづき`, status: 'pending' },
    ])

    await updateFeatureRequestStatus(ID, 'resolved')

    test.expectAuditLog(
      'FEATURE_REQUEST_UPDATE',
      ID,
      expect.objectContaining({ entityName: 'あ'.repeat(40) }),
    )
  })

  it('neither updates nor records a status that does not change', async () => {
    supabase.on('select', 'feature_requests', [
      { message: 'Message', status: 'resolved' },
    ])

    const result = await updateFeatureRequestStatus(ID, 'resolved')

    expect(result).toEqual({ success: true })
    expect(supabase.calls('update', 'feature_requests')).toEqual([])
    test.expectNoAuditLog()
  })

  it('returns an error for a feedback that does not exist', async () => {
    const result = await updateFeatureRequestStatus(ID, 'resolved')

    expect(result).toEqual({
      error: 'フィードバックが見つかりませんでした',
      success: false,
    })
    expect(supabase.calls('update', 'feature_requests')).toEqual([])
    test.expectNoAuditLog()
  })

  it('records nothing when the update fails', async () => {
    supabase.on('select', 'feature_requests', [
      { message: 'Message', status: 'pending' },
    ])
    supabase.on(
      'update',
      'feature_requests',
      postgresError('XX000', 'Database error'),
    )

    const result = await updateFeatureRequestStatus(ID, 'resolved')

    expect(result).toEqual({
      error: 'ステータスの更新に失敗しました',
      success: false,
    })
    test.expectNoAuditLog()
    test.expectNotRevalidated()
  })
})

describe('updateFeatureRequestMemo', () => {
  it('records that a memo was added, without the memo itself', async () => {
    supabase.on('select', 'feature_requests', [
      { admin_memo: null, message: 'Message' },
    ])

    const result = await updateFeatureRequestMemo(ID, MEMO)

    expect(result).toEqual({ success: true })
    expect(supabase.calls('update', 'feature_requests')).toMatchObject([
      { body: { admin_memo: MEMO }, query: { id: `eq.${ID}` } },
    ])
    test.expectAuditLog('FEATURE_REQUEST_UPDATE', ID, {
      changes: {
        after: { hasMemo: true },
        before: { hasMemo: false },
      },
      entityName: 'Message',
    })
    expect(recordedAuditLogs()).not.toContain(MEMO)
    test.expectRevalidated({ paths: ['/feedback'] })
  })

  it('records a change to an existing memo, without either memo', async () => {
    const before = '担当者に確認する。'

    supabase.on('select', 'feature_requests', [
      { admin_memo: before, message: 'Message' },
    ])

    await updateFeatureRequestMemo(ID, MEMO)

    test.expectAuditLog('FEATURE_REQUEST_UPDATE', ID, {
      changes: {
        after: { hasMemo: true },
        before: { hasMemo: true },
      },
      entityName: 'Message',
    })

    const recorded = recordedAuditLogs()

    expect(recorded).not.toContain(before)
    expect(recorded).not.toContain(MEMO)
  })

  it('records that the memo was removed', async () => {
    supabase.on('select', 'feature_requests', [
      { admin_memo: MEMO, message: 'Message' },
    ])

    await updateFeatureRequestMemo(ID, '')

    test.expectAuditLog('FEATURE_REQUEST_UPDATE', ID, {
      changes: {
        after: { hasMemo: false },
        before: { hasMemo: true },
      },
      entityName: 'Message',
    })
  })

  it.each([
    { adminMemo: MEMO, stored: MEMO },
    { adminMemo: '', stored: null },
  ])(
    'neither updates nor records a memo that does not change (stored: $stored)',
    async ({ adminMemo, stored }) => {
      supabase.on('select', 'feature_requests', [
        { admin_memo: stored, message: 'Message' },
      ])

      const result = await updateFeatureRequestMemo(ID, adminMemo)

      expect(result).toEqual({ success: true })
      expect(supabase.calls('update', 'feature_requests')).toEqual([])
      test.expectNoAuditLog()
    },
  )

  it('returns an error for a feedback that does not exist', async () => {
    const result = await updateFeatureRequestMemo(ID, MEMO)

    expect(result).toEqual({
      error: 'フィードバックが見つかりませんでした',
      success: false,
    })
    expect(supabase.calls('update', 'feature_requests')).toEqual([])
    test.expectNoAuditLog()
  })

  it('records nothing when the update fails', async () => {
    supabase.on('select', 'feature_requests', [
      { admin_memo: null, message: 'Message' },
    ])
    supabase.on(
      'update',
      'feature_requests',
      postgresError('XX000', 'Database error'),
    )

    const result = await updateFeatureRequestMemo(ID, MEMO)

    expect(result).toEqual({
      error: 'メモの更新に失敗しました',
      success: false,
    })
    test.expectNoAuditLog()
    test.expectNotRevalidated()
  })
})

describe('markFeatureRequestAsRead', () => {
  it.each([true, false])(
    'sets is_read to %s without recording an audit log',
    async (isRead) => {
      const result = await markFeatureRequestAsRead(ID, isRead)

      expect(result).toEqual({ success: true })
      expect(supabase.calls('update', 'feature_requests')).toMatchObject([
        { body: { is_read: isRead }, query: { id: `eq.${ID}` } },
      ])
      test.expectNoAuditLog()
      test.expectRevalidated({ paths: ['/feedback'] })
    },
  )
})
