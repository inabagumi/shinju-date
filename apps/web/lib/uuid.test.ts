import { describe, expect, it } from "vitest";

import { isUUID } from "./uuid";

describe(isUUID, () => {
  it("should accept UUIDs", () => {
    expect(isUUID("7c3f1b2a-4d5e-4f60-8a1b-2c3d4e5f6a7b")).toBeTruthy();
    expect(isUUID("7C3F1B2A-4D5E-4F60-8A1B-2C3D4E5F6A7B")).toBeTruthy();
    expect(isUUID("00000000-0000-0000-0000-000000000000")).toBeTruthy();
  });

  it("should reject other values", () => {
    expect(isUUID("")).toBeFalsy();
    expect(isUUID("not-a-uuid")).toBeFalsy();
    expect(isUUID("7c3f1b2a4d5e4f608a1b2c3d4e5f6a7b")).toBeFalsy();
    expect(isUUID("7c3f1b2a-4d5e-4f60-8a1b-2c3d4e5f6a7b.ics")).toBeFalsy();
    expect(isUUID("7c3f1b2a-4d5e-4f60-8a1b-2c3d4e5f6a7g")).toBeFalsy();
  });
});
