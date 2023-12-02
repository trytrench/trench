/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.mjs");
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
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      // ignore re2 import
      re2: false,
    };
    config.resolve.fallback = {
      // the require for this module is wrapped in a try/catch, so it can fail without causing issues
      "sqrl-test-utils": false,
    };

    assert(config.module?.rules);
    config.module.rules.push({
      test: /\.txt$/,
      type: "asset/source",
    });

    // Disable code optimization, SQRL uses function names
    assert(config.optimization);
    config.optimization.minimize = false;

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
    if (!isServer) {
      config.plugins.push(
        new MonacoEditorWebpackPlugin({
          languages: ["typescript"],
          filename: "static/[name].worker.js",
          publicPath: "_next",
        })
      );
    }
    return config;
  },
  transpilePackages: ["databases", "event-processing", "sqrl-helpers"],
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default config;
