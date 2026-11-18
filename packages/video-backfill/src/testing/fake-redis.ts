import { getScriptName, SCRIPT_EMULATIONS } from "./scripts.js";
import type { RedisReply } from "./scripts.js";

type Entry =
  | { type: "list"; value: string[] }
  | { type: "string"; value: string };

interface SetOptions {
  ex?: number;
  nx?: boolean;
}

class RedisError extends Error {
  override name = "RedisError";
}

const wrongTypeError = (): RedisError =>
  new RedisError(
    "WRONGTYPE Operation against a key holding the wrong kind of value"
  );

/** Turns a value into the string Redis keeps, like `@upstash/redis` does. */
const serialize = (value: unknown): string =>
  typeof value === "string" ? value : JSON.stringify(value);

/**
 * Turns a reply back into a value, like the automatic deserialization of
 * `@upstash/redis`: JSON is parsed, anything else is kept as it is.
 */
const deserialize = (reply: RedisReply): unknown => {
  if (Array.isArray(reply)) {
    return reply.map(deserialize);
  }

  if (typeof reply !== "string") {
    return reply;
  }

  try {
    const value: unknown = JSON.parse(reply);

    // Like `@upstash/redis`, a number that does not read back the same
    // (e.g. `"007"`) is kept as a string.
    return typeof value === "number" && String(value) !== reply ? reply : value;
  } catch {
    return reply;
  }
};

const parseInteger = (text: string | undefined): number => {
  if (text === undefined || !/^-?\d+$/.test(text)) {
    throw new RedisError("ERR value is not an integer or out of range");
  }

  return Number(text);
};

/**
 * The subset of `@upstash/redis` that the queue uses, kept in memory, for
 * tests that do not have Redis. Values are kept as the strings Redis keeps,
 * and the scripts of the queue are run with {@link SCRIPT_EMULATIONS}.
 *
 * Expiry times are kept but do not run out; a test deletes a key to let it
 * expire.
 *
 * ```ts
 * const queue = new BackfillQueue(new FakeRedis() as unknown as Redis)
 * ```
 */
export class FakeRedis {
  readonly #entries = new Map<string, Entry>();
  readonly #ttls = new Map<string, number>();

  async del(...keys: string[]): Promise<number> {
    return this.#run(["DEL", ...keys]) as number;
  }

  async eval(
    script: string,
    keys: string[],
    args: unknown[]
  ): Promise<unknown> {
    const name = getScriptName(script);
    const emulate = name === undefined ? undefined : SCRIPT_EMULATIONS[name];

    if (!emulate) {
      throw new RedisError(
        `ERR FakeRedis cannot run this script (known: ${Object.keys(SCRIPT_EMULATIONS).join(", ")})`
      );
    }

    // Runs without awaiting, so no other command gets in between, as in
    // Redis.
    return deserialize(
      emulate((...command) => this.#run(command), keys, args.map(serialize))
    );
  }

  async exists(...keys: string[]): Promise<number> {
    return this.#run(["EXISTS", ...keys]) as number;
  }

  async expire(key: string, seconds: number): Promise<number> {
    return this.#run(["EXPIRE", key, String(seconds)]) as number;
  }

  async get<T>(key: string): Promise<T | null> {
    return deserialize(this.#run(["GET", key])) as T | null;
  }

  async lpush(key: string, ...elements: unknown[]): Promise<number> {
    return this.#run(["LPUSH", key, ...elements.map(serialize)]) as number;
  }

  async lrange<T = string>(
    key: string,
    start: number,
    stop: number
  ): Promise<T[]> {
    return deserialize(
      this.#run(["LRANGE", key, String(start), String(stop)])
    ) as T[];
  }

  async mget<T extends unknown[]>(...keys: string[]): Promise<T> {
    return deserialize(this.#run(["MGET", ...keys])) as T;
  }

  async set(
    key: string,
    value: unknown,
    options?: SetOptions
  ): Promise<"OK" | null> {
    return this.#run(this.#setCommand(key, value, options)) as "OK" | null;
  }

  async ttl(key: string): Promise<number> {
    return this.#run(["TTL", key]) as number;
  }

  #setCommand(key: string, value: unknown, options: SetOptions = {}) {
    return [
      "SET",
      key,
      serialize(value),
      ...(options.ex === undefined ? [] : ["EX", String(options.ex)]),
      ...(options.nx ? ["NX"] : []),
    ];
  }

  #delete(key: string): boolean {
    this.#ttls.delete(key);

    return this.#entries.delete(key);
  }

  #list(key: string): string[] | undefined {
    const entry = this.#entries.get(key);

    if (entry && entry.type !== "list") {
      throw wrongTypeError();
    }

    return entry?.value;
  }

  #string(key: string): string | null {
    const entry = this.#entries.get(key);

    if (entry && entry.type !== "string") {
      throw wrongTypeError();
    }

    return entry?.value ?? null;
  }

  /** Runs a command with the semantics of Redis, and returns its reply. */
  #run([name = "", ...args]: readonly string[]): RedisReply {
    switch (name.toUpperCase()) {
      case "DEL": {
        return args.filter((key) => this.#delete(key)).length;
      }
      case "EXISTS": {
        return args.filter((key) => this.#entries.has(key)).length;
      }
      case "EXPIRE": {
        const [key = "", seconds] = args;

        if (!this.#entries.has(key)) {
          return 0;
        }

        this.#ttls.set(key, parseInteger(seconds));

        return 1;
      }
      case "GET": {
        return this.#string(args[0] ?? "");
      }
      case "LPUSH": {
        const [key = "", ...elements] = args;
        const list = this.#list(key) ?? [];

        // Each element is pushed to the head in turn.
        list.unshift(...elements.reverse());
        this.#entries.set(key, { type: "list", value: list });

        return list.length;
      }
      case "LRANGE": {
        const [key = "", startText, stopText] = args;
        const list = this.#list(key) ?? [];
        const start = parseInteger(startText);
        const stop = parseInteger(stopText);

        return list.slice(
          start < 0 ? Math.max(0, list.length + start) : start,
          stop < 0 ? list.length + stop + 1 : stop + 1
        );
      }
      case "MGET": {
        // MGET replies nil for a key of another type instead of an error.
        return args.map((key) => {
          const entry = this.#entries.get(key);

          return entry?.type === "string" ? entry.value : null;
        });
      }
      case "RPOP": {
        const key = args[0] ?? "";
        const list = this.#list(key);
        const element = list?.pop() ?? null;

        if (list?.length === 0) {
          this.#delete(key);
        }

        return element;
      }
      case "SET": {
        const [key = "", value = "", ...options] = args;
        let seconds: number | undefined;
        let nx = false;

        for (let i = 0; i < options.length; i++) {
          const option = options[i]?.toUpperCase();

          if (option === "EX") {
            seconds = parseInteger(options[++i]);
          } else if (option === "NX") {
            nx = true;
          } else {
            throw new RedisError("ERR syntax error");
          }
        }

        if (nx && this.#entries.has(key)) {
          return null;
        }

        // SET replaces a key of any type, and its expiry time.
        this.#delete(key);
        this.#entries.set(key, { type: "string", value });

        if (seconds !== undefined) {
          this.#ttls.set(key, seconds);
        }

        return "OK";
      }
      case "TTL": {
        const key = args[0] ?? "";

        return this.#entries.has(key) ? (this.#ttls.get(key) ?? -1) : -2;
      }
      default: {
        throw new RedisError(`ERR unknown command '${name}'`);
      }
    }
  }
}
