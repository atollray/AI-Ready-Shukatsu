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

  it("GET /api/export returns full workspace backup and download headers", async () => {
    const res = await app.request("/api/export?download=true");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain("shukatsu-backup-");

    const backup = await res.json();
    expect(backup.exportedAt).toBeTruthy();
    expect(backup.meta.schemaVersion).toBe(2);
    expect(backup.profile.name).toBe("就活 太郎");
    expect(backup.companies.length).toBe(2);
    expect(backup.tasks.length).toBe(3);
  });

  it("POST /api/import restores backup in merge and replace modes", async () => {
    const exportRes = await app.request("/api/export");
    const backup = await exportRes.json();

    // Clear existing data and restore in merge mode
    await app.request("/api/sample/clear", { method: "POST" });
    expect((await store.listCompanies()).length).toBe(0);

    const customTask = {
      id: "tk_custom_import",
      rev: 1,
      updatedAt: new Date().toISOString(),
      isSample: false,
      title: "インポートテストタスク",
      state: "todo",
      due: "2026-12-01",
      companyId: "",
      notes: "",
    };

    const mergeRes = await app.request("/api/import?mode=merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...backup,
        tasks: [customTask],
      }),
    });
    expect(mergeRes.status).toBe(200);
    const mergeJson = await mergeRes.json();
    expect(mergeJson.data.imported.companies).toBe(2);
    expect(mergeJson.data.imported.tasks).toBe(1);
    expect((await store.listCompanies()).length).toBe(2);

    // Replace mode replaces existing records with payload
    const replaceRes = await app.request("/api/import?mode=replace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companies: [],
        tasks: [customTask],
        notes: [],
      }),
    });
    expect(replaceRes.status).toBe(200);
    expect((await store.listCompanies()).length).toBe(0);
    expect((await store.listTasks()).map((t) => t.id)).toEqual(["tk_custom_import"]);

    // Invalid payload returns 400
    const badRes = await app.request("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companies: [{ invalid: true }] }),
    });
    expect(badRes.status).toBe(400);
  });

  it("GET /api/calendar.ics exports valid iCalendar with non-sample events", async () => {
    await store.saveCompany({
      id: "co_cal_test",
      rev: 1,
      updatedAt: new Date().toISOString(),
      isSample: false,
      name: "カレンダー株式会社",
      industry: "SaaS",
      headquarters: "東京",
      urls: { careers: "", application: "" },
      tags: [],
      stage: "interview",
      currentTrack: "本選考",
      stageHistory: [],
      interestScore: 5,
      fitScore: 4,
      motivation: "",
      sellingPoints: "",
      concerns: "",
      conditions: "",
      memo: "",
      esEntries: [],
      events: [
        {
          id: "ev_cal_1",
          kind: "interview",
          title: "最終面接",
          start: "2026-12-10T15:00",
          location: "オンライン",
          notes: "役員面接",
        },
      ],
      contacts: [],
      documents: [],
    });

    const res = await app.request("/api/calendar.ics");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/calendar");
    const ics = await res.text();
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("SUMMARY:[カレンダー株式会社] 最終面接");
    expect(ics).toContain("END:VCALENDAR");
  });
});
