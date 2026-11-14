import {
  AlertTriangle,
  Briefcase,
  Building2,
  CheckCircle2,
  CheckSquare,
  FileText,
  Info,
  LayoutDashboard,
  Moon,
  RefreshCw,
  Search,
  Settings,
  Sun,
  Trash2,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router";
import { clearSamplesApi } from "../api/client";
import { type SaveStatus, useWorkspace } from "../api/use-workspace";
import { CommandPalette } from "./CommandPalette";

function saveStateMeta(status: SaveStatus, lastSync: string) {
  switch (status) {
    case "saving":
      return {
        label: "保存中...",
        className: "save-indicator save-indicator-saving",
        icon: <RefreshCw size={13} className="gh-spin" />,
      };
    case "conflict":
      return {
        label: "外部更新を検知（再読込推奨）",
        className: "save-indicator save-indicator-conflict",
        icon: <AlertTriangle size={13} />,
      };
    case "error":
      return {
        label: "保存に失敗しました",
        className: "save-indicator save-indicator-error",
        icon: <XCircle size={13} />,
      };
    case "saved":
      return {
        label: `自動保存済み (${lastSync})`,
        className: "save-indicator save-indicator-saved",
        icon: <CheckCircle2 size={13} />,
      };
    default:
      return {
        label: lastSync ? `同期済み (${lastSync})` : "準備完了",
        className: "save-indicator",
        icon: <CheckCircle2 size={13} />,
      };
  }
}

export function Layout() {
  const { data, refetch, saveStatus, lastSyncTime } = useWorkspace();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [clearingSample, setClearingSample] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    setTheme(isDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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

  const statusMeta = saveStateMeta(saveStatus, lastSyncTime);
  const companyCount = data?.companies.length ?? 0;
  const openTaskCount = data?.tasks.filter((t) => t.state !== "done").length ?? 0;
  const noteCount = data?.notes.length ?? 0;
  const gradYear = data?.profile.graduationYear;

  return (
    <div>
      <header className="gh-header">
        <div className="gh-header-inner">
          <div className="gh-header-top">
            <div className="gh-brand">
              <span className="gh-brand-icon" aria-hidden="true">
                <Briefcase size={16} strokeWidth={2} />
              </span>
              <div className="gh-brand-title-group">
                <h1>AI-Ready Shukatsu</h1>
                <span className="gh-brand-slash">/</span>
                <span className="gh-brand-context">
                  {gradYear ? `${gradYear} ワークスペース` : "ローカル就活ワークスペース"}
                </span>
              </div>
            </div>

            <div className="gh-header-actions">
              <button
                type="button"
                className="gh-cmd-trigger"
                onClick={() => setCmdOpen(true)}
                title="クイック検索・移動 (Ctrl+K / ⌘K)"
              >
                <Search size={13} />
                <span>クイック移動...</span>
                <span className="gh-kbd">⌘K</span>
              </button>

              <span className={statusMeta.className} title="ローカルファイルとの同期状態">
                {statusMeta.icon}
                <span>{statusMeta.label}</span>
              </span>

              <button
                type="button"
                className="btn btn-icon"
                onClick={toggleTheme}
                title={theme === "light" ? "ダークテーマに切り替え" : "ライトテーマに切り替え"}
                aria-label={theme === "light" ? "ダークテーマに切り替え" : "ライトテーマに切り替え"}
              >
                {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
              </button>
            </div>
          </div>

          <nav className="gh-underline-nav" aria-label="メインナビゲーション">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `gh-underline-tab ${isActive ? "active" : ""}`}
            >
              <LayoutDashboard size={15} strokeWidth={1.8} />
              <span>ダッシュボード</span>
            </NavLink>

            <NavLink
              to="/companies"
              className={({ isActive }) => `gh-underline-tab ${isActive ? "active" : ""}`}
            >
              <Building2 size={15} strokeWidth={1.8} />
              <span>企業管理</span>
              {data ? <span className="gh-counter">{companyCount}</span> : null}
            </NavLink>

            <NavLink
              to="/tasks"
              className={({ isActive }) => `gh-underline-tab ${isActive ? "active" : ""}`}
            >
              <CheckSquare size={15} strokeWidth={1.8} />
              <span>タスク</span>
              {data ? <span className="gh-counter">{openTaskCount}</span> : null}
            </NavLink>

            <NavLink
              to="/notes"
              className={({ isActive }) => `gh-underline-tab ${isActive ? "active" : ""}`}
            >
              <FileText size={15} strokeWidth={1.8} />
              <span>ノート</span>
              {data ? <span className="gh-counter">{noteCount}</span> : null}
            </NavLink>

            <NavLink
              to="/settings"
              className={({ isActive }) => `gh-underline-tab ${isActive ? "active" : ""}`}
            >
              <Settings size={15} strokeWidth={1.8} />
              <span>設定</span>
            </NavLink>
          </nav>
        </div>
      </header>

      {hasSampleData && (
        <div className="gh-flash">
          <div className="gh-flash-inner">
            <span className="gh-flash-msg">
              <Info size={16} style={{ color: "var(--attention-fg)", flexShrink: 0 }} />
              <span>
                <strong>サンプルデータ表示中:</strong>{" "}
                体験用のサンプル企業・タスク・ノートが含まれています。
              </span>
            </span>
            <button
              type="button"
              className="btn btn-sm"
              disabled={clearingSample}
              onClick={handleClearSample}
            >
              <Trash2 size={13} />
              <span>{clearingSample ? "削除中..." : "サンプルを一括削除"}</span>
            </button>
          </div>
        </div>
      )}

      <main className="gh-main">
        <Outlet />
      </main>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}
