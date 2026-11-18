import { checkBotId } from "botid/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  BOT_DETECTED_ERROR,
  UNEXPECTED_ERROR,
  withBotCheck,
} from "./form-action";

vi.mock("botid/server", () => ({
  checkBotId: vi.fn(),
}));

const FIELDS = ["message"] as const;

function createFormData(values: Record<string, string>): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }

  return formData;
}

describe("withBotCheck", () => {
  beforeEach(() => {
    vi.mocked(checkBotId).mockResolvedValue({
      bypassed: false,
      isBot: false,
      isHuman: true,
      isVerifiedBot: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes the form data and the submitted values to the action", async () => {
    const handler = vi.fn().mockResolvedValue({ success: true });
    const action = withBotCheck(handler, {
      errorLogMessage: "Test error:",
      fields: FIELDS,
    });
    const formData = createFormData({ message: "こんにちは", other: "x" });

    const result = await action(null, formData);

    expect(result).toEqual({ success: true });
    expect(handler).toHaveBeenCalledWith(formData, { message: "こんにちは" });
  });

  it("rejects a bot without running the action", async () => {
    vi.mocked(checkBotId).mockResolvedValue({
      bypassed: false,
      isBot: true,
      isHuman: false,
      isVerifiedBot: false,
    });
    const handler = vi.fn();
    const action = withBotCheck(handler, {
      errorLogMessage: "Test error:",
      fields: FIELDS,
    });

    const result = await action(null, createFormData({ message: "spam" }));

    expect(result).toEqual({
      error: BOT_DETECTED_ERROR,
      success: false,
      values: { message: "spam" },
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it("logs an error thrown by the action and keeps the submitted values", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const error = new Error("network error");
    const action = withBotCheck(vi.fn().mockRejectedValue(error), {
      errorLogMessage: "Test error:",
      fields: FIELDS,
    });

    const result = await action(
      null,
      createFormData({ message: "こんにちは" })
    );

    expect(result).toEqual({
      error: UNEXPECTED_ERROR,
      success: false,
      values: { message: "こんにちは" },
    });
    expect(consoleError).toHaveBeenCalledWith("Test error:", error);
  });

  it("treats a failed bot check as an unexpected error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(checkBotId).mockRejectedValue(new Error("botid failed"));
    const handler = vi.fn();
    const action = withBotCheck(handler, {
      errorLogMessage: "Test error:",
      fields: FIELDS,
    });

    const result = await action(
      null,
      createFormData({ message: "こんにちは" })
    );

    expect(result).toEqual({
      error: UNEXPECTED_ERROR,
      success: false,
      values: { message: "こんにちは" },
    });
    expect(handler).not.toHaveBeenCalled();
  });
});
