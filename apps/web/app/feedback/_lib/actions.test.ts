// @vitest-environment node
import { featureRequests } from "@shinju-date/msw-handlers";
import type { checkBotId } from "botid/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  disconnectSupabase,
  failSupabase,
  setupSupabase,
} from "@/test/supabase";

vi.mock(import("botid/server"), () => ({
  checkBotId: vi.fn<typeof checkBotId>().mockResolvedValue({
    bypassed: false,
    isBot: false,
    isHuman: true,
    isVerifiedBot: false,
  }),
}));

import { submitFeedback } from "./actions";

setupSupabase();

function createFormData(values: Record<string, string>): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }

  return formData;
}

/** The messages of the feature requests in the mock database */
function storedMessages(): string[] {
  return featureRequests.findMany().map(({ message }) => message);
}

describe("submitFeedback()", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ["empty", ""],
    ["whitespace only", "   \n"],
  ])(
    "returns a field error matching the label when the message is %s",
    async (_, message) => {
      const result = await submitFeedback(null, createFormData({ message }));

      expect(result).toStrictEqual({
        fieldErrors: { message: "機能要望を入力してください" },
        success: false,
        values: { message },
      });
      expect(storedMessages()).toStrictEqual([]);
    }
  );

  it("returns a field error when the message is missing", async () => {
    const result = await submitFeedback(null, new FormData());

    expect(result.fieldErrors?.message).toBe("機能要望を入力してください");
    expect(storedMessages()).toStrictEqual([]);
  });

  it("stores the trimmed message as a new request", async () => {
    const result = await submitFeedback(
      null,
      createFormData({ message: "  検索機能がほしい  " })
    );

    expect(result.success).toBeTruthy();
    expect(result.values).toBeUndefined();
    expect(featureRequests.findMany()).toStrictEqual([
      expect.objectContaining({
        is_read: false,
        message: "検索機能がほしい",
        status: "pending",
      }),
    ]);
  });

  it("returns the submitted message when the insert fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    failSupabase("feature_requests", "insert failed");

    const result = await submitFeedback(
      null,
      createFormData({ message: "  検索機能がほしい  " })
    );

    expect(result.success).toBeFalsy();
    expect(result.error).toBeDefined();
    expect(result.values).toStrictEqual({ message: "  検索機能がほしい  " });
    expect(storedMessages()).toStrictEqual([]);
  });

  it("returns the submitted message when the request cannot be sent", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    disconnectSupabase("feature_requests");

    const result = await submitFeedback(
      null,
      createFormData({ message: "検索機能がほしい" })
    );

    expect(result.success).toBeFalsy();
    expect(result.values).toStrictEqual({ message: "検索機能がほしい" });
  });
});
