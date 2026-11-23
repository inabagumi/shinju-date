import { HttpResponse, http } from "msw";

import {
  ensureCollectionsSeeded,
  talents,
  terms,
  videos,
} from "../../collections.js";
import {
  createRedisDataFactory,
  createSummarySnapshots,
} from "../../redis-factory.js";
import {
  isSupportedCommand,
  runCommand,
  unknownCommandError,
} from "./commands.js";
import type { RedisReply } from "./commands.js";
import { RedisError } from "./errors.js";
import { MockRedisStore } from "./store.js";

/**
 * Mock handlers of the REST API of Upstash Redis, backed by an in-memory
 * store (`store.ts`) and the commands of `commands.ts`.
 */

const UPSTASH_URL = "https://fake.upstash.test";

// The click data uses the videos of the Supabase mock, so that the apps can
// look up the clicked videos and talents.
await ensureCollectionsSeeded();

const allVideos = await videos.findMany();
const clickableVideos = allVideos.filter(
  (video) => video.visible && video.deleted_at === null
);

/** The data of the mock Redis, seeded with the last 7 days in TIME_ZONE. */
export const mockRedisStore = new MockRedisStore();

const seedData = createRedisDataFactory(7, { videos: clickableVideos });

for (const [key, value] of seedData) {
  mockRedisStore.set(
    key,
    value instanceof Set
      ? { type: "set", value: new Set(value) }
      : {
          type: "zset",
          value: new Map(value.map(({ member, score }) => [member, score])),
        }
  );
}

// The snapshots of the counts for the dashboard of admin, counted like
// `countSummaryStats` of `@shinju-date/dashboard-stats`
const existingVideos = allVideos.filter((video) => video.deleted_at === null);
const summarySnapshots = createSummarySnapshots({
  deletedVideos: allVideos.length - existingVideos.length,
  hiddenVideos: existingVideos.filter((video) => !video.visible).length,
  scheduledVideos: existingVideos.filter(
    (video) => video.visible && video.status === "UPCOMING"
  ).length,
  totalTalents: talents
    .findMany()
    .filter((talent) => talent.deleted_at === null).length,
  totalTerms: terms.findMany().length,
  totalVideos: existingVideos.length,
  visibleVideos: existingVideos.filter(
    (video) =>
      video.visible &&
      (video.status === "ENDED" ||
        video.status === "LIVE" ||
        video.status === "PUBLISHED")
  ).length,
});

for (const [key, snapshot] of summarySnapshots) {
  mockRedisStore.set(key, { type: "string", value: JSON.stringify(snapshot) });
}

console.error(
  "🎯 MSW Redis mock data initialized with dates:",
  [
    ...new Set(
      [...seedData.keys()]
        .filter((key) => key.includes(":clicked:"))
        .map((key) => key.split(":").pop())
    ),
  ].toSorted()
);

/** The reply of a command in a response of Upstash. */
type CommandResult = { result: RedisReply } | { error: string };

/** Run a command and reply `{ result }`, or `{ error }` when it fails. */
const execute = (command: unknown): CommandResult => {
  try {
    if (!Array.isArray(command)) {
      throw new RedisError("ERR failed to parse command");
    }

    return { result: runCommand(mockRedisStore, command) };
  } catch (error) {
    if (error instanceof RedisError) {
      return { error: error.message };
    }

    throw error;
  }
};

/** A single command: `{ result }`, or `{ error }` with 400 like Upstash. */
const replyToCommand = (command: unknown): Response => {
  const reply = execute(command);

  return HttpResponse.json(reply, { status: "error" in reply ? 400 : 200 });
};

/**
 * A pipeline: the reply of each command in order. A failing command does not
 * stop the others.
 */
const replyToPipeline = async (request: Request): Promise<Response> => {
  const commands = (await request.json()) as unknown[];

  return HttpResponse.json(commands.map(execute));
};

/**
 * A transaction (`MULTI` … `EXEC`). Like Redis, an unknown command aborts
 * the whole transaction before anything runs, while a command that fails
 * when it runs (such as `WRONGTYPE`) does not stop the others.
 */
const replyToTransaction = async (request: Request): Promise<Response> => {
  const commands = (await request.json()) as unknown[];

  for (const command of commands) {
    const [name, ...args] = Array.isArray(command) ? command : [];

    if (typeof name !== "string" || !isSupportedCommand(name)) {
      return HttpResponse.json(
        {
          error: `EXECABORT Transaction discarded because of previous errors: ${unknownCommandError(String(name), args).message}`,
        },
        { status: 400 }
      );
    }
  }

  return HttpResponse.json(commands.map(execute));
};

export const upstashHandlers = [
  http.post(`${UPSTASH_URL}/pipeline`, ({ request }) =>
    replyToPipeline(request)
  ),
  http.post(`${UPSTASH_URL}/v2/pipeline`, ({ request }) =>
    replyToPipeline(request)
  ),
  http.post(`${UPSTASH_URL}/v2/*/pipeline`, ({ request }) =>
    replyToPipeline(request)
  ),

  http.post(`${UPSTASH_URL}/multi-exec`, ({ request }) =>
    replyToTransaction(request)
  ),

  // A single command as the body, such as `["GET", "key"]`
  http.post(`${UPSTASH_URL}/`, async ({ request }) =>
    replyToCommand(await request.json())
  ),

  // A single command in the path with its arguments as the body, such as
  // `/v2/get` with `["key"]`
  http.post(`${UPSTASH_URL}/v2/:command`, async ({ params, request }) => {
    const body = await request.json();

    return replyToCommand([
      String(params["command"]),
      ...(Array.isArray(body) ? body : []),
    ]);
  }),
];
