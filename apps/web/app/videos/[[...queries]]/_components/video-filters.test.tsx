import type { MultiSelectOption } from '@shinju-date/ui'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { Talent } from '@/lib/data/talents'
import VideoFilters from './video-filters'

const push = vi.hoisted(() => vi.fn())

interface MockMultiSelectProps {
  onChange: (value: string[]) => void
  options: MultiSelectOption[]
  placeholder: string
  value: string[]
}

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('@shinju-date/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@shinju-date/ui')>()),
  MultiSelect: ({
    onChange,
    options,
    placeholder,
    value,
  }: MockMultiSelectProps) => (
    <fieldset>
      <legend>{placeholder}</legend>
      {options.map((option) => (
        <label key={option.value}>
          <input
            checked={value.includes(option.value)}
            onChange={() =>
              onChange(
                value.includes(option.value)
                  ? value.filter((id) => id !== option.value)
                  : [...value, option.value],
              )
            }
            type="checkbox"
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  ),
}))

const TALENTS: Talent[] = [
  { id: 'c3a1b2d4-5e6f-4a7b-8c9d-0e1f2a3b4c03', name: '朝霧ミオ' },
  { id: '0f6b7c84-1a1e-4b4e-9d3a-5c7a0c1e2f01', name: '白露ネネ' },
  { id: '7d2e4b1a-3c5f-4e6a-8b9c-0d1e2f3a4b02', name: '凪沢ユラ' },
]
const [TALENT_A, TALENT_B, TALENT_C] = TALENTS as [Talent, Talent, Talent]

describe('VideoFilters', () => {
  beforeEach(() => {
    push.mockClear()
  })

  test('should show every talent as an option', () => {
    render(
      <VideoFilters
        kind="all"
        query=""
        selectedTalents={[]}
        talents={TALENTS}
      />,
    )

    const group = screen.getByRole('group', { name: 'タレント' })

    expect(
      within(group)
        .getAllByRole('checkbox')
        .map((checkbox) => checkbox.parentElement?.textContent),
    ).toEqual(['朝霧ミオ', '白露ネネ', '凪沢ユラ'])
    expect(
      screen.queryByRole('list', { name: '選んでいるタレント' }),
    ).not.toBeInTheDocument()
  })

  test('should move to the videos of the selected talents', () => {
    render(
      <VideoFilters
        kind="short"
        query="歌"
        selectedTalents={[TALENT_A]}
        talents={TALENTS}
      />,
    )

    fireEvent.click(screen.getByRole('checkbox', { name: '白露ネネ' }))

    expect(push).toHaveBeenCalledWith(
      `/videos/${encodeURIComponent('歌')}?kind=short&talent=${TALENT_B.id}&talent=${TALENT_A.id}`,
      { scroll: false },
    )
  })

  test('should keep the selected talents when switching the kind', () => {
    render(
      <VideoFilters
        kind="all"
        query=""
        selectedTalents={[TALENT_A]}
        talents={TALENTS}
      />,
    )

    const nav = screen.getByRole('navigation', { name: '種別' })

    expect(within(nav).getByRole('link', { name: 'ショート' })).toHaveAttribute(
      'href',
      `/videos?kind=short&talent=${TALENT_A.id}`,
    )
    expect(within(nav).getByRole('link', { name: 'すべて' })).toHaveAttribute(
      'href',
      `/videos?talent=${TALENT_A.id}`,
    )
  })

  test('should show a chip that removes the selected talent', () => {
    render(
      <VideoFilters
        kind="standard"
        query=""
        selectedTalents={[TALENT_A]}
        talents={TALENTS}
      />,
    )

    const list = screen.getByRole('list', { name: '選んでいるタレント' })

    expect(
      within(list).getByRole('link', { name: '朝霧ミオを外す' }),
    ).toHaveAttribute('href', '/videos?kind=standard')
    expect(
      within(list).queryByRole('link', { name: '絞り込みを解除' }),
    ).not.toBeInTheDocument()
  })

  test('should show a link to clear two or more talents', () => {
    render(
      <VideoFilters
        kind="all"
        query="歌"
        selectedTalents={[TALENT_A, TALENT_C]}
        talents={TALENTS}
      />,
    )

    const list = screen.getByRole('list', { name: '選んでいるタレント' })

    expect(
      within(list).getByRole('link', { name: '朝霧ミオを外す' }),
    ).toHaveAttribute(
      'href',
      `/videos/${encodeURIComponent('歌')}?talent=${TALENT_C.id}`,
    )
    expect(
      within(list).getByRole('link', { name: '凪沢ユラを外す' }),
    ).toHaveAttribute(
      'href',
      `/videos/${encodeURIComponent('歌')}?talent=${TALENT_A.id}`,
    )
    expect(
      within(list).getByRole('link', { name: '絞り込みを解除' }),
    ).toHaveAttribute('href', `/videos/${encodeURIComponent('歌')}`)
  })

  test('should link to the calendar of the selected talents and kind', () => {
    render(
      <VideoFilters
        kind="standard"
        query=""
        selectedTalents={[TALENT_C, TALENT_A]}
        talents={TALENTS}
      />,
    )

    expect(
      screen.getByRole('link', { name: 'カレンダーに登録' }),
    ).toHaveAttribute(
      'href',
      `/videos.ics?kind=standard&talent=${TALENT_C.id}&talent=${TALENT_A.id}`,
    )
  })

  test('should link to the calendar of every video without filters', () => {
    render(
      <VideoFilters
        kind="all"
        query=""
        selectedTalents={[]}
        talents={TALENTS}
      />,
    )

    expect(
      screen.getByRole('link', { name: 'カレンダーに登録' }),
    ).toHaveAttribute('href', '/videos.ics')
  })

  test('should not link to the calendar for the search results', () => {
    render(
      <VideoFilters
        kind="all"
        query="歌"
        selectedTalents={[TALENT_A]}
        talents={TALENTS}
      />,
    )

    expect(
      screen.queryByRole('link', { name: 'カレンダーに登録' }),
    ).not.toBeInTheDocument()
  })
})
