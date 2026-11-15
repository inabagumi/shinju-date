export interface ParsedVideoTitle {
  /** タイトルの末尾に並んでいたハッシュタグ（`#` なし） */
  hashtags: string[]
  /** 【】の中身のうち、出演者の表記を除いたもの */
  labels: string[]
  /** 【】と、末尾に並んでいたハッシュタグを除いた残り */
  text: string
}

export interface ParseVideoTitleOptions {
  /** 【】の中の区切られた部分がこのどれかを含むとき、出演者の表記として除く（所属の名前） */
  creditKeywords?: readonly string[]
  /** 【】の中の区切られた部分がこのどれかと一致するとき、出演者の表記として除く（タレントの名前） */
  creditNames?: readonly string[]
}

const SPACE = String.raw`[\s]`
const TAG_NAME = String.raw`[\p{L}\p{M}\p{N}_〜～]`
const BRACKET = /[【〖]([^【】〖〗]*)[】〗]/g
// 直前が文字や数字のもの（`C#` など）はハッシュタグとして扱わない
const HASHTAG = new RegExp(`(?<![\\p{L}\\p{N}])[#＃](${TAG_NAME}+)`, 'gu')
// 末尾の並びの中のハッシュタグ。`#` だけのものも含む
const HASHTAG_IN_RUN = new RegExp(`[#＃](${TAG_NAME}*)`, 'gu')
const TRAILING_RUN = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:${SPACE}*[#＃]${TAG_NAME}*)+${SPACE}*$`,
  'u',
)
const HASHTAG_ONLY = new RegExp(`^[#＃](${TAG_NAME}+)$`, 'u')
const SPACES = new RegExp(`${SPACE}+`, 'gu')
const SEGMENT_SEPARATOR = /[/／￤┋┊|｜]/
const TRAILING_SEPARATORS = /[\s\-–—/／|｜]+$/
const EXCLUDED_HASHTAGS: ReadonlySet<string> = new Set([
  'short',
  'shorts',
  'vtuber',
  '新人vtuber',
])

function isNumber(name: string): boolean {
  return /^\p{N}+$/u.test(name)
}

function toHashtagKey(name: string): string {
  return name.normalize('NFKC').toLowerCase()
}

function toCreditKey(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s・]/g, '')
}

/**
 * 動画のタイトルを、本文・ラベル（【】と〖〗の中身）・末尾のハッシュタグに
 * 分ける。
 *
 * - 【】と〖〗は本文からすべて取り除き、中身をラベルにする。中身のうち、所属の
 *   名前を含む部分とタレントの名前と一致する部分（出演者の表記）は捨てる
 * - ハッシュタグは、タイトルの末尾に並ぶものだけを切り出す。先頭や文の途中の
 *   ものと、数字だけのもの（`#11` などの回数の表記）は本文に残す
 * - 本文が空になったときは、先頭のラベルを本文にする。ラベルもなければ、元の
 *   タイトルを本文にする
 */
export function parseVideoTitle(
  title: string,
  { creditKeywords = [], creditNames = [] }: ParseVideoTitleOptions = {},
): ParsedVideoTitle {
  const keywords = creditKeywords.map(toCreditKey).filter(Boolean)
  const names = new Set(
    [...creditKeywords, ...creditNames].map(toCreditKey).filter(Boolean),
  )
  const contents: string[] = []
  const trailingTags: string[] = []
  const labels: string[] = []

  let text = title.replace(BRACKET, (_match: string, content: string) => {
    contents.push(content)

    return ' '
  })

  // 末尾に並ぶハッシュタグだけを切り出す。数字だけのもの（`#11` などの
  // 回数の表記）は残す
  text = text.replace(TRAILING_RUN, (run) =>
    run.replace(HASHTAG_IN_RUN, (match: string, name: string) => {
      if (isNumber(name)) {
        return match
      }

      trailingTags.push(name)

      return ' '
    }),
  )
  text = text.replace(SPACES, ' ').trim()

  // ハッシュタグの前に置かれていた区切り（`タイトル - #タグ` の `-`）を除く
  if (trailingTags.length > 0) {
    text = text.replace(TRAILING_SEPARATORS, '')
  }

  for (const content of contents) {
    const label = content
      .split(SEGMENT_SEPARATOR)
      .map((segment) => segment.replace(SPACES, ' ').trim())
      .filter((segment) => {
        if (segment === '') {
          return false
        }

        const name = HASHTAG_ONLY.exec(segment)?.[1]

        // `#タレント名誕生日` のようなハッシュタグは、名前を含んでいても残す
        if (name) {
          return (
            !EXCLUDED_HASHTAGS.has(toHashtagKey(name)) &&
            !names.has(toCreditKey(name))
          )
        }

        const key = toCreditKey(segment)

        return (
          !names.has(key) && !keywords.some((keyword) => key.includes(keyword))
        )
      })
      .join(' / ')

    if (/[\p{L}\p{N}]/u.test(label)) {
      labels.push(label)
    }
  }

  // 本文やラベルに残っているハッシュタグは、重ねて出さない
  const seen = new Set<string>()

  for (const value of [text, ...labels]) {
    for (const [, name] of value.matchAll(HASHTAG)) {
      if (name) {
        seen.add(toHashtagKey(name))
      }
    }
  }

  const hashtags: string[] = []

  for (const name of trailingTags) {
    const key = toHashtagKey(name)

    if (
      key === '' ||
      seen.has(key) ||
      EXCLUDED_HASHTAGS.has(key) ||
      names.has(toCreditKey(name))
    ) {
      continue
    }

    seen.add(key)
    hashtags.push(name)
  }

  if (text !== '') {
    return { hashtags, labels, text }
  }

  const [firstLabel, ...restLabels] = labels

  if (firstLabel !== undefined) {
    return { hashtags, labels: restLabels, text: firstLabel }
  }

  return { hashtags: [], labels: [], text: title.replace(SPACES, ' ').trim() }
}
