import { initClient } from '@shinju-date/instrumentation/client'

export { onRouterTransitionStart } from '@shinju-date/instrumentation/client'

initClient({
  profileSessionSampleRate: 1.0,
  replay: {
    onErrorSampleRate: 1.0,
    sessionSampleRate: 0.1,
  },
  tracesSampleRate: 1.0,
})
