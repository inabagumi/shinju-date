/**
 * The in-memory data of the mock Redis: the values of the keys, with their
 * types and expiry times.
 */

/** The values of the keys of each Redis type. */
interface RedisValueTypes {
  hash: Map<string, string>;
  list: string[];
  set: Set<string>;
  string: string;
  zset: Map<string, number>;
}

export type RedisType = keyof RedisValueTypes;

/** The value of a key of the given type. */
export type RedisValueOf<Type extends RedisType> = RedisValueTypes[Type];

/** A value of a key, with its Redis type. */
export type RedisValue = {
  [Type in RedisType]: { type: Type; value: RedisValueTypes[Type] };
}[RedisType];

interface Entry {
  expiresAt: Temporal.Instant | null;
  value: RedisValue;
}

/** An error reply of Redis, such as `WRONGTYPE …` or `ERR syntax error`. */
export class RedisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RedisError";
  }
}

/** The error of a command on a key of another type. */
export function wrongTypeError(): RedisError {
  return new RedisError(
    "WRONGTYPE Operation against a key holding the wrong kind of value"
  );
}

/**
 * The keys of the mock Redis. A key whose expiry time has passed is removed
 * when it is accessed, so the TTLs that the apps set take effect.
 */
export class MockRedisStore {
  readonly #entries = new Map<string, Entry>();

  #getEntry(key: string): Entry | undefined {
    const entry = this.#entries.get(key);

    if (
      entry?.expiresAt &&
      Temporal.Instant.compare(entry.expiresAt, Temporal.Now.instant()) <= 0
    ) {
      this.#entries.delete(key);

      return undefined;
    }

    return entry;
  }

  /** The value of a key, or `undefined` when it does not exist. */
  get(key: string): RedisValue | undefined {
    return this.#getEntry(key)?.value;
  }

  /**
   * The value of a key of the given type, or `undefined` when it does not
   * exist. A key of another type is a `WRONGTYPE` error.
   */
  getOf<Type extends RedisType>(
    key: string,
    type: Type
  ): RedisValueOf<Type> | undefined {
    const value = this.get(key);

    if (value === undefined) {
      return undefined;
    }

    if (value.type !== type) {
      throw wrongTypeError();
    }

    return value.value as RedisValueOf<Type>;
  }

  /**
   * The value of a key of the given type, created empty when the key does
   * not exist (like the commands that write to a list, a set and so on).
   */
  getOrCreate<Type extends Exclude<RedisType, "string">>(
    key: string,
    type: Type
  ): RedisValueOf<Type> {
    const current = this.getOf(key, type);

    if (current !== undefined) {
      return current;
    }

    const value = (
      type === "list" ? [] : type === "set" ? new Set() : new Map()
    ) as RedisValueOf<Type>;

    this.set(key, { type, value } as RedisValue, { keepTtl: false });

    return value;
  }

  has(key: string): boolean {
    return this.#getEntry(key) !== undefined;
  }

  /**
   * Set the value of a key. Like `SET`, the expiry time is removed unless
   * `keepTtl` is true.
   */
  set(key: string, value: RedisValue, { keepTtl = false } = {}): void {
    const expiresAt = keepTtl ? (this.#getEntry(key)?.expiresAt ?? null) : null;

    this.#entries.set(key, { expiresAt, value });
  }

  delete(key: string): boolean {
    return this.#getEntry(key) !== undefined && this.#entries.delete(key);
  }

  /**
   * Remove a key whose collection became empty, as Redis does not keep
   * empty lists, sets, sorted sets and hashes.
   */
  deleteIfEmpty(key: string): void {
    const value = this.get(key);

    if (
      value &&
      value.type !== "string" &&
      (Array.isArray(value.value) ? value.value.length : value.value.size) === 0
    ) {
      this.#entries.delete(key);
    }
  }

  /** The expiry time of a key, `null` without one. */
  getExpiry(key: string): Temporal.Instant | null {
    return this.#getEntry(key)?.expiresAt ?? null;
  }

  /** Set (or remove with `null`) the expiry time of an existing key. */
  setExpiry(key: string, expiresAt: Temporal.Instant | null): void {
    const entry = this.#getEntry(key);

    if (entry) {
      entry.expiresAt = expiresAt;
    }
  }
}
