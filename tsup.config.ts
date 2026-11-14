import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      cli: "src/cli/index.ts",
    },
    format: ["esm"],
    outDir: "dist",
    clean: false,
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
  {
    entry: {
      server: "src/server/node.ts",
    },
    format: ["esm"],
    outDir: "dist",
    clean: false,
  },
]);
