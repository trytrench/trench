import { join } from "path";
import { configDefaults, defineConfig } from "vitest/config";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    test: {
      exclude: [...configDefaults.exclude],
    },
    resolve: {
      alias: {
        "~/": join(__dirname, "./src/"),
      },
    },
  };
});
