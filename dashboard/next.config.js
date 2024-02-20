/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.js");

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  output: "standalone",
  /**
   * If you are using `appDir` then you must comment the below `i18n` config out.
   *
   * @see https://github.com/vercel/next.js/issues/41980
   */
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
  },
  webpack: (
    /** @type {import('webpack').Configuration} */
    config,
    { isServer, webpack }
  ) => {
    if (!isServer && config.resolve) {
      config.resolve.fallback = {
        fs: false,
        dns: false,
        net: false,
        tls: false,
      };

      config.module.noParse = /@ts-morph\/common\/dist\/typescript.js/;
    }

    // Handling WebAssembly files
    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/async",
    });
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Remove annoying warning message that doesn't affect anything
    // https://github.com/jaredwray/keyv/issues/45
    config.plugins.push(new webpack.ContextReplacementPlugin(/keyv/));

    return config;
  },
  transpilePackages: ["databases", "event-processing"],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

// Injected content via Sentry wizard below

import { withSentryConfig } from "@sentry/nextjs";

export default withSentryConfig(
  config,
  {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    // Suppresses source map uploading logs during build
    silent: true,
    org: "trench-ea",
    project: "github-demo",
  },
  {
    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Transpiles SDK to be compatible with IE11 (increases bundle size)
    transpileClientSDK: true,

    // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers (increases server load)
    tunnelRoute: "/monitoring",

    // Hides source maps from generated client bundles
    hideSourceMaps: true,

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,

    // Enables automatic instrumentation of Vercel Cron Monitors.
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,
  }
);
