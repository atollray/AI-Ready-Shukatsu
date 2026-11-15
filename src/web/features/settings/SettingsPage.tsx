import type { ProfileData } from "@/core/client";
import {
  AlertTriangle,
  Calendar,
  Compass,
  Database,
  Download,
  Keyboard,
  Target,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import {
  type WorkspaceBackup,
  clearSamplesApi,
  exportWorkspaceBackup,
  importWorkspaceBackup,
  patchProfile,
} from "../../api/client";
import { useWorkspace } from "../../api/use-workspace";

export function SettingsPage() {
  const { data, isLoading, refetch, setSaveStatus } = useWorkspace();
  const [form, setForm] = useState<ProfileData | null>(null);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [backupMessage, setBackupMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (data?.profile) {
      setForm(data.profile);
    }
  }, [data?.profile]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (isLoading || !form) {
    return (
      <div className="gh-empty">
        <span>設定を読み込み中...</span>
      </div>
    );
  }

  const triggerAutoSave = (updated: ProfileData) => {
    setForm(updated);
    setSaveStatus("saving");

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await patchProfile(updated);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, 650);
  };

  const updateField = <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => {
    triggerAutoSave({ ...form, [field]: value });
  };

  const updateArrayField = (
    field: "desiredRoles" | "desiredIndustries" | "domainInterests" | "strengths" | "priorities",
    valueStr: string,
  ) => {
    const arr = valueStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    updateField(field, arr);
  };

  const hasSampleData =
    data?.companies.some((c) => c.isSample) ||
    data?.tasks.some((t) => t.isSample) ||
    data?.notes.some((n) => n.isSample);

  const handleExportBackup = async () => {
    setIsBackingUp(true);
    setBackupMessage(null);
    try {
      const backup = await exportWorkspaceBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `shukatsu-backup-${backup.exportedAt.slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setBackupMessage({
        type: "success",
        text: `バックアップを出力しました（企業 ${backup.companies.length}社・タスク ${backup.tasks.length}件・ノート ${backup.notes.length}件）`,
      });
    } catch (err) {
      setBackupMessage({
        type: "error",
        text: `エクスポートに失敗しました: ${(err as Error).message}`,
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleImportBackupFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsBackingUp(true);
    setBackupMessage(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as WorkspaceBackup;
      const result = await importWorkspaceBackup(parsed, importMode);
      await refetch();
      setBackupMessage({
        type: "success",
        text: `${importMode === "replace" ? "置き換え" : "マージ"}インポート完了（企業 ${result.imported.companies}社・タスク ${result.imported.tasks}件・ノート ${result.imported.notes}件）`,
      });
    } catch (err) {
      setBackupMessage({
        type: "error",
        text: `インポートに失敗しました: ${(err as Error).message}`,
      });
    } finally {
      setIsBackingUp(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClearSample = async () => {
    if (
      !window.confirm("サンプルデータをすべて削除しますか？ご自身が登録したデータは保持されます。")
    ) {
      return;
    }
    try {
      await clearSamplesApi();
      await refetch();
      setBackupMessage({ type: "success", text: "サンプルデータを削除しました。" });
    } catch (err) {
      setBackupMessage({
        type: "error",
        text: `削除に失敗しました: ${(err as Error).message}`,
      });
    }
  };

  return (
    <div className="gh-stack" style={{ maxWidth: "920px", margin: "0 auto" }}>
      {/* Basic Profile */}
      <section className="card">
        <div className="gh-box-header">
          <h2 className="gh-box-title">
            <User size={15} className="gh-muted" />
            <span>基本プロフィール & 就活軸</span>
          </h2>
          <span className="gh-muted" style={{ fontSize: "12px" }}>
            AIコンテキストとして自動連携
          </span>
        </div>

        <div className="gh-box-body gh-stack">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            <div className="gh-field">
              <label className="gh-field-label">氏名</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="例: 就活 太郎"
              />
            </div>

            <div className="gh-field">
              <label className="gh-field-label">大学・学部・専攻</label>
              <input
                type="text"
                value={form.school}
                onChange={(e) => updateField("school", e.target.value)}
                placeholder="例: ○○大学 工学部 情報工学科"
              />
            </div>

            <div className="gh-field">
              <label className="gh-field-label">卒業年</label>
              <input
                type="text"
                value={form.graduationYear}
                onChange={(e) => updateField("graduationYear", e.target.value)}
                placeholder="例: 2027年卒"
              />
            </div>
          </div>

          <div className="gh-2col-equal">
            <div className="gh-field">
              <label className="gh-field-label">志望職種（カンマ区切り）</label>
              <input
                type="text"
                value={form.desiredRoles.join(", ")}
                onChange={(e) => updateArrayField("desiredRoles", e.target.value)}
                placeholder="例: Webエンジニア, PdM, データサイエンティスト"
              />
            </div>

            <div className="gh-field">
              <label className="gh-field-label">志望業界（カンマ区切り）</label>
              <input
                type="text"
                value={form.desiredIndustries.join(", ")}
                onChange={(e) => updateArrayField("desiredIndustries", e.target.value)}
                placeholder="例: BtoB SaaS, クラウド, ITコンサル"
              />
            </div>
          </div>

          <div className="gh-2col-equal">
            <div className="gh-field">
              <label className="gh-field-label">興味領域（カンマ区切り）</label>
              <input
                type="text"
                value={form.domainInterests.join(", ")}
                onChange={(e) => updateArrayField("domainInterests", e.target.value)}
                placeholder="例: 開発者体験, 生成AI, EdTech"
              />
            </div>

            <div className="gh-field">
              <label className="gh-field-label">優先する価値観（カンマ区切り）</label>
              <input
                type="text"
                value={form.priorities.join(", ")}
                onChange={(e) => updateArrayField("priorities", e.target.value)}
                placeholder="例: 技術的挑戦, 裁量, 自社プロダクト"
              />
            </div>
          </div>

          <div className="gh-field">
            <label className="gh-field-label">
              アピールしたい強み・学生時代注力したこと（カンマ区切り）
            </label>
            <input
              type="text"
              value={form.strengths.join(", ")}
              onChange={(e) => updateArrayField("strengths", e.target.value)}
              placeholder="例: 自走力, ハッカソン最優秀賞, チーム推進力"
            />
          </div>

          <div className="gh-field">
            <label className="gh-field-label">希望する働き方・環境</label>
            <input
              type="text"
              value={form.workingPreferences}
              onChange={(e) => updateField("workingPreferences", e.target.value)}
              placeholder="例: フレックス・ハイブリッド勤務、コードレビュー文化"
            />
          </div>
        </div>
      </section>

      {/* Career Vision & Weekly Focus */}
      <section className="card">
        <div className="gh-box-header">
          <h2 className="gh-box-title">
            <Compass size={15} className="gh-muted" />
            <span>キャリアビジョン & 今週のフォーカス</span>
          </h2>
        </div>

        <div className="gh-box-body gh-stack">
          <div className="gh-field">
            <label className="gh-field-label gh-row-gap" style={{ gap: "5px" }}>
              <Target size={13} style={{ color: "var(--accent-fg)" }} />
              <span>今週のフォーカス・重点課題</span>
            </label>
            <textarea
              rows={3}
              value={form.weeklyFocus}
              onChange={(e) => updateField("weeklyFocus", e.target.value)}
              placeholder="例: ○○社の2次面接準備と逆質問の整理、WEBテスト非言語の復習"
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "12px",
            }}
          >
            <div className="gh-field">
              <label className="gh-field-label">短期ビジョン（1〜2年）</label>
              <textarea
                rows={2}
                value={form.careerVision.shortTerm}
                onChange={(e) =>
                  updateField("careerVision", {
                    ...form.careerVision,
                    shortTerm: e.target.value,
                  })
                }
                placeholder="入社後の目標"
              />
            </div>

            <div className="gh-field">
              <label className="gh-field-label">中期ビジョン（3〜5年）</label>
              <textarea
                rows={2}
                value={form.careerVision.midTerm}
                onChange={(e) =>
                  updateField("careerVision", {
                    ...form.careerVision,
                    midTerm: e.target.value,
                  })
                }
                placeholder="技術リードやPdMなど"
              />
            </div>

            <div className="gh-field">
              <label className="gh-field-label">長期ビジョン</label>
              <textarea
                rows={2}
                value={form.careerVision.longTerm}
                onChange={(e) =>
                  updateField("careerVision", {
                    ...form.careerVision,
                    longTerm: e.target.value,
                  })
                }
                placeholder="目指すエンジニア像"
              />
            </div>
          </div>

          <div className="gh-field">
            <label className="gh-field-label">就活全体のメモ・ポリシー</label>
            <textarea
              rows={2}
              value={form.memo}
              onChange={(e) => updateField("memo", e.target.value)}
              placeholder="選考の判断軸や記録ポリシー"
            />
          </div>
        </div>
      </section>

      {/* Data Backup & Calendar Export */}
      <section className="card">
        <div className="gh-box-header">
          <h2 className="gh-box-title">
            <Database size={15} className="gh-muted" />
            <span>データバックアップ & カレンダー連携</span>
          </h2>
          <span className="gh-muted" style={{ fontSize: "12px" }}>
            JSON エクスポート / 復元 / iCalendar (.ics)
          </span>
        </div>

        <div className="gh-box-body gh-stack">
          <div className="gh-row-between" style={{ gap: "12px", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600 }}>
                ワークスペース JSON バックアップ
              </div>
              <p className="gh-muted" style={{ margin: "2px 0 0", fontSize: "12px" }}>
                全企業・ES・イベント・タスク・ノート・プロフィールを 1 つの JSON
                ファイルとして保存・復元します。
              </p>
            </div>
            <div className="gh-row-gap" style={{ flexWrap: "wrap" }}>
              <button
                type="button"
                className="button"
                onClick={handleExportBackup}
                disabled={isBackingUp}
              >
                <Download size={14} />
                <span>JSON エクスポート</span>
              </button>

              <select
                aria-label="インポートモード"
                value={importMode}
                onChange={(e) => setImportMode(e.target.value as "merge" | "replace")}
                style={{ width: "auto", fontSize: "12px" }}
              >
                <option value="merge">マージ（追加・上書き）</option>
                <option value="replace">置き換え（全入れ替え）</option>
              </select>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleImportBackupFile}
                style={{ display: "none" }}
                aria-label="バックアップJSONファイルを選択"
              />
              <button
                type="button"
                className="button-primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={isBackingUp}
              >
                <Upload size={14} />
                <span>JSON インポート</span>
              </button>
            </div>
          </div>

          <div
            className="gh-row-between"
            style={{
              paddingTop: "12px",
              borderTop: "1px solid var(--border-muted)",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600 }}>カレンダー連携 (.ics)</div>
              <p className="gh-muted" style={{ margin: "2px 0 0", fontSize: "12px" }}>
                面接日程・ES締切・タスク期日を Google カレンダーや Apple カレンダーに取り込める ICS
                形式で出力します。
              </p>
            </div>
            <a href="/api/calendar.ics" download="shukatsu-calendar.ics" className="button">
              <Calendar size={14} />
              <span>calendar.ics をダウンロード</span>
            </a>
          </div>

          {backupMessage && (
            <output
              style={{
                display: "block",
                padding: "8px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                border: "1px solid",
                borderColor:
                  backupMessage.type === "error" ? "var(--danger-muted)" : "var(--success-muted)",
                background:
                  backupMessage.type === "error" ? "var(--danger-subtle)" : "var(--success-subtle)",
                color: backupMessage.type === "error" ? "var(--danger-fg)" : "var(--success-fg)",
              }}
            >
              {backupMessage.text}
            </output>
          )}
        </div>
      </section>

      {/* Keyboard Shortcuts */}
      <section className="card">
        <div className="gh-box-header">
          <h2 className="gh-box-title">
            <Keyboard size={15} className="gh-muted" />
            <span>キーボードショートカット</span>
          </h2>
        </div>
        <div className="gh-box-body gh-row-gap" style={{ gap: "20px", fontSize: "13px" }}>
          <div className="gh-row-gap">
            <span className="gh-kbd">⌘K</span>
            <span className="gh-muted">/</span>
            <span className="gh-kbd">Ctrl+K</span>
            <span>クイック移動パレットを開く</span>
          </div>
          <div className="gh-row-gap">
            <span className="gh-kbd">/</span>
            <span>企業一覧の検索ボックスにフォーカス</span>
          </div>
        </div>
      </section>

      {/* Danger Zone: Sample Data Management */}
      <section className="card" style={{ borderColor: "var(--danger-muted)" }}>
        <div className="gh-box-header">
          <h2 className="gh-box-title" style={{ color: "var(--danger-fg)" }}>
            <AlertTriangle size={15} />
            <span>サンプルデータの管理 (Danger Zone)</span>
          </h2>
        </div>
        <div className="gh-box-body gh-row-between">
          <p className="gh-muted" style={{ margin: 0, fontSize: "13px", maxWidth: "60ch" }}>
            初期状態では体験用のサンプルデータ（2社、タスク、ノート）が登録されています。ご自身のデータを登録し始める際に、サンプルだけを一括削除できます。
          </p>

          <button
            type="button"
            className="button-danger"
            onClick={handleClearSample}
            disabled={!hasSampleData}
          >
            <Trash2 size={14} />
            <span>
              {hasSampleData ? "サンプルデータをすべて削除する" : "サンプルデータはありません"}
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
