/** An error reply of Redis. */
export class RedisError extends Error {
  override name = "RedisError";
}
