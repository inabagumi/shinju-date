import { requestInBatches } from "./batches.js";
import type { BatchOptions } from "./batches.js";
import { getTwitchApiClient } from "./client.js";
import type { ClientOptions } from "./client.js";
import type { TwitchUserIdentifier } from "./identifiers.js";
import { mapUser } from "./mappers.js";
import type { TwitchUser } from "./types.js";

interface GetUsersOptions extends ClientOptions, BatchOptions {
  ids?: string[];
  logins?: string[];
}

/**
 * Gets Twitch users by ID and/or login.
 *
 * @yields {TwitchUser} The users found by ID, then those found by login
 */
export const getUsers = async function* getUsers({
  client = getTwitchApiClient(),
  ids = [],
  logins = [],
  schedule,
}: GetUsersOptions): AsyncGenerator<TwitchUser, void, undefined> {
  if (ids.length === 0 && logins.length === 0) {
    return;
  }

  for await (const user of requestInBatches(ids, schedule, (batch, run) =>
    run(() => client.users.getUsersByIds(batch))
  )) {
    yield mapUser(user);
  }

  for await (const user of requestInBatches(logins, schedule, (batch, run) =>
    run(() => client.users.getUsersByNames(batch))
  )) {
    yield mapUser(user);
  }
};

export const getUserById = async (
  id: string,
  { client = getTwitchApiClient() }: ClientOptions = {}
): Promise<TwitchUser | null> => {
  const user = await client.users.getUserById(id);
  return user ? mapUser(user) : null;
};

const getUserByLogin = async (
  login: string,
  { client = getTwitchApiClient() }: ClientOptions = {}
): Promise<TwitchUser | null> => {
  const user = await client.users.getUserByName(login.toLowerCase());
  return user ? mapUser(user) : null;
};

/**
 * Resolves a parsed identifier to a Twitch user via Helix.
 */
export const resolveTwitchUser = async (
  identifier: TwitchUserIdentifier,
  options: ClientOptions = {}
): Promise<TwitchUser | null> => {
  if (identifier.kind === "id") {
    return await getUserById(identifier.id, options);
  }
  return await getUserByLogin(identifier.login, options);
};
