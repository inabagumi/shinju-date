import { REDIS_KEYS } from "@shinju-date/constants";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isMaintenanceMode,
  type MaintenanceModeRedisClient,
} from "./is-maintenance-mode.js";

function createRedisClient(get: () => Promise<unknown>) {
  const mockGet = vi.fn(get);

  return { get: mockGet } as MaintenanceModeRedisClient & {
    get: typeof mockGet;
  };
}

describe("isMaintenanceMode", () => {
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

    await expect(isMaintenanceMode(redisClient)).resolves.toBe(true);
  });

  it.each([null, false, "true", 1])(
    "returns false when the value is %j",
    async (value) => {
      const redisClient = createRedisClient(() => Promise.resolve(value));

      await expect(isMaintenanceMode(redisClient)).resolves.toBe(false);
    }
  );

  it("returns false when Redis cannot be read", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const redisClient = createRedisClient(() =>
      Promise.reject(new Error("unavailable"))
    );

    await expect(isMaintenanceMode(redisClient)).resolves.toBe(false);
    expect(consoleError).toHaveBeenCalled();
  });
});
