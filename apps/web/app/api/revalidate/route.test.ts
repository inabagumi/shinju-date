// @vitest-environment node
import { CACHE_TAGS } from "@shinju-date/constants";
import type { logger } from "@shinju-date/logger";
import type { revalidateTag } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidateTag: vi.fn<typeof revalidateTag>(),
  serverEnv: {
    REVALIDATE_SECRET_TOKEN: undefined as string | undefined,
  },
}));

vi.mock(import("next/cache"), () => ({
  revalidateTag: mocks.revalidateTag,
}));

vi.mock(import("@/lib/env"), () => ({
  serverEnv: mocks.serverEnv as Partial<ServerEnv> as ServerEnv,
}));

vi.mock(import("@shinju-date/logger"), () => ({
  logger: {
    debug: vi.fn<typeof logger.debug>(),
    error: vi.fn<typeof logger.error>(),
    info: vi.fn<typeof logger.info>(),
    warn: vi.fn<typeof logger.warn>(),
  },
}));

import type { ServerEnv } from "@/lib/env";

import { POST } from "./route";

function post(body: string, headers: HeadersInit = {}): Promise<Response> {
  return POST(
    new Request("https://shinju.date/api/revalidate", {
      body,
      headers: { "Content-Type": "application/json", ...headers },
      method: "POST",
    })
  );
}

describe("POST /api/revalidate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.serverEnv.REVALIDATE_SECRET_TOKEN = undefined;
  });

  it("revalidates every tag of CACHE_TAGS", async () => {
    const tags = Object.values(CACHE_TAGS);

    const response = await post(JSON.stringify({ tags }));

    expect(response.status).toBe(204);
    expect(mocks.revalidateTag).toHaveBeenCalledTimes(tags.length);
    for (const tag of tags) {
      expect(mocks.revalidateTag).toHaveBeenCalledWith(tag, "hours");
    }
  });

  it("answers 422 without revalidating when a tag is not in CACHE_TAGS", async () => {
    const response = await post(
      JSON.stringify({ tags: [CACHE_TAGS.VIDEOS, "unknown"] })
    );

    expect(response.status).toBe(422);
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });

  it("answers 422 for an empty array of tags", async () => {
    const response = await post(JSON.stringify({ tags: [] }));

    expect(response.status).toBe(422);
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });

  it("answers 422 when the body is not JSON", async () => {
    const response = await post("tags=videos");

    expect(response.status).toBe(422);
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });

  it("answers 401 without revalidating when the token does not match", async () => {
    mocks.serverEnv.REVALIDATE_SECRET_TOKEN = "secret";

    const response = await post(JSON.stringify({ tags: [CACHE_TAGS.VIDEOS] }), {
      Authorization: "Bearer wrong",
    });

    expect(response.status).toBe(401);
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });

  it("revalidates when the token matches", async () => {
    mocks.serverEnv.REVALIDATE_SECRET_TOKEN = "secret";

    const response = await post(JSON.stringify({ tags: [CACHE_TAGS.VIDEOS] }), {
      Authorization: "Bearer secret",
    });

    expect(response.status).toBe(204);
    expect(mocks.revalidateTag).toHaveBeenCalledWith(
      CACHE_TAGS.VIDEOS,
      "hours"
    );
  });
});
