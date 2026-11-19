/** An error reply of Redis, such as `WRONGTYPE …` or `ERR syntax error`. */
export class RedisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RedisError";
  }
}

/** The error of a command on a key of another type. */
export const wrongTypeError = (): RedisError =>
  new RedisError(
    "WRONGTYPE Operation against a key holding the wrong kind of value"
  );
