import createMDX from "@next/mdx";
import { withSentry } from "@shinju-date/instrumentation/next-config";
import { withBotId } from "botid/next/config";
// import rehypeExternalLinks from 'rehype-external-links'
// import remarkGfm from 'remark-gfm'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    turbopackRustReactCompiler: true,
  },
  headers() {
    return Promise.resolve([
      {
        headers: [
          {
            key: "Content-Security-Policy",
            // BotID serves challenge/proxy scripts via same-origin rewrites
            // (withBotId), so connect-src/script-src 'self' is sufficient.
            value: [
              "base-uri 'none'",
              "connect-src 'self'",
              "default-src 'none'",
              "font-src 'self'",
              "form-action 'none'",
              "frame-ancestors 'none'",
              "img-src 'self' data:",
              "manifest-src 'self'",
              // React requires eval() in development mode for debugging
              // features such as reconstructing callstacks, so 'unsafe-eval'
              // is allowed only outside of production.
              [
                "script-src",
                "'self'",
                "'unsafe-inline'",
                ...(process.env.NODE_ENV === "production"
                  ? []
                  : ["'unsafe-eval'"]),
                "https://va.vercel-scripts.com",
              ].join(" "),
              "style-src 'self' 'unsafe-inline'",
              "worker-src 'self' blob:",
            ].join("; "),
          },
          {
            key: "Document-Policy",
            value: "js-profiling",
          },
        ],
        source: "/:path*",
      },
    ]);
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 365 * 24 * 60 * 60,
    remotePatterns: [
      {
        hostname: "i.ytimg.com",
        pathname: "/vi/**",
        protocol: "https" as const,
      },
    ],
  },
  pageExtensions: ["tsx", "ts", "mdx"],
  partialPrefetching: true,
  reactCompiler: true,
  reactStrictMode: true,
  redirects() {
    return Promise.resolve([
      // Calendars already subscribed to still read the old path.
      {
        destination: "/talents/:id.ics",
        permanent: true,
        source: "/channels/:id/videos.ics",
      },
    ]);
  },
  rewrites() {
    // Returned as an array, these are applied before dynamic routes, so
    // `/talents/<id>.ics` never reaches the talent's page (`/talents/[id]`).
    // A dynamic segment cannot have an extension in its folder name, so the
    // calendar is served from an internal path, which nothing links to.
    return Promise.resolve([
      {
        destination: "/talents/:id/calendar",
        source: "/talents/:id.ics",
      },
    ]);
  },
  serverExternalPackages: [
    "@sentry/profiling-node",
    "msw",
    "@mswjs/interceptors",
  ],
  turbopack: {
    rules: {
      // Compile Tailwind CSS with its Turbopack loader instead of PostCSS.
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
      },
    },
  },
};

const withMDX = createMDX({
  options: {
    rehypePlugins: [
      [
        "rehype-external-links",
        {
          rel: ["noopener", "noreferrer"],
          target: "_blank",
        },
      ],
    ],
    remarkPlugins: [["remark-gfm", {}]],
  },
});

const withPlugins = (config: NextConfig): NextConfig => {
  // Apply BotID rewrites before other plugins so challenge/proxy routes are
  // always registered.
  const configWithBotId = withBotId(config);

  return withSentry(withMDX(configWithBotId));
};

export default withPlugins(nextConfig);
