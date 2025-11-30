'use client'

import type { Tables } from '@shinju-date/database'
import {
  Card,
  CardContent,
  CardHeader,
  Button as UIButton,
} from '@shinju-date/ui'
import { useState } from 'react'
import type { FormState } from '@/components/form'
import Form, {
  ErrorMessage,
  FormField,
  GenericErrorMessage,
  Input,
  Label,
  SubmitButton,
} from '@/components/form'
import { updateTalentAction } from '../../_actions'

type Talent = Pick<Tables<'talents'>, 'id' | 'name' | 'theme_color'> & {
  youtube_channels: Pick<
    Tables<'youtube_channels'>,
    'id' | 'name' | 'youtube_channel_id' | 'youtube_handle'
  >[]
}

interface EditTalentFormProps {
  talent: Talent
}

function ColorInput({
  defaultValue,
  name,
}: {
  defaultValue: string | null
  name: string
}) {
  const [color, setColor] = useState(defaultValue ?? '#000000')

  return (
    <div className="flex items-center gap-2">
      <input
        className="size-10 cursor-pointer rounded border border-gray-300"
        onChange={(e) => setColor(e.target.value)}
        type="color"
        value={color}
      />
      <input
        className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-774-blue-500 focus:outline-none focus:ring-1 focus:ring-774-blue-500"
        name={name}
        onChange={(e) => setColor(e.target.value)}
        placeholder="#FF5733"
        type="text"
        value={color}
      />
    </div>
  )
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
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900 text-lg leading-6">
                タレント情報
              </h3>
              <p className="mt-1 max-w-2xl text-gray-500 text-sm">
                現在データベースに保存されている情報
              </p>
            </div>
            <UIButton
              onClick={() => setIsEditing(true)}
              type="button"
              variant="secondary-blue"
            >
              編集
            </UIButton>
          </div>
        </CardHeader>
        <CardContent className="p-0">
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
                テーマカラー
              </dt>
              <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                {talent.theme_color ? (
                  <div className="flex items-center gap-2">
                    <div
                      className="size-6 rounded border border-gray-300"
                      style={{ backgroundColor: talent.theme_color }}
                    />
                    <code className="font-mono text-xs">
                      {talent.theme_color}
                    </code>
                  </div>
                ) : (
                  <span className="text-gray-500">設定されていません</span>
                )}
                <p className="mt-1 text-gray-500 text-xs">
                  タレントのテーマカラー（#RRGGBB形式）
                </p>
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="font-medium text-gray-500 text-sm">
                YouTubeチャンネル
              </dt>
              <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                {talent.youtube_channels.length > 0 ? (
                  <div className="space-y-3">
                    {talent.youtube_channels.map((channel) => (
                      <div
                        className="rounded-md border border-gray-200 p-3"
                        key={channel.id}
                      >
                        <div className="space-y-2">
                          <div>
                            <span className="font-medium text-gray-700 text-xs">
                              チャンネル名:
                            </span>
                            <p className="mt-1">{channel.name || 'N/A'}</p>
                            <p className="mt-1 text-gray-500 text-xs">
                              YouTube APIから自動更新される名前
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700 text-xs">
                              チャンネルID:
                            </span>
                            <code className="mt-1 block rounded bg-gray-100 px-2 py-1 font-mono text-xs">
                              {channel.youtube_channel_id}
                            </code>
                          </div>
                          {channel.youtube_handle && (
                            <div>
                              <span className="font-medium text-gray-700 text-xs">
                                ハンドル:
                              </span>
                              <p className="mt-1 text-xs">
                                {channel.youtube_handle}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-500">
                    登録されているチャンネルがありません
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="elevated">
      <CardHeader>
        <h3 className="font-medium text-gray-900 text-lg leading-6">
          タレント情報を編集
        </h3>
        <p className="mt-1 max-w-2xl text-gray-500 text-sm">
          タレント名とテーマカラーを編集できます。
        </p>
      </CardHeader>
      <CardContent>
        <Form action={handleAction} className="space-y-4">
          <input name="id" type="hidden" value={talent.id} />
          <FormField name="name">
            <Label className="mb-2 block font-medium text-sm">タレント名</Label>
            <Input
              defaultValue={talent.name}
              placeholder="表示に使用される名前"
              required
            />
            <p className="mt-1 text-gray-500 text-xs">
              管理画面から編集可能な表示名（YouTube APIによる自動更新の対象外）
            </p>
            <ErrorMessage className="mt-1 text-red-600 text-sm" />
          </FormField>
          <FormField name="theme_color">
            <Label className="mb-2 block font-medium text-sm">
              テーマカラー
            </Label>
            <ColorInput defaultValue={talent.theme_color} name="theme_color" />
            <p className="mt-1 text-gray-500 text-xs">
              タレントのテーマカラー（#RRGGBB形式で指定してください）
            </p>
            <ErrorMessage className="mt-1 text-red-600 text-sm" />
          </FormField>
          <GenericErrorMessage className="text-red-600 text-sm" />
          <div className="flex gap-2 pt-2">
            <UIButton
              onClick={() => setIsEditing(false)}
              type="button"
              variant="secondary"
            >
              キャンセル
            </UIButton>
            <SubmitButton type="submit" variant="secondary-blue">
              保存
            </SubmitButton>
          </div>
        </Form>
      </CardContent>
    </Card>
  )
}
