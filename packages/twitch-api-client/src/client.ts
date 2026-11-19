import { ApiClient } from "@twurple/api";
import { AppTokenAuthProvider } from "@twurple/auth";

export interface ClientOptions {
  /** twurple client to use. Defaults to the shared singleton. */
  client?: ApiClient | undefined;
}

/**
 * Creates a twurple client that authenticates with an App Access Token made
 * from the app credentials in the environment.
 */
const createTwitchApiClient = (): ApiClient => {
  const clientId = process.env["TWITCH_CLIENT_ID"];
  const clientSecret = process.env["TWITCH_CLIENT_SECRET"];

  if (!clientId || !clientSecret) {
    throw new TypeError(
      "Twitch Client ID and Client Secret are required (TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET)."
    );
  }

  return new ApiClient({
    authProvider: new AppTokenAuthProvider(clientId, clientSecret),
  });
};

let _apiClient: ApiClient | null = null;

/**
 * Gets or creates the shared twurple client.
 */
export const getTwitchApiClient = (): ApiClient => {
  if (!_apiClient) {
    _apiClient = createTwitchApiClient();
  }
  return _apiClient;
};
