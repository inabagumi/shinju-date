import type { Redis } from "@upstash/redis";
import { vi } from "vitest";

const PIPELINE_COMMANDS = ["get", "hgetall", "scard", "zrange"] as const;

type PipelineCommand = (typeof PIPELINE_COMMANDS)[number];

type Pipeline = ReturnType<Redis["pipeline"]>;

type PipelineCommandMocks = Partial<
  Record<PipelineCommand, (...args: never[]) => unknown>
>;

/**
 * Create a stand-in for `redis.pipeline()` of `@upstash/redis`.
 *
 * Commands are queued and run through the client's own (mocked) command
 * methods in order when `exec()` is called, so tests can keep mocking each
 * command with `mockResolvedValueOnce()` and the like. Like the real
 * pipeline, `exec()` rejects when any command fails.
 */
export function createMockPipeline(client: PipelineCommandMocks): Pipeline {
  const queued: (() => unknown)[] = [];
  const pipeline: Partial<Record<PipelineCommand | "exec", unknown>> = {
    exec: () => Promise.all(queued.map((run) => run())),
  };

  for (const command of PIPELINE_COMMANDS) {
    pipeline[command] = (...args: unknown[]) => {
      const run = client[command];

      if (!run) {
        throw new Error(`${command} is not mocked`);
      }

      queued.push(() => Reflect.apply(run, client, args));

      return pipeline;
    };
  }

  // Only has the commands above and `exec()`
  return pipeline as Partial<Pipeline> as Pipeline;
}

/**
 * Create a stand-in for the `Redis` client of `@upstash/redis` with only the
 * given (mocked) commands, and a mocked `pipeline()` that runs them through
 * `createMockPipeline()`. Calling any other command fails.
 */
export function createMockRedisClient(
  commands: Partial<Record<keyof Redis, (...args: never[]) => unknown>>
): Redis {
  const client: Partial<Record<keyof Redis, unknown>> = {
    ...commands,
    pipeline: vi.fn<Redis["pipeline"]>(() => createMockPipeline(commands)),
  };

  // Only has the given commands and `pipeline()`
  return client as Partial<Redis> as Redis;
}
