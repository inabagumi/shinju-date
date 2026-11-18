import type { logger } from "@shinju-date/logger";
import { vi } from "vitest";
import type { Mock } from "vitest";

type Logger = typeof logger;

/** The `logger` of `@shinju-date/logger`, with a mock function for each level. */
export interface MockLogger {
  debug: Mock<Logger["debug"]>;
  error: Mock<Logger["error"]>;
  info: Mock<Logger["info"]>;
  warn: Mock<Logger["warn"]>;
}

/**
 * Creates a logger whose methods record their calls and do nothing else.
 *
 * Return it from the factory of `vi.mock(import("@shinju-date/logger"))`,
 * which runs before the imports of the test file are evaluated, so import
 * this module there:
 *
 * @example
 * ```ts
 * vi.mock(import("@shinju-date/logger"), async () => {
 *   const { createMockLogger } = await import("@/test/logger");
 *
 *   return { logger: createMockLogger() };
 * });
 * ```
 */
export function createMockLogger(): MockLogger {
  return {
    debug: vi.fn<Logger["debug"]>(),
    error: vi.fn<Logger["error"]>(),
    info: vi.fn<Logger["info"]>(),
    warn: vi.fn<Logger["warn"]>(),
  };
}
