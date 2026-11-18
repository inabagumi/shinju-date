import { describe, expect, it } from "vitest";
import type * as z from "zod";

import {
  addTwitchUserSchema,
  addYouTubeChannelSchema,
  createTalentSchema,
  talentNameSchema,
  talentReadingSchema,
  talentThemeColorSchema,
  twitchUserInputSchema,
  updateTalentSchema,
  youtubeChannelInputSchema,
} from "./talent-schema";

const TALENT_ID = "123e4567-e89b-12d3-a456-426614174000";

const YOUTUBE_INPUT_INVALID =
  "有効なチャンネルID（UC...）、ハンドル（@name）、またはYouTube URLを入力してください。";
const YOUTUBE_INPUT_REQUIRED =
  "YouTubeチャンネルID、ハンドル、またはURLを入力してください。";
const TWITCH_INPUT_INVALID =
  "有効なログイン名、ユーザーID（数字）、またはTwitch URLを入力してください。";
const TWITCH_INPUT_REQUIRED =
  "Twitchのログイン名、ユーザーID、またはURLを入力してください。";

/** 検証のエラーを、項目ごとの文にまとめる */
function issuesByPath(error: z.ZodError | undefined) {
  return error?.issues.map(({ message, path }) => [path.join("."), message]);
}

describe("talentNameSchema.parse", () => {
  it("should accept a name without the surrounding spaces", () => {
    expect(talentNameSchema.parse("  Example Talent　")).toBe("Example Talent");
  });

  it.each([[""], ["   "], [undefined]])("should require %j", (input) => {
    const result = talentNameSchema.safeParse(input);

    expect(result.success).toBeFalsy();
    expect(result.error?.issues[0]?.message).toBe(
      "タレント名を入力してください。"
    );
  });
});

describe("talentReadingSchema.parse", () => {
  it.each([
    ["しんじゅ", "しんじゅ"],
    ["  しんじゅ　", "しんじゅ"],
    ["らーめん", "らーめん"],
    ["ゔぁいおれっと", "ゔぁいおれっと"],
  ])("should accept %j as %j", (input, expected) => {
    expect(talentReadingSchema.parse(input)).toBe(expected);
  });

  it.each([[""], ["   "], [null], [undefined]])(
    "should treat %j as null",
    (input) => {
      expect(talentReadingSchema.parse(input)).toBeNull();
    }
  );

  it("should save the decomposed and precomposed voiced sounds as the same value", () => {
    const precomposed = "がぱ";
    const decomposed = "がぱ";

    expect(decomposed).not.toBe(precomposed);
    expect(talentReadingSchema.parse(decomposed)).toBe(precomposed);
    expect(talentReadingSchema.parse(precomposed)).toBe(precomposed);
  });

  it.each([
    ["シンジュ"],
    ["ｼﾝｼﾞｭ"],
    ["真珠"],
    ["shinju"],
    ["しん じゅ"],
    ["しんじゅ!"],
    ["ｰ"],
    ["か゛"],
  ])("should reject %j", (input) => {
    const result = talentReadingSchema.safeParse(input);

    expect(result.success).toBeFalsy();
    expect(result.error?.issues[0]?.message).toBe(
      "読み仮名はひらがなと長音符（ー）で入力してください。"
    );
  });
});

describe("talentThemeColorSchema.parse", () => {
  it.each([
    ["#FF5733", "#FF5733"],
    ["#ff5733", "#ff5733"],
    [" #00aaFF ", "#00aaFF"],
  ])("should accept %j as %j", (input, expected) => {
    expect(talentThemeColorSchema.parse(input)).toBe(expected);
  });

  it.each([[null], [undefined]])("should treat %j as null", (input) => {
    expect(talentThemeColorSchema.parse(input)).toBeNull();
  });

  it.each([["FF5733"], ["#FF573"], ["#FF57333"], ["#GG5733"], ["red"], [""]])(
    "should reject %j",
    (input) => {
      const result = talentThemeColorSchema.safeParse(input);

      expect(result.success).toBeFalsy();
      expect(result.error?.issues[0]?.message).toBe(
        "カラーコードは#RRGGBB形式で入力してください（例: #FF5733）"
      );
    }
  );
});

describe.each([
  {
    inputs: [
      "UCabcdefghijklmnopqrstuv",
      "@example",
      "https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv",
      "https://www.youtube.com/@example",
    ],
    invalid: YOUTUBE_INPUT_INVALID,
    name: "youtubeChannelInputSchema",
    required: YOUTUBE_INPUT_REQUIRED,
    schema: youtubeChannelInputSchema,
  },
  {
    inputs: ["exampleuser", "141981764", "https://www.twitch.tv/exampleuser"],
    invalid: TWITCH_INPUT_INVALID,
    name: "twitchUserInputSchema",
    required: TWITCH_INPUT_REQUIRED,
    schema: twitchUserInputSchema,
  },
])("$name", ({ inputs, invalid, required, schema }) => {
  it.each(inputs)("should accept %j", (input) => {
    expect(schema.parse(input)).toBe(input);
  });

  it("should remove the surrounding spaces", () => {
    expect(schema.parse(`  ${inputs[0]}　`)).toBe(inputs[0]);
  });

  it.each([[""], ["   "], [undefined]])(
    "should require %j without reporting it as invalid",
    (input) => {
      const result = schema.safeParse(input);

      expect(result.error?.issues.map(({ message }) => message)).toStrictEqual([
        required,
      ]);
    }
  );

  it.each([["ab"], ["https://example.com/example"], ["not an account"]])(
    "should reject %j",
    (input) => {
      const result = schema.safeParse(input);

      expect(result.error?.issues.map(({ message }) => message)).toStrictEqual([
        invalid,
      ]);
    }
  );
});

describe("createTalentSchema.parse", () => {
  it("should accept a talent with a YouTube channel", () => {
    expect(
      createTalentSchema.parse({
        name: " New Talent ",
        reading: " しんじゅ ",
        youtube_channel_id: " @example ",
      })
    ).toStrictEqual({
      name: "New Talent",
      reading: "しんじゅ",
      youtube_channel_id: "@example",
    });
  });

  it.each([[""], ["   "], [undefined]])(
    "should treat the YouTube channel %j as not given",
    (input) => {
      expect(
        createTalentSchema.parse({
          name: "New Talent",
          youtube_channel_id: input,
        })
      ).toStrictEqual({
        name: "New Talent",
        reading: null,
        youtube_channel_id: undefined,
      });
    }
  );

  it("should report each invalid field", () => {
    const result = createTalentSchema.safeParse({
      name: "",
      reading: "シンジュ",
      youtube_channel_id: "ab",
    });

    expect(issuesByPath(result.error)).toStrictEqual([
      ["name", "タレント名を入力してください。"],
      ["reading", "読み仮名はひらがなと長音符（ー）で入力してください。"],
      ["youtube_channel_id", YOUTUBE_INPUT_INVALID],
    ]);
  });
});

describe("updateTalentSchema.parse", () => {
  it("should accept a talent with its ID and theme color", () => {
    expect(
      updateTalentSchema.parse({
        id: TALENT_ID,
        name: "Updated Talent",
        reading: "しんじゅ",
        theme_color: "#FF5733",
      })
    ).toStrictEqual({
      id: TALENT_ID,
      name: "Updated Talent",
      reading: "しんじゅ",
      theme_color: "#FF5733",
    });
  });

  it("should not include the YouTube channel", () => {
    expect(
      updateTalentSchema.parse({
        id: TALENT_ID,
        name: "Updated Talent",
        youtube_channel_id: "@example",
      })
    ).toStrictEqual({
      id: TALENT_ID,
      name: "Updated Talent",
      reading: null,
      theme_color: null,
    });
  });

  it("should report each invalid field", () => {
    const result = updateTalentSchema.safeParse({
      id: "not-a-uuid",
      name: "",
      reading: "shinju",
      theme_color: "red",
    });

    expect(issuesByPath(result.error)?.map(([path]) => path)).toStrictEqual([
      "name",
      "reading",
      "id",
      "theme_color",
    ]);
  });
});

describe.each([
  {
    field: "youtube_channel_id",
    input: "@example",
    name: "addYouTubeChannelSchema",
    required: YOUTUBE_INPUT_REQUIRED,
    schema: addYouTubeChannelSchema,
  },
  {
    field: "twitch_user",
    input: "exampleuser",
    name: "addTwitchUserSchema",
    required: TWITCH_INPUT_REQUIRED,
    schema: addTwitchUserSchema,
  },
])("$name", ({ field, input, required, schema }) => {
  it("should accept the talent ID and the input", () => {
    expect(
      schema.parse({ [field]: ` ${input} `, talent_id: TALENT_ID })
    ).toStrictEqual({ [field]: input, talent_id: TALENT_ID });
  });

  it("should leave a missing talent ID to the action", () => {
    expect(schema.parse({ [field]: input })).toStrictEqual({
      [field]: input,
      talent_id: "",
    });
  });

  it("should require the input", () => {
    const result = schema.safeParse({ talent_id: TALENT_ID });

    expect(issuesByPath(result.error)).toStrictEqual([[field, required]]);
  });
});
