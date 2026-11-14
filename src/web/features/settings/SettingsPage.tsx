import type { ProfileData } from "@/core/client";
import { useEffect, useRef, useState } from "react";
import { clearSamplesApi, patchProfile } from "../../api/client";
import { useWorkspace } from "../../api/use-workspace";

export function SettingsPage() {
  const { data, isLoading, refetch, setSaveStatus } = useWorkspace();
  const [form, setForm] = useState<ProfileData | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (data?.profile) {
      setForm(data.profile);
    }
  }, [data?.profile]);

  if (isLoading || !form) {
    return <div style={{ padding: "40px", textAlign: "center" }}>設定を読み込み中...</div>;
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
    }, 800);
  };

  const updateField = <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => {
    const updated = { ...form, [field]: value };
    triggerAutoSave(updated);
  };

  const updateArrayField = (
    field: "desiredRoles" | "desiredIndustries" | "strengths",
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

  const handleClearSample = async () => {
    if (
      !window.confirm("サンプルデータをすべて削除しますか？ご自身が登録したデータは保持されます。")
    ) {
      return;
    }
    try {
      await clearSamplesApi();
      await refetch();
      alert("サンプルデータを削除しました。");
    } catch (err) {
      alert("削除に失敗しました: " + (err as Error).message);
    }
  };

  return (
    <div style={{ display: "grid", gap: "24px", maxWidth: "900px", margin: "0 auto" }}>
      {/* Profile Form */}
      <section className="card" style={{ padding: "24px", display: "grid", gap: "16px" }}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: "1.2rem" }}>👤 基本プロフィール & 就活軸</h2>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)" }}>
          入力内容は自動保存され、AIエージェントが志望動機やESの下書きを生成する際の文脈（コンテキスト）として活用されます。
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "14px",
          }}
        >
          <div>
            <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>氏名:</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              style={{ width: "100%", padding: "6px 10px", marginTop: "4px" }}
              placeholder="例: 就活 太郎"
            />
          </div>

          <div>
            <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>大学・学部・専攻:</label>
            <input
              type="text"
              value={form.school}
              onChange={(e) => updateField("school", e.target.value)}
              style={{ width: "100%", padding: "6px 10px", marginTop: "4px" }}
              placeholder="例: ○○大学 工学部 情報工学科"
            />
          </div>

          <div>
            <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>卒業年:</label>
            <input
              type="text"
              value={form.graduationYear}
              onChange={(e) => updateField("graduationYear", e.target.value)}
              style={{ width: "100%", padding: "6px 10px", marginTop: "4px" }}
              placeholder="例: 2027年卒"
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>志望職種 (カンマ区切り):</label>
          <input
            type="text"
            value={form.desiredRoles.join(", ")}
            onChange={(e) => updateArrayField("desiredRoles", e.target.value)}
            style={{ width: "100%", padding: "6px 10px", marginTop: "4px" }}
            placeholder="例: Webエンジニア, PdM, データサイエンティスト"
          />
        </div>

        <div>
          <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>志望業界 (カンマ区切り):</label>
          <input
            type="text"
            value={form.desiredIndustries.join(", ")}
            onChange={(e) => updateArrayField("desiredIndustries", e.target.value)}
            style={{ width: "100%", padding: "6px 10px", marginTop: "4px" }}
            placeholder="例: BtoB SaaS, クラウド, ITコンサル"
          />
        </div>

        <div>
          <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>
            アピールしたい強み・学生時代注力したこと (カンマ区切り):
          </label>
          <input
            type="text"
            value={form.strengths.join(", ")}
            onChange={(e) => updateArrayField("strengths", e.target.value)}
            style={{ width: "100%", padding: "6px 10px", marginTop: "4px" }}
            placeholder="例: 自走力, ハッカソン最優秀賞, チーム推進力"
          />
        </div>

        <div>
          <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>
            今週のフォーカス・重点課題:
          </label>
          <textarea
            rows={3}
            value={form.weeklyFocus}
            onChange={(e) => updateField("weeklyFocus", e.target.value)}
            style={{ width: "100%", padding: "8px 10px", marginTop: "4px" }}
            placeholder="例: ○○社の2次面接準備と逆質問の整理、WEBテスト非言語の復習"
          />
        </div>

        <div>
          <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>就活全体のメモ・ポリシー:</label>
          <textarea
            rows={2}
            value={form.memo}
            onChange={(e) => updateField("memo", e.target.value)}
            style={{ width: "100%", padding: "8px 10px", marginTop: "4px" }}
          />
        </div>
      </section>

      {/* Sample Data Management */}
      <section className="card" style={{ padding: "24px" }}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: "1.2rem" }}>🧪 サンプルデータの管理</h2>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)" }}>
          初期状態では体験用のサンプルデータ（2社、タスク、ノート）が登録されています。
          ご自身のデータを登録し始める際に、以下のボタンからサンプルだけを一括削除できます。
        </p>

        <div style={{ marginTop: "16px" }}>
          <button
            type="button"
            className="button-ghost"
            style={{ color: "var(--danger)", border: "1px solid var(--danger)" }}
            onClick={handleClearSample}
            disabled={!hasSampleData}
          >
            {hasSampleData ? "🗑️ サンプルデータをすべて削除する" : "✓ サンプルデータはありません"}
          </button>
        </div>
      </section>
    </div>
  );
}
