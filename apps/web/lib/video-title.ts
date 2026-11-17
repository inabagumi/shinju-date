import { parseVideoTitle } from '@shinju-date/helpers'
import { TALENT_AFFILIATION_NAME } from './site'

/** ラベルとハッシュタグの行に出すハッシュタグの数 */
const MAX_HASHTAGS = 3

export interface VideoTitleParts {
  /** ラベルとハッシュタグの行に出す文字。内容がないときは空文字列 */
  tags: string
  /** タイトルに出す本文 */
  text: string
}

/**
 * タイトルを本文・ラベル・ハッシュタグに分け、本文と、ラベルとハッシュタグの
 * 行に出す文字を返す。行には先頭のラベル1つと、ハッシュタグを先頭から3つまで
 * （頭に `#`）を半角の空白で区切って並べる。動画カードと配信スケジュールの項目で
 * 使う。
 *
 * 【】の中の出演者の表記（所属の名前を含む部分と、タレントの名前）は出さない。
 */
export function getVideoTitleParts(
  title: string,
  talentName?: string | null | undefined,
): VideoTitleParts {
  const { hashtags, labels, text } = parseVideoTitle(title, {
    creditKeywords: [TALENT_AFFILIATION_NAME],
    creditNames: talentName ? [talentName] : [],
  })
  const tags = [
    ...labels.slice(0, 1),
    ...hashtags.slice(0, MAX_HASHTAGS).map((hashtag) => `#${hashtag}`),
  ].join(' ')

  return { tags, text }
}
