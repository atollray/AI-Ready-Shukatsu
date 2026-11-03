import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { clearSamplesApi } from "../api/client";
import { type SaveStatus, useWorkspace } from "../api/use-workspace";

function saveStateLabel(status: SaveStatus, lastSync: string): string {
  switch (status) {
    case "saving":
      return "💾 保存中...";
    case "conflict":
      return "⚠️ 外部（AI等）で更新されました。最新を取り込みました。";
    case "error":
      return "❌ 保存に失敗しました";
    case "saved":
      return `✓ 自動保存済み (${lastSync})`;
    default:
      return lastSync ? `同期済み (${lastSync})` : "準備完了";
  }
}

export function Layout() {
  const { data, refetch, saveStatus, lastSyncTime } = useWorkspace();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [clearingSample, setClearingSample] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {}
  };

  const hasSampleData =
    data?.companies.some((c) => c.isSample) ||
    data?.tasks.some((t) => t.isSample) ||
    data?.notes.some((n) => n.isSample);

  const handleClearSample = async () => {
    if (
      !window.confirm("サンプルデータをすべて削除しますか？ご自身が登録したデータは保持されます。")
    ) {
      return;
    }
    setClearingSample(true);
    try {
      await clearSamplesApi();
      await refetch();
    } catch (err) {
      alert("サンプルデータの削除に失敗しました: " + (err as Error).message);
    } finally {
      setClearingSample(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-top">
          <div className="app-header-brand">
            <span style={{ fontSize: "1.8rem" }}>💼</span>
            <div>
              <h1>AI-Ready Shukatsu</h1>
              <span className="eyebrow" style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                ローカル就活データベース & AI 連携
              </span>
            </div>
          </div>

          <div className="app-header-actions">
            <span
              className={`save-indicator ${saveStatus === "saving" ? "save-indicator-saving" : saveStatus === "saved" ? "save-indicator-saved" : ""}`}
              style={{
                fontSize: "0.85rem",
                padding: "6px 12px",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-accent)",
              }}
            >
              {saveStateLabel(saveStatus, lastSyncTime)}
            </span>

            <button
              type="button"
              className="button-ghost"
              onClick={toggleTheme}
              title="テーマ切り替え"
              style={{ padding: "8px 12px" }}
            >
              {theme === "light" ? "🌙 ダーク" : "☀️ ライト"}
            </button>
          </div>
        </div>

        {hasSampleData && (
          <div
            style={{
              padding: "10px 16px",
              background: "rgba(214, 160, 84, 0.2)",
              border: "1px solid rgba(214, 160, 84, 0.4)",
              borderRadius: "var(--radius-md)",
              marginTop: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.88rem",
            }}
          >
            <span>
              ℹ️ <strong>サンプルデータ表示中</strong>:
              体験用のサンプル企業・タスク・ノートが含まれています。
            </span>
            <button
              type="button"
              className="button-ghost"
              disabled={clearingSample}
              onClick={handleClearSample}
              style={{ fontSize: "0.82rem", padding: "4px 10px" }}
            >
              {clearingSample ? "削除中..." : "サンプルを一括削除"}
            </button>
          </div>
        )}

        <nav className="main-tab-bar" style={{ marginTop: "12px" }}>
          <NavLink
            to="/"
            end
            className={({ isActive }) => `main-tab ${isActive ? "main-tab-active" : ""}`}
          >
            🏠 ダッシュボード
          </NavLink>
          <NavLink
            to="/companies"
            className={({ isActive }) => `main-tab ${isActive ? "main-tab-active" : ""}`}
          >
            🏢 企業管理
          </NavLink>
          <NavLink
            to="/tasks"
            className={({ isActive }) => `main-tab ${isActive ? "main-tab-active" : ""}`}
          >
            ✅ タスク
          </NavLink>
          <NavLink
            to="/notes"
            className={({ isActive }) => `main-tab ${isActive ? "main-tab-active" : ""}`}
          >
            📝 ノート
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) => `main-tab ${isActive ? "main-tab-active" : ""}`}
          >
            ⚙️ 設定
          </NavLink>
        </nav>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
