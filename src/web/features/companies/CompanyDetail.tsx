import {
  type Company,
  type CompanyStage,
  type EsEntry,
  type EventEntry,
  generateId,
} from "@/core/client";
import { useEffect, useRef, useState } from "react";
import { patchCompany } from "../../api/client";
import type { SaveStatus } from "../../api/use-workspace";

interface CompanyDetailProps {
  company: Company;
  onCompanyUpdated: (updated: Company) => void;
  onCompanyDeleted: (id: string) => void;
  setSaveStatus: (status: SaveStatus) => void;
}

const STAGE_OPTIONS: { value: CompanyStage; label: string }[] = [
  { value: "wishlist", label: "気になる (Wishlist)" },
  { value: "researching", label: "企業調査中" },
  { value: "applied", label: "応募・ES中" },
  { value: "interview", label: "面接進行中" },
  { value: "offer", label: "内定・内々定" },
  { value: "paused", label: "保留" },
  { value: "rejected", label: "お見送り" },
];

export function CompanyDetail({
  company,
  onCompanyUpdated,
  onCompanyDeleted,
  setSaveStatus,
}: CompanyDetailProps) {
  const [form, setForm] = useState<Company>(company);
  const [activeTab, setActiveTab] = useState<"overview" | "es" | "events" | "contacts">("overview");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setForm(company);
  }, [company]);

  // Debounced auto-save
  const triggerAutoSave = (updated: Company) => {
    setForm(updated);
    setSaveStatus("saving");

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const saved = await patchCompany(updated.id, updated, company.rev);
        onCompanyUpdated(saved);
        setSaveStatus("saved");
      } catch (err: any) {
        if (err.message?.startsWith("CONFLICT")) {
          setSaveStatus("conflict");
        } else {
          setSaveStatus("error");
        }
      }
    }, 800);
  };

  const updateField = <K extends keyof Company>(field: K, value: Company[K]) => {
    const updated = { ...form, [field]: value };
    triggerAutoSave(updated);
  };

  const handleStageChange = (newStage: CompanyStage) => {
    if (newStage === form.stage) return;
    const now = new Date().toISOString();
    const updated: Company = {
      ...form,
      stage: newStage,
      stageHistory: [
        ...form.stageHistory,
        {
          at: now,
          track: form.currentTrack,
          from: form.stage,
          to: newStage,
        },
      ],
    };
    triggerAutoSave(updated);
  };

  // ES handlers
  const handleAddEs = () => {
    const newEs: EsEntry = {
      id: generateId("es"),
      title: "新しいES設問",
      question: "",
      draft: "",
      status: "idea",
      deadline: "",
      track: form.currentTrack,
    };
    const updated = { ...form, esEntries: [...form.esEntries, newEs] };
    triggerAutoSave(updated);
  };

  const updateEs = (esId: string, patch: Partial<EsEntry>) => {
    const updated = {
      ...form,
      esEntries: form.esEntries.map((e) => (e.id === esId ? { ...e, ...patch } : e)),
    };
    triggerAutoSave(updated);
  };

  const deleteEs = (esId: string) => {
    const updated = {
      ...form,
      esEntries: form.esEntries.filter((e) => e.id !== esId),
    };
    triggerAutoSave(updated);
  };

  // Event handlers
  const handleAddEvent = () => {
    const newEv: EventEntry = {
      id: generateId("ev"),
      kind: "interview",
      title: "1次面接",
      start: new Date().toISOString().slice(0, 10),
      location: "オンライン",
      track: form.currentTrack,
      notes: "",
    };
    const updated = { ...form, events: [...form.events, newEv] };
    triggerAutoSave(updated);
  };

  const updateEvent = (evId: string, patch: Partial<EventEntry>) => {
    const updated = {
      ...form,
      events: form.events.map((e) => (e.id === evId ? { ...e, ...patch } : e)),
    };
    triggerAutoSave(updated);
  };

  const deleteEvent = (evId: string) => {
    const updated = {
      ...form,
      events: form.events.filter((e) => e.id !== evId),
    };
    triggerAutoSave(updated);
  };

  return (
    <div className="card" style={{ padding: "24px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: "260px" }}>
          <input
            type="text"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            style={{
              fontSize: "1.4rem",
              fontWeight: 700,
              width: "100%",
              padding: "4px 8px",
              border: "1px solid transparent",
              borderRadius: "var(--radius-md)",
              background: "transparent",
            }}
            placeholder="企業名を入力"
          />
          <div
            style={{
              display: "flex",
              gap: "12px",
              marginTop: "6px",
              fontSize: "0.85rem",
              color: "var(--muted)",
            }}
          >
            <span>
              ID: <code>{form.id}</code>
            </span>
            <span>更新: {new Date(form.updatedAt).toLocaleString("ja-JP")}</span>
            {form.isSample && <span style={{ color: "var(--danger)" }}>[サンプル]</span>}
          </div>
        </div>

        <button
          type="button"
          className="button-ghost"
          style={{ color: "var(--danger)", fontSize: "0.85rem" }}
          onClick={() => {
            if (window.confirm(`「${form.name}」を削除しますか？`)) {
              onCompanyDeleted(form.id);
            }
          }}
        >
          🗑️ 企業を削除
        </button>
      </div>

      {/* Stage & Track Bar */}
      <div
        style={{
          marginTop: "16px",
          padding: "14px",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-md)",
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>ステージ:</label>
          <select
            value={form.stage}
            onChange={(e) => handleStageChange(e.target.value as CompanyStage)}
            style={{ padding: "4px 8px", borderRadius: "6px" }}
          >
            {STAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>選考ルート (Track):</label>
          <input
            type="text"
            value={form.currentTrack}
            onChange={(e) => updateField("currentTrack", e.target.value)}
            placeholder="例: 本選考, 早期選考, 夏インターン"
            style={{ padding: "4px 8px", width: "140px", borderRadius: "6px" }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div>
            <label style={{ fontSize: "0.85rem", fontWeight: 600, marginRight: "6px" }}>
              志望度:
            </label>
            <select
              value={form.interestScore}
              onChange={(e) => updateField("interestScore", Number(e.target.value))}
              style={{ padding: "4px 8px", borderRadius: "6px" }}
            >
              {[1, 2, 3, 4, 5].map((s) => (
                <option key={s} value={s}>
                  {s} / 5
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "0.85rem", fontWeight: 600, marginRight: "6px" }}>
              マッチ度:
            </label>
            <select
              value={form.fitScore}
              onChange={(e) => updateField("fitScore", Number(e.target.value))}
              style={{ padding: "4px 8px", borderRadius: "6px" }}
            >
              {[1, 2, 3, 4, 5].map((s) => (
                <option key={s} value={s}>
                  {s} / 5
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginTop: "20px",
          borderBottom: "1px solid var(--line)",
          paddingBottom: "8px",
        }}
      >
        <button
          type="button"
          className={`button-ghost ${activeTab === "overview" ? "button-primary" : ""}`}
          onClick={() => setActiveTab("overview")}
          style={{ padding: "6px 14px", fontSize: "0.88rem" }}
        >
          📋 概要・条件
        </button>
        <button
          type="button"
          className={`button-ghost ${activeTab === "es" ? "button-primary" : ""}`}
          onClick={() => setActiveTab("es")}
          style={{ padding: "6px 14px", fontSize: "0.88rem" }}
        >
          ✍️ エントリーシート ({form.esEntries.length})
        </button>
        <button
          type="button"
          className={`button-ghost ${activeTab === "events" ? "button-primary" : ""}`}
          onClick={() => setActiveTab("events")}
          style={{ padding: "6px 14px", fontSize: "0.88rem" }}
        >
          🎤 予定・面接 ({form.events.length})
        </button>
      </div>

      {/* Sub Tab: Overview */}
      {activeTab === "overview" && (
        <div style={{ display: "grid", gap: "16px", marginTop: "16px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "12px",
            }}
          >
            <div>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>業界:</label>
              <input
                type="text"
                value={form.industry}
                onChange={(e) => updateField("industry", e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  marginTop: "4px",
                  borderRadius: "6px",
                }}
                placeholder="例: BtoB SaaS, SIer"
              />
            </div>
            <div>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>本社所在地:</label>
              <input
                type="text"
                value={form.headquarters}
                onChange={(e) => updateField("headquarters", e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  marginTop: "4px",
                  borderRadius: "6px",
                }}
                placeholder="例: 東京都千代田区"
              />
            </div>
            <div>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>採用ページURL:</label>
              <input
                type="text"
                value={form.urls.careers}
                onChange={(e) => updateField("urls", { ...form.urls, careers: e.target.value })}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  marginTop: "4px",
                  borderRadius: "6px",
                }}
                placeholder="https://..."
              />
            </div>
            <div>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>マイページ / 応募URL:</label>
              <input
                type="text"
                value={form.urls.application}
                onChange={(e) => updateField("urls", { ...form.urls, application: e.target.value })}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  marginTop: "4px",
                  borderRadius: "6px",
                }}
                placeholder="https://..."
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>志望理由・下書き:</label>
            <textarea
              rows={3}
              value={form.motivation}
              onChange={(e) => updateField("motivation", e.target.value)}
              style={{ width: "100%", padding: "8px 10px", marginTop: "4px", borderRadius: "6px" }}
              placeholder="なぜこの企業を志望するのか、自分の強みや興味とどう合致するか"
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "12px",
            }}
          >
            <div>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>企業の強み・魅力:</label>
              <textarea
                rows={3}
                value={form.sellingPoints}
                onChange={(e) => updateField("sellingPoints", e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  marginTop: "4px",
                  borderRadius: "6px",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>懸念点・留意事項:</label>
              <textarea
                rows={3}
                value={form.concerns}
                onChange={(e) => updateField("concerns", e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  marginTop: "4px",
                  borderRadius: "6px",
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>待遇・勤務条件メモ:</label>
            <input
              type="text"
              value={form.conditions}
              onChange={(e) => updateField("conditions", e.target.value)}
              style={{ width: "100%", padding: "6px 10px", marginTop: "4px", borderRadius: "6px" }}
              placeholder="例: 初任給30万、家賃補助あり、フレックス"
            />
          </div>

          <div>
            <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>社内メモ・所感:</label>
            <textarea
              rows={2}
              value={form.memo}
              onChange={(e) => updateField("memo", e.target.value)}
              style={{ width: "100%", padding: "8px 10px", marginTop: "4px", borderRadius: "6px" }}
            />
          </div>
        </div>
      )}

      {/* Sub Tab: ES */}
      {activeTab === "es" && (
        <div style={{ marginTop: "16px", display: "grid", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
              ES設問と推敲中の下書きを管理します
            </span>
            <button
              type="button"
              className="button-primary"
              onClick={handleAddEs}
              style={{ fontSize: "0.82rem" }}
            >
              + 設問を追加
            </button>
          </div>

          {form.esEntries.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>登録されたESはありません。</p>
          ) : (
            form.esEntries.map((es) => (
              <div
                key={es.id}
                style={{
                  padding: "16px",
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-md)",
                  display: "grid",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    alignItems: "center",
                  }}
                >
                  <input
                    type="text"
                    value={es.title}
                    onChange={(e) => updateEs(es.id, { title: e.target.value })}
                    style={{ fontWeight: 700, fontSize: "0.95rem", flex: 1, padding: "4px 8px" }}
                  />
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <select
                      value={es.status}
                      onChange={(e) => updateEs(es.id, { status: e.target.value as any })}
                      style={{ fontSize: "0.82rem", padding: "4px 8px" }}
                    >
                      <option value="idea">アイデア</option>
                      <option value="draft">下書き中</option>
                      <option value="review">添削中</option>
                      <option value="submitted">提出済み</option>
                    </select>
                    <button
                      type="button"
                      className="button-ghost"
                      style={{ color: "var(--danger)", fontSize: "0.82rem" }}
                      onClick={() => deleteEs(es.id)}
                    >
                      削除
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--muted)" }}>設問:</label>
                  <input
                    type="text"
                    value={es.question}
                    onChange={(e) => updateEs(es.id, { question: e.target.value })}
                    style={{ width: "100%", padding: "4px 8px", marginTop: "2px" }}
                    placeholder="設問文を入力"
                  />
                </div>

                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.8rem",
                      color: "var(--muted)",
                    }}
                  >
                    <span>回答下書き:</span>
                    <span>
                      文字数: {es.draft.length} {es.charLimit ? `/ ${es.charLimit} 字` : "字"}
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={es.draft}
                    onChange={(e) => updateEs(es.id, { draft: e.target.value })}
                    style={{ width: "100%", padding: "8px", marginTop: "4px", borderRadius: "6px" }}
                    placeholder="下書きを入力（AIに『このESを添削して』と指示することも可能）"
                  />
                </div>

                <div style={{ display: "flex", gap: "16px", fontSize: "0.82rem" }}>
                  <div>
                    <label style={{ marginRight: "6px" }}>締切:</label>
                    <input
                      type="date"
                      value={es.deadline}
                      onChange={(e) => updateEs(es.id, { deadline: e.target.value })}
                      style={{ padding: "2px 6px" }}
                    />
                  </div>
                  <div>
                    <label style={{ marginRight: "6px" }}>字数制限:</label>
                    <input
                      type="number"
                      value={es.charLimit || ""}
                      onChange={(e) =>
                        updateEs(es.id, {
                          charLimit: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      style={{ width: "70px", padding: "2px 6px" }}
                      placeholder="字"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Sub Tab: Events & Interviews */}
      {activeTab === "events" && (
        <div style={{ marginTop: "16px", display: "grid", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
              面接、説明会、テスト等の日程と結果記録
            </span>
            <button
              type="button"
              className="button-primary"
              onClick={handleAddEvent}
              style={{ fontSize: "0.82rem" }}
            >
              + 予定・面接を追加
            </button>
          </div>

          {form.events.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
              登録された予定はありません。
            </p>
          ) : (
            form.events.map((ev) => (
              <div
                key={ev.id}
                style={{
                  padding: "16px",
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-md)",
                  display: "grid",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flex: 1 }}>
                    <select
                      value={ev.kind}
                      onChange={(e) => updateEvent(ev.id, { kind: e.target.value as any })}
                      style={{ fontSize: "0.82rem", padding: "4px 8px" }}
                    >
                      <option value="interview">面接</option>
                      <option value="deadline">締切</option>
                      <option value="seminar">説明会</option>
                      <option value="test">WEBテスト</option>
                      <option value="internship">インターン</option>
                      <option value="obog">OB/OG訪問</option>
                      <option value="other">その他</option>
                    </select>
                    <input
                      type="text"
                      value={ev.title}
                      onChange={(e) => updateEvent(ev.id, { title: e.target.value })}
                      style={{ fontWeight: 700, fontSize: "0.95rem", flex: 1, padding: "4px 8px" }}
                    />
                  </div>
                  <button
                    type="button"
                    className="button-ghost"
                    style={{ color: "var(--danger)", fontSize: "0.82rem" }}
                    onClick={() => deleteEvent(ev.id)}
                  >
                    削除
                  </button>
                </div>

                <div
                  style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "0.85rem" }}
                >
                  <div>
                    <label style={{ marginRight: "6px" }}>日時:</label>
                    <input
                      type="text"
                      value={ev.start}
                      onChange={(e) => updateEvent(ev.id, { start: e.target.value })}
                      style={{ padding: "4px 8px", width: "160px" }}
                      placeholder="YYYY-MM-DDTHH:mm"
                    />
                  </div>
                  <div>
                    <label style={{ marginRight: "6px" }}>場所/ツール:</label>
                    <input
                      type="text"
                      value={ev.location}
                      onChange={(e) => updateEvent(ev.id, { location: e.target.value })}
                      style={{ padding: "4px 8px", width: "140px" }}
                      placeholder="Google Meet, 本社等"
                    />
                  </div>
                </div>

                {ev.kind === "interview" && (
                  <div
                    style={{
                      marginTop: "6px",
                      padding: "10px",
                      background: "var(--bg-accent)",
                      borderRadius: "6px",
                      display: "grid",
                      gap: "8px",
                    }}
                  >
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>面接記録:</span>
                      <input
                        type="text"
                        value={ev.interview?.round || ""}
                        onChange={(e) =>
                          updateEvent(ev.id, {
                            interview: {
                              ...(ev.interview || {
                                format: "",
                                questions: "",
                                reflections: "",
                                outcome: "",
                              }),
                              round: e.target.value,
                            },
                          })
                        }
                        placeholder="ラウンド（例: 1次面接, 最終面接）"
                        style={{ fontSize: "0.82rem", padding: "2px 6px" }}
                      />
                      <input
                        type="text"
                        value={ev.interview?.outcome || ""}
                        onChange={(e) =>
                          updateEvent(ev.id, {
                            interview: {
                              ...(ev.interview || {
                                round: "",
                                format: "",
                                questions: "",
                                reflections: "",
                              }),
                              outcome: e.target.value,
                            },
                          })
                        }
                        placeholder="結果（例: 通過, 連絡待ち）"
                        style={{ fontSize: "0.82rem", padding: "2px 6px" }}
                      />
                    </div>
                    <textarea
                      rows={2}
                      value={ev.interview?.questions || ""}
                      onChange={(e) =>
                        updateEvent(ev.id, {
                          interview: {
                            ...(ev.interview || {
                              round: "",
                              format: "",
                              outcome: "",
                              reflections: "",
                            }),
                            questions: e.target.value,
                          },
                        })
                      }
                      placeholder="聞かれた質問内容"
                      style={{ width: "100%", padding: "6px", fontSize: "0.85rem" }}
                    />
                    <textarea
                      rows={2}
                      value={ev.interview?.reflections || ""}
                      onChange={(e) =>
                        updateEvent(ev.id, {
                          interview: {
                            ...(ev.interview || {
                              round: "",
                              format: "",
                              outcome: "",
                              questions: "",
                            }),
                            reflections: e.target.value,
                          },
                        })
                      }
                      placeholder="手応え・所感・次回への改善点"
                      style={{ width: "100%", padding: "6px", fontSize: "0.85rem" }}
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
