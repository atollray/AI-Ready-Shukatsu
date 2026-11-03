import fs from "node:fs/promises";
import path from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { resolveDataDir } from "../cli/util";
import { FsStore } from "../core";
import { createApp } from "./app";
import { storeEvents } from "./watcher";

export interface ServerOptions {
  port?: number;
  dataDir?: string;
  onReady?: (url: string) => void;
}

export async function startServer(options: ServerOptions = {}) {
  const port = options.port || Number(process.env.PORT) || 4319;
  const host = "127.0.0.1";
  const dataDir = await resolveDataDir(options.dataDir);

  const store = new FsStore({ dataDir });
  await store.init({ sample: true });

  // Start file watcher
  storeEvents.startWatching(path.join(dataDir, "store"));

  const app = createApp(store);

  // Serve static UI assets if dist/web exists
  const webDist = path.resolve(process.cwd(), "dist", "web");
  let webDistExists = false;
  try {
    const stat = await fs.stat(webDist);
    webDistExists = stat.isDirectory();
  } catch {
    webDistExists = false;
  }

  if (webDistExists) {
    app.use("/*", serveStatic({ root: "./dist/web" }));
    // SPA fallback: return index.html for non-api routes
    app.get("*", async (c, next) => {
      if (c.req.path.startsWith("/api")) {
        return next();
      }
      const indexHtml = await fs.readFile(path.join(webDist, "index.html"), "utf8");
      return c.html(indexHtml);
    });
  }

  const server = serve(
    {
      fetch: app.fetch,
      port,
      hostname: host,
    },
    () => {
      const url = `http://${host}:${port}`;
      if (options.onReady) {
        options.onReady(url);
      } else {
        console.log(`Shukatsu server running at ${url}`);
      }
    },
  );

  return { server, store, dataDir, port };
}

// Standalone execution
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch((err) => {
    console.error("Server startup error:", err);
    process.exit(1);
  });
}
