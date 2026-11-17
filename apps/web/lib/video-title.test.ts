import { describe, expect, test } from 'vitest'
import { TALENT_AFFILIATION_NAME } from './site'
import {
  getVideoTitleParts,
  type ParsedVideoTitle,
  parseVideoTitle,
} from './video-title'

const cases: [title: string, talentName: string, expected: ParsedVideoTitle][] =
  [
    [
      '【雀魂】指示厨が泡吹いて倒れない麻雀【柚原いづみ / ななしいんく】',
      '柚原いづみ',
      {
        hashtags: [],
        labels: ['雀魂'],
        text: '指示厨が泡吹いて倒れない麻雀',
      },
    ],
    [
      '【ARK: Survival Evolved】#天下無双ARK 最終日！【柚原いづみ / ななしいんく】',
      '柚原いづみ',
      {
        hashtags: [],
        labels: ['ARK: Survival Evolved'],
        text: '#天下無双ARK 最終日！',
      },
    ],
    [
      '【 勝利の女神：NIKKE 】完全初見🔰メインストーリー 23~24章「牢屋・追放」#11【漆瀬レイ / ななしいんく】',
      '漆瀬レイ',
      {
        hashtags: [],
        labels: ['勝利の女神：NIKKE'],
        text: '完全初見🔰メインストーリー 23~24章「牢屋・追放」#11',
      },
    ],
    [
      '#1【星のカービィスーパーデラックス】完全初見❕ずっとやりたかった神ゲー【#新人Vtuber/緑青くれは】',
      '緑青くれは',
      {
        hashtags: [],
        labels: ['星のカービィスーパーデラックス'],
        text: '#1 完全初見❕ずっとやりたかった神ゲー',
      },
    ],
    [
      '【 #踊ってみた 】Magic / 3SKM【 蛇宵ティア / ななしいんく 】#shorts #3skm #magic',
      '蛇宵ティア',
      {
        hashtags: ['3skm', 'magic'],
        labels: ['#踊ってみた'],
        text: 'Magic / 3SKM',
      },
    ],
    [
      '【Minecraft】最終日！後悔の無いように、下山します！！！！ #マイクラ肝試し2026  #にこぷい #566【島村シャルロット / ななしいんく】',
      '島村シャルロット',
      {
        hashtags: ['マイクラ肝試し2026', 'にこぷい'],
        labels: ['Minecraft'],
        text: '最終日！後悔の無いように、下山します！！！！ #566',
      },
    ],
    [
      '☾ ໋ #4〖 新発売 〗深夜チルで時オカリメイクです .ᐟ.ᐟ🌳#ゼルダの伝説時のオカリナ〖 天羽衣┊ななしいんく 〗',
      '天羽衣',
      {
        hashtags: ['ゼルダの伝説時のオカリナ'],
        labels: ['新発売'],
        text: '☾ ໋ #4 深夜チルで時オカリメイクです .ᐟ.ᐟ🌳',
      },
    ],
    [
      '圧倒的好評97%!!実力派鬱ゲー   -#MOLE【ななしいんく/アズリ】',
      'アズリ',
      {
        hashtags: ['MOLE'],
        labels: [],
        text: '圧倒的好評97%!!実力派鬱ゲー',
      },
    ],
    [
      '[ENG SUB]#22 この中に痔の人がいます。【ELDEN RING / アズリAzri】',
      'アズリ',
      {
        hashtags: [],
        labels: ['ELDEN RING / アズリAzri'],
        text: '[ENG SUB]#22 この中に痔の人がいます。',
      },
    ],
    [
      '【裏側公開⁉️】RIΣMの自己紹介動画、実は5人で #nizima ACTION!! で編集してました！【アズリ/緑青くれは/ななしいんく】',
      'アズリ',
      {
        hashtags: [],
        labels: ['裏側公開⁉️', '緑青くれは'],
        text: 'RIΣMの自己紹介動画、実は5人で #nizima ACTION!! で編集してました！',
      },
    ],
    [
      '中指で意思疎通【BOMBANANA!】【杏戸ゆげ/花奏かのん/季咲あんこ】#ななしいんく #shorts',
      'ななしいんく公式',
      {
        hashtags: [],
        labels: ['BOMBANANA!', '杏戸ゆげ / 花奏かのん / 季咲あんこ'],
        text: '中指で意思疎通',
      },
    ],
    [
      'YMCAになるポポティア #shorts #家入ポポ #蛇宵ティア #ymcaダンス',
      '家入ポポ',
      {
        hashtags: ['蛇宵ティア', 'ymcaダンス'],
        labels: [],
        text: 'YMCAになるポポティア',
      },
    ],
    [
      '儚すぎる命 #vtuber #新人vtuber # #ゲーム実況 #切り抜き #shorts',
      '緑青くれは',
      {
        hashtags: ['ゲーム実況', '切り抜き'],
        labels: [],
        text: '儚すぎる命',
      },
    ],
    [
      '#ストグラseason2 出勤します #ストグラSeason2',
      '柚原いづみ',
      {
        hashtags: [],
        labels: [],
        text: '#ストグラseason2 出勤します',
      },
    ],
    [
      '【#ストグラ】※閲覧注意 #ストグラSeason2 柚乃いずみの日常～183日目～【柚原いづみ / ななしいんく】',
      '柚原いづみ',
      {
        hashtags: [],
        labels: ['#ストグラ'],
        text: '※閲覧注意 #ストグラSeason2 柚乃いずみの日常～183日目～',
      },
    ],
    [
      'ちょっと変わった魚の釣り方しりたい？ - #howtofish 【ななしいんく/ アズリ ＆ 白妙ときさん】',
      'アズリ',
      {
        hashtags: ['howtofish'],
        labels: ['アズリ ＆ 白妙ときさん'],
        text: 'ちょっと変わった魚の釣り方しりたい？',
      },
    ],
    [
      '【 Minecraft 】マ。-建築は運動らしい-【 堰代ミコ / ななしいんく 】',
      '堰代ミコ',
      {
        hashtags: [],
        labels: ['Minecraft'],
        text: 'マ。-建築は運動らしい-',
      },
    ],
    [
      'SURGE Town┊︎#7 わるいやつをつかまえる！',
      '飛良ひかり',
      {
        hashtags: [],
        labels: [],
        text: 'SURGE Town┊︎#7 わるいやつをつかまえる！',
      },
    ],
    [
      '【 👑💫 】「 Starlight Tribute 」グッズ販売中～～🌸！【 季咲あんこ / ななしいんく 】',
      '季咲あんこ',
      {
        hashtags: [],
        labels: [],
        text: '「 Starlight Tribute 」グッズ販売中～～🌸！',
      },
    ],
    [
      '【#漆瀬レイ誕生日2026】告知あり!! お誕生日カウントダウン🎉✨【漆瀬レイ / ななしいんく】',
      '漆瀬レイ',
      {
        hashtags: [],
        labels: ['#漆瀬レイ誕生日2026'],
        text: '告知あり!! お誕生日カウントダウン🎉✨',
      },
    ],
    [
      '【 歌枠 】今日も歌います【幽音しの:ななしいんく】',
      '幽音しの',
      {
        hashtags: [],
        labels: ['歌枠'],
        text: '今日も歌います',
      },
    ],
    [
      '【雀魂】【柚原いづみ / ななしいんく】',
      '柚原いづみ',
      {
        hashtags: [],
        labels: [],
        text: '雀魂',
      },
    ],
    [
      '【 #踊ってみた 】【 蛇宵ティア / ななしいんく 】#shorts',
      '蛇宵ティア',
      {
        hashtags: [],
        labels: [],
        text: '#踊ってみた',
      },
    ],
    [
      '#SURGETown',
      '飛良ひかり',
      {
        hashtags: [],
        labels: [],
        text: '#SURGETown',
      },
    ],
    [
      'Phasmophobia',
      '飛良ひかり',
      {
        hashtags: [],
        labels: [],
        text: 'Phasmophobia',
      },
    ],
  ]

describe('parseVideoTitle', () => {
  test.each(cases)('should parse %s', (title, talentName, expected) => {
    expect(
      parseVideoTitle(title, {
        creditKeywords: [TALENT_AFFILIATION_NAME],
        creditNames: [talentName],
      }),
    ).toEqual(expected)
  })

  test('should keep the credits in the labels without the options', () => {
    expect(
      parseVideoTitle(
        '【雀魂】指示厨が泡吹いて倒れない麻雀【柚原いづみ / ななしいんく】',
      ),
    ).toEqual({
      hashtags: [],
      labels: ['雀魂', '柚原いづみ / ななしいんく'],
      text: '指示厨が泡吹いて倒れない麻雀',
    })
  })

  test.each([
    ['#Minecraft #11', { hashtags: [], labels: [], text: '#Minecraft #11' }],
    [
      '＃Minecraft  ＃11 ＃12',
      { hashtags: [], labels: [], text: '＃Minecraft ＃11 ＃12' },
    ],
    [
      '【雑談】#Minecraft #11【柚原いづみ / ななしいんく】',
      { hashtags: [], labels: ['雑談'], text: '#Minecraft #11' },
    ],
    ['#Minecraft #ARK', { hashtags: [], labels: [], text: '#Minecraft #ARK' }],
  ])('should keep %s made only of hashtags in the text', (title, expected) => {
    expect(
      parseVideoTitle(title, {
        creditKeywords: [TALENT_AFFILIATION_NAME],
        creditNames: ['柚原いづみ'],
      }),
    ).toEqual(expected)
  })

  test('should not treat `#` after a letter as a hashtag', () => {
    expect(parseVideoTitle('C# で作るゲーム C#')).toEqual({
      hashtags: [],
      labels: [],
      text: 'C# で作るゲーム C#',
    })
  })
})

describe('getVideoTitleParts', () => {
  test('should put the first label and up to three hashtags in the tags', () => {
    expect(
      getVideoTitleParts(
        '【Minecraft】【雑談】夜の肝試し #マイクラ肝試し2026 #a #b #c',
      ),
    ).toEqual({
      tags: 'Minecraft #マイクラ肝試し2026 #a #b',
      text: '夜の肝試し',
    })
  })

  test('should leave the tags empty without labels and hashtags', () => {
    expect(getVideoTitleParts('今日も歌います')).toEqual({
      tags: '',
      text: '今日も歌います',
    })
  })

  test('should drop the credits of the talent and the affiliation', () => {
    expect(
      getVideoTitleParts(
        `【歌枠】今日も歌います【朝霧ミオ / ${TALENT_AFFILIATION_NAME}】`,
        '朝霧ミオ',
      ),
    ).toEqual({ tags: '歌枠', text: '今日も歌います' })
  })

  test('should keep the name of a talent without the talent', () => {
    expect(getVideoTitleParts('【朝霧ミオ】今日も歌います', null)).toEqual({
      tags: '朝霧ミオ',
      text: '今日も歌います',
    })
  })
})
