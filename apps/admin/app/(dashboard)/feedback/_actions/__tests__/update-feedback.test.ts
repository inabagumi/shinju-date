import { describe, expect, it } from 'vitest'
import { setupActionTest } from '@/test/action-harness'
import { postgresError } from '@/test/supabase'
import {
  markFeatureRequestAsRead,
  updateFeatureRequestMemo,
  updateFeatureRequestStatus,
} from '../update-feedback'

const test = setupActionTest()
const { supabase } = test

const ID = '70000000-0000-4000-8000-000000000001'
const MEMO = '検索の絞り込みと合わせて、次の四半期に対応する。'

function statusForm(status: string, id = ID): FormData {
  const formData = new FormData()
  formData.set('id', id)
  formData.set('status', status)
  return formData
}

function memoForm(adminMemo: string, id = ID): FormData {
  const formData = new FormData()
  formData.set('id', id)
  formData.set('admin_memo', adminMemo)
  return formData
}

function readForm(isRead: string, id = ID): FormData {
  const formData = new FormData()
  formData.set('id', id)
  formData.set('is_read', isRead)
  return formData
}

function errorState(message: string) {
  return { errors: { generic: [message] } }
}

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

    const result = await updateFeatureRequestStatus(
      {},
      statusForm('in_progress'),
    )

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

    await updateFeatureRequestStatus({}, statusForm('resolved'))

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

    const result = await updateFeatureRequestStatus({}, statusForm('resolved'))

    expect(result).toEqual({ success: true })
    expect(supabase.calls('update', 'feature_requests')).toEqual([])
    test.expectNoAuditLog()
  })

  it('returns an error for a feedback that does not exist', async () => {
    const result = await updateFeatureRequestStatus({}, statusForm('resolved'))

    expect(result).toEqual(errorState('フィードバックが見つかりませんでした。'))
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

    const result = await updateFeatureRequestStatus({}, statusForm('resolved'))

    expect(result).toEqual(errorState('ステータスの更新に失敗しました。'))
    test.expectNoAuditLog()
    test.expectNotRevalidated()
  })
})

describe('updateFeatureRequestMemo', () => {
  it('records that a memo was added, without the memo itself', async () => {
    supabase.on('select', 'feature_requests', [
      { admin_memo: null, message: 'Message' },
    ])

    const result = await updateFeatureRequestMemo({}, memoForm(MEMO))

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

    await updateFeatureRequestMemo({}, memoForm(MEMO))

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

    await updateFeatureRequestMemo({}, memoForm(''))

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

      const result = await updateFeatureRequestMemo({}, memoForm(adminMemo))

      expect(result).toEqual({ success: true })
      expect(supabase.calls('update', 'feature_requests')).toEqual([])
      test.expectNoAuditLog()
    },
  )

  it('returns an error for a feedback that does not exist', async () => {
    const result = await updateFeatureRequestMemo({}, memoForm(MEMO))

    expect(result).toEqual(errorState('フィードバックが見つかりませんでした。'))
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

    const result = await updateFeatureRequestMemo({}, memoForm(MEMO))

    expect(result).toEqual(errorState('メモの更新に失敗しました。'))
    test.expectNoAuditLog()
    test.expectNotRevalidated()
  })
})

describe('markFeatureRequestAsRead', () => {
  it.each([true, false])(
    'sets is_read to %s without recording an audit log',
    async (isRead) => {
      const result = await markFeatureRequestAsRead(
        {},
        readForm(String(isRead)),
      )

      expect(result).toEqual({ success: true })
      expect(supabase.calls('update', 'feature_requests')).toMatchObject([
        { body: { is_read: isRead }, query: { id: `eq.${ID}` } },
      ])
      test.expectNoAuditLog()
      test.expectRevalidated({ paths: ['/feedback'] })
    },
  )

  it('records nothing when the update fails', async () => {
    supabase.on(
      'update',
      'feature_requests',
      postgresError('XX000', 'Database error'),
    )

    const result = await markFeatureRequestAsRead({}, readForm('true'))

    expect(result).toEqual(errorState('既読状態の更新に失敗しました。'))
    test.expectNotRevalidated()
  })
})

describe('with an invalid input', () => {
  const INVALID_INPUT = errorState('入力が正しくありません。')

  it.each([
    [
      'a status for an ID that is not a UUID',
      () => updateFeatureRequestStatus({}, statusForm('resolved', 'abc')),
    ],
    [
      'a status that is not in the enum',
      () => updateFeatureRequestStatus({}, statusForm('done')),
    ],
    [
      'a status form without the status',
      () => {
        const formData = statusForm('resolved')
        formData.delete('status')
        return updateFeatureRequestStatus({}, formData)
      },
    ],
    [
      'a memo for an ID that is not a UUID',
      () => updateFeatureRequestMemo({}, memoForm(MEMO, 'abc')),
    ],
    [
      'a memo form without the memo',
      () => {
        const formData = memoForm(MEMO)
        formData.delete('admin_memo')
        return updateFeatureRequestMemo({}, formData)
      },
    ],
    [
      'a read state for an ID that is not a UUID',
      () => markFeatureRequestAsRead({}, readForm('true', 'abc')),
    ],
    [
      'a read state that is not a boolean',
      () => markFeatureRequestAsRead({}, readForm('yes')),
    ],
  ])('updates nothing for %s', async (_label, action) => {
    await expect(action()).resolves.toEqual(INVALID_INPUT)
    expect(supabase.requests).toEqual([])
    test.expectNoAuditLog()
    test.expectNotRevalidated()
  })
})
