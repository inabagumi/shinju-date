import { type BatchOptions, requestInBatches } from "./batches.js";
import { type ClientOptions, getTwitchApiClient } from "./client.js";
import type { TwitchUserIdentifier } from "./identifiers.js";
import { mapUser } from "./mappers.js";
import type { TwitchUser } from "./types.js";

interface GetUsersOptions extends ClientOptions, BatchOptions {
  ids?: string[];
  logins?: string[];
}

/**
 * Gets Twitch users by ID and/or login.
 */
export async function* getUsers({
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
}

export async function getUserById(
  id: string,
  { client = getTwitchApiClient() }: ClientOptions = {}
): Promise<TwitchUser | null> {
  const user = await client.users.getUserById(id);
  return user ? mapUser(user) : null;
}

async function getUserByLogin(
  login: string,
  { client = getTwitchApiClient() }: ClientOptions = {}
): Promise<TwitchUser | null> {
  const user = await client.users.getUserByName(login.toLowerCase());
  return user ? mapUser(user) : null;
}

/**
 * Resolves a parsed identifier to a Twitch user via Helix.
 */
export async function resolveTwitchUser(
  identifier: TwitchUserIdentifier,
  options: ClientOptions = {}
): Promise<TwitchUser | null> {
  if (identifier.kind === "id") {
    return getUserById(identifier.id, options);
  }
  return getUserByLogin(identifier.login, options);
}
