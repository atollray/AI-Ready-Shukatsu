import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ConflictError, FsStore, generateId } from "@/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("FsStore and Core integration", () => {
  let tmpDir: string;
  let store: FsStore;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "shukatsu-test-"));
    store = new FsStore({ dataDir: tmpDir });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  it("initializes workspace with sample data and syncs views", async () => {
    await store.init({ sample: true });

    const meta = await store.getMeta();
    expect(meta.schemaVersion).toBe(2);

    const profile = await store.getProfile();
    expect(profile.name).toBe("就活 太郎");

    const companies = await store.listCompanies();
    expect(companies.length).toBe(2);
    expect(companies[0]!.isSample).toBe(true);

    const tasks = await store.listTasks();
    expect(tasks.length).toBe(3);

    const notes = await store.listNotes();
    expect(notes.length).toBe(1);

    // Verify generated markdown and ics views
    const contextContent = await fs.readFile(path.join(tmpDir, "views", "context.md"), "utf8");
    expect(contextContent).toContain("テックフロンティア");

    const icsContent = await fs.readFile(path.join(tmpDir, "views", "calendar.ics"), "utf8");
    expect(icsContent).toContain("BEGIN:VCALENDAR");

    const companyMd = await fs.readFile(
      path.join(tmpDir, "views", "companies", `${companies[0]!.id}.md`),
      "utf8",
    );
    expect(companyMd).toContain(companies[0]!.name);
  });

  it("handles optimistic locking conflict", async () => {
    await store.init({ sample: false });

    const newCompany = {
      id: generateId("co"),
      rev: 1,
      updatedAt: new Date().toISOString(),
      isSample: false,
      name: "テスト株式会社",
      industry: "IT",
      headquarters: "東京",
      urls: { careers: "", application: "" },
      tags: [],
      stage: "researching" as const,
      currentTrack: "本選考",
      stageHistory: [],
      interestScore: 3,
      fitScore: 3,
      motivation: "",
      sellingPoints: "",
      concerns: "",
      conditions: "",
      memo: "",
      esEntries: [],
      events: [],
      contacts: [],
      documents: [],
    };

    const saved = await store.saveCompany(newCompany);
    expect(saved.rev).toBe(1);

    // Update with correct expectRev
    const updated = await store.saveCompany({ ...saved, name: "テスト株式会社 (更新)" }, 1);
    expect(updated.rev).toBe(2);
    expect(updated.name).toBe("テスト株式会社 (更新)");

    // Attempt update with stale rev (1 instead of 2) -> should throw ConflictError
    await expect(store.saveCompany({ ...updated, name: "衝突する更新" }, 1)).rejects.toThrow(
      ConflictError,
    );
  });

  it("clears sample data leaving user data intact", async () => {
    await store.init({ sample: true });

    // Add a non-sample company
    const userCompany = {
      id: generateId("co"),
      rev: 1,
      updatedAt: new Date().toISOString(),
      isSample: false,
      name: "本番志望企業",
      industry: "通信",
      headquarters: "東京",
      urls: { careers: "", application: "" },
      tags: [],
      stage: "researching" as const,
      currentTrack: "本選考",
      stageHistory: [],
      interestScore: 5,
      fitScore: 5,
      motivation: "",
      sellingPoints: "",
      concerns: "",
      conditions: "",
      memo: "",
      esEntries: [],
      events: [],
      contacts: [],
      documents: [],
    };
    await store.saveCompany(userCompany);

    const beforeClear = await store.listCompanies();
    expect(beforeClear.length).toBe(3);

    // Clear samples
    const res = await store.clearSamples();
    expect(res.companies).toBe(2);
    expect(res.tasks).toBe(3);
    expect(res.notes).toBe(1);

    const afterClear = await store.listCompanies();
    expect(afterClear.length).toBe(1);
    expect(afterClear[0]!.name).toBe("本番志望企業");
    expect(afterClear[0]!.isSample).toBe(false);
  });

  it("runs doctor check and detects missing relations", async () => {
    await store.init({ sample: false });

    // Create a task referencing a non-existent company
    const orphanTask = {
      id: generateId("tk"),
      rev: 1,
      updatedAt: new Date().toISOString(),
      isSample: false,
      title: "孤立したタスク",
      state: "todo" as const,
      due: "2026-12-01",
      companyId: "co_missing_123",
      notes: "",
    };
    await store.saveTask(orphanTask);

    const report = await store.doctor();
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.code === "BROKEN_TASK_COMPANY_REF")).toBe(true);
  });
});
