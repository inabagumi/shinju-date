// Node.js provides Temporal natively on the server, so the polyfill is only
// needed in the browser. It installs itself only when Temporal is missing.
import "temporal-polyfill/global";
import { initClient } from "@shinju-date/instrumentation/client";

export { onRouterTransitionStart } from "@shinju-date/instrumentation/client";

initClient({
  profileSessionSampleRate: 1.0,
  replay: {
    onErrorSampleRate: 1.0,
    sessionSampleRate: 0.1,
  },
  tracesSampleRate: 1.0,
});
