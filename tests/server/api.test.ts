import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FsStore } from "@/core";
import { createApp } from "@/server/app";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("Hono Server API tests", () => {
  let tmpDir: string;
  let store: FsStore;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "shukatsu-api-test-"));
    store = new FsStore({ dataDir: tmpDir });
    await store.init({ sample: true });
    app = createApp(store);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  it("GET /api/health", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("GET /api/workspace", async () => {
    const res = await app.request("/api/workspace");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.profile.name).toBe("就活 太郎");
    expect(json.data.companies.length).toBe(2);
    expect(json.data.tasks.length).toBe(3);
  });

  it("PATCH /api/companies/:id with optimistic lock", async () => {
    const companies = await store.listCompanies();
    const target = companies[0]!;

    // Successful patch
    const patchRes = await app.request(`/api/companies/${target.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: { name: "名前更新" },
        expectRev: target.rev,
      }),
    });
    expect(patchRes.status).toBe(200);
    const patchJson = await patchRes.json();
    expect(patchJson.data.name).toBe("名前更新");
    expect(patchJson.data.rev).toBe(target.rev + 1);

    // Stale rev -> 409 Conflict
    const conflictRes = await app.request(`/api/companies/${target.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: { name: "衝突する更新" },
        expectRev: target.rev, // stale
      }),
    });
    expect(conflictRes.status).toBe(409);
    const conflictJson = await conflictRes.json();
    expect(conflictJson.error.code).toBe("CONFLICT");
  });

  it("POST /api/sample/clear", async () => {
    const clearRes = await app.request("/api/sample/clear", { method: "POST" });
    expect(clearRes.status).toBe(200);
    const clearJson = await clearRes.json();
    expect(clearJson.data.companies).toBe(2);

    const companies = await store.listCompanies();
    expect(companies.length).toBe(0);
  });
});
