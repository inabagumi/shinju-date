'use client'

import type { Tables } from '@shinju-date/database'
import { Button as UIButton, Input as UIInput } from '@shinju-date/ui'
import { useId, useState } from 'react'
import type { FormState } from '@/components/form'
import Form, {
  ErrorMessage,
  FormField,
  Input,
  Label,
  SubmitButton,
} from '@/components/form'
import { DetailList, DetailRow, Panel } from '@/components/panel'
import { updateTalentAction } from '../../_actions'
import {
  TALENT_READING_DESCRIPTION,
  TALENT_READING_PLACEHOLDER,
} from '../../_lib/talent-reading-description'

type Talent = Pick<
  Tables<'talents'>,
  'id' | 'name' | 'reading' | 'theme_color'
> & {
  youtube_channels: Pick<
    Tables<'youtube_channels'>,
    'id' | 'name' | 'youtube_channel_id' | 'youtube_handle'
  >[]
}

interface EditTalentFormProps {
  talent: Talent
}

interface ColorInputProps {
  defaultValue: string | null
  id?: string
  name: string
}

function ColorInput({ defaultValue, id, name }: ColorInputProps) {
  const [color, setColor] = useState(defaultValue ?? '#000000')

  return (
    <div className="flex items-center gap-2">
      <input
        aria-label="色を選ぶ"
        className="h-10 w-12 shrink-0 cursor-pointer rounded-control border border-border bg-surface p-1"
        onChange={(e) => setColor(e.target.value)}
        type="color"
        value={color}
      />
      <UIInput
        className="flex-1 font-mono"
        id={id}
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
  const themeColorId = useId()

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
      <Panel
        actions={
          <UIButton
            onClick={() => setIsEditing(true)}
            type="button"
            variant="secondary"
          >
            編集
          </UIButton>
        }
        description="現在データベースに保存されている情報"
        title="タレント情報"
      >
        <DetailList>
          <DetailRow label="タレント名">
            {talent.name}
            <p className="mt-1 text-caption text-muted">
              管理画面から編集可能な表示名
            </p>
          </DetailRow>
          <DetailRow label="読み仮名">
            {talent.reading ?? (
              <span className="text-muted">設定されていません</span>
            )}
            <p className="mt-1 text-caption text-muted">
              {TALENT_READING_DESCRIPTION}
            </p>
          </DetailRow>
          <DetailRow label="テーマカラー">
            {talent.theme_color ? (
              <div className="flex items-center gap-2">
                <div
                  className="size-6 rounded-control border border-border"
                  style={{ backgroundColor: talent.theme_color }}
                />
                <code className="font-mono text-caption">
                  {talent.theme_color}
                </code>
              </div>
            ) : (
              <span className="text-muted">設定されていません</span>
            )}
            <p className="mt-1 text-caption text-muted">
              タレントのテーマカラー（#RRGGBB形式）
            </p>
          </DetailRow>
          <DetailRow label="YouTubeチャンネル">
            {talent.youtube_channels.length > 0 ? (
              <div className="space-y-3">
                {talent.youtube_channels.map((channel) => (
                  <dl
                    className="space-y-2 rounded-container border border-border p-3"
                    key={channel.id}
                  >
                    <div>
                      <dt className="text-caption font-semibold text-muted">
                        チャンネル名
                      </dt>
                      <dd className="mt-1">{channel.name || 'N/A'}</dd>
                      <dd className="mt-1 text-caption text-muted">
                        YouTube APIから自動更新される名前
                      </dd>
                    </div>
                    <div>
                      <dt className="text-caption font-semibold text-muted">
                        チャンネルID
                      </dt>
                      <dd className="mt-1">
                        <code className="block rounded-control bg-muted px-2 py-1 font-mono text-caption break-all">
                          {channel.youtube_channel_id}
                        </code>
                      </dd>
                    </div>
                    {channel.youtube_handle && (
                      <div>
                        <dt className="text-caption font-semibold text-muted">
                          ハンドル
                        </dt>
                        <dd className="mt-1 text-caption">
                          {channel.youtube_handle}
                        </dd>
                      </div>
                    )}
                  </dl>
                ))}
              </div>
            ) : (
              <span className="text-muted">
                登録されているチャンネルがありません
              </span>
            )}
          </DetailRow>
        </DetailList>
      </Panel>
    )
  }

  return (
    <Panel
      description="タレント名・読み仮名・テーマカラーを編集できます。"
      title="タレント情報を編集"
    >
      <Form action={handleAction} className="max-w-xl space-y-4">
        <input name="id" type="hidden" value={talent.id} />
        <FormField name="name">
          <Label>タレント名</Label>
          <Input
            defaultValue={talent.name}
            placeholder="表示に使用される名前"
            required
          />
          <p className="mt-1 text-caption text-muted">
            管理画面から編集可能な表示名（YouTube APIによる自動更新の対象外）
          </p>
          <ErrorMessage />
        </FormField>
        <FormField name="reading">
          <Label>読み仮名（任意）</Label>
          <Input
            defaultValue={talent.reading ?? ''}
            placeholder={TALENT_READING_PLACEHOLDER}
          />
          <p className="mt-1 text-caption text-muted">
            {TALENT_READING_DESCRIPTION}
          </p>
          <ErrorMessage />
        </FormField>
        <FormField name="theme_color">
          <Label htmlFor={themeColorId}>テーマカラー</Label>
          <ColorInput
            defaultValue={talent.theme_color}
            id={themeColorId}
            name="theme_color"
          />
          <p className="mt-1 text-caption text-muted">
            タレントのテーマカラー（#RRGGBB形式で指定してください）
          </p>
          <ErrorMessage />
        </FormField>
        <div className="flex gap-2 pt-2">
          <UIButton
            onClick={() => setIsEditing(false)}
            type="button"
            variant="secondary"
          >
            キャンセル
          </UIButton>
          <SubmitButton>保存</SubmitButton>
        </div>
      </Form>
    </Panel>
  )
}
