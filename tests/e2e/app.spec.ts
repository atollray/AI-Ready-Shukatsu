import { execSync } from "node:child_process";
import path from "node:path";
import { expect, test } from "@playwright/test";

test.describe("AI-Ready Shukatsu 実ブラウザ E2E 機能テスト", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("1. ダッシュボード: 基本情報、サマリータイル、直近予定の表示確認", async ({ page }) => {
    // Header brand and title
    await expect(page.locator("h1")).toContainText("AI-Ready Shukatsu");

    // Profile card on dashboard
    await expect(page.locator("text=就活 太郎 さんの就活ダッシュボード")).toBeVisible();

    // Stage tiles (first match is the tile)
    await expect(page.locator(".card", { hasText: "面接進行中" }).first()).toBeVisible();

    // Upcoming list
    await expect(page.locator("h3:has-text('直近の予定・締切')")).toBeVisible();

    // Top companies section
    const topSection = page.locator("section.card", { hasText: "注目・高志望度企業" });
    await expect(topSection.locator("text=テックフロンティア株式会社")).toBeVisible();
  });

  test("2. 企業管理: 企業詳細の表示と自動保存の動作確認", async ({ page }) => {
    await page.goto("/companies");

    // Wait for list to load
    await expect(page.locator("text=テックフロンティア株式会社").first()).toBeVisible();

    // Select tech frontier
    await page.locator("text=テックフロンティア株式会社").first().click();

    // Verify company detail form
    const nameInput = page.locator("input[placeholder='企業名を入力']");
    await expect(nameInput).toHaveValue("テックフロンティア株式会社");

    // Edit industry
    const industryInput = page.locator("input[placeholder='例: BtoB SaaS, SIer']");
    await industryInput.fill("クラウドサービス開発（更新テスト）");

    // Check auto-save indicator (should show either 自動保存済み or 同期済み)
    await expect(page.locator(".save-indicator")).toContainText(/自動保存済み|同期済み/, {
      timeout: 4000,
    });

    // Reload page to verify persistence
    await page.reload();
    await page.locator("text=テックフロンティア株式会社").first().click();
    await expect(page.locator("input[placeholder='例: BtoB SaaS, SIer']")).toHaveValue(
      "クラウドサービス開発（更新テスト）",
    );
  });

  test("3. 企業管理: 新規企業追加の動作確認", async ({ page }) => {
    await page.goto("/companies");

    // Click "+ 追加"
    await page.locator("button:has-text('+ 追加')").click();

    // Should create and select "新規企業"
    const nameInput = page.locator("input[placeholder='企業名を入力']");
    await expect(nameInput).toHaveValue("新規企業");

    // Change company name
    await nameInput.fill("ブラウザテスト新規株式会社");

    // Wait for auto-save
    await expect(page.locator(".save-indicator")).toContainText("自動保存済み", { timeout: 4000 });

    // Verify in list
    await expect(page.locator("text=ブラウザテスト新規株式会社").first()).toBeVisible();
  });

  test("4. タスク管理: タスクの追加、完了、フィルターの動作確認", async ({ page }) => {
    await page.goto("/tasks");

    // Verify task page header and form
    const taskInput = page.locator("input[placeholder='新しいタスクを入力...']");
    await expect(taskInput).toBeVisible();

    // Add new task with unique title
    const testTaskTitle = `E2E実ブラウザ自動テスト用タスク_${Date.now()}`;
    await taskInput.fill(testTaskTitle);
    await page.locator("button:has-text('+ タスク追加')").click();

    // Verify new task appears in list
    const newTaskRow = page.locator("div.card", { hasText: testTaskTitle }).first();
    await expect(newTaskRow).toBeVisible();

    // Complete the task
    const checkbox = newTaskRow.locator("input[type='checkbox']");
    await checkbox.click();

    // Switch to "完了済み" filter
    await page.locator("button:has-text('完了済み')").click();
    await expect(page.locator("div.card", { hasText: testTaskTitle }).first()).toBeVisible();
  });

  test("5. ノート管理: ノート作成と自動保存の動作確認", async ({ page }) => {
    await page.goto("/notes");

    // Click "+ 追加"
    await page.locator("button:has-text('+ 追加')").click();

    // Edit title
    const titleInput = page.locator("input[placeholder='タイトル']");
    await titleInput.fill("ブラウザテスト自動作成ノート");

    // Edit content
    const textarea = page.locator("textarea[placeholder*='面接の振り返り']");
    await textarea.fill("ブラウザからのノート作成テストです。自動保存されます。");

    // Wait for auto-save
    await expect(page.locator(".save-indicator")).toContainText("自動保存済み", { timeout: 4000 });

    // Verify list reflects title
    await expect(page.locator("text=ブラウザテスト自動作成ノート").first()).toBeVisible();
  });

  test("6. 設定管理: プロフィールの編集と自動保存確認", async ({ page }) => {
    await page.goto("/settings");

    // Edit weekly focus
    const focusArea = page.locator("textarea[placeholder*='面接準備']");
    await focusArea.fill("ブラウザテスト: 今週のフォーカス更新");

    // Wait for auto-save debounce
    await expect(page.locator(".save-indicator")).toContainText("自動保存済み", { timeout: 4000 });

    // Return to dashboard and verify updated focus is shown
    await page.goto("/");
    await expect(page.locator("text=ブラウザテスト: 今週のフォーカス更新")).toBeVisible();
  });

  test("7. リアルタイム同期 (SSE): CLIからのデータ更新がリロードなしで画面に反映されること", async ({
    page,
  }) => {
    await page.goto("/companies");

    // Ensure company list is visible
    await expect(page.locator("text=テックフロンティア株式会社").first()).toBeVisible();

    // Execute CLI command to add a company with unique name
    const uniqueCoName = `SSE即時反映株式会社_${Date.now()}`;
    const cliPath = path.resolve(process.cwd(), "dist/cli.js");
    execSync(`node "${cliPath}" company add --name "${uniqueCoName}" --industry "AI"`);

    // The browser page should automatically receive the SSE change event and render the new company
    await expect(page.locator(`text=${uniqueCoName}`).first()).toBeVisible({ timeout: 6000 });
  });
});
