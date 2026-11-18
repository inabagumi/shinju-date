import { logger } from "@shinju-date/logger";
import type { User } from "@supabase/supabase-js";
import { notFound, redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as z from "zod";

import type {
  AuthenticatedContext,
  requireAuthenticatedUser,
} from "@/lib/auth";
import { unauthenticatedFormState, unauthenticatedResult } from "@/lib/auth";
import type { TypedSupabaseClient } from "@/lib/supabase";

import {
  ACTION_FAILED_ERROR_MESSAGE,
  ActionError,
  adminAction,
  adminFormAction,
  parseActionInput,
} from "./action";
import type { ActionResult, FormState } from "./action";
import { INVALID_INPUT_ERROR_MESSAGE, uuidSchema } from "./schemas";

const { requireAuthenticatedUserMock } = vi.hoisted(() => ({
  requireAuthenticatedUserMock: vi.fn<typeof requireAuthenticatedUser>(),
}));

vi.mock(import("@shinju-date/logger"), async () => {
  const { createMockLogger } = await import("@/test/logger");

  return { logger: createMockLogger() };
});

vi.mock(import("@/lib/auth"), async (importOriginal) => ({
  ...(await importOriginal()),
  requireAuthenticatedUser: requireAuthenticatedUserMock,
}));

const loggerErrorMock = vi.mocked(logger.error);

const auth: AuthenticatedContext = {
  supabaseClient: {
    from: vi.fn<TypedSupabaseClient["from"]>(),
  } as Partial<TypedSupabaseClient> as TypedSupabaseClient,
  user: { id: "user-id" } as Partial<User> as User,
};

const formData = (entries: Record<string, string>): FormData => {
  const data = new FormData();

  for (const [key, value] of Object.entries(entries)) {
    data.append(key, value);
  }

  return data;
};

describe("lib/action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedUserMock.mockResolvedValue(auth);
  });

  describe(ActionError, () => {
    it("keeps the message that may be shown and the field it belongs to", () => {
      const error = new ActionError("すでに登録されています。", {
        field: "youtube_channel_id",
      });

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("ActionError");
      expect(error.message).toBe("すでに登録されています。");
      expect(error.field).toBe("youtube_channel_id");
    });

    it("belongs to no field when none is given", () => {
      expect(new ActionError("失敗しました。").field).toBeUndefined();
    });
  });

  describe(adminAction, () => {
    it("returns the unauthenticated result without calling the handler", async () => {
      requireAuthenticatedUserMock.mockResolvedValue(null);
      const handler =
        vi.fn<
          (context: AuthenticatedContext, id: string) => Promise<ActionResult>
        >();
      const action = adminAction("testAction", handler);

      await expect(action("id")).resolves.toStrictEqual(
        unauthenticatedResult()
      );
      expect(handler).not.toHaveBeenCalled();
    });

    it("calls the handler with the context and the arguments and returns its result", async () => {
      const handler = vi.fn<
        (
          context: AuthenticatedContext,
          id: string,
          n: number
        ) => Promise<ActionResult<{ id: string; n: number }>>
      >((_context, id, n) =>
        Promise.resolve({
          data: { id, n },
          success: true as const,
          warnings: ["一部を飛ばしました。"],
        })
      );
      const action = adminAction("testAction", handler);

      await expect(action("id", 1)).resolves.toStrictEqual({
        data: { id: "id", n: 1 },
        success: true,
        warnings: ["一部を飛ばしました。"],
      });
      expect(handler).toHaveBeenCalledWith(auth, "id", 1);
    });

    it("returns a failed result from the handler as it is", async () => {
      const action = adminAction("testAction", () =>
        Promise.resolve({
          error: "見つかりません。",
          success: false as const,
        })
      );

      await expect(action()).resolves.toStrictEqual({
        error: "見つかりません。",
        success: false,
      });
    });

    it("returns the message of an ActionError", async () => {
      const action = adminAction("testAction", () =>
        Promise.reject(new ActionError("すでに登録されています。"))
      );

      await expect(action()).resolves.toStrictEqual({
        error: "すでに登録されています。",
        success: false,
      });
      expect(loggerErrorMock).not.toHaveBeenCalled();
    });

    it("logs any other error and returns a fixed message instead of its message", async () => {
      const error = new Error("duplicate key value violates unique constraint");
      const action = adminAction("testAction", (_context, _id: string) =>
        Promise.reject(error)
      );

      const result = await action("id");

      expect(result).toStrictEqual({
        error: ACTION_FAILED_ERROR_MESSAGE,
        success: false,
      });
      expect(JSON.stringify(result)).not.toContain("duplicate key");
      expect(loggerErrorMock).toHaveBeenCalledWith(expect.any(String), {
        action: "testAction",
        args: ["id"],
        error,
      });
    });

    it("rethrows the errors that Next.js handles", async () => {
      const action = adminAction("testAction", () => redirect("/talents"));

      await expect(action()).rejects.toThrow("NEXT_REDIRECT");
      expect(loggerErrorMock).not.toHaveBeenCalled();
    });
  });

  describe(parseActionInput, () => {
    it("returns the parsed value", () => {
      expect(parseActionInput(z.string().trim(), "  query  ")).toBe("query");
    });

    it("throws an ActionError with the fixed message when the value is invalid", () => {
      expect(() => parseActionInput(uuidSchema, "not-a-uuid")).toThrow(
        new ActionError(INVALID_INPUT_ERROR_MESSAGE)
      );
    });

    it("makes adminAction return the fixed message without going on", async () => {
      const update = vi.fn<() => void>();
      const action = adminAction("testAction", (_context, id: string) => {
        parseActionInput(uuidSchema, id);
        update();

        return Promise.resolve({ success: true });
      });

      await expect(action("not-a-uuid")).resolves.toStrictEqual({
        error: INVALID_INPUT_ERROR_MESSAGE,
        success: false,
      });
      expect(update).not.toHaveBeenCalled();
      expect(loggerErrorMock).not.toHaveBeenCalled();
    });
  });

  describe(adminFormAction, () => {
    const schema = z.object({
      name: z.string().min(1, "名前を入力してください。"),
    });

    type FormHandler = (
      context: AuthenticatedContext,
      data: z.output<typeof schema>
    ) => Promise<FormState | undefined>;

    it("returns the unauthenticated state without calling the handler", async () => {
      requireAuthenticatedUserMock.mockResolvedValue(null);
      const handler = vi.fn<FormHandler>();
      const action = adminFormAction("testFormAction", schema, handler);

      await expect(
        action({}, formData({ name: "name" }))
      ).resolves.toStrictEqual(unauthenticatedFormState());
      expect(handler).not.toHaveBeenCalled();
    });

    it("returns the errors of each field without calling the handler when the validation fails", async () => {
      const handler = vi.fn<FormHandler>();
      const action = adminFormAction("testFormAction", schema, handler);

      await expect(action({}, formData({ name: "" }))).resolves.toStrictEqual({
        errors: { name: ["名前を入力してください。"] },
      });
      expect(handler).not.toHaveBeenCalled();
    });

    it("returns the errors of the hidden fields as generic errors", async () => {
      const handler = vi.fn<FormHandler>();
      const action = adminFormAction("testFormAction", schema, handler, {
        hiddenFields: ["name"],
      });

      await expect(action({}, formData({ name: "" }))).resolves.toStrictEqual({
        errors: { generic: ["名前を入力してください。"] },
      });
      expect(handler).not.toHaveBeenCalled();
    });

    it("calls the handler with the context and the parsed data and returns success", async () => {
      const handler = vi.fn<FormHandler>(async () => {});
      const action = adminFormAction("testFormAction", schema, handler);

      await expect(
        action({}, formData({ name: "name" }))
      ).resolves.toStrictEqual({
        success: true,
      });
      expect(handler).toHaveBeenCalledWith(auth, { name: "name" });
    });

    it("returns the state that the handler returns", async () => {
      const action = adminFormAction("testFormAction", schema, () =>
        Promise.resolve({
          errors: { name: ["使えない名前です。"] },
        })
      );

      await expect(
        action({}, formData({ name: "name" }))
      ).resolves.toStrictEqual({
        errors: { name: ["使えない名前です。"] },
      });
    });

    it("returns the message of an ActionError as the error of its field", async () => {
      const action = adminFormAction("testFormAction", schema, () =>
        Promise.reject(
          new ActionError("すでに登録されています。", { field: "name" })
        )
      );

      await expect(
        action({}, formData({ name: "name" }))
      ).resolves.toStrictEqual({
        errors: { name: ["すでに登録されています。"] },
      });
      expect(loggerErrorMock).not.toHaveBeenCalled();
    });

    it("returns the message of an ActionError without a field as a generic error", async () => {
      const action = adminFormAction("testFormAction", schema, () =>
        Promise.reject(new ActionError("失敗しました。"))
      );

      await expect(
        action({}, formData({ name: "name" }))
      ).resolves.toStrictEqual({
        errors: { generic: ["失敗しました。"] },
      });
    });

    it("logs any other error without the form values and returns a fixed message instead of its message", async () => {
      const error = new Error("duplicate key value violates unique constraint");
      const action = adminFormAction("testFormAction", schema, () =>
        Promise.reject(error)
      );

      const result = await action({}, formData({ name: "secret" }));

      expect(result).toStrictEqual({ error: ACTION_FAILED_ERROR_MESSAGE });
      expect(JSON.stringify(result)).not.toContain("duplicate key");
      expect(loggerErrorMock).toHaveBeenCalledWith(expect.any(String), {
        action: "testFormAction",
        error,
      });
    });

    it("rethrows the errors that Next.js handles", async () => {
      const action = adminFormAction("testFormAction", schema, () =>
        notFound()
      );

      await expect(action({}, formData({ name: "name" }))).rejects.toThrow(
        "NEXT_HTTP_ERROR_FALLBACK"
      );
      expect(loggerErrorMock).not.toHaveBeenCalled();
    });
  });
});
