/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.js");
import assert from "assert";
import MonacoEditorWebpackPlugin from "monaco-editor-webpack-plugin";

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,

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
    { isServer }
  ) => {
    assert(config.module?.rules);

    const oneOfRule = config.module.rules.find(
      /** @returns {rule is import('webpack').RuleSetRule} */
      (rule) => typeof rule === "object" && !!rule.oneOf
    );
    assert(oneOfRule?.oneOf);

    oneOfRule.oneOf.forEach((r) => {
      if (r.issuer?.and?.[0]?.toString().includes("_app")) {
        r.issuer = [
          { and: r.issuer.and },
          /[\\/]node_modules[\\/]monaco-editor[\\/]/,
        ];
      }
    });

    assert(config.plugins, "no plugins array");

    config.plugins.push(
      new MonacoEditorWebpackPlugin({
        languages: ["typescript"],
        filename: "static/[name].worker.js",
        publicPath: "/_next",
      })
    );

    if (!isServer) {
      config.resolve.fallback.fs = false;
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

    return config;
  },
  transpilePackages: ["databases", "event-processing"],
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default config;
