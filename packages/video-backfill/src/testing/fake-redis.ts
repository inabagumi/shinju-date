import { RedisError } from "./redis-error.js";
import { getScriptName, SCRIPT_EMULATIONS } from "./scripts.js";
import type { RedisReply } from "./scripts.js";

type Entry =
  | { type: "list"; value: string[] }
  | { type: "string"; value: string };

interface SetOptions {
  ex?: number;
  nx?: boolean;
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
  if (text === undefined || !/^-?\d+$/u.test(text)) {
    throw new RedisError("ERR value is not an integer or out of range");
  }

  return Number(text);
};

/**
 * Calls `run` at once and returns what it returns as a promise, rejected
 * with what it throws, like an async function does.
 */
const settle = <T>(run: () => T): Promise<T> => {
  try {
    return Promise.resolve(run());
  } catch (error) {
    return Promise.reject(error);
  }
};

/** The arguments of SET for {@link FakeRedis.set}. */
const setCommand = (
  key: string,
  value: unknown,
  options: SetOptions = {}
): string[] => [
  "SET",
  key,
  serialize(value),
  ...(options.ex === undefined ? [] : ["EX", String(options.ex)]),
  ...(options.nx ? ["NX"] : []),
];

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

  del(...keys: string[]): Promise<number> {
    return settle(() => this.#run(["DEL", ...keys]) as number);
  }

  eval(script: string, keys: string[], args: unknown[]): Promise<unknown> {
    return settle(() => {
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
    });
  }

  exists(...keys: string[]): Promise<number> {
    return settle(() => this.#run(["EXISTS", ...keys]) as number);
  }

  expire(key: string, seconds: number): Promise<number> {
    return settle(() => this.#run(["EXPIRE", key, String(seconds)]) as number);
  }

  get<T>(key: string): Promise<T | null> {
    return settle(() => deserialize(this.#run(["GET", key])) as T | null);
  }

  lpush(key: string, ...elements: unknown[]): Promise<number> {
    return settle(
      () => this.#run(["LPUSH", key, ...elements.map(serialize)]) as number
    );
  }

  lrange<T = string>(key: string, start: number, stop: number): Promise<T[]> {
    return settle(
      () =>
        deserialize(
          this.#run(["LRANGE", key, String(start), String(stop)])
        ) as T[]
    );
  }

  mget<T extends unknown[]>(...keys: string[]): Promise<T> {
    return settle(() => deserialize(this.#run(["MGET", ...keys])) as T);
  }

  set(key: string, value: unknown, options?: SetOptions): Promise<"OK" | null> {
    return settle(
      () => this.#run(setCommand(key, value, options)) as "OK" | null
    );
  }

  ttl(key: string): Promise<number> {
    return settle(() => this.#run(["TTL", key]) as number);
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
        return this.#expire(args);
      }
      case "GET": {
        return this.#string(args[0] ?? "");
      }
      case "LPUSH": {
        return this.#lpush(args);
      }
      case "LRANGE": {
        return this.#lrange(args);
      }
      case "MGET": {
        return this.#mget(args);
      }
      case "RPOP": {
        return this.#rpop(args);
      }
      case "SET": {
        return this.#set(args);
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

  #expire([key = "", seconds]: readonly string[]): RedisReply {
    if (!this.#entries.has(key)) {
      return 0;
    }

    this.#ttls.set(key, parseInteger(seconds));

    return 1;
  }

  #lpush([key = "", ...elements]: readonly string[]): RedisReply {
    const list = this.#list(key) ?? [];

    // Each element is pushed to the head in turn.
    list.unshift(...elements.toReversed());
    this.#entries.set(key, { type: "list", value: list });

    return list.length;
  }

  #lrange([key = "", startText, stopText]: readonly string[]): RedisReply {
    const list = this.#list(key) ?? [];
    const start = parseInteger(startText);
    const stop = parseInteger(stopText);

    return list.slice(
      start < 0 ? Math.max(0, list.length + start) : start,
      stop < 0 ? list.length + stop + 1 : stop + 1
    );
  }

  #mget(keys: readonly string[]): RedisReply {
    // MGET replies nil for a key of another type instead of an error.
    return keys.map((key) => {
      const entry = this.#entries.get(key);

      return entry?.type === "string" ? entry.value : null;
    });
  }

  #rpop([key = ""]: readonly string[]): RedisReply {
    const list = this.#list(key);
    const element = list?.pop() ?? null;

    if (list?.length === 0) {
      this.#delete(key);
    }

    return element;
  }

  #set([key = "", value = "", ...options]: readonly string[]): RedisReply {
    let seconds: number | undefined;
    let nx = false;

    for (let i = 0; i < options.length; i += 1) {
      const option = options[i]?.toUpperCase();

      if (option === "EX") {
        i += 1;
        seconds = parseInteger(options[i]);
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
}
