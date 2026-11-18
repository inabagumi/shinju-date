import { withSentry } from "@shinju-date/instrumentation/next-config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    "@sentry/profiling-node",
    "msw",
    "@mswjs/interceptors",
  ],
};

// This app has only Route Handlers, so it leaves out the Sentry options for
// the browser bundle.
export default withSentry(nextConfig, { browser: false });
