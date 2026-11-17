import PQueue from 'p-queue'
import type {
  AccountChanges,
  AccountFields,
  SyncAccountResult,
  WriteContext,
} from '../../types.js'
import { diffAccountFields } from '../account-fields.js'
import { WRITE_CONCURRENCY } from '../constants.js'
import type { AccountTable } from '../database/index.js'
import { DatabaseError } from '../errors.js'
import type { ProfileImageSyncResult } from '../profile-images/index.js'

/** The columns every saved account is loaded with. */
export interface SavedAccountBase {
  /** Primary key of the account row */
  id: string
}

/** Where saved accounts are loaded from. */
export interface SavedAccountQuery {
  accountTable: AccountTable
  /**
   * The columns of `accountTable` that load a saved account, its icon
   * included.
   */
  savedAccountColumns: string
}

/**
 * What differs between the platforms when saved accounts are brought in line
 * with the platform: how they are loaded and read from the platform, which
 * details are kept in line and how they and the icon are written.
 *
 * @typeParam TAccount - An account as the platform API returns it.
 * @typeParam TSaved - A saved account as loaded with `savedAccountColumns`.
 * @typeParam TFields - The details kept in line with the platform.
 */
export interface AccountAdapter<
  TAccount extends { id: string },
  TSaved extends SavedAccountBase & TFields,
  TFields extends AccountFields,
> extends SavedAccountQuery {
  /** What logs call an account, e.g. `YouTubeチャンネル`. */
  label: string
  /**
   * The key the ID of an account on the platform is logged and reported
   * under, e.g. `youtubeChannelId`.
   */
  platformIdKey: string
  /**
   * Reads accounts from the platform. IDs it does not return are accounts
   * the platform no longer has.
   */
  getAccounts(platformIds: readonly string[]): Promise<TAccount[]>
  /** The ID of the saved account on the platform. */
  getPlatformId(saved: TSaved): string
  /**
   * Brings the stored icon of the saved account in line with the platform.
   *
   * @throws When the icon cannot be downloaded, stored or assigned.
   */
  syncIcon(
    context: WriteContext,
    saved: TSaved,
    account: TAccount,
  ): Promise<ProfileImageSyncResult>
  /** The details of an account as the platform reports them. */
  toDetails(account: TAccount): TFields
  /**
   * Writes the details of an account that changed on the platform.
   *
   * @throws When the account cannot be updated.
   */
  updateDetails(
    context: WriteContext,
    saved: TSaved,
    details: TFields,
  ): Promise<void>
}

export interface SyncAccountsOptions {
  /**
   * Primary key of the talent whose accounts are synced. Omit to sync the
   * accounts of every talent.
   */
  talentId?: string | undefined
}

/**
 * Loads the saved accounts of non-deleted talents (retired ones included), or
 * of one talent only.
 *
 * @throws When the accounts cannot be loaded.
 */
async function loadSavedAccounts<TSaved extends SavedAccountBase>(
  { supabaseClient }: WriteContext,
  { accountTable: { table }, savedAccountColumns }: SavedAccountQuery,
  talentId: string | undefined,
): Promise<TSaved[]> {
  let query = supabaseClient
    .from('talents')
    .select(`id, ${table}!inner(${savedAccountColumns})`)
    .is('deleted_at', null)

  if (talentId !== undefined) {
    query = query.eq('id', talentId)
  }

  const { data: talents, error } = await query

  if (error) {
    throw new DatabaseError(`Failed to load ${table}`, error)
  }

  // `savedAccountColumns` is a plain string here, so the rows cannot be typed
  // from it; the adapter guarantees they are `TSaved`.
  return (talents as unknown as Partial<Record<string, TSaved[]>>[]).flatMap(
    (talent) => talent[table] ?? [],
  )
}

/**
 * Updates the stored icon of a saved account.
 *
 * A failure is reported instead of thrown, so that an icon that cannot be
 * stored never keeps the details from being synced.
 *
 * @returns Whether anything was written.
 */
async function syncIcon<
  TAccount extends { id: string },
  TSaved extends SavedAccountBase & TFields,
  TFields extends AccountFields,
>(
  context: WriteContext,
  adapter: AccountAdapter<TAccount, TSaved, TFields>,
  saved: TSaved,
  account: TAccount,
): Promise<boolean> {
  const platformId = { [adapter.platformIdKey]: adapter.getPlatformId(saved) }

  try {
    const result = await adapter.syncIcon(context, saved, account)

    if (result === 'unchanged') {
      return false
    }

    context.logger.info(`${adapter.label}のアイコンを更新しました`, {
      result,
      ...platformId,
    })

    return true
  } catch (error) {
    context.reportError(error, { operation: 'syncProfileImage', ...platformId })

    return false
  }
}

/**
 * Syncs the details of a saved account, then its icon. The two are
 * independent: a failure to write the details is reported and does not keep
 * the icon from being synced.
 */
async function syncAccount<
  TAccount extends { id: string },
  TSaved extends SavedAccountBase & TFields,
  TFields extends AccountFields,
>(
  context: WriteContext,
  adapter: AccountAdapter<TAccount, TSaved, TFields>,
  saved: TSaved,
  account: TAccount,
): Promise<SyncAccountResult<TFields>> {
  const details = adapter.toDetails(account)
  const changes: AccountChanges<TFields> | undefined =
    diffAccountFields<TFields>(saved, details)
  let detailsFailed = false

  if (changes) {
    try {
      await adapter.updateDetails(context, saved, details)
    } catch (error) {
      context.reportError(error, {
        [adapter.platformIdKey]: adapter.getPlatformId(saved),
      })
      detailsFailed = true
    }
  }

  const iconUpdated = await syncIcon(context, adapter, saved, account)

  if (detailsFailed) {
    return {
      accountId: saved.id,
      iconUpdated,
      name: saved.name,
      status: 'failed',
    }
  }

  return {
    accountId: saved.id,
    iconUpdated,
    name: details.name,
    status: changes || iconUpdated ? 'updated' : 'unchanged',
    ...(changes ? { changes } : {}),
  }
}

/**
 * Brings the details and the icon of saved accounts in line with the
 * platform. Accounts of retired talents are included (deleted talents are
 * not), and an account is written only when something changed.
 *
 * Every account is synced on its own: one that fails is reported and does
 * not keep the others from being synced. Within an account, the details and
 * the icon are synced independently as well.
 *
 * @returns One result per saved account; empty when there is none.
 * @throws When the accounts cannot be loaded or the platform cannot be read.
 */
export async function syncAccountsWith<
  TAccount extends { id: string },
  TSaved extends SavedAccountBase & TFields,
  TFields extends AccountFields,
>(
  context: WriteContext,
  adapter: AccountAdapter<TAccount, TSaved, TFields>,
  { talentId }: SyncAccountsOptions = {},
): Promise<SyncAccountResult<TFields>[]> {
  const savedAccounts = await loadSavedAccounts<TSaved>(
    context,
    adapter,
    talentId,
  )

  if (savedAccounts.length === 0) {
    return []
  }

  const accounts = await adapter.getAccounts(
    savedAccounts.map((saved) => adapter.getPlatformId(saved)),
  )
  const accountById = new Map(accounts.map((account) => [account.id, account]))
  const queue = new PQueue({ concurrency: WRITE_CONCURRENCY })

  return Promise.all(
    savedAccounts.map((saved) =>
      queue.add(async (): Promise<SyncAccountResult<TFields>> => {
        const account = accountById.get(adapter.getPlatformId(saved))
        const notSynced = {
          accountId: saved.id,
          iconUpdated: false,
          name: saved.name,
        }

        if (!account) {
          return { ...notSynced, status: 'not-found' }
        }

        try {
          return await syncAccount(context, adapter, saved, account)
        } catch (error) {
          context.reportError(error, {
            [adapter.platformIdKey]: adapter.getPlatformId(saved),
          })

          return { ...notSynced, status: 'failed' }
        }
      }),
    ),
  )
}

/**
 * Counts the accounts a sync wrote to: those whose details or icon changed.
 */
export function countUpdatedAccounts(
  results: readonly SyncAccountResult[],
): number {
  return results.filter(
    ({ iconUpdated, status }) => status === 'updated' || iconUpdated,
  ).length
}
