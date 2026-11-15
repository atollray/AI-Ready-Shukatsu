import { expect, test } from "@playwright/test";

test.describe("UX安全性 & ワークフロー改善 E2E", () => {
  test("タスク削除時の Toast と元に戻す (Undo) が動作する", async ({ page }) => {
    await page.goto("/tasks");

    const taskTitle = `Undo検証タスク_${Date.now()}`;
    await page.locator("input[placeholder='新しいタスクを入力...']").fill(taskTitle);
    await page.locator("button:has-text('+ タスク追加')").click();

    const row = page.locator("div.card", { hasText: taskTitle }).first();
    await expect(row).toBeVisible();

    await row.locator("button:has-text('削除')").click();
    await expect(page.locator(".gh-toast")).toContainText(`タスク「${taskTitle}」を削除しました`);
    await expect(page.locator("div.card", { hasText: taskTitle })).toHaveCount(0);

    await page.locator(".gh-toast button:has-text('元に戻す')").click();
    await expect(page.locator("div.card", { hasText: taskTitle }).first()).toBeVisible();
  });

  test("企業詳細の関連タスク追加と ES 空白除外文字数カウント切替が動作する", async ({ page }) => {
    await page.goto("/companies");
    await expect(page.locator("text=テックフロンティア株式会社").first()).toBeVisible();
    await page.locator("text=テックフロンティア株式会社").first().click();

    // Related task creation inside CompanyDetail
    const coTaskTitle = `企業内追加タスク_${Date.now()}`;
    await page.locator("input[placeholder='この企業のタスクを追加...']").fill(coTaskTitle);
    await page.locator("form button:has-text('追加')").click();
    await expect(page.locator(".gh-toast")).toContainText("関連タスクを追加しました");
    await expect(page.locator(`text=${coTaskTitle}`).first()).toBeVisible();

    // ES char count mode toggle (excluding whitespace/newlines)
    await page.locator("button[role='tab']:has-text('エントリーシート')").click();
    await page.locator("button:has-text('設問を追加')").click();

    const draftArea = page.locator("textarea[placeholder*='下書きを入力']").last();
    await draftArea.fill("あい\nうえ お"); // 7 chars with whitespace, 5 without

    const esCard = page
      .locator(".card", { has: page.locator("textarea[placeholder*='下書きを入力']") })
      .last();
    await expect(esCard).toContainText("7 字");

    await esCard.locator("button:has-text('空白・改行含む')").click();
    await expect(esCard.locator("button:has-text('空白・改行除く')")).toBeVisible();
    await expect(esCard).toContainText("5 字");
  });

  test("コマンドパレットのテーマ切替アクションが動作する", async ({ page }) => {
    await page.goto("/");
    await page.locator("button.gh-cmd-trigger").click();
    await page.locator(".gh-cmd-item", { hasText: "ダークテーマに切り替え" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.locator("button.gh-cmd-trigger").click();
    await page.locator(".gh-cmd-item", { hasText: "ライトテーマに切り替え" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("ノート切り替え時に未保存の入力がフラッシュ保存される", async ({ page }) => {
    await page.goto("/notes");

    // Create two notes so we can edit first and immediately switch
    await page.locator("button:has-text('+ 追加')").click();
    const firstTitle = `切替前ノート_${Date.now()}`;
    await page.locator("input[placeholder='タイトル']").fill(firstTitle);
    await expect(page.locator(".gh-list-item", { hasText: firstTitle }).first()).toBeVisible();
    await expect(page.locator(".save-indicator")).toContainText("自動保存済み", { timeout: 4000 });

    await page.locator("button:has-text('+ 追加')").click();
    const secondTitle = `切替先ノート_${Date.now()}`;
    await page.locator("input[placeholder='タイトル']").fill(secondTitle);
    await expect(page.locator(".gh-list-item", { hasText: secondTitle }).first()).toBeVisible();
    await expect(page.locator(".save-indicator")).toContainText("自動保存済み", { timeout: 4000 });

    // Edit second note body and immediately switch to first note before 550ms debounce fires
    const flushedBody = `即時切替フラッシュ本文_${Date.now()}`;
    await page.locator("textarea[placeholder*='面接の振り返り']").fill(flushedBody);
    await page.locator(".gh-list-item", { hasText: firstTitle }).first().click();

    await page.waitForTimeout(400);
    await page.reload();
    await page.locator(".gh-list-item", { hasText: secondTitle }).first().click();
    await expect(page.locator("textarea[placeholder*='面接の振り返り']")).toHaveValue(flushedBody);
  });
});
