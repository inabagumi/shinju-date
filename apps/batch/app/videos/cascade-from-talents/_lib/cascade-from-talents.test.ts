import { DatabaseError } from "@shinju-date/scraper";
import type * as TemporalFns from "@shinju-date/temporal-fns";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  CascadePhaseError,
  cascadeVideosFromTalents,
} from "./cascade-from-talents";

vi.mock(import("@shinju-date/temporal-fns"), () => ({
  toDBString: vi.fn<typeof TemporalFns.toDBString>((instant) =>
    instant.toString()
  ),
}));

vi.spyOn(Temporal.Now, "instant").mockReturnValue(
  Temporal.Instant.from("2026-08-02T12:00:00Z")
);

interface QueryResult {
  data: unknown;
  error: { message: string } | null;
}

interface MockCall {
  table: string;
  method: string;
  args: unknown[];
}

interface RpcCall {
  name: string;
  args: Record<string, unknown>;
}

/**
 * Builds a Supabase client mock: `from('videos')` is a thenable query that
 * records chain calls and resolves with `onSelectVideos()` when awaited, and
 * `rpc()` records the call and resolves with `onRpc()` (by default, every ID
 * passed in, as if the function updated them all).
 */
const createClientMock = (options: {
  onSelectVideos: () => QueryResult;
  onRpc?: (call: RpcCall) => QueryResult | undefined;
}) => {
  const calls: MockCall[] = [];
  const rpcCalls: RpcCall[] = [];

  const createQuery = (table: string) => {
    // Deferred thenable: resolve only when awaited so the chain is recorded
    // first.
    const thenable = {
      // oxlint-disable-next-line unicorn/no-thenable -- intentional thenable mock for Supabase query chains
      then(
        onfulfilled?: ((value: QueryResult) => unknown) | null,
        onrejected?: ((reason: unknown) => unknown) | null
      ) {
        return Promise.resolve()
          .then(options.onSelectVideos)
          .then(onfulfilled, onrejected);
      },
    };

    const record =
      (method: string) =>
      (...args: unknown[]) => {
        calls.push({ args, method, table });
        return thenable;
      };

    Object.assign(thenable, {
      eq: record("eq"),
      is: record("is"),
      limit: record("limit"),
      not: record("not"),
      order: record("order"),
      select: record("select"),
    });

    return thenable;
  };

  const from =
    vi.fn<(table: string) => ReturnType<typeof createQuery>>(createQuery);
  const rpc = vi.fn<
    (name: string, args: Record<string, unknown>) => Promise<QueryResult>
  >(async (name, args) => {
    const call = { args, name };

    rpcCalls.push(call);

    return options.onRpc?.(call) ?? { data: args["p_video_ids"], error: null };
  });

  return { calls, client: { from, rpc }, rpcCalls };
};

describe(cascadeVideosFromTalents, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("soft-deletes undeleted videos under deleted talents as talent_deleted", async () => {
    let selectPhase = 0;

    const { client, calls, rpcCalls } = createClientMock({
      onSelectVideos: () => {
        selectPhase++;
        if (selectPhase === 1) {
          return {
            data: [{ id: "video-1" }, { id: "video-2" }],
            error: null,
          };
        }
        // restore candidates
        return { data: [], error: null };
      },
    });

    const result = await cascadeVideosFromTalents(client as never);

    expect(result).toStrictEqual({ restored: 0, softDeleted: 2 });
    // The function deletes the thumbnails with the videos.
    expect(rpcCalls).toStrictEqual([
      {
        args: {
          p_deleted_at: "2026-08-02T12:00:00Z",
          p_reason: "talent_deleted",
          p_video_ids: ["video-1", "video-2"],
        },
        name: "soft_delete_videos",
      },
    ]);

    // Soft-delete path filters on parent talent deleted_at
    expect(
      calls.some(
        (call) =>
          call.table === "videos" &&
          call.method === "not" &&
          call.args[0] === "talents.deleted_at"
      )
    ).toBeTruthy();
  });

  it("counts only the videos the function soft-deleted", async () => {
    let selectPhase = 0;

    const { client } = createClientMock({
      onRpc: () => ({ data: ["video-2"], error: null }),
      onSelectVideos: () => {
        selectPhase++;
        return selectPhase === 1
          ? { data: [{ id: "video-1" }, { id: "video-2" }], error: null }
          : { data: [], error: null };
      },
    });

    const result = await cascadeVideosFromTalents(client as never);

    // video-1 was deleted meanwhile (for example, withdrawn by an admin).
    expect(result).toStrictEqual({ restored: 0, softDeleted: 1 });
  });

  it("restores only videos marked talent_deleted under active talents", async () => {
    let selectPhase = 0;

    const { client, calls, rpcCalls } = createClientMock({
      onSelectVideos: () => {
        selectPhase++;
        if (selectPhase === 1) {
          return { data: [], error: null };
        }
        return {
          data: [{ id: "cascade-video" }],
          error: null,
        };
      },
    });

    const result = await cascadeVideosFromTalents(client as never);

    expect(result).toStrictEqual({ restored: 1, softDeleted: 0 });
    // The function restores only the videos still deleted as talent_deleted,
    // with their thumbnails.
    expect(rpcCalls).toStrictEqual([
      {
        args: { p_reason: "talent_deleted", p_video_ids: ["cascade-video"] },
        name: "restore_videos",
      },
    ]);

    // Restore path selects only deleted_reason = talent_deleted
    expect(
      calls.some(
        (call) =>
          call.table === "videos" &&
          call.method === "eq" &&
          call.args[0] === "deleted_reason" &&
          call.args[1] === "talent_deleted"
      )
    ).toBeTruthy();

    // Active talent: talents.deleted_at IS NULL
    expect(
      calls.some(
        (call) =>
          call.table === "videos" &&
          call.method === "is" &&
          call.args[0] === "talents.deleted_at" &&
          call.args[1] === null
      )
    ).toBeTruthy();
  });

  it("returns zeros when there is nothing to process", async () => {
    const { client, rpcCalls } = createClientMock({
      onSelectVideos: () => ({ data: [], error: null }),
    });

    const result = await cascadeVideosFromTalents(client as never);

    expect(result).toStrictEqual({ restored: 0, softDeleted: 0 });
    expect(rpcCalls).toStrictEqual([]);
  });

  it("preserves soft-delete count when restore phase fails", async () => {
    let selectPhase = 0;

    const { client } = createClientMock({
      onSelectVideos: () => {
        selectPhase++;
        if (selectPhase === 1) {
          return {
            data: [{ id: "to-delete" }],
            error: null,
          };
        }
        return {
          data: null,
          error: { message: "restore select failed" },
        };
      },
    });

    await expect(cascadeVideosFromTalents(client as never)).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof CascadePhaseError &&
        error.softDeleted === 1 &&
        error.restored === 0 &&
        error.message.includes("softDeleted=1")
    );
  });

  it("throws CascadePhaseError with a DatabaseError when a function fails", async () => {
    const { client } = createClientMock({
      onRpc: ({ name }) =>
        name === "soft_delete_videos"
          ? { data: null, error: { message: "soft delete failed" } }
          : undefined,
      onSelectVideos: () => ({ data: [{ id: "video-1" }], error: null }),
    });

    const error = await cascadeVideosFromTalents(client as never).catch(
      (error: unknown) => error
    );

    expect(error).toBeInstanceOf(CascadePhaseError);
    expect((error as CascadePhaseError).softDeleted).toBe(0);
    expect((error as CascadePhaseError).restored).toBe(1);
    expect((error as Error).cause).toBeInstanceOf(DatabaseError);
    expect(((error as Error).cause as DatabaseError).operation).toBe(
      "Failed to soft-delete videos of deleted talents"
    );
  });

  it("throws CascadePhaseError when select for soft-delete fails", async () => {
    const { client } = createClientMock({
      onSelectVideos: () => ({
        data: null,
        error: { message: "db error" },
      }),
    });

    await expect(cascadeVideosFromTalents(client as never)).rejects.toThrow(
      CascadePhaseError
    );
    await expect(cascadeVideosFromTalents(client as never)).rejects.toThrow(
      "db error"
    );

    const error = await cascadeVideosFromTalents(client as never).catch(
      (error: unknown) => error
    );
    const causes = (error as Error).cause as AggregateError;

    expect(causes).toBeInstanceOf(AggregateError);
    expect(causes.errors).toStrictEqual([
      expect.any(DatabaseError),
      expect.any(DatabaseError),
    ]);
    expect(causes.errors.map((cause) => cause.operation)).toStrictEqual([
      "Failed to load videos of deleted talents",
      "Failed to load videos of restored talents",
    ]);
  });

  it("soft-deletes and restores in the same run when both exist", async () => {
    let selectPhase = 0;

    const { client, rpcCalls } = createClientMock({
      onSelectVideos: () => {
        selectPhase++;
        if (selectPhase === 1) {
          return {
            data: [{ id: "to-delete" }],
            error: null,
          };
        }
        return {
          data: [{ id: "to-restore" }],
          error: null,
        };
      },
    });

    const result = await cascadeVideosFromTalents(client as never);

    expect(result).toStrictEqual({ restored: 1, softDeleted: 1 });
    expect(
      rpcCalls.map(({ args, name }) => [name, args["p_video_ids"]])
    ).toStrictEqual([
      ["soft_delete_videos", ["to-delete"]],
      ["restore_videos", ["to-restore"]],
    ]);
  });
});
