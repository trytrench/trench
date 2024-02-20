import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    POSTGRES_URL: z.string().url(),
    NODE_ENV: z.enum(["development", "production", "test"]),
    CLICKHOUSE_URL: z.string().url(),
    CLICKHOUSE_PASSWORD: z.string().optional(),
    REDIS_URL: z.string().url(),
  },

  /**
   * What object holds the environment variables at runtime. This is usually
   * `process.env` or `import.meta.env`.
   */
  runtimeEnv: process.env,

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
