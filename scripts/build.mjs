import {mkdir, rm} from "node:fs/promises";
import {build} from "esbuild";

await rm(new URL("../dist", import.meta.url), {recursive: true, force: true});
await mkdir(new URL("../dist", import.meta.url), {recursive: true});
await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2020",
  jsx: "automatic",
  external: ["react", "react/jsx-runtime"],
  banner: {js: '"use client";'},
  sourcemap: true,
  logLevel: "info",
});
