import { registerServer } from '@shinju-date/instrumentation/server'

export { onRequestError } from '@shinju-date/instrumentation/server'

export async function register() {
  // Checks the environment variables on start, so that a missing one stops
  // the server with its name instead of failing the first request that needs
  // it.
  const { serverEnv } = await import('./lib/env')

  await registerServer({
    enableMsw: serverEnv.ENABLE_MSW,
    profileSessionSampleRate: 0.333,
    tracesSampleRate: 0.333,
  })
}
