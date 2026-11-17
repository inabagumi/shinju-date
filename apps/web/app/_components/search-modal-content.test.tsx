import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { Talent } from '@/lib/fetchers'
import { SearchModalContent } from './search-modal-content'

const MIO: Talent = {
  id: '00000000-0000-4000-8000-000000000001',
  name: '朝霧ミオ',
}
const YURA: Talent = {
  id: '00000000-0000-4000-8000-000000000002',
  name: '凪沢ユラ',
}
const MYOSOTIS: Talent = {
  id: '00000000-0000-4000-8000-000000000003',
  name: 'ミオソティス',
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

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
}

async function renderContent(queryClient = createQueryClient()) {
  const onClose = vi.fn()

  const { unmount } = render(
    <QueryClientProvider client={queryClient}>
      <SearchModalContent onClose={onClose} />
    </QueryClientProvider>,
  )

  await waitFor(() =>
    expect(actions.fetchSearchModalTalents).toHaveBeenCalledTimes(1),
  )
  // おすすめの検索キーワードの読み込みが終わるまで待つ
  await screen.findByRole('link', { name: '歌枠' })

  return { onClose, unmount }
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
      .mockResolvedValue([MIO, YURA, MYOSOTIS])
    actions.fetchSuggestions.mockReset().mockResolvedValue([])
  })

  test('should not refetch the recommended queries and talents when reopened', async () => {
    const queryClient = createQueryClient()

    const { unmount } = await renderContent(queryClient)
    unmount()

    // モーダルを閉じて開き直す
    await renderContent(queryClient)

    expect(actions.fetchRecommendedQueries).toHaveBeenCalledTimes(1)
    expect(actions.fetchSearchModalTalents).toHaveBeenCalledTimes(1)

    fireEvent.change(getInput(), { target: { value: '朝霧' } })
    expect(
      within(getTalentSection()).getByRole('button', { name: '朝霧ミオ' }),
    ).toBeInTheDocument()
  })

  test('should hide the recommended queries when they fail to load', async () => {
    actions.fetchRecommendedQueries.mockRejectedValue(new Error('failed'))

    render(
      <QueryClientProvider client={createQueryClient()}>
        <SearchModalContent onClose={vi.fn()} />
      </QueryClientProvider>,
    )

    expect(screen.getByText('おすすめの検索キーワード')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByText('おすすめの検索キーワード')).toBeNull(),
    )
  })

  test('should show the hint to search when the suggestions fail to load', async () => {
    actions.fetchSuggestions.mockRejectedValue(new Error('failed'))

    await renderContent()

    fireEvent.change(getInput(), { target: { value: 'test query' } })
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
    expect(
      await screen.findByText('Enterキーを押して「test query」を検索'),
    ).toBeInTheDocument()
  })

  test('should keep showing the previous suggestions while fetching the new ones', async () => {
    actions.fetchSuggestions.mockImplementation(async (query) => [
      { term: `${query} 歌枠` },
    ])

    await renderContent()

    fireEvent.change(getInput(), { target: { value: 'ミオ' } })
    await screen.findByRole('link', { name: 'ミオ 歌枠' })

    fireEvent.change(getInput(), { target: { value: 'ミオソ' } })
    expect(screen.getByRole('link', { name: 'ミオ 歌枠' })).toBeInTheDocument()
    expect(
      await screen.findByRole('link', { name: 'ミオソ 歌枠' }),
    ).toBeInTheDocument()
  })

  test('should show the matching talents above the keyword suggestions', async () => {
    actions.fetchSuggestions.mockResolvedValue([{ term: 'ミオ' }])

    await renderContent()

    fireEvent.change(getInput(), { target: { value: 'みお' } })
    expect(screen.queryByRole('region', { name: 'タレント' })).toBeNull()

    fireEvent.change(getInput(), { target: { value: 'ミオ' } })

    const section = getTalentSection()
    expect(
      within(section)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['朝霧ミオ', 'ミオソティス'])

    const suggestion = await screen.findByRole('link', { name: 'ミオ' })
    expect(
      section.compareDocumentPosition(suggestion) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  test('should turn the selected talent into a chip and clear the input', async () => {
    await renderContent()

    await selectTalent('朝霧', '朝霧ミオ')

    expect(within(getChipList()).getByText('朝霧ミオ')).toBeInTheDocument()
    expect(getInput()).toHaveValue('')
    expect(getInput()).toHaveFocus()

    // すでにチップになっているタレントは候補に出さない
    fireEvent.change(getInput(), { target: { value: 'ミオ' } })
    expect(
      within(getTalentSection())
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['ミオソティス'])
  })

  test('should search the keyword within the selected talents', async () => {
    const { onClose } = await renderContent()

    await selectTalent('朝霧', '朝霧ミオ')
    await selectTalent('ユラ', '凪沢ユラ')

    fireEvent.change(getInput(), { target: { value: ' 歌枠 ' } })
    submit()

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(navigation.push).toHaveBeenCalledWith(
      `/videos/${encodeURIComponent('歌枠')}?talent=${MIO.id}&talent=${YURA.id}`,
    )
  })

  test('should open the video list of the selected talents without a keyword', async () => {
    await renderContent()

    await selectTalent('朝霧', '朝霧ミオ')

    expect(
      screen.getByText('Enterキーを押して、選んだタレントの動画を表示'),
    ).toBeInTheDocument()

    submit()

    expect(navigation.push).toHaveBeenCalledWith(`/videos?talent=${MIO.id}`)
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

    expect(navigation.push).toHaveBeenCalledWith(
      `/videos/${encodeURIComponent('test query')}`,
    )
  })

  test('should remove the last chip with Backspace on an empty input', async () => {
    await renderContent()

    await selectTalent('朝霧', '朝霧ミオ')
    await selectTalent('ユラ', '凪沢ユラ')

    fireEvent.change(getInput(), { target: { value: 'a' } })
    fireEvent.keyDown(getInput(), { key: 'Backspace' })
    expect(within(getChipList()).getAllByRole('listitem')).toHaveLength(2)

    fireEvent.change(getInput(), { target: { value: '' } })
    fireEvent.keyDown(getInput(), { key: 'Backspace' })
    expect(within(getChipList()).getByText('朝霧ミオ')).toBeInTheDocument()
    expect(within(getChipList()).queryByText('凪沢ユラ')).toBeNull()

    fireEvent.keyDown(getInput(), { key: 'Backspace' })
    expect(
      screen.queryByRole('list', { name: '選んでいるタレント' }),
    ).toBeNull()
  })

  test('should remove a chip with its remove button', async () => {
    await renderContent()

    await selectTalent('朝霧', '朝霧ミオ')
    await selectTalent('ユラ', '凪沢ユラ')

    fireEvent.click(screen.getByRole('button', { name: '朝霧ミオを外す' }))

    expect(within(getChipList()).queryByText('朝霧ミオ')).toBeNull()
    expect(within(getChipList()).getByText('凪沢ユラ')).toBeInTheDocument()
    expect(getInput()).toHaveFocus()
  })

  test('should carry the chips over to the keyword suggestions and recommended queries', async () => {
    actions.fetchSuggestions.mockResolvedValue([{ term: '歌枠' }])

    await renderContent()

    await selectTalent('朝霧', '朝霧ミオ')

    expect(screen.getByRole('link', { name: '歌枠' })).toHaveAttribute(
      'href',
      `/videos/${encodeURIComponent('歌枠')}?talent=${MIO.id}`,
    )

    fireEvent.change(getInput(), { target: { value: 'うた' } })

    expect(await screen.findByRole('link', { name: '歌枠' })).toHaveAttribute(
      'href',
      `/videos/${encodeURIComponent('歌枠')}?talent=${MIO.id}`,
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
      ['talent', YURA.id],
      ['talent', 'not-a-uuid'],
      ['talent', MIO.id],
    ])

    await renderContent()

    expect(
      within(await screen.findByRole('list', { name: '選んでいるタレント' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['朝霧ミオ', '凪沢ユラ'])

    submit()

    // 種別は引き継がない
    expect(navigation.push).toHaveBeenCalledWith(
      `/videos?talent=${MIO.id}&talent=${YURA.id}`,
    )
  })

  test('should not start with chips outside the video list', async () => {
    navigation.pathname = '/talents'
    navigation.searchParams = new URLSearchParams([['talent', MIO.id]])

    await renderContent()

    expect(
      screen.queryByRole('list', { name: '選んでいるタレント' }),
    ).toBeNull()
  })

  test('should move between the talent and keyword suggestions with the arrow keys', async () => {
    actions.fetchSuggestions.mockResolvedValue([
      { term: 'ミオ' },
      { term: 'ミオ 歌枠' },
    ])

    await renderContent()

    fireEvent.change(getInput(), { target: { value: 'ミオ' } })
    await screen.findByRole('link', { name: 'ミオ 歌枠' })

    const options = [
      screen.getByRole('button', { name: '朝霧ミオ' }),
      screen.getByRole('button', { name: 'ミオソティス' }),
      screen.getByRole('link', { name: 'ミオ' }),
      screen.getByRole('link', { name: 'ミオ 歌枠' }),
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
