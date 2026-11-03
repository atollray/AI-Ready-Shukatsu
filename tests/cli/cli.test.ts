import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("CLI E2E tests", () => {
  let tmpDir: string;
  const cliPath = path.resolve(__dirname, "../../dist/cli.js");

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "shukatsu-cli-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  function runCli(args: string): { ok: boolean; data?: any; error?: any } {
    try {
      const output = execSync(`node "${cliPath}" ${args} --data "${tmpDir}"`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      return JSON.parse(output);
    } catch (err: any) {
      if (err.stdout) {
        return JSON.parse(err.stdout);
      }
      if (err.stderr) {
        return JSON.parse(err.stderr);
      }
      throw err;
    }
  }

  it("inits and returns context", () => {
    const initRes = runCli("init");
    expect(initRes.ok).toBe(true);
    expect(initRes.data.initialized).toBe(true);

    const contextRes = runCli("context --sample");
    expect(contextRes.ok).toBe(true);
    expect(contextRes.data.profile.name).toBe("就活 太郎");
    expect(contextRes.data.topCompanies.length).toBeGreaterThan(0);
  });

  it("finds and adds a company", () => {
    runCli("init --empty");

    // Add company
    const addRes = runCli('company add --name "AI株式会社" --industry "IT" --stage "interview"');
    expect(addRes.ok).toBe(true);
    expect(addRes.data.name).toBe("AI株式会社");
    expect(addRes.data.id).toMatch(/^co_/);

    const companyId = addRes.data.id;

    // Duplicate check
    const dupRes = runCli('company find "AI株式"');
    expect(dupRes.ok).toBe(true);
    expect(dupRes.data.length).toBe(1);
    expect(dupRes.data[0].id).toBe(companyId);

    // Add task for this company
    const taskRes = runCli(
      `task add --title "面接対策" --company "${companyId}" --due "2026-11-20"`,
    );
    expect(taskRes.ok).toBe(true);
    expect(taskRes.data.title).toBe("面接対策");

    // Advance stage
    const stageRes = runCli(`company stage "${companyId}" "offer"`);
    expect(stageRes.ok).toBe(true);
    expect(stageRes.data.stage).toBe("offer");
    expect(stageRes.data.stageHistory.length).toBe(2);
  });
});
