import type { User } from "@supabase/supabase-js";
import { beforeEach, expect, vi } from "vitest";

import type { AuditAction, AuditLogEntry } from "@/lib/audit-log";

import { setupSupabase } from "./supabase";
import type { FakeSupabase } from "./supabase";

/**
 * The modules every Server Action talks to, replaced for the action tests.
 *
 * `vi.mock()` registers when this module is evaluated, so a test file must
 * import this module before the action under test. oxfmt sorts `@/test/*`
 * ahead of relative imports, so importing the action with a relative path
 * is enough. Read the mocks from what `setupActionTest()` returns instead of
 * importing the mocked modules in the test file.
 */
const mocks = vi.hoisted(() => ({
  createAuditLog: vi.fn(async () => {}),
  createAuditLogs: vi.fn(async () => {}),
  createSupabaseServerClient: vi.fn(),
  getRedisClient: vi.fn(() => ({})),
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  requireAuthenticatedUser: vi.fn(),
  revalidatePath: vi.fn(),
  revalidateTags: vi.fn(async () => {}),
  state: { supabase: null as FakeSupabase | null },
}));

const currentClient = () => {
  if (!mocks.state.supabase) {
    throw new Error("Call setupActionTest() before running a Server Action.");
  }

  return mocks.state.supabase.client;
};

vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth")>()),
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));
vi.mock("@/lib/supabase", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: () => currentClient(),
}));
vi.mock("@/lib/audit-log", () => ({
  createAuditLog: mocks.createAuditLog,
  createAuditLogs: mocks.createAuditLogs,
}));
vi.mock("@/lib/redis", () => ({ getRedisClient: mocks.getRedisClient }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@shinju-date/web-cache", () => ({
  revalidateTags: mocks.revalidateTags,
}));
vi.mock("@shinju-date/logger", () => ({ logger: mocks.logger }));

/** The administrator that `signIn()` signs in by default. */
export const TEST_USER = {
  app_metadata: { role: "admin" },
  aud: "authenticated",
  created_at: "2024-01-01T00:00:00Z",
  email: "admin@example.com",
  id: "test-user-id",
  user_metadata: {},
} satisfies User;

interface RevalidationExpectation {
  paths?: string[];
  tags?: string[][];
}

/**
 * Replaces the modules that Server Actions depend on (authentication, the
 * Supabase clients, the audit log, revalidation, Redis and the logger) and
 * starts a fake Supabase for the current test file.
 *
 * Before each test, the mocks are cleared and an administrator is signed in.
 * Call it once at the top level of the test file.
 */
export const setupActionTest = () => {
  const supabase = setupSupabase();

  mocks.state.supabase = supabase;

  const signIn = (user: Partial<User> = {}): void => {
    mocks.requireAuthenticatedUser.mockResolvedValue({
      supabaseClient: supabase.client,
      user: { ...TEST_USER, ...user },
    });
  };

  const signOut = (): void => {
    mocks.requireAuthenticatedUser.mockResolvedValue(null);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createAuditLog.mockImplementation(async () => {});
    mocks.createAuditLogs.mockImplementation(async () => {});
    mocks.createSupabaseServerClient.mockResolvedValue(supabase.client);
    mocks.getRedisClient.mockImplementation(() => ({}));
    mocks.revalidateTags.mockImplementation(async () => {});
    signIn();
  });

  return {
    /** `createAuditLog()` of `@/lib/audit-log`. */
    createAuditLog: mocks.createAuditLog,
    /** `createAuditLogs()` of `@/lib/audit-log`. */
    createAuditLogs: mocks.createAuditLogs,
    /** `createSupabaseServerClient()` of `@/lib/supabase`. */
    createSupabaseServerClient: mocks.createSupabaseServerClient,
    /**
     * Asserts that an audit log entry was recorded with these arguments by
     * `createAuditLog()`, with the client of the signed-in user.
     */
    expectAuditLog(
      ...args:
        | [action: AuditAction, targetRecordId: unknown]
        | [action: AuditAction, targetRecordId: unknown, details: unknown]
    ): void {
      expect(mocks.createAuditLog).toHaveBeenCalledWith(
        supabase.client,
        ...args
      );
    },
    /**
     * Asserts that these audit log entries were recorded with one call of
     * `createAuditLogs()`, with the client of the signed-in user, and that
     * nothing else was recorded.
     */
    expectAuditLogs(entries: AuditLogEntry[]): void {
      expect(mocks.createAuditLogs).toHaveBeenCalledExactlyOnceWith(
        supabase.client,
        entries
      );
      expect(mocks.createAuditLog).not.toHaveBeenCalled();
    },
    /** Asserts that no audit log entry was recorded. */
    expectNoAuditLog(): void {
      expect(mocks.createAuditLog).not.toHaveBeenCalled();
      expect(mocks.createAuditLogs).not.toHaveBeenCalled();
    },
    /** Asserts that nothing was revalidated. */
    expectNotRevalidated(): void {
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
      expect(mocks.revalidateTags).not.toHaveBeenCalled();
    },
    /** Asserts that each of these paths and sets of tags was revalidated. */
    expectRevalidated({
      paths = [],
      tags = [],
    }: RevalidationExpectation): void {
      for (const path of paths) {
        expect(mocks.revalidatePath).toHaveBeenCalledWith(path);
      }

      for (const tagSet of tags) {
        expect(mocks.revalidateTags).toHaveBeenCalledWith(tagSet);
      }
    },
    /** `getRedisClient()` of `@/lib/redis`; returns an empty object. */
    getRedisClient: mocks.getRedisClient,
    /** `logger` of `@shinju-date/logger`. */
    logger: mocks.logger,
    /** `requireAuthenticatedUser()` of `@/lib/auth`. */
    requireAuthenticatedUser: mocks.requireAuthenticatedUser,
    /** `revalidatePath()` of `next/cache`. */
    revalidatePath: mocks.revalidatePath,
    /** `revalidateTags()` of `@shinju-date/web-cache`. */
    revalidateTags: mocks.revalidateTags,
    /** Signs in an administrator, with `user` merged into `TEST_USER`. */
    signIn,
    /** Signs out, so `requireAuthenticatedUser()` resolves to `null`. */
    signOut,
    /** The fake Supabase that both clients talk to. */
    supabase,
  };
};

export type ActionTest = ReturnType<typeof setupActionTest>;
