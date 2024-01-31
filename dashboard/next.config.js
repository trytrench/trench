/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.js");

/** @type {import("next").NextConfig} */
const config = {
  redirects: () => {
    return [
      {
        source: "/",
        destination: "/events",
        permanent: true,
      },
    ];
  },
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

export default config;
