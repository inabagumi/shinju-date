// Node.js provides Temporal natively on the server, so the polyfill is only
// needed in the browser. It installs itself only when Temporal is missing.
import 'temporal-polyfill/global'
import { initClient } from '@shinju-date/instrumentation/client'
import { initBotId } from 'botid/client/core'

export { onRouterTransitionStart } from '@shinju-date/instrumentation/client'

// Protect Server Actions invoked from public form pages.
// Path is the page route (not the action module path).
// Use basic check level (free) — Deep Analysis can be enabled later if needed.
initBotId({
  protect: [
    {
      advancedOptions: {
        checkLevel: 'basic',
      },
      method: 'POST',
      path: '/contact',
    },
    {
      advancedOptions: {
        checkLevel: 'basic',
      },
      method: 'POST',
      path: '/feedback',
    },
  ],
})

initClient({
  profileSessionSampleRate: 0.333,
  replay: {
    onErrorSampleRate: 1.0,
    sessionSampleRate: 0.1,
  },
  tracesSampleRate: 0.333,
})
