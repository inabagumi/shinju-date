'use client'

import { useState } from 'react'
import type { FormState } from '@/components/form'
import Form, {
  Button,
  ErrorMessage,
  FormField,
  GenericErrorMessage,
  Input,
  Label,
} from '@/components/form'
import { updateTalentAction } from '../../_actions'

interface Talent {
  id: string
  name: string
  youtube_channel: {
    name: string | null
    youtube_channel_id: string
  } | null
}

interface EditTalentFormProps {
  talent: Talent
}

export function EditTalentForm({ talent }: EditTalentFormProps) {
  const [isEditing, setIsEditing] = useState(false)

  const handleAction = async (
    currentState: FormState,
    formData: FormData,
  ): Promise<FormState> => {
    const result = await updateTalentAction(currentState, formData)

    // Exit edit mode if there are no errors
    if (!result.errors || Object.keys(result.errors).length === 0) {
      setIsEditing(false)
    }

    return result
  }

  if (!isEditing) {
    return (
      <div className="overflow-hidden bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900 text-lg leading-6">
                タレント情報
              </h3>
              <p className="mt-1 max-w-2xl text-gray-500 text-sm">
                現在データベースに保存されている情報
              </p>
            </div>
            <button
              className="rounded-md bg-secondary-blue px-4 py-2 text-secondary-blue-foreground hover:opacity-90"
              onClick={() => setIsEditing(true)}
              type="button"
            >
              編集
            </button>
          </div>
        </div>
        <div className="border-gray-200 border-t">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="font-medium text-gray-500 text-sm">タレント名</dt>
              <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                {talent.name}
                <p className="mt-1 text-gray-500 text-xs">
                  管理画面から編集可能な表示名
                </p>
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="font-medium text-gray-500 text-sm">
                YouTubeチャンネル名
              </dt>
              <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                {talent.youtube_channel?.name || 'N/A'}
                <p className="mt-1 text-gray-500 text-xs">
                  YouTube APIから自動更新される名前
                </p>
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="font-medium text-gray-500 text-sm">
                YouTubeチャンネルID
              </dt>
              <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                {talent.youtube_channel?.youtube_channel_id ? (
                  <code className="rounded bg-gray-100 px-2 py-1 font-mono text-xs">
                    {talent.youtube_channel.youtube_channel_id}
                  </code>
                ) : (
                  <span className="text-gray-500">未設定</span>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="font-medium text-gray-900 text-lg leading-6">
          タレント情報を編集
        </h3>
        <p className="mt-1 max-w-2xl text-gray-500 text-sm">
          タレント名とYouTubeチャンネルIDを編集できます
        </p>
      </div>
      <div className="border-gray-200 border-t px-4 py-5 sm:px-6">
        <Form action={handleAction} className="space-y-4">
          <input name="id" type="hidden" value={talent.id} />
          <FormField name="name">
            <Label className="mb-2 block font-medium text-sm">タレント名</Label>
            <Input
              className="w-full rounded-md border border-774-blue-300 px-3 py-2 focus:border-secondary-blue focus:outline-none"
              defaultValue={talent.name}
              placeholder="表示に使用される名前"
              required
            />
            <p className="mt-1 text-gray-500 text-xs">
              管理画面から編集可能な表示名（YouTube APIによる自動更新の対象外）
            </p>
            <ErrorMessage className="mt-1 text-red-600 text-sm" />
          </FormField>
          <FormField name="youtube_channel_id">
            <Label className="mb-2 block font-medium text-sm">
              YouTubeチャンネルID（任意）
            </Label>
            <Input
              className="w-full rounded-md border border-774-blue-300 px-3 py-2 focus:border-secondary-blue focus:outline-none"
              defaultValue={talent.youtube_channel?.youtube_channel_id ?? ''}
              placeholder="UCから始まるチャンネルID"
            />
            <p className="mt-1 text-gray-500 text-xs">
              YouTubeチャンネルと紐づける場合は入力してください
            </p>
            <ErrorMessage className="mt-1 text-red-600 text-sm" />
          </FormField>
          <GenericErrorMessage className="text-red-600 text-sm" />
          <div className="flex gap-2 pt-2">
            <button
              className="rounded-md border border-774-blue-300 px-4 py-2 hover:bg-gray-50"
              onClick={() => setIsEditing(false)}
              type="button"
            >
              キャンセル
            </button>
            <Button
              className="rounded-md bg-secondary-blue px-4 py-2 text-secondary-blue-foreground hover:opacity-90 disabled:opacity-50"
              type="submit"
            >
              保存
            </Button>
          </div>
        </Form>
      </div>
    </div>
  )
}
