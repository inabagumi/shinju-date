import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BACKFILL_SAVE_CONCURRENCY } from '../constants.js'
import { YOUTUBE_CHANNELS } from '../database/index.js'
import { AccountNotFoundError, StalledPaginationError } from '../errors.js'
import { createTestContext } from '../testing/context.js'
import { setupSupabase } from '../testing/supabase.js'
import {
  addPastVideosWith,
  type PastVideoAdapter,
  type PastVideoPage,
} from './add-past-videos.js'

const supabase = setupSupabase()
const context = createTestContext({
  fetcher: null,
  reportError: vi.fn(),
  supabaseClient: supabase.supabaseClient,
})

const channelRow = {
  id: 'channel-row-1',
  talent_id: 'talent-1',
  talents: { id: 'talent-1' },
  youtube_channel_id: 'UCaaa',
}

const account = {
  id: 'channel-row-1',
  platformId: 'UCaaa',
  talentId: 'talent-1',
}

function createAdapter(page: PastVideoPage<string> | null) {
  const getPage = vi.fn(async () => page)
  const saveNew = vi.fn(
    async (
      _context: unknown,
      _account: unknown,
      listed: readonly string[],
    ): Promise<number> => listed.length - 1,
  )
  const adapter: PastVideoAdapter<null, string> = {
    accountTable: YOUTUBE_CHANNELS,
    getPage,
    saveNew,
  }

  return { adapter, getPage, saveNew }
}

describe('addPastVideosWith', () => {
  beforeEach(() => {
    supabase.respondWith({ 'GET youtube_channels': [channelRow] })
  })

  it('saves the videos of the page and returns where the next page starts', async () => {
    const { adapter, getPage, saveNew } = createAdapter({
      cursor: 'page-3',
      listed: ['a', 'b', 'c'],
    })

    await expect(
      addPastVideosWith(context, adapter, {
        accountId: 'channel-row-1',
        cursor: 'page-2',
      }),
    ).resolves.toEqual({ added: 2, cursor: 'page-3', listed: 3 })

    expect(getPage).toHaveBeenCalledWith(context, account, 'page-2')
    expect(saveNew).toHaveBeenCalledWith(
      context,
      account,
      ['a', 'b', 'c'],
      BACKFILL_SAVE_CONCURRENCY,
    )
    expect(supabase.written('GET', 'youtube_channels')[0]?.query).toMatchObject(
      {
        id: 'eq.channel-row-1',
        'talents.deleted_at': 'is.null',
      },
    )
  })

  it('rejects an account that is not saved or whose talent was deleted', async () => {
    supabase.respondWith({ 'GET youtube_channels': [] })
    const { adapter, getPage } = createAdapter({ cursor: null, listed: [] })

    await expect(
      addPastVideosWith(context, adapter, { accountId: 'channel-row-1' }),
    ).rejects.toBeInstanceOf(AccountNotFoundError)
    expect(getPage).not.toHaveBeenCalled()
  })

  it('rejects an account the platform does not have', async () => {
    const { adapter, saveNew } = createAdapter(null)

    await expect(
      addPastVideosWith(context, adapter, { accountId: 'channel-row-1' }),
    ).rejects.toBeInstanceOf(AccountNotFoundError)
    expect(saveNew).not.toHaveBeenCalled()
  })

  it('rejects a page that does not move the cursor forward', async () => {
    const { adapter, saveNew } = createAdapter({
      cursor: 'page-2',
      listed: ['a'],
    })

    await expect(
      addPastVideosWith(context, adapter, {
        accountId: 'channel-row-1',
        cursor: 'page-2',
      }),
    ).rejects.toBeInstanceOf(StalledPaginationError)
    expect(saveNew).not.toHaveBeenCalled()
  })
})
