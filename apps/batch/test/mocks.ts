import type { logger } from "@shinju-date/logger";
import type { after } from "next/server";
import { vi } from "vitest";

type Logger = typeof logger;

/** A `logger` of `@shinju-date/logger` whose every level is a mock. */
export function createLoggerMock() {
  return {
    debug: vi.fn<Logger["debug"]>(),
    error: vi.fn<Logger["error"]>(),
    info: vi.fn<Logger["info"]>(),
    warn: vi.fn<Logger["warn"]>(),
  };
}

/**
 * An `after` of `next/server` that runs the callback right away, since there
 * is no response to wait for in a test.
 */
export function createAfterMock() {
  return vi.fn<typeof after>((task) => {
    if (typeof task === "function") {
      void task();
    }
  });
}
