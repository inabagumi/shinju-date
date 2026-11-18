import { registerServer } from "@shinju-date/instrumentation/server";

export { onRequestError } from "@shinju-date/instrumentation/server";

export async function register() {
  // Checks the environment variables on start, so that a missing one stops
  // the server with its name instead of failing the first cron run that needs
  // it.
  const { serverEnv } = await import("./lib/env");

  await registerServer({
    enableMsw: serverEnv.ENABLE_MSW,
    profileSessionSampleRate: 1.0,
    tracesSampleRate: 1.0,
  });
}
