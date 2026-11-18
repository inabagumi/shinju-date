// @vitest-environment node
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { ENV_NAMES, parseEnv, parsePublicEnv } from "./env";
import type { EnvSource } from "./env";

const API_KEYS = {
  GOOGLE_API_KEY: "google-api-key",
  TWITCH_CLIENT_ID: "twitch-client-id",
  TWITCH_CLIENT_SECRET: "twitch-client-secret",
} as const satisfies EnvSource;

const REQUIRED_ENV = {
  ...API_KEYS,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  NEXT_PUBLIC_SUPABASE_URL: "https://supabase.test",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  UPSTASH_REDIS_REST_TOKEN: "redis-token",
  UPSTASH_REDIS_REST_URL: "https://upstash.test",
} as const satisfies EnvSource;

type RequiredName = keyof typeof REQUIRED_ENV;

function without(...names: RequiredName[]): EnvSource {
  return Object.fromEntries(
    Object.entries(REQUIRED_ENV).filter(
      ([name]) => !names.includes(name as RequiredName)
    )
  );
}

function errorOf(callback: () => unknown): Error {
  try {
    callback();
  } catch (error) {
    if (error instanceof Error) {
      return error;
    }
  }

  throw new Error("Expected an error to be thrown.");
}

describe("parseEnv", () => {
  it("returns the variables when every required one is set", () => {
    const { publicEnv, serverEnv } = parseEnv(REQUIRED_ENV);

    expect(publicEnv).toMatchObject({
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      NEXT_PUBLIC_SUPABASE_URL: "https://supabase.test",
    });
    expect(serverEnv).toMatchObject({
      GOOGLE_API_KEY: "google-api-key",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      TWITCH_CLIENT_ID: "twitch-client-id",
      TWITCH_CLIENT_SECRET: "twitch-client-secret",
      UPSTASH_REDIS_REST_TOKEN: "redis-token",
      UPSTASH_REDIS_REST_URL: "https://upstash.test",
    });
  });

  it.each(Object.keys(REQUIRED_ENV) as RequiredName[])(
    "throws an error naming %s when it is missing",
    (name) => {
      expect(() => parseEnv(without(name))).toThrow(name);
    }
  );

  it("treats an empty variable as missing", () => {
    expect(() =>
      parseEnv({ ...REQUIRED_ENV, SUPABASE_SERVICE_ROLE_KEY: "" })
    ).toThrow("SUPABASE_SERVICE_ROLE_KEY: is not set");
  });

  it("names every missing variable at once", () => {
    const { message } = errorOf(() => parseEnv({}));

    for (const name of Object.keys(REQUIRED_ENV)) {
      expect(message).toContain(name);
    }
  });

  it("throws an error naming a variable that is not a URL", () => {
    expect(() =>
      parseEnv({ ...REQUIRED_ENV, UPSTASH_REDIS_REST_URL: "not a url" })
    ).toThrow("UPSTASH_REDIS_REST_URL: is not a valid URL");
  });

  it("does not need the API keys when ENABLE_MSW is true", () => {
    const { serverEnv } = parseEnv({
      ...without("GOOGLE_API_KEY", "TWITCH_CLIENT_ID", "TWITCH_CLIENT_SECRET"),
      ENABLE_MSW: "true",
    });

    expect(serverEnv.GOOGLE_API_KEY).toBeUndefined();
    expect(serverEnv.TWITCH_CLIENT_ID).toBeUndefined();
    expect(serverEnv.TWITCH_CLIENT_SECRET).toBeUndefined();
  });

  it.each(Object.keys(API_KEYS) as (keyof typeof API_KEYS)[])(
    "still needs %s when ENABLE_MSW is not true",
    (name) => {
      expect(() => parseEnv({ ...without(name), ENABLE_MSW: "false" })).toThrow(
        `${name}: is not set (required unless ENABLE_MSW=true)`
      );
    }
  );

  it("uses http://localhost:4000 when NEXT_PUBLIC_BASE_URL is not set", () => {
    expect(parseEnv(REQUIRED_ENV).publicEnv.NEXT_PUBLIC_BASE_URL).toBe(
      "http://localhost:4000"
    );
    expect(
      parseEnv({ ...REQUIRED_ENV, NEXT_PUBLIC_BASE_URL: "" }).publicEnv
        .NEXT_PUBLIC_BASE_URL
    ).toBe("http://localhost:4000");
    expect(
      parseEnv({
        ...REQUIRED_ENV,
        NEXT_PUBLIC_BASE_URL: "https://admin.shinju.date",
      }).publicEnv.NEXT_PUBLIC_BASE_URL
    ).toBe("https://admin.shinju.date");
  });

  it("leaves the optional variables unset", () => {
    const { publicEnv, serverEnv } = parseEnv(REQUIRED_ENV);

    expect(publicEnv.NEXT_PUBLIC_SENTRY_DSN).toBeUndefined();
    expect(serverEnv.REVALIDATE_SECRET_TOKEN).toBeUndefined();
    expect(serverEnv.REVALIDATE_URL).toBeUndefined();
  });

  it.each([
    ["true", true],
    ["false", false],
    [undefined, false],
  ])("reads ENABLE_MSW=%s as %s", (value, expected) => {
    expect(
      parseEnv({ ...REQUIRED_ENV, ENABLE_MSW: value }).serverEnv.ENABLE_MSW
    ).toBe(expected);
  });

  it.each([
    ["true", true],
    ["", false],
    [undefined, false],
  ])("reads MSW_SUPABASE_AUTHENTICATED=%s as %s", (value, expected) => {
    expect(
      parseEnv({ ...REQUIRED_ENV, MSW_SUPABASE_AUTHENTICATED: value }).serverEnv
        .MSW_SUPABASE_AUTHENTICATED
    ).toBe(expected);
  });
});

describe("parsePublicEnv", () => {
  it("does not need the server variables", () => {
    expect(() =>
      parsePublicEnv(
        without(
          "GOOGLE_API_KEY",
          "SUPABASE_SERVICE_ROLE_KEY",
          "TWITCH_CLIENT_ID",
          "TWITCH_CLIENT_SECRET",
          "UPSTASH_REDIS_REST_TOKEN",
          "UPSTASH_REDIS_REST_URL"
        )
      )
    ).not.toThrow();
  });

  it("throws an error naming a missing public variable", () => {
    expect(() => parsePublicEnv(without("NEXT_PUBLIC_SUPABASE_URL"))).toThrow(
      "NEXT_PUBLIC_SUPABASE_URL"
    );
  });
});

interface TurboConfig {
  globalEnv?: string[];
  tasks?: Record<string, { env?: string[] }>;
}

function readTurboConfig(path: string): TurboConfig {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), "utf-8"));
}

describe("ENV_NAMES", () => {
  it("are all passed to the build by turbo.json", () => {
    const appConfig = readTurboConfig("../turbo.json");
    const rootConfig = readTurboConfig("../../../turbo.json");
    const passedNames = new Set([
      ...(rootConfig.globalEnv ?? []),
      ...(appConfig.tasks?.["build"]?.env ?? []),
    ]);

    expect(ENV_NAMES).toContain("UPSTASH_REDIS_REST_URL");
    expect(ENV_NAMES.filter((name) => !passedNames.has(name))).toEqual([]);
  });
});
