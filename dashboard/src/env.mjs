import { z } from "zod";
import { createEnv } from "@t3-oss/env-nextjs";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    POSTGRES_PRISMA_URL: z.string().url(),
    NODE_ENV: z.enum(["development", "test", "production"]),
    JWT_SECRET: z.string(),
    MAXMIND_ACCOUNT_ID: z.string().optional(),
    MAXMIND_LICENSE_KEY: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    API_KEY: z.string(),
    ADMIN_USERNAME: z.string(),
    ADMIN_PASSWORD: z.string(),
    NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: z.string().optional(),
    STRIPE_SECRET_KEY: z.string(),
    STRIPE_WEBHOOK_SECRET: z.string(),
    NEXTAUTH_URL: z.string().url().optional(),
    ALCHEMY_API_KEY: z.string().optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: z.string().optional(),
    NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN: z.enum(["true", "false"]).optional(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN:
      process.env.NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN === "true" ? "true" : "false",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL,
    NODE_ENV: process.env.NODE_ENV,
    JWT_SECRET: process.env.JWT_SECRET,
    MAXMIND_ACCOUNT_ID: process.env.MAXMIND_ACCOUNT_ID,
    MAXMIND_LICENSE_KEY: process.env.MAXMIND_LICENSE_KEY,
    API_KEY: process.env.API_KEY,
    NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN:
      process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
    ADMIN_USERNAME: process.env.ADMIN_USERNAME,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY,
  },
});
