import { defineCommand } from "citty";
import { getStore, outputError, outputJson } from "../util";

export const syncCommand = defineCommand({
  meta: {
    name: "sync",
    description: "Re-generate all derived Markdown and ICS views",
  },
  args: {
    data: { type: "string" },
    pretty: { type: "boolean", default: false },
  },
  async run({ args }) {
    try {
      const store = await getStore(args.data);
      await store.syncViews();
      outputJson({ synced: true }, args.pretty);
    } catch (err) {
      outputError("SYNC_FAILED", (err as Error).message);
    }
  },
});
