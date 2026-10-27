import {fileURLToPath} from "node:url";

const config = {
  resolve: {alias: {"@patrykparcheta/atmos": fileURLToPath(new URL("../src/index.ts", import.meta.url))}},
  server: {host: "127.0.0.1", port: 4317, strictPort: true},
  build: {outDir: "dist", emptyOutDir: true},
};

export default config;
