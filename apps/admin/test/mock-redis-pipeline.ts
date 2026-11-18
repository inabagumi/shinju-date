const PIPELINE_COMMANDS = ["get", "hgetall", "scard", "zrange"] as const;

type PipelineCommand = (typeof PIPELINE_COMMANDS)[number];

type CommandMock = (...args: unknown[]) => unknown;

/**
 * Create a stand-in for `redis.pipeline()` of `@upstash/redis`.
 *
 * Commands are queued and run through the client's own (mocked) command
 * methods in order when `exec()` is called, so tests can keep mocking each
 * command with `mockResolvedValueOnce()` and the like. Like the real
 * pipeline, `exec()` rejects when any command fails.
 */
export function createMockPipeline(
  client: Partial<Record<PipelineCommand, CommandMock>>
) {
  const queued: (() => unknown)[] = [];
  const pipeline: Record<string, unknown> = {
    exec: () => Promise.all(queued.map((run) => run())),
  };

  for (const command of PIPELINE_COMMANDS) {
    pipeline[command] = (...args: unknown[]) => {
      const run = client[command];

      if (!run) {
        throw new Error(`${command} is not mocked`);
      }

      queued.push(() => run(...args));

      return pipeline;
    };
  }

  return pipeline;
}
