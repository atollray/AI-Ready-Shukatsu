import {
  type Company,
  type CompanyStage,
  type ContactEntry,
  type DocumentEntry,
  type EsEntry,
  type EventEntry,
  generateId,
} from "@/core/client";
import {
  Calendar,
  Check,
  ClipboardList,
  Copy,
  ExternalLink,
  FileText,
  History,
  MapPin,
  Mic,
  PenTool,
  Plus,
  Tag,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { patchCompany } from "../../api/client";
import type { SaveStatus } from "../../api/use-workspace";
import { MarkdownPreview } from "../../components/MarkdownPreview";
import { StageBadge } from "../../components/StageBadge";
import {
  ACTIVE_STAGE_FLOW,
  ES_STATUS_META,
  EVENT_KIND_META,
  STAGE_LIST,
  STAGE_MAP,
  formatRelativeDate,
} from "../../constants/meta";

interface CompanyDetailProps {
  company: Company;
  onCompanyUpdated: (updated: Company) => void;
  onCompanyDeleted: (id: string) => void;
  setSaveStatus: (status: SaveStatus) => void;
}

type DetailTab = "overview" | "es" | "events" | "resources";

function splitCommaList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isSafeHttpUrl(url: string): boolean {
  return /^https?:\/\/.+/i.test(url.trim());
}

export function CompanyDetail({
  company,
  onCompanyUpdated,
  onCompanyDeleted,
  setSaveStatus,
}: CompanyDetailProps) {
  const [form, setForm] = useState<Company>(company);
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [overviewMode, setOverviewMode] = useState<"write" | "preview">("write");
  const [previewEsIds, setPreviewEsIds] = useState<Record<string, boolean>>({});
  const [showHistory, setShowHistory] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState(company.tags.join(", "));

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRevRef = useRef<number>(company.rev);

  useEffect(() => {
    setForm(company);
    setTagInput(company.tags.join(", "));
    latestRevRef.current = company.rev;
  }, [company]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const triggerAutoSave = (updated: Company) => {
    setForm(updated);
    setSaveStatus("saving");

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const saved = await patchCompany(updated.id, updated, latestRevRef.current);
        latestRevRef.current = saved.rev;
        onCompanyUpdated(saved);
        setSaveStatus("saved");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.startsWith("CONFLICT")) {
          setSaveStatus("conflict");
        } else {
          setSaveStatus("error");
        }
      }
    }, 650);
  };

  const updateField = <K extends keyof Company>(field: K, value: Company[K]) => {
    triggerAutoSave({ ...form, [field]: value });
  };

  const handleStageChange = (newStage: CompanyStage) => {
    if (newStage === form.stage) return;
    const now = new Date().toISOString();
    triggerAutoSave({
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
    });
  };

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1500);
    } catch {
      // clipboard unavailable
    }
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
    triggerAutoSave({ ...form, esEntries: [...form.esEntries, newEs] });
  };

  const updateEs = (esId: string, patch: Partial<EsEntry>) => {
    triggerAutoSave({
      ...form,
      esEntries: form.esEntries.map((e) => (e.id === esId ? { ...e, ...patch } : e)),
    });
  };

  const deleteEs = (esId: string) => {
    triggerAutoSave({
      ...form,
      esEntries: form.esEntries.filter((e) => e.id !== esId),
    });
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
    triggerAutoSave({ ...form, events: [...form.events, newEv] });
  };

  const updateEvent = (evId: string, patch: Partial<EventEntry>) => {
    triggerAutoSave({
      ...form,
      events: form.events.map((e) => (e.id === evId ? { ...e, ...patch } : e)),
    });
  };

  const deleteEvent = (evId: string) => {
    triggerAutoSave({
      ...form,
      events: form.events.filter((e) => e.id !== evId),
    });
  };

  // Contact handlers
  const handleAddContact = () => {
    const newContact: ContactEntry = {
      id: generateId("ct"),
      name: "",
      role: "",
      channel: "",
      email: "",
      notes: "",
    };
    triggerAutoSave({ ...form, contacts: [...form.contacts, newContact] });
  };

  const updateContact = (contactId: string, patch: Partial<ContactEntry>) => {
    triggerAutoSave({
      ...form,
      contacts: form.contacts.map((c) => (c.id === contactId ? { ...c, ...patch } : c)),
    });
  };

  const deleteContact = (contactId: string) => {
    triggerAutoSave({
      ...form,
      contacts: form.contacts.filter((c) => c.id !== contactId),
    });
  };

  // Document handlers
  const handleAddDocument = () => {
    const newDoc: DocumentEntry = {
      id: generateId("dc"),
      label: "",
      path: "",
      notes: "",
    };
    triggerAutoSave({ ...form, documents: [...form.documents, newDoc] });
  };

  const updateDocument = (docId: string, patch: Partial<DocumentEntry>) => {
    triggerAutoSave({
      ...form,
      documents: form.documents.map((d) => (d.id === docId ? { ...d, ...patch } : d)),
    });
  };

  const deleteDocument = (docId: string) => {
    triggerAutoSave({
      ...form,
      documents: form.documents.filter((d) => d.id !== docId),
    });
  };

  const activeStageIdx = ACTIVE_STAGE_FLOW.indexOf(form.stage);
  const resourceCount = form.contacts.length + form.documents.length;

  return (
    <div className="card">
      {/* Header (GitHub Issue / Repo style) */}
      <div className="gh-detail-header">
        <div className="gh-row-between" style={{ alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: "240px" }}>
            <input
              type="text"
              className="gh-title-input"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="企業名を入力"
            />
            <div className="gh-row-gap gh-muted" style={{ fontSize: "12px", marginTop: "4px" }}>
              <StageBadge stage={form.stage} track={form.currentTrack} />
              <span className="gh-row-gap" style={{ gap: "4px" }}>
                <code style={{ fontSize: "11px" }}>{form.id}</code>
                <button
                  type="button"
                  className="btn btn-sm btn-invisible"
                  style={{ height: "22px", padding: "0 5px" }}
                  onClick={() => handleCopy("id", form.id)}
                  title="企業IDをコピー"
                >
                  {copiedKey === "id" ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </span>
              <span>更新: {new Date(form.updatedAt).toLocaleString("ja-JP")}</span>
              {form.isSample ? (
                <span className="gh-label gh-label-attention" style={{ fontSize: "11px" }}>
                  サンプル
                </span>
              ) : null}
            </div>
          </div>

          <div className="gh-row-gap">
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setShowHistory((v) => !v)}
              title="選考ステージ変更履歴"
            >
              <History size={13} />
              <span>履歴 ({form.stageHistory.length})</span>
            </button>
            <button
              type="button"
              className="button-danger btn-sm"
              onClick={() => {
                if (window.confirm(`「${form.name}」を削除しますか？`)) {
                  onCompanyDeleted(form.id);
                }
              }}
            >
              <Trash2 size={13} />
              <span>削除</span>
            </button>
          </div>
        </div>

        {/* Interactive Stage Pipeline Stepper */}
        <div className="gh-stage-stepper" aria-label="選考パイプライン">
          {ACTIVE_STAGE_FLOW.map((stageKey, idx) => {
            const meta = STAGE_MAP[stageKey];
            const isCurrent = form.stage === stageKey;
            const isPassed = activeStageIdx > idx;
            return (
              <button
                key={stageKey}
                type="button"
                className={`gh-stage-step ${isCurrent ? "current" : isPassed ? "passed" : ""}`}
                onClick={() => handleStageChange(stageKey)}
              >
                {isPassed ? <Check size={12} /> : null}
                <span>{meta.shortLabel}</span>
              </button>
            );
          })}
          <span className="gh-muted" style={{ fontSize: "12px", margin: "0 4px" }}>
            /
          </span>
          {(["paused", "rejected"] as CompanyStage[]).map((stageKey) => {
            const meta = STAGE_MAP[stageKey];
            const isCurrent = form.stage === stageKey;
            return (
              <button
                key={stageKey}
                type="button"
                className={`gh-stage-step ${isCurrent ? "current" : ""}`}
                onClick={() => handleStageChange(stageKey)}
              >
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>

        {showHistory && (
          <div
            className="card"
            style={{
              marginBottom: "12px",
              padding: "10px 14px",
              backgroundColor: "var(--bg-canvas)",
              fontSize: "12px",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: "6px" }}>ステージ変更履歴</div>
            {form.stageHistory.length === 0 ? (
              <div className="gh-muted">履歴はまだありません。</div>
            ) : (
              <div style={{ display: "grid", gap: "4px" }}>
                {[...form.stageHistory].reverse().map((h, i) => (
                  <div key={`${h.at}-${i}`} className="gh-row-gap gh-muted">
                    <span className="mono">{new Date(h.at).toLocaleString("ja-JP")}</span>
                    <span>·</span>
                    <span>{h.track}</span>
                    <span>·</span>
                    <span>
                      {STAGE_MAP[h.from]?.label || h.from} →{" "}
                      <strong style={{ color: "var(--fg-default)" }}>
                        {STAGE_MAP[h.to]?.label || h.to}
                      </strong>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sub Tabs (GitHub UnderlineNav) */}
        <div className="gh-underline-nav" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "overview"}
            className={`gh-underline-tab ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <ClipboardList size={14} />
            <span>概要・条件</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "es"}
            className={`gh-underline-tab ${activeTab === "es" ? "active" : ""}`}
            onClick={() => setActiveTab("es")}
          >
            <PenTool size={14} />
            <span>エントリーシート</span>
            <span className="gh-counter">{form.esEntries.length}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "events"}
            className={`gh-underline-tab ${activeTab === "events" ? "active" : ""}`}
            onClick={() => setActiveTab("events")}
          >
            <Calendar size={14} />
            <span>予定・面接</span>
            <span className="gh-counter">{form.events.length}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "resources"}
            className={`gh-underline-tab ${activeTab === "resources" ? "active" : ""}`}
            onClick={() => setActiveTab("resources")}
          >
            <Users size={14} />
            <span>連絡先・資料</span>
            <span className="gh-counter">{resourceCount}</span>
          </button>
        </div>
      </div>

      {/* Sub Tab: Overview (GitHub 2-column Issue Layout) */}
      {activeTab === "overview" && (
        <div className="gh-detail-2col">
          {/* Left Main Content */}
          <div className="gh-stack">
            <div className="gh-row-between">
              <span className="gh-muted" style={{ fontSize: "12px" }}>
                志望動機・企業分析メモ（Markdown 記法対応）
              </span>
              <div className="gh-segmented">
                <button
                  type="button"
                  className={`gh-segmented-btn ${overviewMode === "write" ? "active" : ""}`}
                  onClick={() => setOverviewMode("write")}
                >
                  Write
                </button>
                <button
                  type="button"
                  className={`gh-segmented-btn ${overviewMode === "preview" ? "active" : ""}`}
                  onClick={() => setOverviewMode("preview")}
                >
                  Preview
                </button>
              </div>
            </div>

            {overviewMode === "write" ? (
              <>
                <div className="card">
                  <div className="gh-box-header" style={{ padding: "8px 12px" }}>
                    <span className="gh-box-title" style={{ fontSize: "13px" }}>
                      志望理由・下書き
                    </span>
                    <span className="mono gh-muted" style={{ fontSize: "11px" }}>
                      {form.motivation.length} 字
                    </span>
                  </div>
                  <div style={{ padding: "10px 12px" }}>
                    <textarea
                      rows={4}
                      value={form.motivation}
                      onChange={(e) => updateField("motivation", e.target.value)}
                      style={{ width: "100%" }}
                      placeholder="なぜこの企業を志望するのか、自分の強みや興味とどう合致するか"
                    />
                  </div>
                </div>

                <div className="gh-2col-equal">
                  <div className="card">
                    <div className="gh-box-header" style={{ padding: "8px 12px" }}>
                      <span className="gh-box-title" style={{ fontSize: "13px" }}>
                        企業の強み・魅力
                      </span>
                    </div>
                    <div style={{ padding: "10px 12px" }}>
                      <textarea
                        rows={4}
                        value={form.sellingPoints}
                        onChange={(e) => updateField("sellingPoints", e.target.value)}
                        style={{ width: "100%" }}
                        placeholder="技術力、プロダクト、カルチャー、事業成長性など"
                      />
                    </div>
                  </div>

                  <div className="card">
                    <div className="gh-box-header" style={{ padding: "8px 12px" }}>
                      <span className="gh-box-title" style={{ fontSize: "13px" }}>
                        懸念点・確認したいこと
                      </span>
                    </div>
                    <div style={{ padding: "10px 12px" }}>
                      <textarea
                        rows={4}
                        value={form.concerns}
                        onChange={(e) => updateField("concerns", e.target.value)}
                        style={{ width: "100%" }}
                        placeholder="面接の逆質問で確認したい点やリスクなど"
                      />
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="gh-box-header" style={{ padding: "8px 12px" }}>
                    <span className="gh-box-title" style={{ fontSize: "13px" }}>
                      待遇・勤務条件メモ
                    </span>
                  </div>
                  <div style={{ padding: "10px 12px" }}>
                    <input
                      type="text"
                      value={form.conditions}
                      onChange={(e) => updateField("conditions", e.target.value)}
                      style={{ width: "100%" }}
                      placeholder="例: 初任給30万、家賃補助あり、フレックス"
                    />
                  </div>
                </div>

                <div className="card">
                  <div className="gh-box-header" style={{ padding: "8px 12px" }}>
                    <span className="gh-box-title" style={{ fontSize: "13px" }}>
                      社内メモ・所感
                    </span>
                  </div>
                  <div style={{ padding: "10px 12px" }}>
                    <textarea
                      rows={3}
                      value={form.memo}
                      onChange={(e) => updateField("memo", e.target.value)}
                      style={{ width: "100%" }}
                      placeholder="説明会や社員面談で感じたことなど"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="gh-stack">
                <div className="card">
                  <div className="gh-box-header" style={{ padding: "8px 12px" }}>
                    <span className="gh-box-title" style={{ fontSize: "13px" }}>
                      志望理由
                    </span>
                  </div>
                  <div className="gh-box-body">
                    <MarkdownPreview content={form.motivation} emptyText="未記入" />
                  </div>
                </div>
                <div className="gh-2col-equal">
                  <div className="card">
                    <div className="gh-box-header" style={{ padding: "8px 12px" }}>
                      <span className="gh-box-title" style={{ fontSize: "13px" }}>
                        強み・魅力
                      </span>
                    </div>
                    <div className="gh-box-body">
                      <MarkdownPreview content={form.sellingPoints} emptyText="未記入" />
                    </div>
                  </div>
                  <div className="card">
                    <div className="gh-box-header" style={{ padding: "8px 12px" }}>
                      <span className="gh-box-title" style={{ fontSize: "13px" }}>
                        懸念点・留意事項
                      </span>
                    </div>
                    <div className="gh-box-body">
                      <MarkdownPreview content={form.concerns} emptyText="未記入" />
                    </div>
                  </div>
                </div>
                <div className="card">
                  <div className="gh-box-header" style={{ padding: "8px 12px" }}>
                    <span className="gh-box-title" style={{ fontSize: "13px" }}>
                      待遇・所感
                    </span>
                  </div>
                  <div className="gh-box-body" style={{ display: "grid", gap: "10px" }}>
                    <div>
                      <div className="gh-meta-label" style={{ marginBottom: "4px" }}>
                        待遇・勤務条件
                      </div>
                      <div style={{ fontSize: "13px" }}>{form.conditions || "未記入"}</div>
                    </div>
                    <div>
                      <div className="gh-meta-label" style={{ marginBottom: "4px" }}>
                        社内メモ・所感
                      </div>
                      <MarkdownPreview content={form.memo} emptyText="未記入" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Metadata Sidebar (GitHub Issue Sidebar style) */}
          <aside className="gh-meta-sidebar">
            <div className="gh-meta-section">
              <label className="gh-meta-label">ステージ</label>
              <select
                value={form.stage}
                onChange={(e) => handleStageChange(e.target.value as CompanyStage)}
              >
                {STAGE_LIST.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="gh-meta-section">
              <label className="gh-meta-label">選考ルート (Track)</label>
              <input
                type="text"
                value={form.currentTrack}
                onChange={(e) => updateField("currentTrack", e.target.value)}
                placeholder="例: 本選考, 早期選考"
              />
            </div>

            <div className="gh-meta-section">
              <div className="gh-row-between">
                <span className="gh-meta-label">志望度</span>
                <span className="mono gh-muted" style={{ fontSize: "12px" }}>
                  {form.interestScore} / 5
                </span>
              </div>
              <div className="gh-score-group">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`gh-score-btn ${form.interestScore === s ? "active" : ""}`}
                    onClick={() => updateField("interestScore", s)}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="gh-row-between" style={{ marginTop: "6px" }}>
                <span className="gh-meta-label">マッチ度</span>
                <span className="mono gh-muted" style={{ fontSize: "12px" }}>
                  {form.fitScore} / 5
                </span>
              </div>
              <div className="gh-score-group">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`gh-score-btn ${form.fitScore === s ? "active" : ""}`}
                    onClick={() => updateField("fitScore", s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="gh-meta-section">
              <label className="gh-meta-label">業界</label>
              <input
                type="text"
                value={form.industry}
                onChange={(e) => updateField("industry", e.target.value)}
                placeholder="例: BtoB SaaS, SIer"
              />
              <label className="gh-meta-label" style={{ marginTop: "6px" }}>
                本社所在地
              </label>
              <div style={{ position: "relative" }}>
                <MapPin
                  size={13}
                  className="gh-muted"
                  style={{
                    position: "absolute",
                    left: "9px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="text"
                  value={form.headquarters}
                  onChange={(e) => updateField("headquarters", e.target.value)}
                  placeholder="例: 東京都千代田区"
                  style={{ width: "100%", paddingLeft: "28px" }}
                />
              </div>
            </div>

            <div className="gh-meta-section">
              <label className="gh-meta-label">採用ページURL</label>
              <div className="gh-row-gap" style={{ flexWrap: "nowrap" }}>
                <input
                  type="text"
                  value={form.urls.careers}
                  onChange={(e) => updateField("urls", { ...form.urls, careers: e.target.value })}
                  placeholder="https://..."
                  style={{ flex: 1, minWidth: 0 }}
                />
                {isSafeHttpUrl(form.urls.careers) ? (
                  <a
                    href={form.urls.careers}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-icon"
                    title="採用ページを開く"
                  >
                    <ExternalLink size={13} />
                  </a>
                ) : null}
              </div>

              <label className="gh-meta-label" style={{ marginTop: "6px" }}>
                マイページ / 応募URL
              </label>
              <div className="gh-row-gap" style={{ flexWrap: "nowrap" }}>
                <input
                  type="text"
                  value={form.urls.application}
                  onChange={(e) =>
                    updateField("urls", { ...form.urls, application: e.target.value })
                  }
                  placeholder="https://..."
                  style={{ flex: 1, minWidth: 0 }}
                />
                {isSafeHttpUrl(form.urls.application) ? (
                  <a
                    href={form.urls.application}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-icon"
                    title="マイページを開く"
                  >
                    <ExternalLink size={13} />
                  </a>
                ) : null}
              </div>
            </div>

            <div className="gh-meta-section">
              <label className="gh-meta-label gh-row-gap" style={{ gap: "4px" }}>
                <Tag size={12} />
                <span>タグ（カンマ区切り）</span>
              </label>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setTagInput(val);
                  updateField("tags", splitCommaList(val));
                }}
                placeholder="例: SaaS, TypeScript, リモート"
              />
              {form.tags.length > 0 && (
                <div className="gh-row-gap" style={{ marginTop: "4px", gap: "4px" }}>
                  {form.tags.map((t) => (
                    <span key={t} className="gh-label gh-label-accent" style={{ fontSize: "11px" }}>
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Sub Tab: ES */}
      {activeTab === "es" && (
        <div className="gh-box-body gh-stack">
          <div className="gh-row-between">
            <span className="gh-muted" style={{ fontSize: "13px" }}>
              ES設問と推敲中の下書きを管理します（AIに「このESを添削して」と依頼できます）
            </span>
            <button type="button" className="button-primary btn-sm" onClick={handleAddEs}>
              <Plus size={14} />
              <span>設問を追加</span>
            </button>
          </div>

          {form.esEntries.length === 0 ? (
            <div className="card gh-empty">
              <PenTool size={22} className="gh-subtle" />
              <span>登録されたESはありません。</span>
            </div>
          ) : (
            form.esEntries.map((es) => {
              const statusMeta = ES_STATUS_META[es.status] || ES_STATUS_META.idea;
              const isPreview = Boolean(previewEsIds[es.id]);
              const charCount = es.draft.length;
              const limit = es.charLimit;
              const ratio = limit ? Math.min(100, Math.round((charCount / limit) * 100)) : 0;
              const isOver = Boolean(limit && charCount > limit);
              const deadlineRel = es.deadline ? formatRelativeDate(es.deadline) : null;

              return (
                <div key={es.id} className="card">
                  <div className="gh-box-header" style={{ padding: "10px 14px" }}>
                    <div className="gh-row-gap" style={{ flex: 1, minWidth: "220px" }}>
                      <span className={`gh-label ${statusMeta.labelClass}`}>
                        {statusMeta.label}
                      </span>
                      <input
                        type="text"
                        value={es.title}
                        onChange={(e) => updateEs(es.id, { title: e.target.value })}
                        style={{ fontWeight: 600, flex: 1, minWidth: "160px" }}
                        placeholder="設問タイトル"
                      />
                    </div>

                    <div className="gh-row-gap">
                      <div className="gh-segmented">
                        <button
                          type="button"
                          className={`gh-segmented-btn ${!isPreview ? "active" : ""}`}
                          onClick={() => setPreviewEsIds((prev) => ({ ...prev, [es.id]: false }))}
                        >
                          Write
                        </button>
                        <button
                          type="button"
                          className={`gh-segmented-btn ${isPreview ? "active" : ""}`}
                          onClick={() => setPreviewEsIds((prev) => ({ ...prev, [es.id]: true }))}
                        >
                          Preview
                        </button>
                      </div>

                      <select
                        value={es.status}
                        onChange={(e) =>
                          updateEs(es.id, { status: e.target.value as EsEntry["status"] })
                        }
                      >
                        <option value="idea">アイデア</option>
                        <option value="draft">下書き中</option>
                        <option value="review">添削中</option>
                        <option value="submitted">提出済み</option>
                      </select>

                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => handleCopy(`es-${es.id}`, es.draft)}
                        title="回答をコピー"
                      >
                        {copiedKey === `es-${es.id}` ? <Check size={13} /> : <Copy size={13} />}
                      </button>

                      <button
                        type="button"
                        className="button-danger btn-sm"
                        onClick={() => deleteEs(es.id)}
                        title="設問を削除"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="gh-box-body" style={{ display: "grid", gap: "12px" }}>
                    <div className="gh-field">
                      <label className="gh-field-label">設問文</label>
                      <input
                        type="text"
                        value={es.question}
                        onChange={(e) => updateEs(es.id, { question: e.target.value })}
                        placeholder="設問文を入力"
                      />
                    </div>

                    <div className="gh-field">
                      <div className="gh-row-between">
                        <label className="gh-field-label">回答下書き</label>
                        <span
                          className="mono"
                          style={{
                            fontSize: "12px",
                            color: isOver ? "var(--danger-fg)" : "var(--fg-muted)",
                            fontWeight: isOver ? 600 : 400,
                          }}
                        >
                          {charCount} {limit ? `/ ${limit} 字 (${ratio}%)` : "字"}
                        </span>
                      </div>

                      {limit ? (
                        <div className="gh-progress-track">
                          <div
                            className="gh-progress-fill"
                            style={{
                              width: `${ratio}%`,
                              backgroundColor: isOver
                                ? "var(--danger-emphasis)"
                                : ratio >= 85
                                  ? "var(--success-emphasis)"
                                  : "var(--accent-emphasis)",
                            }}
                          />
                        </div>
                      ) : null}

                      {isPreview ? (
                        <div
                          style={{
                            padding: "10px 12px",
                            borderRadius: "var(--radius-md)",
                            backgroundColor: "var(--bg-subtle)",
                            border: "1px solid var(--border-muted)",
                          }}
                        >
                          <MarkdownPreview content={es.draft} emptyText="下書きがまだありません" />
                        </div>
                      ) : (
                        <textarea
                          rows={5}
                          value={es.draft}
                          onChange={(e) => updateEs(es.id, { draft: e.target.value })}
                          placeholder="下書きを入力（AIに『このESを添削して』と指示することも可能）"
                        />
                      )}
                    </div>

                    <div className="gh-row-gap" style={{ gap: "16px", fontSize: "12px" }}>
                      <div className="gh-row-gap">
                        <span className="gh-field-label">締切:</span>
                        <input
                          type="date"
                          value={es.deadline}
                          onChange={(e) => updateEs(es.id, { deadline: e.target.value })}
                        />
                        {deadlineRel?.text ? (
                          <span
                            className={`gh-label ${deadlineRel.urgent ? "gh-label-danger" : "gh-label-neutral"}`}
                          >
                            {deadlineRel.text}
                          </span>
                        ) : null}
                      </div>
                      <div className="gh-row-gap">
                        <span className="gh-field-label">字数制限:</span>
                        <input
                          type="number"
                          value={es.charLimit || ""}
                          onChange={(e) =>
                            updateEs(es.id, {
                              charLimit: e.target.value ? Number(e.target.value) : undefined,
                            })
                          }
                          style={{ width: "90px" }}
                          placeholder="例: 400"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Sub Tab: Events & Interviews */}
      {activeTab === "events" && (
        <div className="gh-box-body gh-stack">
          <div className="gh-row-between">
            <span className="gh-muted" style={{ fontSize: "13px" }}>
              面接、説明会、WEBテスト等の日程と振り返り記録
            </span>
            <button type="button" className="button-primary btn-sm" onClick={handleAddEvent}>
              <Plus size={14} />
              <span>予定・面接を追加</span>
            </button>
          </div>

          {form.events.length === 0 ? (
            <div className="card gh-empty">
              <Calendar size={22} className="gh-subtle" />
              <span>登録された予定はありません。</span>
            </div>
          ) : (
            form.events.map((ev) => {
              const kindMeta = EVENT_KIND_META[ev.kind] || EVENT_KIND_META.other;
              const rel = ev.start ? formatRelativeDate(ev.start) : null;

              return (
                <div key={ev.id} className="card">
                  <div className="gh-box-header" style={{ padding: "10px 14px" }}>
                    <div className="gh-row-gap" style={{ flex: 1, minWidth: "240px" }}>
                      <span className={`gh-label ${kindMeta.labelClass}`}>{kindMeta.label}</span>
                      <select
                        value={ev.kind}
                        onChange={(e) =>
                          updateEvent(ev.id, { kind: e.target.value as EventEntry["kind"] })
                        }
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
                        style={{ fontWeight: 600, flex: 1, minWidth: "160px" }}
                        placeholder="予定タイトル"
                      />
                    </div>

                    <div className="gh-row-gap">
                      {rel?.text ? (
                        <span
                          className={`gh-label ${rel.urgent ? "gh-label-danger" : "gh-label-accent"}`}
                        >
                          {rel.text}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        className="button-danger btn-sm"
                        onClick={() => deleteEvent(ev.id)}
                        title="予定を削除"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="gh-box-body" style={{ display: "grid", gap: "12px" }}>
                    <div className="gh-row-gap" style={{ gap: "16px" }}>
                      <div className="gh-field">
                        <label className="gh-field-label">日時</label>
                        <input
                          type="text"
                          className="mono"
                          value={ev.start}
                          onChange={(e) => updateEvent(ev.id, { start: e.target.value })}
                          placeholder="YYYY-MM-DDTHH:mm"
                          style={{ width: "180px" }}
                        />
                      </div>
                      <div className="gh-field" style={{ flex: 1, minWidth: "180px" }}>
                        <label className="gh-field-label">場所 / ツール</label>
                        <input
                          type="text"
                          value={ev.location}
                          onChange={(e) => updateEvent(ev.id, { location: e.target.value })}
                          placeholder="Google Meet, 本社等"
                        />
                      </div>
                    </div>

                    <div className="gh-field">
                      <label className="gh-field-label">メモ</label>
                      <input
                        type="text"
                        value={ev.notes}
                        onChange={(e) => updateEvent(ev.id, { notes: e.target.value })}
                        placeholder="持ち物、事前準備、URLなど"
                      />
                    </div>

                    {ev.kind === "interview" && (
                      <div
                        style={{
                          padding: "12px",
                          backgroundColor: "var(--bg-subtle)",
                          border: "1px solid var(--border-default)",
                          borderRadius: "var(--radius-md)",
                          display: "grid",
                          gap: "10px",
                        }}
                      >
                        <div className="gh-row-gap" style={{ fontWeight: 600, fontSize: "13px" }}>
                          <Mic size={14} style={{ color: "var(--attention-fg)" }} />
                          <span>面接記録</span>
                        </div>
                        <div className="gh-row-gap">
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
                            style={{ flex: 1, minWidth: "160px" }}
                          />
                          <input
                            type="text"
                            value={ev.interview?.format || ""}
                            onChange={(e) =>
                              updateEvent(ev.id, {
                                interview: {
                                  ...(ev.interview || {
                                    round: "",
                                    questions: "",
                                    reflections: "",
                                    outcome: "",
                                  }),
                                  format: e.target.value,
                                },
                              })
                            }
                            placeholder="形式（例: オンライン1on1）"
                            style={{ flex: 1, minWidth: "140px" }}
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
                            style={{ flex: 1, minWidth: "140px" }}
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
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Sub Tab: Contacts & Documents */}
      {activeTab === "resources" && (
        <div className="gh-box-body gh-stack">
          {/* Contacts */}
          <div className="card">
            <div className="gh-box-header" style={{ padding: "10px 14px" }}>
              <span className="gh-box-title">
                <Users size={14} className="gh-muted" />
                <span>担当者・OB/OG 連絡先</span>
                <span className="gh-counter">{form.contacts.length}</span>
              </span>
              <button type="button" className="btn btn-sm" onClick={handleAddContact}>
                <Plus size={13} />
                <span>連絡先を追加</span>
              </button>
            </div>
            <div className="gh-box-body" style={{ display: "grid", gap: "10px" }}>
              {form.contacts.length === 0 ? (
                <div className="gh-muted" style={{ fontSize: "13px" }}>
                  連絡先はまだ登録されていません。
                </div>
              ) : (
                form.contacts.map((ct) => (
                  <div
                    key={ct.id}
                    style={{
                      padding: "10px",
                      border: "1px solid var(--border-muted)",
                      borderRadius: "var(--radius-md)",
                      display: "grid",
                      gap: "8px",
                    }}
                  >
                    <div className="gh-row-gap">
                      <input
                        type="text"
                        value={ct.name}
                        onChange={(e) => updateContact(ct.id, { name: e.target.value })}
                        placeholder="氏名"
                        style={{ flex: 1, minWidth: "140px" }}
                      />
                      <input
                        type="text"
                        value={ct.role}
                        onChange={(e) => updateContact(ct.id, { role: e.target.value })}
                        placeholder="部署・役職"
                        style={{ flex: 1, minWidth: "140px" }}
                      />
                      <input
                        type="text"
                        value={ct.channel}
                        onChange={(e) => updateContact(ct.id, { channel: e.target.value })}
                        placeholder="経路（例: Matcher, 人事メール）"
                        style={{ flex: 1, minWidth: "140px" }}
                      />
                      <button
                        type="button"
                        className="button-danger btn-sm"
                        onClick={() => deleteContact(ct.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="gh-row-gap">
                      <input
                        type="email"
                        value={ct.email}
                        onChange={(e) => updateContact(ct.id, { email: e.target.value })}
                        placeholder="メールアドレス / URL"
                        style={{ flex: 1, minWidth: "180px" }}
                      />
                      <input
                        type="text"
                        value={ct.notes}
                        onChange={(e) => updateContact(ct.id, { notes: e.target.value })}
                        placeholder="メモ"
                        style={{ flex: 2, minWidth: "200px" }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Documents */}
          <div className="card">
            <div className="gh-box-header" style={{ padding: "10px 14px" }}>
              <span className="gh-box-title">
                <FileText size={14} className="gh-muted" />
                <span>関連資料・リンク</span>
                <span className="gh-counter">{form.documents.length}</span>
              </span>
              <button type="button" className="btn btn-sm" onClick={handleAddDocument}>
                <Plus size={13} />
                <span>資料を追加</span>
              </button>
            </div>
            <div className="gh-box-body" style={{ display: "grid", gap: "10px" }}>
              {form.documents.length === 0 ? (
                <div className="gh-muted" style={{ fontSize: "13px" }}>
                  関連資料はまだ登録されていません。
                </div>
              ) : (
                form.documents.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      padding: "10px",
                      border: "1px solid var(--border-muted)",
                      borderRadius: "var(--radius-md)",
                      display: "grid",
                      gap: "8px",
                    }}
                  >
                    <div className="gh-row-gap">
                      <input
                        type="text"
                        value={doc.label}
                        onChange={(e) => updateDocument(doc.id, { label: e.target.value })}
                        placeholder="資料名（例: 採用スライド, ポートフォリオ）"
                        style={{ flex: 1, minWidth: "160px" }}
                      />
                      <input
                        type="text"
                        value={doc.path}
                        onChange={(e) => updateDocument(doc.id, { path: e.target.value })}
                        placeholder="URL またはファイルパス"
                        style={{ flex: 2, minWidth: "200px" }}
                      />
                      {isSafeHttpUrl(doc.path) ? (
                        <a
                          href={doc.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-icon"
                          title="リンクを開く"
                        >
                          <ExternalLink size={13} />
                        </a>
                      ) : null}
                      <button
                        type="button"
                        className="button-danger btn-sm"
                        onClick={() => deleteDocument(doc.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={doc.notes}
                      onChange={(e) => updateDocument(doc.id, { notes: e.target.value })}
                      placeholder="備考"
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
