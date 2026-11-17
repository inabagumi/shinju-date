import type { Tables } from '@shinju-date/database'
import type { ButtonProps } from '@shinju-date/ui'
import type { ServerActionResult } from '@/lib/use-server-action'
import {
  restoreAction,
  softDeleteAction,
  toggleVisibilityAction,
} from '../_actions'

/** 動画に対する操作の種類 */
export type VideoAction = 'toggle' | 'delete' | 'restore'

/** 操作の対象の動画 */
export interface VideoActionTarget
  extends Pick<Tables<'videos'>, 'id' | 'title'> {
  /**
   * 操作する前の表示状態。1件の表示を切り替えるときに渡すと、切り替えた後の
   * 状態を成功の文で知らせる
   */
  visible?: boolean | undefined
}

/** 操作のアクションの戻り値 */
interface VideoActionResult extends ServerActionResult {
  /** 表示を切り替えた動画の件数 */
  updatedCount?: number | undefined
}

/** 確認のダイアログの文言 */
export interface VideoActionConfirmConfig {
  title: string
  description: (count: number) => string
  confirmLabel: string
  confirmVariant: ButtonProps['variant']
  /** 指定すると、この文字列を入力するまで実行できない */
  requireKeyword?: string | undefined
}

interface VideoActionDefinition {
  /** 呼ぶ Server Action */
  action: (ids: string[]) => Promise<VideoActionResult>
  /** 成功したときにトーストで出す文 */
  successText: (
    result: VideoActionResult,
    targets: readonly VideoActionTarget[],
  ) => string
  /** 失敗したが `error` が空のときにトーストで出す文 */
  errorText: string
  confirm: VideoActionConfirmConfig
}

/**
 * 動画の操作の定義。呼ぶアクション、結果の文、確認のダイアログの文言を持つ。
 * 一覧と詳細の両方が、`useVideoAction()` を通してこの表を使う
 */
export const VIDEO_ACTIONS = {
  delete: {
    action: softDeleteAction,
    confirm: {
      confirmLabel: '削除する',
      confirmVariant: 'danger',
      description: (count) =>
        count > 1
          ? `${count}件の動画を削除しようとしています。この操作は取り消せません。`
          : '以下の動画を削除します。この操作は取り消せません。',
      requireKeyword: 'DELETE',
      title: '動画を削除',
    },
    errorText: '削除に失敗しました。',
    successText: () => '動画を削除しました。',
  },
  restore: {
    action: restoreAction,
    confirm: {
      confirmLabel: '復元する',
      confirmVariant: 'primary',
      description: (count) =>
        count > 1
          ? `${count}件の動画を復元します。`
          : '以下の動画を復元します。',
      title: '動画を復元',
    },
    errorText: '復元に失敗しました。',
    successText: () => '動画を復元しました。',
  },
  toggle: {
    action: toggleVisibilityAction,
    confirm: {
      confirmLabel: '切り替える',
      confirmVariant: 'primary',
      description: (count) =>
        count > 1
          ? `${count}件の動画の表示状態を切り替えます。`
          : '以下の動画の表示状態を切り替えます。',
      title: '表示状態を切り替え',
    },
    errorText: '更新に失敗しました。',
    successText: (result, targets) => {
      const [target] = targets

      if (targets.length === 1 && target?.visible !== undefined) {
        return `動画を${target.visible ? '非表示' : '表示'}に変更しました。`
      }

      return `${result.updatedCount ?? targets.length} 件の動画の表示状態を更新しました。`
    },
  },
} as const satisfies Record<VideoAction, VideoActionDefinition>

/** `runVideoAction` の戻り値。トーストの文を作るため、操作と対象も持つ */
export interface VideoActionRunResult extends VideoActionResult {
  action: VideoAction
  targets: readonly VideoActionTarget[]
}

/**
 * 表に従って、対象の動画に操作のアクションを呼ぶ。失敗して `error` が空の
 * ときは、操作ごとの文を `error` に入れる
 */
export async function runVideoAction(
  action: VideoAction,
  targets: readonly VideoActionTarget[],
): Promise<VideoActionRunResult> {
  const definition: VideoActionDefinition = VIDEO_ACTIONS[action]
  const result = await definition.action(targets.map((target) => target.id))

  return {
    ...result,
    action,
    error: result.success ? result.error : result.error || definition.errorText,
    targets,
  }
}

/** 成功したときにトーストで出す文を、表に従って作る */
export function getVideoActionSuccessText(result: VideoActionRunResult) {
  const definition: VideoActionDefinition = VIDEO_ACTIONS[result.action]

  return definition.successText(result, result.targets)
}
