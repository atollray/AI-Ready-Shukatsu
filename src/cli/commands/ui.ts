import { defineCommand } from "citty";
import open from "open";
import { startServer } from "../../server/node";
import { outputError } from "../util";

export const uiCommand = defineCommand({
  meta: {
    name: "ui",
    description: "Start Shukatsu web UI server and open in browser",
  },
  args: {
    port: {
      type: "string",
      description: "Port to listen on (default 4319)",
      default: "4319",
    },
    data: {
      type: "string",
      description: "Custom data directory",
    },
    open: {
      type: "boolean",
      description: "Automatically open in browser",
      default: true,
    },
  },
  async run({ args }) {
    try {
      const port = Number(args.port) || 4319;
      await startServer({
        port,
        dataDir: args.data,
        onReady: (url) => {
          console.log(`\n💼 AI-Ready Shukatsu UI is running at: ${url}`);
          console.log("Press Ctrl+C to stop the server.\n");
          if (args.open) {
            open(url).catch(() => {});
          }
        },
      });
    } catch (err) {
      outputError("UI_START_FAILED", (err as Error).message);
    }
  },
});
