import { REDIS_KEYS } from "@shinju-date/constants";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setupActionTest } from "@/test/action-harness";

import {
  disableMaintenanceModeAction,
  enableMaintenanceModeAction,
} from "./maintenance-mode";

const test = setupActionTest();

/**
 * 予期しない例外のときに画面に出る文（`@/lib/action` の `ACTION_FAILED_ERROR_MESSAGE`）。
 * `@/lib/action` を読み込むと、認証のモックより先に `@/lib/auth` が読み込まれるため、
 * ここに書く
 */
const ACTION_FAILED_ERROR =
  "処理に失敗しました。時間をおいて、もう一度お試しください。";

const redisClient = {
  del: vi.fn(async () => 1),
  set: vi.fn(async () => "OK"),
};

beforeEach(() => {
  redisClient.del.mockImplementation(async () => 1);
  redisClient.set.mockImplementation(async () => "OK");
  test.getRedisClient.mockImplementation(() => redisClient);
});

describe("enableMaintenanceModeAction", () => {
  it("turns maintenance mode on and records it", async () => {
    await expect(enableMaintenanceModeAction()).resolves.toEqual({
      success: true,
    });

    expect(redisClient.set).toHaveBeenCalledExactlyOnceWith(
      REDIS_KEYS.MAINTENANCE_MODE,
      "true"
    );
    test.expectAuditLog("MAINTENANCE_MODE_ENABLE", null);
  });

  it("hides the message of an unexpected error and records nothing", async () => {
    redisClient.set.mockRejectedValue(new Error("redis unavailable"));

    await expect(enableMaintenanceModeAction()).resolves.toEqual({
      error: ACTION_FAILED_ERROR,
      success: false,
    });
    test.expectNoAuditLog();
  });
});

describe("disableMaintenanceModeAction", () => {
  it("turns maintenance mode off and records it", async () => {
    await expect(disableMaintenanceModeAction()).resolves.toEqual({
      success: true,
    });

    expect(redisClient.del).toHaveBeenCalledExactlyOnceWith(
      REDIS_KEYS.MAINTENANCE_MODE
    );
    test.expectAuditLog("MAINTENANCE_MODE_DISABLE", null);
  });

  it("hides the message of an unexpected error and records nothing", async () => {
    redisClient.del.mockRejectedValue(new Error("redis unavailable"));

    await expect(disableMaintenanceModeAction()).resolves.toEqual({
      error: ACTION_FAILED_ERROR,
      success: false,
    });
    test.expectNoAuditLog();
  });
});
