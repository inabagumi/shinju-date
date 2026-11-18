import { describe, expect, expectTypeOf, it } from "vitest";

import { Constants, type Enums } from "./index.js";

describe("Constants", () => {
  it("exposes the values of platform_type at runtime", () => {
    expect(Constants.public.Enums.platform_type).toEqual(["youtube", "twitch"]);
  });
});

describe("Enums", () => {
  it("matches the values in Constants", () => {
    expectTypeOf<Enums<"platform_type">>().toEqualTypeOf<
      (typeof Constants.public.Enums.platform_type)[number]
    >();
  });
});
