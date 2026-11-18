// @vitest-environment node
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { ENV_NAMES, parseEnv, parsePublicEnv } from "./env";
import type { EnvSource } from "./env";

const REQUIRED_ENV = {
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  NEXT_PUBLIC_SUPABASE_URL: "https://supabase.test",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  UPSTASH_REDIS_REST_TOKEN: "redis-token",
  UPSTASH_REDIS_REST_URL: "https://upstash.test",
} as const satisfies EnvSource;

function without(...names: (keyof typeof REQUIRED_ENV)[]): EnvSource {
  return Object.fromEntries(
    Object.entries(REQUIRED_ENV).filter(
      ([name]) => !names.includes(name as keyof typeof REQUIRED_ENV)
    )
  );
}

describe("parseEnv", () => {
  it("returns the variables when every required one is set", () => {
    const { publicEnv, serverEnv } = parseEnv(REQUIRED_ENV);

    expect(publicEnv).toMatchObject({
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      NEXT_PUBLIC_SUPABASE_URL: "https://supabase.test",
    });
    expect(serverEnv).toMatchObject({
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      UPSTASH_REDIS_REST_TOKEN: "redis-token",
      UPSTASH_REDIS_REST_URL: "https://upstash.test",
    });
  });

  it.each(Object.keys(REQUIRED_ENV) as (keyof typeof REQUIRED_ENV)[])(
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
    let error: unknown;

    try {
      parseEnv({});
    } catch (error_) {
      error = error_;
    }

    expect(error).toBeInstanceOf(Error);

    for (const name of Object.keys(REQUIRED_ENV)) {
      expect((error as Error).message).toContain(name);
    }
  });

  it("throws an error naming a variable that is not a URL", () => {
    expect(() =>
      parseEnv({ ...REQUIRED_ENV, UPSTASH_REDIS_REST_URL: "not a url" })
    ).toThrow("UPSTASH_REDIS_REST_URL: is not a valid URL");
  });

  it("uses http://localhost:3000 when NEXT_PUBLIC_BASE_URL is not set", () => {
    expect(parseEnv(REQUIRED_ENV).publicEnv.NEXT_PUBLIC_BASE_URL).toBe(
      "http://localhost:3000"
    );
    expect(
      parseEnv({ ...REQUIRED_ENV, NEXT_PUBLIC_BASE_URL: "" }).publicEnv
        .NEXT_PUBLIC_BASE_URL
    ).toBe("http://localhost:3000");
    expect(
      parseEnv({ ...REQUIRED_ENV, NEXT_PUBLIC_BASE_URL: "https://shinju.date" })
        .publicEnv.NEXT_PUBLIC_BASE_URL
    ).toBe("https://shinju.date");
  });

  it("leaves the optional variables unset", () => {
    const { publicEnv, serverEnv } = parseEnv(REQUIRED_ENV);

    expect(publicEnv.NEXT_PUBLIC_SENTRY_DSN).toBeUndefined();
    expect(serverEnv.RESEND_API_KEY).toBeUndefined();
    expect(serverEnv.REVALIDATE_SECRET_TOKEN).toBeUndefined();
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
});

describe("parsePublicEnv", () => {
  it("does not need the server variables", () => {
    expect(() =>
      parsePublicEnv(
        without(
          "SUPABASE_SERVICE_ROLE_KEY",
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
