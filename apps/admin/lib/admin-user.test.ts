import { describe, expect, it } from "vitest";

import { ADMIN_ROLE, isAdminUser } from "./admin-user";

describe(isAdminUser, () => {
  it("returns true when app_metadata.role is admin", () => {
    expect(isAdminUser({ app_metadata: { role: ADMIN_ROLE } })).toBeTruthy();
  });

  it("returns false when app_metadata has no role", () => {
    expect(
      isAdminUser({
        app_metadata: { provider: "email", providers: ["email"] },
      })
    ).toBeFalsy();
  });

  it("returns false for other roles", () => {
    expect(isAdminUser({ app_metadata: { role: "editor" } })).toBeFalsy();
  });

  it("does not trust user_metadata, which users can change themselves", () => {
    expect(
      isAdminUser({
        app_metadata: {},
        user_metadata: { role: ADMIN_ROLE },
      } as Parameters<typeof isAdminUser>[0])
    ).toBeFalsy();
  });
});
