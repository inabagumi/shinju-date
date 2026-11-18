import type { checkBotId } from "botid/server";
import type { ErrorResponse, Resend } from "resend";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ServerEnv } from "@/lib/env";

const DEFAULT_ADMIN_EMAIL = "contact@example.org";

const { sendEmail, serverEnv } = vi.hoisted(() => ({
  sendEmail: vi.fn<Resend["emails"]["send"]>(),
  serverEnv: {
    ADMIN_EMAIL: "contact@example.org" as string | undefined,
    FROM_EMAIL: "noreply@example.org",
    RESEND_API_KEY: "re_test",
  },
}));

vi.mock(import("@/lib/env"), () => ({
  serverEnv: serverEnv as Partial<ServerEnv> as ServerEnv,
}));

vi.mock(import("resend"), async (importOriginal) => {
  const actual = await importOriginal();

  return {
    Resend: class extends actual.Resend {
      override emails = { send: sendEmail } as Partial<
        Resend["emails"]
      > as Resend["emails"];
    },
  };
});

vi.mock(import("botid/server"), () => ({
  checkBotId: vi.fn<typeof checkBotId>().mockResolvedValue({
    bypassed: false,
    isBot: false,
    isHuman: true,
    isVerifiedBot: false,
  }),
}));

import { submitContactForm } from "./actions";

const createFormData = (values: Record<string, string>): FormData => {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }

  return formData;
};

const SUBMITTED_VALUES = {
  email: "hanako@example.com",
  message: "不具合があります",
  name: "山田花子",
  type: "bug",
  wantsReply: "on",
};

describe("submitContactForm()", () => {
  beforeEach(() => {
    sendEmail.mockReset();
  });

  afterEach(() => {
    serverEnv.ADMIN_EMAIL = DEFAULT_ADMIN_EMAIL;
    vi.restoreAllMocks();
  });

  it("returns field errors matching the labels for empty required fields", async () => {
    const result = await submitContactForm(
      null,
      createFormData({ message: "", type: "" })
    );

    expect(result).toStrictEqual({
      fieldErrors: {
        message: "お問い合わせ内容を入力してください",
        type: "お問い合わせ種別を選択してください",
      },
      success: false,
      values: { message: "", type: "" },
    });
  });

  it("returns a field error for an invalid email address", async () => {
    const result = await submitContactForm(
      null,
      createFormData({
        email: "invalid",
        message: "不具合があります",
        type: "bug",
        wantsReply: "on",
      })
    );

    expect(result.success).toBeFalsy();
    expect(result.fieldErrors?.email).toBe(
      "メールアドレスの形式が正しくありません"
    );
  });

  it("requires an email address when a reply is requested", async () => {
    const result = await submitContactForm(
      null,
      createFormData({
        message: "不具合があります",
        type: "bug",
        wantsReply: "on",
      })
    );

    expect(result.success).toBeFalsy();
    expect(result.fieldErrors?.email).toBe(
      "返信を希望する場合はメールアドレスが必須です"
    );
  });

  it.each([
    ["not set", undefined],
    ["the sample value", "admin@example.com"],
  ])(
    "does not send the email when ADMIN_EMAIL is %s",
    async (_, adminEmail) => {
      serverEnv.ADMIN_EMAIL = adminEmail;

      const result = await submitContactForm(
        null,
        createFormData(SUBMITTED_VALUES)
      );

      expect(result).toStrictEqual({
        error: "お問い合わせ機能は現在ご利用いただけません。",
        success: false,
        values: SUBMITTED_VALUES,
      });
      expect(sendEmail).not.toHaveBeenCalled();
    }
  );

  it("reports success when the email is sent", async () => {
    sendEmail.mockResolvedValue({
      data: { id: "email-id" },
      error: null,
      headers: null,
    });

    const result = await submitContactForm(
      null,
      createFormData(SUBMITTED_VALUES)
    );

    expect(result).toStrictEqual({
      message: "お問い合わせを受け付けました。ありがとうございます。",
      success: true,
    });
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "noreply@example.org",
        replyTo: "山田花子 <hanako@example.com>",
        text: expect.stringContaining("■ お名前\n山田花子\n"),
        to: "contact@example.org",
      })
    );
  });

  it("includes the name in the body when no reply is requested", async () => {
    sendEmail.mockResolvedValue({
      data: { id: "email-id" },
      error: null,
      headers: null,
    });

    const result = await submitContactForm(
      null,
      createFormData({
        message: "不具合があります",
        name: "山田花子",
        type: "bug",
      })
    );

    expect(result.success).toBeTruthy();

    const [options] = sendEmail.mock.calls[0] ?? [];

    expect(options).not.toHaveProperty("replyTo");
    expect(options?.text).toContain("■ お名前\n山田花子\n");
  });

  it("marks the name as not entered when it is empty", async () => {
    sendEmail.mockResolvedValue({
      data: { id: "email-id" },
      error: null,
      headers: null,
    });

    await submitContactForm(
      null,
      createFormData({ message: "不具合があります", name: "", type: "bug" })
    );

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("■ お名前\n（未入力）\n"),
      })
    );
  });

  it("reports a failure when Resend returns an error", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const sendError: ErrorResponse = {
      message: "Internal server error",
      name: "internal_server_error",
      statusCode: 500,
    };
    sendEmail.mockResolvedValue({
      data: null,
      error: sendError,
      headers: null,
    });

    const result = await submitContactForm(
      null,
      createFormData(SUBMITTED_VALUES)
    );

    expect(result).toStrictEqual({
      error:
        "送信中にエラーが発生しました。しばらく時間をおいて再度お試しください。",
      success: false,
      values: SUBMITTED_VALUES,
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to send contact form email:",
      sendError
    );
  });
});
