import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/index.ts"],
  noExternal: ["common"],
  dts: true,
  format: ["cjs", "esm"],
});
