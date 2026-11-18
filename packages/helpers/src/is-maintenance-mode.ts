import { REDIS_KEYS } from "@shinju-date/constants";

/**
 * The part of a Redis client that `isMaintenanceMode` uses. The client of
 * `@upstash/redis` satisfies it.
 */
export interface MaintenanceModeRedisClient {
  get<TData>(key: string): Promise<TData | null>;
}

/**
 * Reads whether the maintenance mode is on. When Redis cannot be read, it
 * returns `false`, so that an outage of Redis does not stop the service.
 */
export const isMaintenanceMode = async (
  redisClient: MaintenanceModeRedisClient
): Promise<boolean> => {
  try {
    const value = await redisClient.get<boolean>(REDIS_KEYS.MAINTENANCE_MODE);

    return value === true;
  } catch (error) {
    console.error("Failed to check maintenance mode:", error);

    return false;
  }
};
