import {fileURLToPath} from "node:url";

export default {
  root: fileURLToPath(new URL(".", import.meta.url)),
  resolve: {alias: {
    "legacy-atmos": fileURLToPath(new URL("../../.work/legacy/index.js", import.meta.url)),
    "alpha-fixed-atmos": fileURLToPath(new URL("../../.work/alpha-fixed/index.js", import.meta.url)),
  }},
  server: {fs: {allow: [fileURLToPath(new URL("../..", import.meta.url))]}},
};
