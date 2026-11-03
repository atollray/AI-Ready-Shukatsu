import { defineCommand } from "citty";
import { getStore, outputError, outputJson } from "../util";

const clearSubCommand = defineCommand({
  meta: { name: "clear", description: "Clear all sample data" },
  args: {
    data: { type: "string" },
    pretty: { type: "boolean", default: false },
  },
  async run({ args }) {
    try {
      const store = await getStore(args.data);
      const result = await store.clearSamples();
      outputJson(
        {
          cleared: true,
          removed: result,
        },
        args.pretty,
      );
    } catch (err) {
      outputError("SAMPLE_CLEAR_FAILED", (err as Error).message);
    }
  },
});

export const sampleCommand = defineCommand({
  meta: {
    name: "sample",
    description: "Manage sample data",
  },
  subCommands: {
    clear: clearSubCommand,
  },
});
