import { CACHE_TAGS } from '@shinju-date/constants'
import type { Enums, Tables } from '@shinju-date/database'
import { logger } from '@shinju-date/logger'
import { toDBString } from '@shinju-date/temporal-fns'
import {
  parseTwitchUserIdentifier,
  resolveTwitchUser,
  type TwitchUser,
  type TwitchUserIdentifier,
} from '@shinju-date/twitch-api-client'
import { revalidateTags } from '@shinju-date/web-cache'
import {
  type FilteredYouTubeChannel,
  parseYouTubeChannelIdentifier,
  resolveYouTubeChannel,
  type YouTubeChannelIdentifier,
} from '@shinju-date/youtube-api-client'
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { ActionError } from '@/lib/action'
import { type AuditLogDetails, createAuditLog } from '@/lib/audit-log'
import type { TypedSupabaseClient } from '@/lib/supabase'
import {
  isNotFoundError,
  UNIQUE_VIOLATION_ERROR_CODE,
} from '@/lib/supabase/query'
import { syncTwitchUserIconSafely } from '@/lib/twitch-user-icon'
import { syncYouTubeChannelIconSafely } from '@/lib/youtube-channel-icon'

/** タレントに結び付けられるアカウントのプラットフォーム */
export type AccountPlatform = Enums<'platform_type'>

/** プラットフォームごとに違う型 */
interface AccountTypes {
  twitch: {
    /** 監査ログに残す、アカウントの行の列 */
    account: AuditLogDetails<'TWITCH_USER_CREATE'>['account']
    identifier: TwitchUserIdentifier
    remote: TwitchUser
    table: 'twitch_users'
  }
  youtube: {
    account: AuditLogDetails<'YOUTUBE_CHANNEL_CREATE'>['account']
    identifier: YouTubeChannelIdentifier
    remote: FilteredYouTubeChannel
    table: 'youtube_channels'
  }
}

/** 結び付いているタレントの名前を埋め込んだ、アカウントの行 */
type AccountRow<P extends AccountPlatform> = AccountTypes[P]['account'] & {
  talent: Pick<Tables<'talents'>, 'name'>
}

/** 画面に出すエラーの文 */
interface AccountMessages {
  /** 同じタレントに登録済み */
  alreadyLinked: string
  /** API に接続できない */
  apiFailed: string
  /** API の認証情報が設定されていない */
  credentialsMissing: string
  /** 入力を、ID や URL として解釈できない */
  inputInvalid: string
  /** 入力が空 */
  inputRequired: string
  /** ほかのタレントに登録済み */
  linkedToOtherTalent: string
  /** プラットフォームに、アカウントが見つからない */
  notFound: string
  /** 削除するアカウントかタレントの ID が空 */
  unlinkIdsRequired: string
  /** 削除するアカウントが見つからない */
  unlinkNotFound: string
}

/** プラットフォームごとの定義 */
interface AccountDefinition<P extends AccountPlatform> {
  /** 行を作ったあとと削除の前に読み、監査ログに残す列 */
  accountColumns: readonly (keyof AccountTypes[P]['account'] & string)[]
  /** エラーを結び付ける、フォームの入力欄の名前 */
  field: string
  /** API の認証情報が設定されていないことを示すエラーかどうか */
  isCredentialsError(error: unknown): boolean
  messages: AccountMessages
  /** 入力（ID、ハンドル、URL など）を解釈する。解釈できなければ `null` */
  parse(input: string): AccountTypes[P]['identifier'] | null
  /** 追加の監査ログを、タレントを対象にして残す */
  recordLink(
    supabaseClient: TypedSupabaseClient,
    talentId: string,
    account: AccountRow<P>,
  ): Promise<void>
  /** 削除の監査ログを、タレントを対象にして残す */
  recordUnlink(
    supabaseClient: TypedSupabaseClient,
    talentId: string,
    account: AccountRow<P>,
  ): Promise<void>
  /** プラットフォーム側の ID を入れる列。すべてのタレントを通して一意 */
  remoteIdColumn: keyof Tables<AccountTypes[P]['table']> & string
  /** API でアカウントを解決する。見つからなければ `null` */
  resolve(
    identifier: AccountTypes[P]['identifier'],
  ): Promise<AccountTypes[P]['remote'] | null>
  /** 作った行に、アイコンを同期する。失敗しても例外を投げない */
  syncIcon(
    remote: AccountTypes[P]['remote'],
    accountId: string,
  ): Promise<unknown>
  /** アカウントを保存するテーブル */
  table: AccountTypes[P]['table']
  /** API が返したアカウントから作る、保存する行 */
  toRow(
    remote: AccountTypes[P]['remote'],
    talentId: string,
  ): Omit<AccountTypes[P]['account'], 'id'> &
    Pick<Tables<AccountTypes[P]['table']>, 'talent_id'>
}

const ACCOUNT_DEFINITIONS: {
  [P in AccountPlatform]: AccountDefinition<P>
} = {
  twitch: {
    accountColumns: ['id', 'name', 'twitch_login_name', 'twitch_user_id'],
    field: 'twitch_user',
    isCredentialsError: (error) =>
      error instanceof TypeError &&
      error.message.includes('Client ID and Client Secret'),
    messages: {
      alreadyLinked: 'このTwitchユーザーは既に登録されています。',
      apiFailed:
        'Twitch APIへの接続に失敗しました。しばらくしてから再度お試しください。',
      credentialsMissing:
        'Twitch APIの認証情報が設定されていません。管理者に連絡してください。',
      inputInvalid:
        '有効なログイン名、ユーザーID（数字）、またはTwitch URLを入力してください。',
      inputRequired:
        'Twitchのログイン名、ユーザーID、またはURLを入力してください。',
      linkedToOtherTalent:
        'このTwitchユーザーは別のタレントに既に登録されています。',
      notFound:
        'Twitchでユーザーが見つかりませんでした。入力内容を確認してください。',
      unlinkIdsRequired:
        'TwitchユーザーIDまたはタレントIDが指定されていません。',
      unlinkNotFound:
        '指定されたTwitchユーザーが見つかりません。既に削除されているか、存在しないIDが指定されています。',
    },
    parse: parseTwitchUserIdentifier,
    recordLink: (supabaseClient, talentId, { talent, ...account }) =>
      createAuditLog(supabaseClient, 'TWITCH_USER_CREATE', talentId, {
        account,
        entityName: talent.name,
      }),
    recordUnlink: (supabaseClient, talentId, { talent, ...account }) =>
      createAuditLog(supabaseClient, 'TWITCH_USER_DELETE', talentId, {
        account,
        entityName: talent.name,
      }),
    remoteIdColumn: 'twitch_user_id',
    resolve: resolveTwitchUser,
    syncIcon: (user, accountId) =>
      syncTwitchUserIconSafely(user, {
        id: accountId,
        profile_images: null,
        twitch_user_id: user.id,
      }),
    table: 'twitch_users',
    toRow: (user, talentId) => ({
      name: user.display_name,
      talent_id: talentId,
      twitch_login_name: user.login,
      twitch_user_id: user.id,
    }),
  },
  youtube: {
    accountColumns: ['id', 'name', 'youtube_channel_id', 'youtube_handle'],
    field: 'youtube_channel_id',
    isCredentialsError: (error) =>
      error instanceof TypeError && error.message.includes('API Key'),
    messages: {
      alreadyLinked: 'このチャンネルは既に登録されています。',
      apiFailed:
        'YouTube APIへの接続に失敗しました。しばらくしてから再度お試しください。',
      credentialsMissing:
        'YouTube APIキーが設定されていません。管理者に連絡してください。',
      inputInvalid:
        '有効なチャンネルID（UC...）、ハンドル（@name）、またはYouTube URLを入力してください。',
      inputRequired:
        'YouTubeチャンネルID、ハンドル、またはURLを入力してください。',
      linkedToOtherTalent:
        'このチャンネルは別のタレントに既に登録されています。',
      notFound:
        'YouTubeでチャンネルが見つかりませんでした。入力内容を確認してください。',
      unlinkIdsRequired: 'チャンネルIDまたはタレントIDが指定されていません。',
      unlinkNotFound:
        '指定されたチャンネルが見つかりません。既に削除されているか、存在しないIDが指定されています。',
    },
    parse: parseYouTubeChannelIdentifier,
    recordLink: (supabaseClient, talentId, { talent, ...account }) =>
      createAuditLog(supabaseClient, 'YOUTUBE_CHANNEL_CREATE', talentId, {
        account,
        entityName: talent.name,
      }),
    recordUnlink: (supabaseClient, talentId, { talent, ...account }) =>
      createAuditLog(supabaseClient, 'YOUTUBE_CHANNEL_DELETE', talentId, {
        account,
        entityName: talent.name,
      }),
    remoteIdColumn: 'youtube_channel_id',
    resolve: resolveYouTubeChannel,
    syncIcon: (channel, accountId) =>
      syncYouTubeChannelIconSafely(channel, {
        id: accountId,
        profile_images: null,
        youtube_channel_id: channel.id,
      }),
    table: 'youtube_channels',
    toRow: (channel, talentId) => ({
      name: channel.snippet.title,
      talent_id: talentId,
      youtube_channel_id: channel.id,
      youtube_handle: channel.snippet.customUrl || null,
    }),
  },
}

/** API で解決し、どのタレントにも登録されていないことを確かめたアカウント */
export interface ResolvedAccount<P extends AccountPlatform = AccountPlatform> {
  platform: P
  /** API が返したアカウント */
  remote: AccountTypes[P]['remote']
}

export interface ResolveAccountOptions {
  /** 入力された、アカウントの ID、ハンドル（ログイン名）、または URL */
  input: string
  supabaseClient: TypedSupabaseClient
  /** 結び付ける先のタレント。登録済みのときのエラーの文を、このタレントかどうかで変える */
  talentId?: string
}

export interface LinkAccountOptions<P extends AccountPlatform> {
  /** 入力された文字列。先に `resolveAccount` で解決してあるときは、その結果 */
  input: string | ResolvedAccount<P>
  supabaseClient: TypedSupabaseClient
  talentId: string
}

export interface UnlinkAccountOptions {
  /** アカウントの行の ID（`youtube_channels.id` / `twitch_users.id`） */
  accountId: string
  supabaseClient: TypedSupabaseClient
  talentId: string
}

/** 定義のうち、テーブルの問い合わせに使う、プラットフォームの型によらない部分 */
interface AccountTableDefinition {
  accountColumns: readonly string[]
  field: string
  messages: AccountMessages
  remoteIdColumn: string
  table: AccountTypes[AccountPlatform]['table']
}

/**
 * アカウントのテーブルを開く。
 *
 * テーブルと列の名前が定義から来るので、型付きのクライアントでは問い合わせの型が
 * 決まらない。型のないクライアントとして開き、結果の型は呼ぶ側で指定する
 * （名前がデータベースにあることは、`AccountDefinition` の型が確かめる）。
 */
function accountsTable(
  supabaseClient: TypedSupabaseClient,
  { table }: AccountTableDefinition,
) {
  return (supabaseClient as SupabaseClient).from(table)
}

/** 監査ログに残す列と、結び付いているタレントの名前を読む `select` */
function accountSelect({ accountColumns }: AccountTableDefinition): string {
  return `${accountColumns.join(', ')}, talent:talents (name)`
}

/**
 * タレントの更新日時を進める（一覧の並びに反映するため）。
 *
 * 失敗しても例外は投げず、ログに残してエラーを返す。アカウントの追加と削除は、
 * 更新日時を進められなくても成功として扱う。失敗として扱う呼び出し元は、戻り値を確かめる。
 *
 * @returns 更新に失敗したときのエラー。成功したときは `null`
 */
export async function touchTalent(
  supabaseClient: TypedSupabaseClient,
  talentId: string,
  now: Temporal.Instant = Temporal.Now.instant(),
): Promise<PostgrestError | null> {
  const { error } = await supabaseClient
    .from('talents')
    .update({ updated_at: toDBString(now) })
    .eq('id', talentId)

  if (error) {
    logger.error('タレントの更新日時の更新に失敗しました', { error, talentId })
  }

  return error
}

async function revalidateTalent(talentId: string): Promise<void> {
  revalidatePath(`/talents/${talentId}`)
  revalidatePath('/talents')
  await revalidateTags([CACHE_TAGS.TALENTS, CACHE_TAGS.VIDEOS])
}

/**
 * アカウントがまだ登録されていないことを確かめる。
 * プラットフォーム側の ID は、すべてのタレントを通して一意。
 */
async function assertNotLinked(
  definition: AccountTableDefinition,
  supabaseClient: TypedSupabaseClient,
  remoteId: string,
  talentId: string | undefined,
): Promise<void> {
  const { data: linked, error } = await accountsTable(
    supabaseClient,
    definition,
  )
    .select('talent_id')
    .eq(definition.remoteIdColumn, remoteId)
    .maybeSingle<{ talent_id: string }>()

  if (error) {
    throw error
  }

  if (linked) {
    throw new ActionError(
      linked.talent_id === talentId
        ? definition.messages.alreadyLinked
        : definition.messages.linkedToOtherTalent,
      { field: definition.field },
    )
  }
}

/**
 * 入力を解釈し、API でアカウントを解決して、まだ登録されていないことを確かめる。
 *
 * タレントを作る前に確かめたいとき（新規作成）は、これを先に呼び、
 * 結果を `linkAccount` の `input` に渡す。
 *
 * @throws {ActionError} 入力を解釈できない、API を呼べない、アカウントが見つからない、登録済み
 */
export async function resolveAccount<P extends AccountPlatform>(
  platform: P,
  { input, supabaseClient, talentId }: ResolveAccountOptions,
): Promise<ResolvedAccount<P>> {
  const definition: AccountDefinition<P> = ACCOUNT_DEFINITIONS[platform]
  const { field, messages } = definition

  if (!input.trim()) {
    throw new ActionError(messages.inputRequired, { field })
  }

  const identifier = definition.parse(input)

  if (!identifier) {
    throw new ActionError(messages.inputInvalid, { field })
  }

  let remote: AccountTypes[P]['remote'] | null

  try {
    remote = await definition.resolve(identifier)
  } catch (error) {
    if (definition.isCredentialsError(error)) {
      throw new ActionError(messages.credentialsMissing)
    }

    logger.error('アカウントを解決する API の呼び出しに失敗しました', {
      error,
      platform,
    })

    throw new ActionError(messages.apiFailed)
  }

  if (!remote) {
    throw new ActionError(messages.notFound, { field })
  }

  await assertNotLinked(definition, supabaseClient, remote.id, talentId)

  return { platform, remote }
}

/**
 * タレントにアカウントを結び付ける。
 *
 * 入力を解釈する → API で解決する → 登録済みかを確かめる → 行を作る →
 * アイコンを同期する → タレントの更新日時を進める → 監査ログ → 再検証、の順に行う。
 *
 * @throws {ActionError} 画面に見せてよい理由で結び付けられないとき（`resolveAccount` を参照）。
 * それ以外の失敗（データベースのエラーなど）は、そのままの例外を投げる
 */
export async function linkAccount<P extends AccountPlatform>(
  platform: P,
  { input, supabaseClient, talentId }: LinkAccountOptions<P>,
): Promise<void> {
  if (!talentId) {
    throw new ActionError('タレントIDが指定されていません。')
  }

  const definition: AccountDefinition<P> = ACCOUNT_DEFINITIONS[platform]
  const { remote } =
    typeof input === 'string'
      ? await resolveAccount(platform, { input, supabaseClient, talentId })
      : input

  const { data: account, error } = await accountsTable(
    supabaseClient,
    definition,
  )
    .insert(definition.toRow(remote, talentId))
    .select(accountSelect(definition))
    .single<AccountRow<P>>()

  if (error) {
    // 確かめたあとに、別の操作で登録された場合は、登録済みとして知らせる
    if (error.code === UNIQUE_VIOLATION_ERROR_CODE) {
      await assertNotLinked(definition, supabaseClient, remote.id, talentId)
    }

    throw error
  }

  // アイコンの取得に失敗しても、追加は成功として扱う（次回の同期で取得し直す）
  await definition.syncIcon(remote, account.id)
  await touchTalent(supabaseClient, talentId)
  await definition.recordLink(supabaseClient, talentId, account)
  await revalidateTalent(talentId)
}

/**
 * タレントからアカウントを外す（行を削除する）。
 *
 * 行を読む → 削除する → タレントの更新日時を進める → 監査ログ → 再検証、の順に行う。
 *
 * @throws {ActionError} ID が空のとき、アカウントが見つからないとき。
 * それ以外の失敗（データベースのエラーなど）は、そのままの例外を投げる
 */
export async function unlinkAccount<P extends AccountPlatform>(
  platform: P,
  { accountId, supabaseClient, talentId }: UnlinkAccountOptions,
): Promise<void> {
  const definition: AccountDefinition<P> = ACCOUNT_DEFINITIONS[platform]
  const { messages } = definition

  if (!accountId || !talentId) {
    throw new ActionError(messages.unlinkIdsRequired)
  }

  // 監査ログに残す値を、削除の前に読む
  const { data: account, error: fetchError } = await accountsTable(
    supabaseClient,
    definition,
  )
    .select(accountSelect(definition))
    .eq('id', accountId)
    .eq('talent_id', talentId)
    .single<AccountRow<P>>()

  if (fetchError) {
    if (isNotFoundError(fetchError)) {
      logger.warn('削除対象のアカウントが見つかりませんでした', {
        accountId,
        platform,
        talentId,
      })

      throw new ActionError(messages.unlinkNotFound)
    }

    throw fetchError
  }

  const { error } = await accountsTable(supabaseClient, definition)
    .delete()
    .eq('id', accountId)
    .eq('talent_id', talentId)

  if (error) {
    throw error
  }

  await touchTalent(supabaseClient, talentId)
  await definition.recordUnlink(supabaseClient, talentId, account)
  await revalidateTalent(talentId)
}
