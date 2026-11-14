import { defineCommand } from "citty";
import { getStore, outputError, outputJson } from "../util";

export const initCommand = defineCommand({
  meta: {
    name: "init",
    description: "Initialize Shukatsu workspace data directory",
  },
  args: {
    data: {
      type: "string",
      description: "Custom data directory",
    },
    empty: {
      type: "boolean",
      description: "Initialize with empty data instead of sample data",
      default: false,
    },
    pretty: {
      type: "boolean",
      description: "Pretty print JSON output",
      default: false,
    },
  },
  async run({ args }) {
    try {
      const store = await getStore(args.data);
      await store.init({ sample: !args.empty });
      outputJson(
        {
          initialized: true,
          dataDir: store.dataDir,
          withSample: !args.empty,
        },
        args.pretty,
      );
    } catch (err) {
      outputError("INIT_FAILED", (err as Error).message);
    }
  },
});
