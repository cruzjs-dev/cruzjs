import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.tsx"],
  format: ["esm"],
  dts: false,
  clean: true,
  splitting: true,
  sourcemap: true,
  external: [
    /^@cruzjs\//,
    /^node:/,
    "react",
    "ink",
  ],
});
