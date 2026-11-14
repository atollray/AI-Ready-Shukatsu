import fs from "node:fs/promises";
import path from "node:path";
import { FsStore, type Store } from "../core";

export interface CliContext {
  store: Store;
  dataDir: string;
}

export async function resolveDataDir(explicitDir?: string): Promise<string> {
  if (explicitDir) {
    return path.resolve(explicitDir);
  }
  if (process.env.SHUKATSU_HOME) {
    return path.resolve(process.env.SHUKATSU_HOME);
  }

  // Look for shukatsu.config.json or data in current/parent directories
  let curr = process.cwd();
  while (true) {
    const configPath = path.join(curr, "shukatsu.config.json");
    try {
      const raw = await fs.readFile(configPath, "utf8");
      const cfg = JSON.parse(raw);
      if (cfg.dataDir) {
        return path.resolve(curr, cfg.dataDir);
      }
    } catch {
      // ignore
    }

    const dataPath = path.join(curr, "data");
    try {
      const stat = await fs.stat(dataPath);
      if (stat.isDirectory()) {
        return dataPath;
      }
    } catch {
      // ignore
    }

    const parent = path.dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }

  return path.resolve(process.cwd(), "data");
}

export async function getStore(explicitDir?: string): Promise<FsStore> {
  const dataDir = await resolveDataDir(explicitDir);
  const store = new FsStore({ dataDir });
  return store;
}

export function outputJson(data: unknown, pretty = false): void {
  const payload = { ok: true, data };
  console.log(JSON.stringify(payload, null, pretty ? 2 : undefined));
}

export function outputError(code: string, message: string, hint?: string, exitCode = 1): void {
  const payload = {
    ok: false,
    error: {
      code,
      message,
      ...(hint ? { hint } : {}),
    },
  };
  console.error(JSON.stringify(payload, null, 2));
  process.exit(exitCode);
}

export async function readInputJson<T>(filePath?: string): Promise<T | null> {
  if (!filePath) return null;
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch (err) {
    outputError(
      "INVALID_INPUT_FILE",
      `Failed to read or parse input JSON file: ${filePath}`,
      (err as Error).message,
    );
    return null;
  }
}
