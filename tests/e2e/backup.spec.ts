import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, test } from "@playwright/test";

test.describe("設定画面 バックアップ & カレンダー出力 E2E", () => {
  test("JSON エクスポート・インポート (merge)・ICS ダウンロードが動作する", async ({ page }) => {
    await page.goto("/settings");

    await expect(
      page.locator("h2", { hasText: "データバックアップ & カレンダー連携" }),
    ).toBeVisible();

    // 1. Trigger JSON export download
    const [exportDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("button:has-text('JSON エクスポート')").click(),
    ]);
    expect(exportDownload.suggestedFilename()).toMatch(/^shukatsu-backup-\d{4}-\d{2}-\d{2}\.json$/);
    await expect(page.locator("output")).toContainText("バックアップを出力しました");

    // 2. Import JSON backup file in merge mode
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "sk-e2e-backup-"));
    const backupFile = path.join(tmpDir, "backup.json");
    const importedTaskTitle = `バックアップ復元タスク_${Date.now()}`;
    await fs.writeFile(
      backupFile,
      JSON.stringify({
        companies: [],
        tasks: [
          {
            id: `tk_imp_${Date.now()}`,
            rev: 1,
            updatedAt: new Date().toISOString(),
            isSample: false,
            title: importedTaskTitle,
            state: "todo",
            due: "2026-12-20",
            companyId: "",
            notes: "",
          },
        ],
        notes: [],
      }),
      "utf8",
    );

    try {
      const fileInput = page.locator("input[aria-label='バックアップJSONファイルを選択']");
      await fileInput.setInputFiles(backupFile);
      await expect(page.locator("output")).toContainText("マージインポート完了");

      // Verify imported task appears on tasks page
      await page.goto("/tasks");
      await expect(page.locator(`text=${importedTaskTitle}`).first()).toBeVisible();
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }

    // 3. Verify calendar.ics download endpoint
    await page.goto("/settings");
    const [icsDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("a:has-text('calendar.ics をダウンロード')").click(),
    ]);
    expect(icsDownload.suggestedFilename()).toBe("shukatsu-calendar.ics");
  });
});
