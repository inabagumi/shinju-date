import { withSentryConfig } from "@sentry/nextjs/config";

export interface WithSentryOptions {
  /**
   * Whether the app serves pages to browsers. Set it to `false` for an app
   * that has only Route Handlers, such as `apps/batch`, to leave out the
   * options for the browser bundle (the component annotations, the tunnel
   * route and the upload of the client files).
   *
   * Defaults to `true`.
   */
  browser?: boolean;
}

/**
 * Wraps the Next.js config with `withSentryConfig` when
 * `NEXT_PUBLIC_SENTRY_DSN` is set, and returns it as it is otherwise.
 *
 * Apply it last, after the other plugins such as `withMDX`.
 */
export const withSentry = <C>(
  nextConfig: C,
  { browser = true }: WithSentryOptions = {}
): C => {
  if (!process.env["NEXT_PUBLIC_SENTRY_DSN"]) {
    return nextConfig;
  }

  return withSentryConfig(nextConfig, {
    bundleSizeOptimizations: {
      excludeDebugStatements: true,
    },
    silent: true,
    ...(browser
      ? {
          reactComponentAnnotation: {
            enabled: true,
          },
          tunnelRoute: "/monitoring",
          widenClientFileUpload: true,
        }
      : {}),
  });
};
