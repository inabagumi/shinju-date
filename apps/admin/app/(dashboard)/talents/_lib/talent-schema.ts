import { Constants } from "@shinju-date/database";
import { parseTwitchUserIdentifier } from "@shinju-date/twitch-api-client";
import { parseYouTubeChannelIdentifier } from "@shinju-date/youtube-api-client";
import * as z from "zod";

import { uuidSchema } from "@/lib/schemas";

const TALENT_READING_MESSAGE =
  "読み仮名はひらがなと長音符（ー）で入力してください。";

/**
 * ひらがなと長音符（ー）だけからなる文字列。
 * `Script=Hiragana` には分解表現の濁点・半濁点（U+3099・U+309A）が含まれないため、
 * 検査の前に NFC 正規化しておく必要がある。
 */
const TALENT_READING_PATTERN = /^[\p{Script=Hiragana}ー]+$/u;

export const talentNameSchema = z
  .string({ message: "タレント名を入力してください。" })
  .trim()
  .min(1, "タレント名を入力してください。");

/**
 * タレントの読み仮名（`talents.reading`）。
 * NFC 正規化して前後の空白を取り除き、空欄は `null` にする。
 * 公開サイトのタレント一覧は、この値で五十音順に並べる。
 */
export const talentReadingSchema = z
  .string({ message: TALENT_READING_MESSAGE })
  .nullish()
  .transform((value) => {
    const reading = (value ?? "").normalize("NFC").trim();

    return reading === "" ? null : reading;
  })
  .refine(
    (reading) => reading === null || TALENT_READING_PATTERN.test(reading),
    { message: TALENT_READING_MESSAGE }
  );

const THEME_COLOR_MESSAGE =
  "カラーコードは#RRGGBB形式で入力してください（例: #FF5733）";

/**
 * タレントのテーマカラー（`talents.theme_color`）。`#RRGGBB` の形式で、空は `null` にする。
 */
export const talentThemeColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/u, { message: THEME_COLOR_MESSAGE })
  .nullable()
  .optional()
  .transform((value) => value || null);

interface AccountInputMessages {
  /** 入力を、ID・ハンドル・URL として解釈できない */
  invalid: string;
  /** 入力が空 */
  required: string;
}

/**
 * アカウントの入力（ID、ハンドル、URL など）のスキーマを作る。
 * 前後の空白を除いた、空でない文字列で、`parse` が解釈できるものだけを通す。
 */
const accountInputSchema = (
  parse: (input: string) => unknown,
  { invalid, required }: AccountInputMessages
) =>
  z
    .string({ message: required })
    .trim()
    // 空のときに、解釈できないことのエラーを重ねない
    .min(1, { abort: true, message: required })
    .refine((input) => parse(input) !== null, { message: invalid });

/**
 * YouTube のチャンネルの入力。チャンネル ID（UC...）、ハンドル（@name）、または URL。
 */
export const youtubeChannelInputSchema = accountInputSchema(
  parseYouTubeChannelIdentifier,
  {
    invalid:
      "有効なチャンネルID（UC...）、ハンドル（@name）、またはYouTube URLを入力してください。",
    required: "YouTubeチャンネルID、ハンドル、またはURLを入力してください。",
  }
);

/**
 * Twitch のユーザーの入力。ログイン名、ユーザー ID（数字）、または URL。
 */
export const twitchUserInputSchema = accountInputSchema(
  parseTwitchUserIdentifier,
  {
    invalid:
      "有効なログイン名、ユーザーID（数字）、またはTwitch URLを入力してください。",
    required: "Twitchのログイン名、ユーザーID、またはURLを入力してください。",
  }
);

/**
 * タレントの作成のフォーム。YouTube のチャンネルは任意で、空欄は `undefined` にする。
 */
export const createTalentSchema = z.object({
  name: talentNameSchema,
  reading: talentReadingSchema,
  youtube_channel_id: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    youtubeChannelInputSchema.optional()
  ),
});

/**
 * タレントの更新のフォーム。チャンネルは別の画面で結び付けるため含めず、
 * ID（隠しフィールド）とテーマカラーを加える。
 */
export const updateTalentSchema = createTalentSchema
  .omit({ youtube_channel_id: true })
  .extend({
    id: uuidSchema,
    theme_color: talentThemeColorSchema,
  });

/**
 * タレントに YouTube のチャンネルを結び付けるフォーム。
 * タレントの ID（隠しフィールド）が空のときは、結び付ける処理がエラーを返す。
 */
export const addYouTubeChannelSchema = z.object({
  talent_id: z.string().default(""),
  youtube_channel_id: youtubeChannelInputSchema,
});

/**
 * タレントに Twitch のユーザーを結び付けるフォーム。
 * タレントの ID（隠しフィールド）が空のときは、結び付ける処理がエラーを返す。
 */
export const addTwitchUserSchema = z.object({
  talent_id: z.string().default(""),
  twitch_user: twitchUserInputSchema,
});

/**
 * タレントの ID（削除・復活・引退・アクティブ化、同期、過去動画の取り込みの
 * アクションの引数）
 */
export { uuidSchema as talentIdSchema } from "@/lib/schemas";

/**
 * タレントに結び付いたアカウントの行の ID（`youtube_channels.id`、`twitch_users.id`。
 * 結び付きを外すアクションの引数）。YouTube のチャンネル ID や Twitch のユーザー ID
 * ではない
 */
export { uuidSchema as talentAccountIdSchema } from "@/lib/schemas";

/** 過去動画の取り込みのプラットフォーム（DB の enum `platform_type` の値） */
export const backfillProviderSchema = z.enum(
  Constants.public.Enums.platform_type
);
