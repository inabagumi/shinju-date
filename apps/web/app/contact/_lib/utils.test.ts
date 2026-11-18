import { afterEach, describe, expect, it, vi } from "vitest";

const { serverEnv } = vi.hoisted(() => ({
  serverEnv: {
    ADMIN_EMAIL: undefined as string | undefined,
    FROM_EMAIL: undefined as string | undefined,
    RESEND_API_KEY: undefined as string | undefined,
  },
}));

vi.mock("@/lib/env", () => ({ serverEnv }));

import { getContactFormConfig, isContactFormEnabled } from "./utils";

function setEnv(values: Partial<typeof serverEnv>): void {
  Object.assign(serverEnv, {
    ADMIN_EMAIL: "contact@example.org",
    FROM_EMAIL: "noreply@example.org",
    RESEND_API_KEY: "re_test",
    ...values,
  });
}

describe("getContactFormConfig", () => {
  afterEach(() => {
    serverEnv.ADMIN_EMAIL = undefined;
    serverEnv.FROM_EMAIL = undefined;
    serverEnv.RESEND_API_KEY = undefined;
  });

  it("returns the settings when every variable is set", () => {
    setEnv({});

    expect(getContactFormConfig()).toEqual({
      adminEmail: "contact@example.org",
      fromEmail: "noreply@example.org",
      resendApiKey: "re_test",
    });
    expect(isContactFormEnabled()).toBe(true);
  });

  it.each(["ADMIN_EMAIL", "FROM_EMAIL", "RESEND_API_KEY"] as const)(
    "returns null when %s is not set",
    (name) => {
      setEnv({ [name]: undefined });

      expect(getContactFormConfig()).toBeNull();
      expect(isContactFormEnabled()).toBe(false);
    }
  );

  it("returns null when ADMIN_EMAIL is the sample value", () => {
    setEnv({ ADMIN_EMAIL: "admin@example.com" });

    expect(getContactFormConfig()).toBeNull();
    expect(isContactFormEnabled()).toBe(false);
  });
});
