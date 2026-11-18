import { describe, expect, expectTypeOf, it } from "vitest";

import { Constants } from "./index.js";
import type { Enums } from "./index.js";

describe("Constants.public.Enums", () => {
  it("exposes the values of platform_type at runtime", () => {
    expect(Constants.public.Enums.platform_type).toStrictEqual([
      "youtube",
      "twitch",
    ]);
  });
});

describe("Enums<T>", () => {
  it("matches the values in Constants", () => {
    expectTypeOf<Enums<"platform_type">>().toEqualTypeOf<
      (typeof Constants.public.Enums.platform_type)[number]
    >();
  });
});
