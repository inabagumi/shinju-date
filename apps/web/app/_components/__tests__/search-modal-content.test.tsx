import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { Talent } from '@/lib/fetchers'
import { SearchModalContent } from '../search-modal-content'

const URUHA: Talent = {
  id: '00000000-0000-4000-8000-000000000001',
  name: '一ノ瀬うるは',
}
const RISA: Talent = {
  id: '00000000-0000-4000-8000-000000000002',
  name: '英リサ',
}
const URURU: Talent = {
  id: '00000000-0000-4000-8000-000000000003',
  name: 'うるる',
}

const navigation = vi.hoisted(() => ({
  pathname: '/',
  push: vi.fn(),
  searchParams: new URLSearchParams(),
}))

const actions = vi.hoisted(() => ({
  fetchRecommendedQueries: vi.fn<() => Promise<string[]>>(),
  fetchSearchModalTalents: vi.fn<() => Promise<Talent[]>>(),
  fetchSuggestions: vi.fn<(query: string) => Promise<{ term: string }[]>>(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push }),
  useSearchParams: () => navigation.searchParams,
}))

vi.mock('@/app/_lib/actions', () => actions)

function getInput() {
  return screen.getByRole('searchbox')
}

function getChipList() {
  return screen.getByRole('list', { name: '選んでいるタレント' })
}

function getTalentSection() {
  return screen.getByRole('region', { name: 'タレント' })
}

async function renderContent() {
  const onClose = vi.fn()

  render(<SearchModalContent onClose={onClose} />)

  await waitFor(() =>
    expect(actions.fetchSearchModalTalents).toHaveBeenCalledTimes(1),
  )
  // おすすめの検索キーワードの読み込みが終わるまで待つ
  await screen.findByRole('link', { name: '歌枠' })

  return { onClose }
}

async function selectTalent(query: string, name: string) {
  fireEvent.change(getInput(), { target: { value: query } })
  fireEvent.click(
    await within(getTalentSection()).findByRole('button', { name }),
  )
}

function submit() {
  fireEvent.submit(getInput().closest('form') as HTMLFormElement)
}

describe('SearchModalContent', () => {
  beforeEach(() => {
    navigation.pathname = '/'
    navigation.push.mockReset()
    navigation.searchParams = new URLSearchParams()
    actions.fetchRecommendedQueries.mockReset().mockResolvedValue(['歌枠'])
    actions.fetchSearchModalTalents
      .mockReset()
      .mockResolvedValue([URUHA, RISA, URURU])
    actions.fetchSuggestions.mockReset().mockResolvedValue([])
  })

  test('should show the matching talents above the keyword suggestions', async () => {
    actions.fetchSuggestions.mockResolvedValue([{ term: 'うるは' }])

    await renderContent()

    fireEvent.change(getInput(), { target: { value: 'ウルハ' } })
    expect(screen.queryByRole('region', { name: 'タレント' })).toBeNull()

    fireEvent.change(getInput(), { target: { value: 'うる' } })

    const section = getTalentSection()
    expect(
      within(section)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['一ノ瀬うるは', 'うるる'])

    const suggestion = await screen.findByRole('link', { name: 'うるは' })
    expect(
      section.compareDocumentPosition(suggestion) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  test('should turn the selected talent into a chip and clear the input', async () => {
    await renderContent()

    await selectTalent('うるは', '一ノ瀬うるは')

    expect(within(getChipList()).getByText('一ノ瀬うるは')).toBeInTheDocument()
    expect(getInput()).toHaveValue('')
    expect(getInput()).toHaveFocus()

    // すでにチップになっているタレントは候補に出さない
    fireEvent.change(getInput(), { target: { value: 'うる' } })
    expect(
      within(getTalentSection())
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['うるる'])
  })

  test('should search the keyword within the selected talents', async () => {
    const { onClose } = await renderContent()

    await selectTalent('うるは', '一ノ瀬うるは')
    await selectTalent('リサ', '英リサ')

    fireEvent.change(getInput(), { target: { value: ' 歌枠 ' } })
    submit()

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(navigation.push).toHaveBeenCalledWith(
      `/videos/${encodeURIComponent('歌枠')}?talent=${URUHA.id}&talent=${RISA.id}`,
    )
  })

  test('should open the video list of the selected talents without a keyword', async () => {
    await renderContent()

    await selectTalent('うるは', '一ノ瀬うるは')

    expect(
      screen.getByText('Enterキーを押して、選んだタレントの動画を表示'),
    ).toBeInTheDocument()

    submit()

    expect(navigation.push).toHaveBeenCalledWith(`/videos?talent=${URUHA.id}`)
  })

  test('should keep the search without chips as before', async () => {
    const { onClose } = await renderContent()

    submit()
    expect(navigation.push).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.change(getInput(), { target: { value: 'test query' } })
    expect(
      await screen.findByText('Enterキーを押して「test query」を検索'),
    ).toBeInTheDocument()
    submit()

    expect(navigation.push).toHaveBeenCalledWith('/search?q=test%20query')
  })

  test('should remove the last chip with Backspace on an empty input', async () => {
    await renderContent()

    await selectTalent('うるは', '一ノ瀬うるは')
    await selectTalent('リサ', '英リサ')

    fireEvent.change(getInput(), { target: { value: 'a' } })
    fireEvent.keyDown(getInput(), { key: 'Backspace' })
    expect(within(getChipList()).getAllByRole('listitem')).toHaveLength(2)

    fireEvent.change(getInput(), { target: { value: '' } })
    fireEvent.keyDown(getInput(), { key: 'Backspace' })
    expect(within(getChipList()).getByText('一ノ瀬うるは')).toBeInTheDocument()
    expect(within(getChipList()).queryByText('英リサ')).toBeNull()

    fireEvent.keyDown(getInput(), { key: 'Backspace' })
    expect(
      screen.queryByRole('list', { name: '選んでいるタレント' }),
    ).toBeNull()
  })

  test('should remove a chip with its remove button', async () => {
    await renderContent()

    await selectTalent('うるは', '一ノ瀬うるは')
    await selectTalent('リサ', '英リサ')

    fireEvent.click(screen.getByRole('button', { name: '一ノ瀬うるはを外す' }))

    expect(within(getChipList()).queryByText('一ノ瀬うるは')).toBeNull()
    expect(within(getChipList()).getByText('英リサ')).toBeInTheDocument()
    expect(getInput()).toHaveFocus()
  })

  test('should carry the chips over to the keyword suggestions and recommended queries', async () => {
    actions.fetchSuggestions.mockResolvedValue([{ term: '歌枠' }])

    await renderContent()

    await selectTalent('うるは', '一ノ瀬うるは')

    expect(screen.getByRole('link', { name: '歌枠' })).toHaveAttribute(
      'href',
      `/videos/${encodeURIComponent('歌枠')}?talent=${URUHA.id}`,
    )

    fireEvent.change(getInput(), { target: { value: 'うた' } })

    expect(await screen.findByRole('link', { name: '歌枠' })).toHaveAttribute(
      'href',
      `/videos/${encodeURIComponent('歌枠')}?talent=${URUHA.id}`,
    )
  })

  test('should keep the links without chips as before', async () => {
    actions.fetchSuggestions.mockResolvedValue([{ term: '歌枠' }])

    await renderContent()

    expect(screen.getByRole('link', { name: '歌枠' })).toHaveAttribute(
      'href',
      `/videos/${encodeURIComponent('歌枠')}`,
    )

    fireEvent.change(getInput(), { target: { value: 'うた' } })

    expect(await screen.findByRole('link', { name: '歌枠' })).toHaveAttribute(
      'href',
      `/videos/${encodeURIComponent('歌枠')}`,
    )
  })

  test('should start with the chips of the talent filter on the video list', async () => {
    navigation.pathname = `/videos/${encodeURIComponent('歌枠')}`
    navigation.searchParams = new URLSearchParams([
      ['kind', 'short'],
      ['talent', RISA.id],
      ['talent', 'not-a-uuid'],
      ['talent', URUHA.id],
    ])

    await renderContent()

    expect(
      within(await screen.findByRole('list', { name: '選んでいるタレント' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['一ノ瀬うるは', '英リサ'])

    submit()

    // 種別は引き継がない
    expect(navigation.push).toHaveBeenCalledWith(
      `/videos?talent=${URUHA.id}&talent=${RISA.id}`,
    )
  })

  test('should not start with chips outside the video list', async () => {
    navigation.pathname = '/talents'
    navigation.searchParams = new URLSearchParams([['talent', URUHA.id]])

    await renderContent()

    expect(
      screen.queryByRole('list', { name: '選んでいるタレント' }),
    ).toBeNull()
  })

  test('should move between the talent and keyword suggestions with the arrow keys', async () => {
    actions.fetchSuggestions.mockResolvedValue([
      { term: 'うるは' },
      { term: 'うるう年' },
    ])

    await renderContent()

    fireEvent.change(getInput(), { target: { value: 'うる' } })
    await screen.findByRole('link', { name: 'うるう年' })

    const options = [
      screen.getByRole('button', { name: '一ノ瀬うるは' }),
      screen.getByRole('button', { name: 'うるる' }),
      screen.getByRole('link', { name: 'うるは' }),
      screen.getByRole('link', { name: 'うるう年' }),
    ]

    getInput().focus()
    fireEvent.keyDown(getInput(), { key: 'ArrowDown' })
    expect(options[0]).toHaveFocus()

    for (let index = 1; index < options.length; index++) {
      fireEvent.keyDown(document.activeElement as Element, {
        key: 'ArrowDown',
      })
      expect(options[index]).toHaveFocus()
    }

    // 最後の候補では止まる
    fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowDown' })
    expect(options.at(-1)).toHaveFocus()

    for (let index = options.length - 2; index >= 0; index--) {
      fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowUp' })
      expect(options[index]).toHaveFocus()
    }

    fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowUp' })
    expect(getInput()).toHaveFocus()
  })
})
