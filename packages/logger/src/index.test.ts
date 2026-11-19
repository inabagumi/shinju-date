import * as Sentry from "@sentry/nextjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { logger } from "./index.js";

/** The form in which the shared logger calls the Sentry logger. */
type LogFunction = (
  message: string,
  attributes?: Record<string, unknown>
) => void;

// Sentryモジュールをモック化
vi.mock(import("@sentry/nextjs"), () => ({
  logger: {
    debug: vi.fn<LogFunction>(),
    error: vi.fn<LogFunction>(),
    info: vi.fn<LogFunction>(),
    warn: vi.fn<LogFunction>(),
  } as Partial<typeof Sentry.logger> as typeof Sentry.logger,
}));

// 全ログレベル共通のテストケース
const testCases = [
  { label: "デバッグ", method: "debug" as const, mock: Sentry.logger.debug },
  { label: "情報", method: "info" as const, mock: Sentry.logger.info },
  { label: "警告", method: "warn" as const, mock: Sentry.logger.warn },
  { label: "エラー", method: "error" as const, mock: Sentry.logger.error },
];

describe("the logger", () => {
  // 各テストの前にモックをクリア
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- 全レベル共通のテスト ---
  describe.each(testCases)("$method", ({ method, mock, label }) => {
    const message = `${label}メッセージ`;

    it("should call Sentry logger without attributes", () => {
      logger[method](message);

      // 修正点: 2番目の引数としてundefinedが渡されることを期待する
      expect(mock).toHaveBeenCalledExactlyOnceWith(message, undefined);
    });

    it("should call Sentry logger with attributes", () => {
      const attributes = { id: 123, key: "value" };
      logger[method](message, attributes);

      expect(mock).toHaveBeenCalledExactlyOnceWith(message, attributes);
    });

    it("should call Sentry logger with an Error object in attributes", () => {
      const error = new Error("Test error");
      const attributes = { error, operation: "fetch" };
      logger[method](message, attributes);

      expect(mock).toHaveBeenCalledExactlyOnceWith(message, attributes);
    });
  });
});
