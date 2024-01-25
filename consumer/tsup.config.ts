import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/index.ts"],
  noExternal: ["event-processing", "common"],
  sourcemap: true,
});
