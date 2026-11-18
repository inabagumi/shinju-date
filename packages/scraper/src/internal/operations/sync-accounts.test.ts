import { beforeEach, describe, expect, it, vi } from "vitest";

import { YOUTUBE_CHANNELS } from "../database/index.js";
import type { ProfileImageSyncResult } from "../profile-images/index.js";
import { createTestContext } from "../testing/context.js";
import { postgresError, setupSupabase } from "../testing/supabase.js";
import { countUpdatedAccounts, syncAccountsWith } from "./sync-accounts.js";
import type { AccountAdapter } from "./sync-accounts.js";

interface FakeFields {
  name: string;
  youtube_handle: string | null;
}

interface FakeSaved extends FakeFields {
  id: string;
  youtube_channel_id: string;
}

interface FakeAccount {
  handle: string | null;
  id: string;
  title: string;
}

const supabase = setupSupabase();
const reportError = vi.fn();
const context = createTestContext({
  fetcher: null,
  reportError,
  supabaseClient: supabase.supabaseClient,
});

const savedAccounts: FakeSaved[] = [
  {
    id: "row-a",
    name: "Alice",
    youtube_channel_id: "a",
    youtube_handle: "@alice",
  },
  { id: "row-b", name: "Bob", youtube_channel_id: "b", youtube_handle: null },
];

/** A database holding `savedAccounts`, both owned by `talent-1`. */
function respondWithSavedAccounts() {
  supabase.respondWith({
    "GET talents": [{ id: "talent-1", youtube_channels: savedAccounts }],
  });
}

/** A platform that returns `accounts` and writes nothing for real. */
function createAdapter(accounts: FakeAccount[]) {
  const adapter = {
    accountTable: YOUTUBE_CHANNELS,
    getAccounts: vi.fn(async (ids: readonly string[]) =>
      accounts.filter((account) => ids.includes(account.id))
    ),
    getPlatformId: (saved: FakeSaved) => saved.youtube_channel_id,
    label: "テストのアカウント",
    platformIdKey: "testAccountId",
    savedAccountColumns: "id, name, youtube_channel_id, youtube_handle",
    syncIcon: vi.fn(async (): Promise<ProfileImageSyncResult> => "unchanged"),
    toDetails: vi.fn((account: FakeAccount) => ({
      name: account.title,
      youtube_handle: account.handle,
    })),
    updateDetails: vi.fn(async () => {}),
  } satisfies AccountAdapter<FakeAccount, FakeSaved, FakeFields>;

  return adapter;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("syncAccountsWith", () => {
  it("loads the saved accounts of non-deleted talents from the table of the adapter", async () => {
    respondWithSavedAccounts();
    const adapter = createAdapter([]);

    await syncAccountsWith(context, adapter);

    expect(supabase.requests[0]?.query).toEqual({
      deleted_at: "is.null",
      select:
        "id,youtube_channels!inner(id,name,youtube_channel_id,youtube_handle)",
    });
    expect(adapter.getAccounts).toHaveBeenCalledWith(["a", "b"]);
  });

  it("loads the accounts of one talent only when asked to", async () => {
    respondWithSavedAccounts();

    await syncAccountsWith(context, createAdapter([]), {
      talentId: "talent-1",
    });

    expect(supabase.requests[0]?.query).toMatchObject({ id: "eq.talent-1" });
  });

  it("writes only the details that changed and syncs every icon", async () => {
    respondWithSavedAccounts();
    const adapter = createAdapter([
      { handle: "@alice", id: "a", title: "Alice" },
      { handle: "@bob", id: "b", title: "Bob" },
    ]);

    const results = await syncAccountsWith(context, adapter);

    expect(adapter.updateDetails).toHaveBeenCalledOnce();
    expect(adapter.updateDetails).toHaveBeenCalledWith(
      context,
      savedAccounts[1],
      { name: "Bob", youtube_handle: "@bob" }
    );
    expect(adapter.syncIcon).toHaveBeenCalledTimes(2);
    expect(results).toEqual([
      {
        accountId: "row-a",
        iconUpdated: false,
        name: "Alice",
        status: "unchanged",
      },
      {
        accountId: "row-b",
        changes: {
          after: { youtube_handle: "@bob" },
          before: { youtube_handle: null },
        },
        iconUpdated: false,
        name: "Bob",
        status: "updated",
      },
    ]);
    expect(reportError).not.toHaveBeenCalled();
  });

  it("reports an account the platform does not return as not found", async () => {
    respondWithSavedAccounts();
    const adapter = createAdapter([{ handle: null, id: "b", title: "Bob" }]);

    const [result] = await syncAccountsWith(context, adapter);

    expect(result).toEqual({
      accountId: "row-a",
      iconUpdated: false,
      name: "Alice",
      status: "not-found",
    });
    expect(adapter.syncIcon).toHaveBeenCalledOnce();
  });

  it("still syncs the icon when the details cannot be written", async () => {
    respondWithSavedAccounts();
    const adapter = createAdapter([
      { handle: "@alice_new", id: "a", title: "Alice" },
    ]);
    const error = new Error("duplicate key value");
    adapter.updateDetails.mockRejectedValue(error);
    adapter.syncIcon.mockResolvedValue("replaced");

    const [result] = await syncAccountsWith(context, adapter);

    expect(adapter.syncIcon).toHaveBeenCalledOnce();
    expect(result).toEqual({
      accountId: "row-a",
      iconUpdated: true,
      name: "Alice",
      status: "failed",
    });
    expect(reportError).toHaveBeenCalledOnce();
    expect(reportError).toHaveBeenCalledWith(error, { testAccountId: "a" });
  });

  it("still reports the details when the icon cannot be synced", async () => {
    respondWithSavedAccounts();
    const adapter = createAdapter([{ handle: "@bob", id: "b", title: "Bob" }]);
    const error = new Error("not an image");
    adapter.syncIcon.mockRejectedValue(error);

    const [, result] = await syncAccountsWith(context, adapter);

    expect(result).toMatchObject({ iconUpdated: false, status: "updated" });
    expect(adapter.updateDetails).toHaveBeenCalledOnce();
    expect(reportError).toHaveBeenCalledWith(error, {
      operation: "syncProfileImage",
      testAccountId: "b",
    });
  });

  it("keeps one failing account from stopping the others", async () => {
    respondWithSavedAccounts();
    const adapter = createAdapter([
      { handle: "@alice", id: "a", title: "Alice" },
      { handle: "@bob", id: "b", title: "Bob" },
    ]);
    const error = new Error("unexpected");
    adapter.toDetails.mockImplementationOnce(() => {
      throw error;
    });

    const results = await syncAccountsWith(context, adapter);

    expect(results.map(({ status }) => status)).toEqual(["failed", "updated"]);
    expect(adapter.updateDetails).toHaveBeenCalledWith(
      context,
      savedAccounts[1],
      { name: "Bob", youtube_handle: "@bob" }
    );
    expect(reportError).toHaveBeenCalledWith(error, { testAccountId: "a" });
  });

  it("returns nothing without asking the platform when there are no accounts", async () => {
    supabase.respond(() => []);
    const adapter = createAdapter([]);

    await expect(syncAccountsWith(context, adapter)).resolves.toEqual([]);
    expect(adapter.getAccounts).not.toHaveBeenCalled();
  });

  it("fails when the accounts cannot be loaded", async () => {
    supabase.respond(() => postgresError("42501", "permission denied"));

    await expect(syncAccountsWith(context, createAdapter([]))).rejects.toThrow(
      "permission denied"
    );
  });
});

describe("countUpdatedAccounts", () => {
  it("counts the accounts whose details or icon were written", () => {
    expect(
      countUpdatedAccounts([
        { accountId: "1", iconUpdated: false, name: null, status: "updated" },
        { accountId: "2", iconUpdated: false, name: null, status: "unchanged" },
        { accountId: "3", iconUpdated: true, name: null, status: "failed" },
        { accountId: "4", iconUpdated: false, name: null, status: "failed" },
        { accountId: "5", iconUpdated: false, name: null, status: "not-found" },
      ])
    ).toBe(2);
  });
});
