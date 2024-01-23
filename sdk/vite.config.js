import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import path from "path";

module.exports = defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "Trench",
      fileName: "trench",
    },
  },
  plugins: [dts()],
});
