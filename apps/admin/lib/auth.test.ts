import { AuthError } from "@supabase/supabase-js";
import type { User, UserResponse } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  createSupabaseServerClient,
  TypedSupabaseClient,
} from "@/lib/supabase";

type AuthClient = TypedSupabaseClient["auth"];

const { createSupabaseServerClientMock, getUserMock } = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn<() => Promise<TypedSupabaseClient>>(),
  getUserMock: vi.fn<AuthClient["getUser"]>(),
}));

vi.mock(import("@/lib/supabase"), () => ({
  // Always resolves to the client of the default database
  createSupabaseServerClient:
    createSupabaseServerClientMock as typeof createSupabaseServerClient,
}));

import {
  requireAuthenticatedUser,
  UNAUTHENTICATED_ERROR_MESSAGE,
  unauthenticatedFormState,
  unauthenticatedResult,
} from "./auth";

describe(requireAuthenticatedUser, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createSupabaseServerClientMock.mockResolvedValue({
      auth: { getUser: getUserMock } as Partial<AuthClient> as AuthClient,
    } as Partial<TypedSupabaseClient> as TypedSupabaseClient);
  });

  it("returns the user and Supabase client when authenticated", async () => {
    const user: User = {
      app_metadata: { provider: "email", role: "admin" },
      aud: "authenticated",
      created_at: "2024-01-01T00:00:00Z",
      email: "admin@example.com",
      id: "user-id",
      user_metadata: {},
    };
    getUserMock.mockResolvedValue({ data: { user }, error: null });

    const result = await requireAuthenticatedUser();

    expect(result).not.toBeNull();
    expect(result?.user).toBe(user);
    expect(result?.supabaseClient.auth.getUser).toBe(getUserMock);
  });

  it("returns null when the user does not have the admin role", async () => {
    const user: User = {
      app_metadata: { provider: "email" },
      aud: "authenticated",
      created_at: "2024-01-01T00:00:00Z",
      email: "someone@example.com",
      id: "user-id",
      user_metadata: {},
    };
    getUserMock.mockResolvedValue({ data: { user }, error: null });

    await expect(requireAuthenticatedUser()).resolves.toBeNull();
  });

  it("returns null when getUser returns an error", async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: new AuthError("Auth session missing!"),
    });

    await expect(requireAuthenticatedUser()).resolves.toBeNull();
  });

  it("returns null when there is no user", async () => {
    // Not in the type of the response, but handled in case Supabase returns it
    const response: { data: { user: User | null }; error: null } = {
      data: { user: null },
      error: null,
    };
    getUserMock.mockResolvedValue(response as UserResponse);

    await expect(requireAuthenticatedUser()).resolves.toBeNull();
  });

  it("returns null when the Supabase client cannot be created", async () => {
    createSupabaseServerClientMock.mockRejectedValue(
      new TypeError("Supabase URL and key are required.")
    );

    await expect(requireAuthenticatedUser()).resolves.toBeNull();
  });

  it("returns null when getUser throws", async () => {
    getUserMock.mockRejectedValue(new Error("network error"));

    await expect(requireAuthenticatedUser()).resolves.toBeNull();
  });
});

describe("unauthenticated responses", () => {
  it("builds a failed result for success/error style actions", () => {
    expect(unauthenticatedResult()).toStrictEqual({
      error: UNAUTHENTICATED_ERROR_MESSAGE,
      success: false,
    });
  });

  it("builds a FormState with a generic error for form actions", () => {
    expect(unauthenticatedFormState()).toStrictEqual({
      errors: {
        generic: [UNAUTHENTICATED_ERROR_MESSAGE],
      },
    });
  });
});
