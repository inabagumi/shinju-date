import { REDIS_KEYS } from "@shinju-date/constants";
import { afterEach, describe, expect, it, vi } from "vitest";

import { isMaintenanceMode } from "./is-maintenance-mode.js";
import type { MaintenanceModeRedisClient } from "./is-maintenance-mode.js";

const createRedisClient = (get: () => Promise<unknown>) => {
  const mockGet = vi.fn<() => Promise<unknown>>(get);

  return { get: mockGet } as MaintenanceModeRedisClient & {
    get: typeof mockGet;
  };
};

describe(isMaintenanceMode, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reads the maintenance mode key", async () => {
    const redisClient = createRedisClient(() => Promise.resolve(true));

    await isMaintenanceMode(redisClient);

    expect(redisClient.get).toHaveBeenCalledWith(REDIS_KEYS.MAINTENANCE_MODE);
  });

  it("returns true when the value is true", async () => {
    const redisClient = createRedisClient(() => Promise.resolve(true));

    await expect(isMaintenanceMode(redisClient)).resolves.toBeTruthy();
  });

  it.each([null, false, "true", 1])(
    "returns false when the value is %j",
    async (value) => {
      const redisClient = createRedisClient(() => Promise.resolve(value));

      await expect(isMaintenanceMode(redisClient)).resolves.toBeFalsy();
    }
  );

  it("returns false when Redis cannot be read", async () => {
    const consoleError = vi.spyOn(console, "error").mockReturnValue(undefined);
    const redisClient = createRedisClient(() =>
      Promise.reject(new Error("unavailable"))
    );

    await expect(isMaintenanceMode(redisClient)).resolves.toBeFalsy();
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to check maintenance mode:",
      expect.any(Error)
    );
  });
});
