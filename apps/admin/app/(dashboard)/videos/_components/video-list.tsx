'use client'

import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/dropdown-menu'
import ToggleSwitch from '@/components/toggle-switch'
import { supabaseClient } from '@/lib/supabase'
import {
  softDeleteAction,
  softDeleteSingleVideoAction,
  toggleSingleVideoVisibilityAction,
  toggleVisibilityAction,
} from '../_actions'
import type { Video } from '../_lib/get-videos'

type Channel = {
  created_at: string
  id: number
  name: string
  slug: string
  updated_at: string
}

type Props = {
  channels: Channel[]
  videos: Video[]
}

export default function VideoList({ channels, videos }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([])
  const [showConfirmModal, setShowConfirmModal] = useState<{
    action: 'toggle' | 'delete'
    open: boolean
    slug?: string
  }>({ action: 'toggle', open: false })
  const [isPending, startTransition] = useTransition()

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSlugs(videos.map((v) => v.slug))
    } else {
      setSelectedSlugs([])
    }
  }

  const handleSelectVideo = (slug: string, checked: boolean) => {
    if (checked) {
      setSelectedSlugs((prev) => [...prev, slug])
    } else {
      setSelectedSlugs((prev) => prev.filter((s) => s !== slug))
    }
  }

  const handleBulkAction = (action: 'toggle' | 'delete') => {
    setShowConfirmModal({ action, open: true })
  }

  const handleSingleAction = (action: 'toggle' | 'delete', slug: string) => {
    setShowConfirmModal({ action, open: true, slug })
  }

  const handleToggleVisibility = async (slug: string) => {
    startTransition(async () => {
      try {
        const result = await toggleSingleVideoVisibilityAction(slug)
        if (!result.success) {
          alert(result.error || '更新に失敗しました。')
        }
      } catch (_error) {
        alert('エラーが発生しました。')
      }
    })
  }

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        // If slug is provided, it's a single action
        if (showConfirmModal.slug) {
          if (showConfirmModal.action === 'toggle') {
            const result = await toggleSingleVideoVisibilityAction(
              showConfirmModal.slug,
            )
            if (result.success) {
              alert('表示状態を更新しました。')
            } else {
              alert(result.error || '更新に失敗しました。')
            }
          } else if (showConfirmModal.action === 'delete') {
            const result = await softDeleteSingleVideoAction(
              showConfirmModal.slug,
            )
            if (result.success) {
              alert('動画を削除しました。')
            } else {
              alert(result.error || '削除に失敗しました。')
            }
          }
        } else {
          // Bulk action
          if (showConfirmModal.action === 'toggle') {
            const result = await toggleVisibilityAction(selectedSlugs)
            if (result.success) {
              setSelectedSlugs([])
              alert('表示状態を更新しました。')
            } else {
              alert(result.error || '更新に失敗しました。')
            }
          } else if (showConfirmModal.action === 'delete') {
            const result = await softDeleteAction(selectedSlugs)
            if (result.success) {
              setSelectedSlugs([])
              alert('動画を削除しました。')
            } else {
              alert(result.error || '削除に失敗しました。')
            }
          }
        }
      } catch (_error) {
        alert('エラーが発生しました。')
      } finally {
        setShowConfirmModal({ action: 'toggle', open: false })
      }
    })
  }

  const handleFilterChange = (key: 'channelId' | 'visible', value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === '') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    // Reset to page 1 when filters change
    params.delete('page')
    router.push(`/videos?${params.toString()}`)
  }

  const allSelected =
    videos.length > 0 && selectedSlugs.length === videos.length

  const currentChannelId = searchParams.get('channelId') || ''
  const currentVisible = searchParams.get('visible') || ''

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex gap-4">
        <div>
          <label
            className="mb-1 block font-medium text-gray-700 text-sm"
            htmlFor="channel-filter"
          >
            チャンネルで絞り込み
          </label>
          <select
            className="rounded-md border border-gray-300 px-3 py-2"
            id="channel-filter"
            onChange={(e) => handleFilterChange('channelId', e.target.value)}
            value={currentChannelId}
          >
            <option value="">すべてのチャンネル</option>
            {channels.map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            className="mb-1 block font-medium text-gray-700 text-sm"
            htmlFor="status-filter"
          >
            ステータスで絞り込み
          </label>
          <select
            className="rounded-md border border-gray-300 px-3 py-2"
            id="status-filter"
            onChange={(e) => handleFilterChange('visible', e.target.value)}
            value={currentVisible}
          >
            <option value="">すべて</option>
            <option value="true">公開中のみ</option>
            <option value="false">非表示のみ</option>
          </select>
        </div>
      </div>

      {/* Action bar */}
      {selectedSlugs.length > 0 && (
        <div className="sticky top-0 z-10 mb-4 bg-blue-600 p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <span className="font-semibold">
              {selectedSlugs.length} 件選択中
            </span>
            <div className="flex gap-2">
              <button
                className="rounded-md bg-blue-700 px-4 py-2 hover:bg-blue-800 disabled:bg-gray-400"
                disabled={isPending}
                onClick={() => handleBulkAction('toggle')}
                type="button"
              >
                表示/非表示を切り替え
              </button>
              <button
                className="rounded-md bg-red-600 px-4 py-2 hover:bg-red-700 disabled:bg-gray-400"
                disabled={isPending}
                onClick={() => handleBulkAction('delete')}
                type="button"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="p-3 text-left">
                <input
                  checked={allSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  type="checkbox"
                />
              </th>
              <th className="p-3 text-left">サムネイル</th>
              <th className="p-3 text-left">タイトル</th>
              <th className="p-3 text-left">チャンネル</th>
              <th className="p-3 text-left">クリック数</th>
              <th className="p-3 text-left">表示状態</th>
              <th className="p-3 text-left">アクション</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((video) => (
              <tr className="border-b hover:bg-gray-50" key={video.slug}>
                <td className="p-3">
                  <input
                    checked={selectedSlugs.includes(video.slug)}
                    onChange={(e) =>
                      handleSelectVideo(video.slug, e.target.checked)
                    }
                    type="checkbox"
                  />
                </td>
                <td className="p-3">
                  {video.thumbnail ? (
                    <div className="relative aspect-video w-20">
                      <Image
                        alt=""
                        className="object-cover"
                        fill
                        sizes="80px"
                        src={
                          supabaseClient.storage
                            .from('thumbnails')
                            .getPublicUrl(video.thumbnail.path).data.publicUrl
                        }
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-video w-20 items-center justify-center bg-gray-200 text-xs">
                      No Image
                    </div>
                  )}
                </td>
                <td className="max-w-xs p-3">
                  <div className="line-clamp-2" title={video.title}>
                    {video.title}
                  </div>
                </td>
                <td className="p-3">
                  <span className="text-gray-600 text-sm">
                    {video.channel.name}
                  </span>
                </td>
                <td className="p-3">{video.clicks}</td>
                <td className="p-3">
                  <ToggleSwitch
                    checked={video.visible}
                    disabled={isPending}
                    label={video.visible ? '公開中' : '非表示'}
                    onChange={() => handleToggleVisibility(video.slug)}
                  />
                </td>
                <td className="p-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger aria-label="アクションメニュー">
                      <svg
                        aria-hidden="true"
                        className="h-5 w-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <title>アクションメニュー</title>
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => router.push(`/videos/${video.slug}`)}
                      >
                        編集
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleSingleAction('toggle', video.slug)}
                      >
                        表示/非表示を切り替え
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleSingleAction('delete', video.slug)}
                        variant="danger"
                      >
                        削除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Confirmation modal */}
      {showConfirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 font-semibold text-lg">確認</h3>
            <p className="mb-6 text-gray-700">
              {showConfirmModal.action === 'delete'
                ? showConfirmModal.slug
                  ? 'この動画を削除しますか？'
                  : `本当に${selectedSlugs.length}件の動画を削除しますか？`
                : showConfirmModal.slug
                  ? 'この動画の表示状態を切り替えますか？'
                  : `本当に${selectedSlugs.length}件の動画の表示状態を切り替えますか？`}
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-100"
                disabled={isPending}
                onClick={() =>
                  setShowConfirmModal({ action: 'toggle', open: false })
                }
                type="button"
              >
                キャンセル
              </button>
              <button
                className={`rounded-md px-4 py-2 text-white disabled:bg-gray-400 ${
                  showConfirmModal.action === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                disabled={isPending}
                onClick={handleConfirm}
                type="button"
              >
                {isPending ? '処理中...' : '実行'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
