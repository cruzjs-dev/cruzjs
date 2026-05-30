import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: false,
  clean: true,
  splitting: true,
  sourcemap: true,
  external: [
    /^@cruzjs\//,
    /^node:/,
    "react",
    "react-dom",
    "react-router",
    "@trpc/server",
    "drizzle-orm",
    "inversify",
    "reflect-metadata",
    "zod",
  ],
});
