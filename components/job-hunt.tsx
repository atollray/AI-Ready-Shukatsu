"use client";

import {
  type ReactNode,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import type {
  CompanyRecord,
  DocumentEntry,
  EsEntry,
  EventType,
  InterviewEntry,
  JournalEntry,
  Priority,
  TaskItem,
  WorkspaceData,
} from "@/lib/types";

const DRAFT_STORAGE_KEY = "ai-ready-shukatsu-draft";

const stageOptions = [
  { value: "wishlist", label: "気になる" },
  { value: "researching", label: "調査中" },
  { value: "es", label: "ES準備中" },
  { value: "applied", label: "応募済み" },
  { value: "interview", label: "面接中" },
  { value: "offer", label: "内定" },
  { value: "paused", label: "保留" },
  { value: "rejected", label: "見送り" },
] as const;

const priorityOptions = [
  { value: "high", label: "高" },
  { value: "medium", label: "中" },
  { value: "low", label: "低" },
] as const;

const taskStateOptions = [
  { value: "todo", label: "未着手" },
  { value: "doing", label: "進行中" },
  { value: "done", label: "完了" },
] as const;

const esStatusOptions = [
  { value: "idea", label: "メモ" },
  { value: "draft", label: "下書き" },
  { value: "review", label: "見直し中" },
  { value: "submitted", label: "提出済み" },
] as const;

const eventTypeOptions = [
  { value: "deadline", label: "締切" },
  { value: "seminar", label: "説明会" },
  { value: "internship", label: "インターン" },
  { value: "interview", label: "面接" },
  { value: "test", label: "テスト" },
  { value: "obog", label: "OB/OG" },
  { value: "other", label: "その他" },
] as const;

type AppTab = "dashboard" | "companies" | "tasks" | "notes" | "settings";
type CompanyTab = "overview" | "es" | "events" | "interviews" | "resources";
type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

function makeId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function splitCommaList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDateLabel(value: string): string {
  return value || "日付未設定";
}

function todayLocalDateString(): string {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isUpcomingDate(value: string, today: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= today;
}

function getCompanyName(workspace: WorkspaceData, companyId: string): string {
  return workspace.companies.find((company) => company.id === companyId)?.name || "共通";
}

function createCompany(): CompanyRecord {
  const now = new Date().toISOString();

  return {
    id: makeId("company"),
    slug: "",
    name: "新しい企業",
    industry: "",
    stage: "wishlist",
    priority: "high",
    interestScore: 3,
    fitScore: 3,
    applicationUrl: "",
    careersUrl: "",
    headquarters: "",
    tags: [],
    motivation: "",
    sellingPoints: "",
    concerns: "",
    conditions: "",
    nextAction: "",
    notes: "",
    updatedAt: now,
    esEntries: [],
    events: [],
    contacts: [],
    interviews: [],
    documents: [],
  };
}

function createTask(): TaskItem {
  return {
    id: makeId("task"),
    title: "新しいタスク",
    state: "todo",
    dueDate: "",
    relatedCompanyId: "",
    notes: "",
  };
}

function createEsEntry(): EsEntry {
  return {
    id: makeId("es"),
    title: "ES設問",
    question: "",
    draft: "",
    status: "idea",
    deadline: "",
  };
}

function createEvent(type: EventType = "deadline") {
  return {
    id: makeId("event"),
    title: "",
    type,
    date: "",
    location: "",
    notes: "",
  };
}

function createInterview(): InterviewEntry {
  return {
    id: makeId("interview"),
    round: "一次面接",
    date: "",
    format: "",
    outcome: "",
    questions: "",
    reflections: "",
  };
}

function createDocument(): DocumentEntry {
  return {
    id: makeId("document"),
    label: "資料リンク",
    path: "",
    notes: "",
  };
}

function createJournalEntry(): JournalEntry {
  return {
    id: makeId("journal"),
    date: new Date().toISOString().slice(0, 10),
    title: "日次メモ",
    relatedCompanyId: "",
    content: "",
  };
}

function saveStateLabel(state: SaveState): string {
  switch (state) {
    case "dirty":
      return "未保存の変更があります";
    case "saving":
      return "保存中...";
    case "saved":
      return "ローカルファイルに保存済み";
    case "error":
      return "保存に失敗しました";
    default:
      return "読み込み済み";
  }
}

function saveStateClass(state: SaveState): string {
  if (state === "saved") {
    return "save-indicator success";
  }

  if (state === "error") {
    return "save-indicator error";
  }

  return "save-indicator";
}

export function JobHunt({
  initialWorkspace,
}: {
  initialWorkspace: WorkspaceData;
}) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [activeTab, setActiveTab] = useState<AppTab>("dashboard");
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    initialWorkspace.companies[0]?.id || ""
  );
  const [companySearch, setCompanySearch] = useState("");
  const [stageFilters, setStageFilters] = useState<string[]>([]);
  const [companyTab, setCompanyTab] = useState<CompanyTab>("overview");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMessage, setSaveMessage] = useState("ローカルファイルに保存されます。");
  const [draftTimestamp, setDraftTimestamp] = useState("");
  const [taskStateFilter, setTaskStateFilter] = useState("all");
  const [taskCompanyFilter, setTaskCompanyFilter] = useState("all");
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const hydratedRef = useRef(false);
  const deferredSearch = useDeferredValue(companySearch);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    window.localStorage.setItem("theme", newTheme);
  };

  useEffect(() => {
    try {
      const rawDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY);

      if (rawDraft) {
        const parsed = JSON.parse(rawDraft) as WorkspaceData;

        startTransition(() => {
          setWorkspace(parsed);
          setSelectedCompanyId(parsed.companies[0]?.id || "");
          setSaveState("dirty");
          setSaveMessage("ブラウザ下書きを復元しました。必要なら保存してください。");
        });
      }
    } catch {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    } finally {
      hydratedRef.current = true;
    }
  }, [startTransition]);

  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }

    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(workspace));
    setDraftTimestamp(new Date().toLocaleString("ja-JP"));
  }, [workspace]);

  useEffect(() => {
    if (
      selectedCompanyId &&
      workspace.companies.some((company) => company.id === selectedCompanyId)
    ) {
      return;
    }

    setSelectedCompanyId(workspace.companies[0]?.id || "");
  }, [selectedCompanyId, workspace.companies]);

  const selectedCompany =
    workspace.companies.find((company) => company.id === selectedCompanyId) ?? null;

  const filteredCompanies = workspace.companies.filter((company) => {
    const keyword = deferredSearch.toLowerCase();
    const matchSearch =
      !keyword ||
      company.name.toLowerCase().includes(keyword) ||
      company.industry.toLowerCase().includes(keyword) ||
      company.tags.some((tag) => tag.toLowerCase().includes(keyword));
    const matchStage = stageFilters.length === 0 || stageFilters.includes(company.stage);

    return matchSearch && matchStage;
  });

  const filteredTasks = workspace.tasks.filter((task) => {
    const matchState =
      taskStateFilter === "all" ||
      (taskStateFilter === "active"
        ? task.state !== "done"
        : task.state === taskStateFilter);
    const matchCompany =
      taskCompanyFilter === "all" || task.relatedCompanyId === taskCompanyFilter;
    return matchState && matchCompany;
  });

  const stageSummary = stageOptions.map((stage) => ({
    label: stage.label,
    value: stage.value,
    count: workspace.companies.filter((company) => company.stage === stage.value).length,
  }));

  function toggleStageFilter(value: string) {
    setStageFilters((current) =>
      current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
    );
  }

  const today = todayLocalDateString();
  const hiddenStages = new Set(["paused", "rejected"]);

  const upcomingItems = [
    ...workspace.tasks
      .filter((task) => {
        if (!task.dueDate || task.state === "done" || !isUpcomingDate(task.dueDate, today)) {
          return false;
        }

        if (!task.relatedCompanyId) {
          return true;
        }

        const relatedCompany = workspace.companies.find(
          (company) => company.id === task.relatedCompanyId
        );
        return !relatedCompany || !hiddenStages.has(relatedCompany.stage);
      })
      .map((task) => ({
        id: task.id,
        date: task.dueDate,
        title: task.title,
        meta: `タスク | ${getCompanyName(workspace, task.relatedCompanyId)}`,
        note: task.notes,
      })),
    ...workspace.companies
      .filter((company) => !hiddenStages.has(company.stage))
      .flatMap((company) =>
        company.events
          .filter((event) => event.date && isUpcomingDate(event.date, today))
          .map((event) => ({
            id: event.id,
            date: event.date,
            title: event.title,
            meta: `${company.name} | ${eventTypeOptions.find((item) => item.value === event.type)?.label || event.type
              }`,
            note: event.notes || event.location,
          }))
      ),
  ]
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(0, 8);

  function markDirty(message = "未保存の変更があります。") {
    setSaveState("dirty");
    setSaveMessage(message);
  }

  function updateWorkspace(updater: (current: WorkspaceData) => WorkspaceData) {
    setWorkspace((current) => ({
      ...updater(current),
      updatedAt: new Date().toISOString(),
    }));
    markDirty();
  }

  function replaceCompany(
    companyId: string,
    updater: (company: CompanyRecord) => CompanyRecord
  ) {
    updateWorkspace((current) => ({
      ...current,
      companies: current.companies.map((company) =>
        company.id === companyId
          ? {
            ...updater(company),
            updatedAt: new Date().toISOString(),
          }
          : company
      ),
    }));
  }

  function addCompany() {
    const company = createCompany();

    updateWorkspace((current) => ({
      ...current,
      companies: [company, ...current.companies],
    }));
    setSelectedCompanyId(company.id);
    setCompanyTab("overview");
    setSaveMessage("企業を追加しました。保存すると data/companies に個別ファイルも出力されます。");
  }

  function removeCompany(companyId: string) {
    const company = workspace.companies.find((item) => item.id === companyId);

    if (!company || !window.confirm(`「${company.name}」を削除しますか？`)) {
      return;
    }

    updateWorkspace((current) => ({
      ...current,
      companies: current.companies.filter((item) => item.id !== companyId),
      tasks: current.tasks.map((task) =>
        task.relatedCompanyId === companyId ? { ...task, relatedCompanyId: "" } : task
      ),
      journalEntries: current.journalEntries.map((entry) =>
        entry.relatedCompanyId === companyId
          ? { ...entry, relatedCompanyId: "" }
          : entry
      ),
    }));
    setSaveMessage("企業を削除しました。");
  }

  function addTaskItem() {
    updateWorkspace((current) => ({
      ...current,
      tasks: [createTask(), ...current.tasks],
    }));
  }

  function updateTask(taskId: string, patch: Partial<TaskItem>) {
    updateWorkspace((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === taskId ? { ...task, ...patch } : task
      ),
    }));
  }

  function removeTask(taskId: string) {
    updateWorkspace((current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== taskId),
    }));
  }

  function addJournal(): string {
    const entry = createJournalEntry();
    updateWorkspace((current) => ({
      ...current,
      journalEntries: [entry, ...current.journalEntries],
    }));
    return entry.id;
  }

  function updateJournal(entryId: string, patch: Partial<JournalEntry>) {
    updateWorkspace((current) => ({
      ...current,
      journalEntries: current.journalEntries.map((entry) =>
        entry.id === entryId ? { ...entry, ...patch } : entry
      ),
    }));
  }

  function removeJournal(entryId: string) {
    updateWorkspace((current) => ({
      ...current,
      journalEntries: current.journalEntries.filter((entry) => entry.id !== entryId),
    }));
  }

  function saveToDisk() {
    setSaveState("saving");
    setSaveMessage("保存中...");

    fetch("/api/workspace", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(workspace),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("save failed");
        }

        const payload = (await response.json()) as { workspace: WorkspaceData };
        startTransition(() => {
          setWorkspace(payload.workspace);
          setSaveState("saved");
          setSaveMessage("ファイルを更新しました。JSON / Markdown / ICS も同期済みです。");
        });
      })
      .catch(() => {
        setSaveState("error");
        setSaveMessage("保存に失敗しました。内容はブラウザ下書きに残っています。");
      });
  }

  function reloadFromDisk() {
    setSaveState("saving");
    setSaveMessage("ディスクを読み込み中...");

    fetch("/api/workspace")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("reload failed");
        }

        const payload = (await response.json()) as { workspace: WorkspaceData };
        startTransition(() => {
          setWorkspace(payload.workspace);
          setSelectedCompanyId(payload.workspace.companies[0]?.id || "");
          setSaveState("saved");
          setSaveMessage("ディスク上の内容を再読み込みしました。");
        });
      })
      .catch(() => {
        setSaveState("error");
        setSaveMessage("再読み込みに失敗しました。");
      });
  }

  function clearDraft() {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    setDraftTimestamp("");
    setSaveMessage("ブラウザ下書きを削除しました。");
  }

  const mainTabs: { id: AppTab; label: string }[] = [
    { id: "dashboard", label: "🏠 ダッシュボード" },
    { id: "companies", label: "🏢 企業管理" },
    { id: "tasks", label: "✅ タスク" },
    { id: "notes", label: "📝 ノート" },
    { id: "settings", label: "⚙️ 設定" },
  ];

  return (
    <main className="app-shell">
      {/* ヘッダー */}
      <header className="app-header">
        <div className="app-header-top">
          <div className="app-header-brand">
            <span className="eyebrow">AI-Ready Shukatsu</span>
            <h1>就活管理</h1>
          </div>
          <div className="app-header-actions">
            <div className={saveStateClass(saveState)} style={{ fontSize: "0.84rem" }}>
              {saveStateLabel(saveState)} {isPending ? "同期中..." : ""}
            </div>
            <button
              className="button-ghost"
              onClick={toggleTheme}
              style={{ width: "38px", height: "38px", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%" }}
              title="テーマ切り替え"
              type="button"
            >
              {theme === "light" ? "🌙" : "☀️"}
            </button>
            <button
              className="button-ghost"
              onClick={reloadFromDisk}
              disabled={saveState === "saving"}
            >
              再読込
            </button>
            <button className="button" onClick={saveToDisk} disabled={saveState === "saving"}>
              保存する
            </button>
          </div>
        </div>
        <nav className="main-tab-bar">
          {mainTabs.map((tab) => (
            <button
              key={tab.id}
              className={`main-tab-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* ダッシュボード */}
      {activeTab === "dashboard" && (
        <div className="tab-content">
          <div className="dashboard-grid">
            <section className="panel">
              <div className="section-header">
                <div>
                  <h2 className="section-title">概要</h2>
                  <p className="section-copy">件数、面接中の企業、予定数をすぐ見られます。</p>
                </div>
              </div>
              <div className="stats-grid">
                <StatTile label="企業数" value={String(workspace.companies.length)} />
                <StatTile label="今後の予定" value={String(upcomingItems.length)} />
                <StatTile
                  label="未完了タスク"
                  value={String(workspace.tasks.filter((task) => task.state !== "done").length)}
                />
                <StatTile
                  label="面接中"
                  value={String(
                    workspace.companies.filter((company) => company.stage === "interview").length
                  )}
                />
              </div>
              <div className="footer-note" style={{ marginTop: 20 }}>
                <div className="micro-copy">{saveMessage}</div>
                <div className="micro-copy" style={{ marginTop: 4 }}>
                  ブラウザ下書き: {draftTimestamp || "未作成"}
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="section-header">
                <div>
                  <h2 className="section-title">ステージ別</h2>
                  <p className="section-copy">各選考フェーズの企業数</p>
                </div>
              </div>
              <div className="pill-row">
                {stageSummary
                  .filter((item) => item.count > 0)
                  .map((item) => (
                    <span className="pill" key={item.value}>
                      {item.label}: {item.count}
                    </span>
                  ))}
              </div>
            </section>
          </div>

          <section className="panel" style={{ marginTop: 20 }}>
            <div className="section-header">
              <div>
                <h2 className="section-title">予定と締切</h2>
                <p className="section-copy">全タスクと企業イベントを時系列で確認できます。</p>
              </div>
              <button
                className="button-secondary"
                onClick={() => {
                  setActiveTab("tasks");
                  addTaskItem();
                }}
              >
                タスク追加
              </button>
            </div>
            <div className="timeline-list">
              {upcomingItems.length ? (
                upcomingItems.map((item) => (
                  <div className="timeline-item" key={item.id}>
                    <div className="timeline-date">{formatDateLabel(item.date)}</div>
                    <strong>{item.title || "タイトル未設定"}</strong>
                    <div className="timeline-note">{item.meta}</div>
                    {item.note ? <div className="timeline-note">{item.note}</div> : null}
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <p>まだ予定はありません。タスクやイベントを追加するとここに表示されます。</p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* 企業管理 */}
      {activeTab === "companies" && (
        <div className="tab-content overview-grid">
          <section className="panel">
            <div className="section-header">
              <div>
                <h2 className="section-title">企業一覧</h2>
                <p className="section-copy">検索、進捗確認、優先度の見直しに使います。</p>
              </div>
              <button className="button-secondary" onClick={addCompany}>
                企業追加
              </button>
            </div>
            <div className="field-grid">
              <input
                className="company-search"
                value={companySearch}
                onChange={(event) => setCompanySearch(event.target.value)}
                placeholder="企業名 / 業界 / タグで検索"
              />
              <div className="pill-row" style={{ marginTop: 8 }}>
                {stageSummary.map((item) => {
                  const isActive = stageFilters.length === 0 || stageFilters.includes(item.value);
                  return (
                    <button
                      key={item.value}
                      className="pill"
                      onClick={() => toggleStageFilter(item.value)}
                      style={{
                        cursor: "pointer",
                        background: isActive ? "var(--accent-soft)" : "transparent",
                        color: isActive ? "var(--accent-strong)" : "var(--text)",
                        border: `1px solid ${isActive ? "rgba(15, 118, 110, 0.1)" : "var(--line)"}`,
                        opacity: isActive ? 1 : 0.6,
                        transition: "all 160ms ease",
                      }}
                      type="button"
                      title={`${item.label}の企業を絞り込む`}
                    >
                      {item.label}: {item.count}
                    </button>
                  );
                })}
                {stageFilters.length > 0 && (
                  <button
                    className="pill"
                    onClick={() => setStageFilters([])}
                    style={{
                      cursor: "pointer",
                      background: "transparent",
                      color: "var(--muted)",
                      border: "1px dashed var(--muted)",
                      marginLeft: "4px",
                      transition: "all 160ms ease",
                    }}
                    type="button"
                    title="フィルターを解除"
                  >
                    ✕ 解除
                  </button>
                )}
              </div>
            </div>
            <div className="company-list">
              {filteredCompanies.length ? (
                filteredCompanies.map((company) => (
                  <button
                    className={`company-card ${company.id === selectedCompanyId ? "active" : ""}`}
                    key={company.id}
                    onClick={() => {
                      setSelectedCompanyId(company.id);
                      setCompanyTab("overview");
                    }}
                    type="button"
                  >
                    <h3>{company.name}</h3>
                    <p>{company.nextAction || "次アクション未設定"}</p>
                    <div className="company-meta">
                      <span className="pill stage-pill">
                        {stageOptions.find((item) => item.value === company.stage)?.label}
                      </span>
                      <span className={`pill priority-pill ${company.priority}`}>
                        優先度 {priorityOptions.find((item) => item.value === company.priority)?.label}
                      </span>
                      <span className="pill">志望度 {company.interestScore}/5</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="empty-state">
                  <p>条件に一致する企業はありません。</p>
                </div>
              )}
            </div>
          </section>

          <section className="panel detail-panel">
            {selectedCompany ? (
              <CompanyDetail
                company={selectedCompany}
                companyTab={companyTab}
                onTabChange={setCompanyTab}
                onDelete={() => removeCompany(selectedCompany.id)}
                onUpdate={(updater) => replaceCompany(selectedCompany.id, updater)}
              />
            ) : (
              <div className="empty-state">
                <p>企業を追加すると、ここで詳細情報を編集できます。</p>
              </div>
            )}
          </section>
        </div>
      )}

      {/* タスク & ログ */}
      {activeTab === "tasks" && (
        <div className="tab-content stack">
          <section className="panel">
            <div className="section-header">
              <div>
                <h2 className="section-title">タスク</h2>
                <p className="section-copy">共通タスクも企業別タスクもまとめて管理します。</p>
              </div>
              <button className="button-secondary" onClick={addTaskItem}>
                タスク追加
              </button>
            </div>
            <div className="task-filter-row">
              <SelectField
                label="状態"
                value={taskStateFilter}
                onChange={setTaskStateFilter}
                options={[
                  { value: "all", label: "すべて" },
                  { value: "active", label: "未着手・進行中" },
                  ...taskStateOptions,
                ]}
              />
              <SelectField
                label="関連企業"
                value={taskCompanyFilter}
                onChange={setTaskCompanyFilter}
                options={[
                  { value: "all", label: "すべて" },
                  { value: "", label: "共通" },
                  ...workspace.companies.map((company) => ({
                    value: company.id,
                    label: company.name,
                  })),
                ]}
              />
              <div className="micro-copy" style={{ alignSelf: "flex-end", paddingBottom: 4 }}>
                {filteredTasks.length} / {workspace.tasks.length} 件表示
              </div>
            </div>
            <div className="entity-list entity-list--2col">
              {filteredTasks.length ? (
                filteredTasks.map((task) => (
                  <div className="list-card" key={task.id}>
                    <div className="inline-grid">
                      <InputField
                        label="タイトル"
                        value={task.title}
                        onChange={(value) => updateTask(task.id, { title: value })}
                      />
                      <SelectField
                        label="状態"
                        value={task.state}
                        onChange={(value) =>
                          updateTask(task.id, { state: value as TaskItem["state"] })
                        }
                        options={taskStateOptions}
                      />
                      <InputField
                        label="期限"
                        type="date"
                        value={task.dueDate}
                        onChange={(value) => updateTask(task.id, { dueDate: value })}
                      />
                      <SelectField
                        label="関連企業"
                        value={task.relatedCompanyId}
                        onChange={(value) =>
                          updateTask(task.id, { relatedCompanyId: value })
                        }
                        options={[
                          { value: "", label: "共通" },
                          ...workspace.companies.map((company) => ({
                            value: company.id,
                            label: company.name,
                          })),
                        ]}
                      />
                    </div>
                    <TextAreaField
                      label="メモ"
                      value={task.notes}
                      onChange={(value) => updateTask(task.id, { notes: value })}
                    />
                    <div className="list-card-actions">
                      <button className="button-ghost" onClick={() => removeTask(task.id)}>
                        削除
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <p>{workspace.tasks.length ? "条件に一致するタスクはありません。" : "タスクはまだありません。"}</p>
                </div>
              )}
            </div>
          </section>

        </div>
      )}

      {/* ノート */}
      {activeTab === "notes" && (
        <div className="tab-content stack">
          <section className="panel">
            <div className="section-header">
              <div>
                <h2 className="section-title">ノート</h2>
                <p className="section-copy">日次ログ、逆質問メモ、自由なメモを管理します。</p>
              </div>
              <button
                className="button-secondary"
                onClick={() => {
                  const id = addJournal();
                  setExpandedNoteId(id);
                }}
              >
                ノート追加
              </button>
            </div>
            <div className="note-list">
              {workspace.journalEntries.length ? (
                workspace.journalEntries.map((entry) => {
                  const isExpanded = expandedNoteId === entry.id;
                  const preview = entry.content
                    ? entry.content.slice(0, 80) + (entry.content.length > 80 ? "…" : "")
                    : "内容なし";
                  const companyName = entry.relatedCompanyId
                    ? getCompanyName(workspace, entry.relatedCompanyId)
                    : null;

                  return (
                    <div className={`note-card ${isExpanded ? "expanded" : ""}`} key={entry.id}>
                      <button
                        className="note-card-header"
                        type="button"
                        onClick={() =>
                          setExpandedNoteId(isExpanded ? null : entry.id)
                        }
                      >
                        <div className="note-card-meta">
                          <span className="note-card-title">
                            {entry.title || "タイトル未設定"}
                          </span>
                          <div className="note-card-sub">
                            {entry.date && (
                              <span className="pill">{entry.date}</span>
                            )}
                            {companyName && (
                              <span className="pill">{companyName}</span>
                            )}
                          </div>
                        </div>
                        {!isExpanded && (
                          <p className="note-card-preview">{preview}</p>
                        )}
                        <span className="note-card-chevron">
                          {isExpanded ? "▲" : "▼"}
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="note-card-body">
                          <div className="inline-grid">
                            <InputField
                              label="タイトル"
                              value={entry.title}
                              onChange={(value) =>
                                updateJournal(entry.id, { title: value })
                              }
                            />
                            <InputField
                              label="日付"
                              type="date"
                              value={entry.date}
                              onChange={(value) =>
                                updateJournal(entry.id, { date: value })
                              }
                            />
                            <SelectField
                              label="関連企業"
                              value={entry.relatedCompanyId}
                              onChange={(value) =>
                                updateJournal(entry.id, { relatedCompanyId: value })
                              }
                              options={[
                                { value: "", label: "なし" },
                                ...workspace.companies.map((company) => ({
                                  value: company.id,
                                  label: company.name,
                                })),
                              ]}
                            />
                          </div>
                          <TextAreaField
                            label="内容"
                            value={entry.content}
                            onChange={(value) =>
                              updateJournal(entry.id, { content: value })
                            }
                          />
                          <div className="list-card-actions">
                            <button
                              className="button-ghost"
                              onClick={() => {
                                removeJournal(entry.id);
                                setExpandedNoteId(null);
                              }}
                            >
                              削除
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="empty-state">
                  <p>ノートはまだありません。「ノート追加」から作成できます。</p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* 設定 */}
      {activeTab === "settings" && (
        <div className="tab-content stack">
          <section className="panel">
            <div className="section-header">
              <div>
                <h2 className="section-title">プロフィール</h2>
                <p className="section-copy">就活軸を先に固めておくためのメモ欄です。</p>
              </div>
            </div>
            <div className="field-grid two">
              <InputField
                label="氏名"
                value={workspace.profile.name}
                onChange={(value) =>
                  updateWorkspace((current) => ({
                    ...current,
                    profile: { ...current.profile, name: value },
                  }))
                }
              />
              <InputField
                label="学校"
                value={workspace.profile.school}
                onChange={(value) =>
                  updateWorkspace((current) => ({
                    ...current,
                    profile: { ...current.profile, school: value },
                  }))
                }
              />
              <InputField
                label="卒業予定年"
                value={workspace.profile.graduationYear}
                onChange={(value) =>
                  updateWorkspace((current) => ({
                    ...current,
                    profile: { ...current.profile, graduationYear: value },
                  }))
                }
              />
              <InputField
                label="希望職種"
                value={workspace.profile.desiredRoles.join(", ")}
                onChange={(value) =>
                  updateWorkspace((current) => ({
                    ...current,
                    profile: { ...current.profile, desiredRoles: splitCommaList(value) },
                  }))
                }
                placeholder="例: Webエンジニア, PM"
              />
              <InputField
                label="希望業界"
                value={workspace.profile.desiredIndustries.join(", ")}
                onChange={(value) =>
                  updateWorkspace((current) => ({
                    ...current,
                    profile: {
                      ...current.profile,
                      desiredIndustries: splitCommaList(value),
                    },
                  }))
                }
              />
              <InputField
                label="興味領域"
                value={(workspace.profile.domainInterests || []).join(", ")}
                onChange={(value) =>
                  updateWorkspace((current) => ({
                    ...current,
                    profile: {
                      ...current.profile,
                      domainInterests: splitCommaList(value),
                    },
                  }))
                }
                placeholder="例: 教育・学習支援、エンタメ"
              />
              <InputField
                label="強み"
                value={workspace.profile.strengths.join(", ")}
                onChange={(value) =>
                  updateWorkspace((current) => ({
                    ...current,
                    profile: { ...current.profile, strengths: splitCommaList(value) },
                  }))
                }
              />
              <InputField
                label="優先する価値観"
                value={workspace.profile.priorities.join(", ")}
                onChange={(value) =>
                  updateWorkspace((current) => ({
                    ...current,
                    profile: { ...current.profile, priorities: splitCommaList(value) },
                  }))
                }
                placeholder="例: 成長環境, 裁量, プロダクト志向"
              />
            </div>
            <div className="field-grid" style={{ marginTop: 12 }}>
              <TextAreaField
                label="働き方の希望"
                value={workspace.profile.workingPreferences}
                onChange={(value) =>
                  updateWorkspace((current) => ({
                    ...current,
                    profile: { ...current.profile, workingPreferences: value },
                  }))
                }
                placeholder="勤務地、カルチャー、開発体制など"
              />
              <TextAreaField
                label="今週のフォーカス"
                value={workspace.profile.weeklyFocus}
                onChange={(value) =>
                  updateWorkspace((current) => ({
                    ...current,
                    profile: { ...current.profile, weeklyFocus: value },
                  }))
                }
              />
              <TextAreaField
                label="キャリアビジョン (短期: 1〜2年)"
                value={workspace.profile.careerVision?.shortTerm || ""}
                onChange={(value) =>
                  updateWorkspace((current) => ({
                    ...current,
                    profile: {
                      ...current.profile,
                      careerVision: { ...(current.profile.careerVision || {}), shortTerm: value },
                    },
                  }))
                }
              />
              <TextAreaField
                label="キャリアビジョン (中期: 3〜5年)"
                value={workspace.profile.careerVision?.midTerm || ""}
                onChange={(value) =>
                  updateWorkspace((current) => ({
                    ...current,
                    profile: {
                      ...current.profile,
                      careerVision: { ...(current.profile.careerVision || {}), midTerm: value },
                    },
                  }))
                }
              />
              <TextAreaField
                label="キャリアビジョン (長期)"
                value={workspace.profile.careerVision?.longTerm || ""}
                onChange={(value) =>
                  updateWorkspace((current) => ({
                    ...current,
                    profile: {
                      ...current.profile,
                      careerVision: { ...(current.profile.careerVision || {}), longTerm: value },
                    },
                  }))
                }
              />
              <TextAreaField
                label="自由メモ"
                value={workspace.profile.memo}
                onChange={(value) =>
                  updateWorkspace((current) => ({
                    ...current,
                    profile: { ...current.profile, memo: value },
                  }))
                }
              />
            </div>
          </section>

          <section className="panel">
            <div className="section-header">
              <div>
                <h2 className="section-title">AI 向け出力ファイル</h2>
                <p className="section-copy">保存時に下記ファイルが自動更新されます。</p>
              </div>
            </div>
            <div className="stack">
              <div className="timeline-item">
                <strong>`data/workspace/*.json`</strong>
                <div className="timeline-note">正規データ（分割保存）</div>
              </div>
              <div className="timeline-item">
                <strong>`data/companies/*.md`</strong>
                <div className="timeline-note">企業ごとの要約データ（AI向け）</div>
              </div>
              <div className="timeline-item">
                <strong>`data/ai/notes-index.md`</strong>
                <div className="timeline-note">ノート横断検索用のインデックス</div>
              </div>
              <div className="timeline-item">
                <strong>`data/dashboard.md` / `data/calendar.ics`</strong>
                <div className="timeline-note">全体俯瞰とカレンダー連携</div>
              </div>
            </div>
            <div className="save-row" style={{ marginTop: 16 }}>
              <button className="button-ghost" onClick={clearDraft}>
                ブラウザ下書きを消す
              </button>
            </div>
            <div className="footer-note" style={{ marginTop: 12 }}>
              保存先: `projects/AI-Ready-Shukatsu/data/`
              <br />
              ブラウザ下書き: {draftTimestamp || "未作成"}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function CompanyDetail({
  company,
  companyTab,
  onTabChange,
  onDelete,
  onUpdate,
}: {
  company: CompanyRecord;
  companyTab: CompanyTab;
  onTabChange: (tab: CompanyTab) => void;
  onDelete: () => void;
  onUpdate: (updater: (company: CompanyRecord) => CompanyRecord) => void;
}) {
  function updateEs(entryId: string, patch: Partial<EsEntry>) {
    onUpdate((current) => ({
      ...current,
      esEntries: current.esEntries.map((entry) =>
        entry.id === entryId ? { ...entry, ...patch } : entry
      ),
    }));
  }

  function updateEvent(
    eventId: string,
    patch: {
      title?: string;
      type?: EventType;
      date?: string;
      location?: string;
      notes?: string;
    }
  ) {
    onUpdate((current) => ({
      ...current,
      events: current.events.map((event) =>
        event.id === eventId ? { ...event, ...patch } : event
      ),
    }));
  }

  function updateInterview(entryId: string, patch: Partial<InterviewEntry>) {
    onUpdate((current) => ({
      ...current,
      interviews: current.interviews.map((entry) =>
        entry.id === entryId ? { ...entry, ...patch } : entry
      ),
    }));
  }

  function updateDocument(entryId: string, patch: Partial<DocumentEntry>) {
    onUpdate((current) => ({
      ...current,
      documents: current.documents.map((entry) =>
        entry.id === entryId ? { ...entry, ...patch } : entry
      ),
    }));
  }

  function updateContact(
    contactId: string,
    patch: {
      name?: string;
      role?: string;
      channel?: string;
      email?: string;
      notes?: string;
    }
  ) {
    onUpdate((current) => ({
      ...current,
      contacts: current.contacts.map((entry) =>
        entry.id === contactId ? { ...entry, ...patch } : entry
      ),
    }));
  }

  return (
    <div className="detail-grid">
      <div className="section-header">
        <div>
          <h2 className="section-title">{company.name}</h2>
          <p className="section-copy">
            更新日時 {new Date(company.updatedAt).toLocaleString("ja-JP")}
          </p>
        </div>
        <div className="save-row">
          <span className="pill stage-pill">
            {stageOptions.find((item) => item.value === company.stage)?.label}
          </span>
          <button className="button-ghost" onClick={onDelete}>
            企業を削除
          </button>
        </div>
      </div>

      <div className="tab-row">
        {[
          { value: "overview", label: "概要" },
          { value: "es", label: "ES" },
          { value: "events", label: "予定" },
          { value: "interviews", label: "面接" },
          { value: "resources", label: "資料" },
        ].map((tab) => (
          <button
            className={`tab-button ${companyTab === tab.value ? "active" : ""}`}
            key={tab.value}
            onClick={() => onTabChange(tab.value as CompanyTab)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {companyTab === "overview" ? (
        <div className="stack">
          <div className="field-grid two">
            <InputField
              label="企業名"
              value={company.name}
              onChange={(value) => onUpdate((current) => ({ ...current, name: value }))}
            />
            <InputField
              label="業界"
              value={company.industry}
              onChange={(value) => onUpdate((current) => ({ ...current, industry: value }))}
            />
            <SelectField
              label="ステージ"
              value={company.stage}
              onChange={(value) =>
                onUpdate((current) => ({
                  ...current,
                  stage: value as CompanyRecord["stage"],
                }))
              }
              options={stageOptions}
            />
            <SelectField
              label="優先度"
              value={company.priority}
              onChange={(value) =>
                onUpdate((current) => ({
                  ...current,
                  priority: value as Priority,
                }))
              }
              options={priorityOptions}
            />
            <SelectField
              label="志望度"
              value={String(company.interestScore)}
              onChange={(value) =>
                onUpdate((current) => ({
                  ...current,
                  interestScore: Number(value),
                }))
              }
              options={[1, 2, 3, 4, 5].map((value) => ({
                value: String(value),
                label: `${value} / 5`,
              }))}
            />
            <SelectField
              label="マッチ度"
              value={String(company.fitScore)}
              onChange={(value) =>
                onUpdate((current) => ({
                  ...current,
                  fitScore: Number(value),
                }))
              }
              options={[1, 2, 3, 4, 5].map((value) => ({
                value: String(value),
                label: `${value} / 5`,
              }))}
            />
            <InputField
              label="勤務地 / 本社"
              value={company.headquarters}
              onChange={(value) =>
                onUpdate((current) => ({ ...current, headquarters: value }))
              }
            />
            <InputField
              label="タグ"
              value={company.tags.join(", ")}
              onChange={(value) =>
                onUpdate((current) => ({ ...current, tags: splitCommaList(value) }))
              }
              placeholder="例: 第一志望, 自社開発"
            />
            <InputField
              label="応募URL"
              value={company.applicationUrl}
              onChange={(value) =>
                onUpdate((current) => ({ ...current, applicationUrl: value }))
              }
            />
            <InputField
              label="採用ページ"
              value={company.careersUrl}
              onChange={(value) =>
                onUpdate((current) => ({ ...current, careersUrl: value }))
              }
            />
          </div>
          <div className="field-grid">
            <TextAreaField
              label="志望理由"
              value={company.motivation}
              onChange={(value) =>
                onUpdate((current) => ({ ...current, motivation: value }))
              }
            />
            <TextAreaField
              label="強み"
              value={company.sellingPoints}
              onChange={(value) =>
                onUpdate((current) => ({ ...current, sellingPoints: value }))
              }
            />
            <TextAreaField
              label="懸念点"
              value={company.concerns}
              onChange={(value) => onUpdate((current) => ({ ...current, concerns: value }))}
            />
            <TextAreaField
              label="待遇・働き方(条件等)"
              value={company.conditions}
              onChange={(value) => onUpdate((current) => ({ ...current, conditions: value }))}
            />
            <TextAreaField
              label="次アクション"
              value={company.nextAction}
              onChange={(value) =>
                onUpdate((current) => ({ ...current, nextAction: value }))
              }
            />
            <TextAreaField
              label="総合メモ"
              value={company.notes}
              onChange={(value) => onUpdate((current) => ({ ...current, notes: value }))}
            />
          </div>
        </div>
      ) : null}

      {companyTab === "es" ? (
        <CompanyArraySection
          title="ES / 提出書類"
          description="設問、締切、下書きを企業ごとに管理します。"
          actionLabel="ES追加"
          onAdd={() =>
            onUpdate((current) => ({
              ...current,
              esEntries: [createEsEntry(), ...current.esEntries],
            }))
          }
        >
          {company.esEntries.length ? (
            company.esEntries.map((entry) => (
              <div className="list-card" key={entry.id}>
                <div className="inline-grid">
                  <InputField
                    label="タイトル"
                    value={entry.title}
                    onChange={(value) => updateEs(entry.id, { title: value })}
                  />
                  <SelectField
                    label="状態"
                    value={entry.status}
                    onChange={(value) =>
                      updateEs(entry.id, { status: value as EsEntry["status"] })
                    }
                    options={esStatusOptions}
                  />
                  <InputField
                    label="締切"
                    type="date"
                    value={entry.deadline}
                    onChange={(value) => updateEs(entry.id, { deadline: value })}
                  />
                </div>
                <TextAreaField
                  label="設問"
                  value={entry.question}
                  onChange={(value) => updateEs(entry.id, { question: value })}
                />
                <TextAreaField
                  label="下書き"
                  value={entry.draft}
                  onChange={(value) => updateEs(entry.id, { draft: value })}
                />
                <div className="list-card-actions">
                  <button
                    className="button-ghost"
                    onClick={() =>
                      onUpdate((current) => ({
                        ...current,
                        esEntries: current.esEntries.filter((item) => item.id !== entry.id),
                      }))
                    }
                  >
                    削除
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <p>ES はまだ登録されていません。</p>
            </div>
          )}
        </CompanyArraySection>
      ) : null}

      {companyTab === "events" ? (
        <CompanyArraySection
          title="予定 / 選考イベント"
          description="締切、説明会、面接、テスト日程をまとめます。"
          actionLabel="予定追加"
          onAdd={() =>
            onUpdate((current) => ({
              ...current,
              events: [createEvent(), ...current.events],
            }))
          }
        >
          {company.events.length ? (
            company.events.map((event) => (
              <div className="list-card" key={event.id}>
                <div className="inline-grid">
                  <InputField
                    label="タイトル"
                    value={event.title}
                    onChange={(value) => updateEvent(event.id, { title: value })}
                  />
                  <SelectField
                    label="種別"
                    value={event.type}
                    onChange={(value) =>
                      updateEvent(event.id, { type: value as EventType })
                    }
                    options={eventTypeOptions}
                  />
                  <InputField
                    label="日付"
                    type="date"
                    value={event.date}
                    onChange={(value) => updateEvent(event.id, { date: value })}
                  />
                  <InputField
                    label="場所 / URL"
                    value={event.location}
                    onChange={(value) => updateEvent(event.id, { location: value })}
                  />
                </div>
                <TextAreaField
                  label="メモ"
                  value={event.notes}
                  onChange={(value) => updateEvent(event.id, { notes: value })}
                />
                <div className="list-card-actions">
                  <button
                    className="button-ghost"
                    onClick={() =>
                      onUpdate((current) => ({
                        ...current,
                        events: current.events.filter((item) => item.id !== event.id),
                      }))
                    }
                  >
                    削除
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <p>予定はまだ登録されていません。</p>
            </div>
          )}
        </CompanyArraySection>
      ) : null}

      {companyTab === "interviews" ? (
        <CompanyArraySection
          title="面接ログ"
          description="聞かれたこと、反省、改善点を企業ごとに残します。"
          actionLabel="面接メモ追加"
          onAdd={() =>
            onUpdate((current) => ({
              ...current,
              interviews: [createInterview(), ...current.interviews],
            }))
          }
        >
          {company.interviews.length ? (
            company.interviews.map((entry) => (
              <div className="list-card" key={entry.id}>
                <div className="inline-grid">
                  <InputField
                    label="ラウンド"
                    value={entry.round}
                    onChange={(value) => updateInterview(entry.id, { round: value })}
                  />
                  <InputField
                    label="実施日"
                    type="date"
                    value={entry.date}
                    onChange={(value) => updateInterview(entry.id, { date: value })}
                  />
                  <InputField
                    label="形式"
                    value={entry.format}
                    onChange={(value) => updateInterview(entry.id, { format: value })}
                    placeholder="オンライン / 対面"
                  />
                  <InputField
                    label="結果"
                    value={entry.outcome}
                    onChange={(value) => updateInterview(entry.id, { outcome: value })}
                    placeholder="通過 / 保留 / 見送り"
                  />
                </div>
                <TextAreaField
                  label="聞かれたこと"
                  value={entry.questions}
                  onChange={(value) => updateInterview(entry.id, { questions: value })}
                />
                <TextAreaField
                  label="振り返り"
                  value={entry.reflections}
                  onChange={(value) => updateInterview(entry.id, { reflections: value })}
                />
                <div className="list-card-actions">
                  <button
                    className="button-ghost"
                    onClick={() =>
                      onUpdate((current) => ({
                        ...current,
                        interviews: current.interviews.filter((item) => item.id !== entry.id),
                      }))
                    }
                  >
                    削除
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <p>面接メモはまだありません。</p>
            </div>
          )}
        </CompanyArraySection>
      ) : null}

      {companyTab === "resources" ? (
        <div className="stack">
          <CompanyArraySection
            title="資料リンク"
            description="求人票、会社資料、説明会URL、ポートフォリオリンクなど。"
            actionLabel="資料追加"
            onAdd={() =>
              onUpdate((current) => ({
                ...current,
                documents: [createDocument(), ...current.documents],
              }))
            }
          >
            {company.documents.length ? (
              company.documents.map((entry) => (
                <div className="list-card" key={entry.id}>
                  <div className="inline-grid">
                    <InputField
                      label="ラベル"
                      value={entry.label}
                      onChange={(value) => updateDocument(entry.id, { label: value })}
                    />
                    <InputField
                      label="パス / URL"
                      value={entry.path}
                      onChange={(value) => updateDocument(entry.id, { path: value })}
                    />
                  </div>
                  <TextAreaField
                    label="補足"
                    value={entry.notes}
                    onChange={(value) => updateDocument(entry.id, { notes: value })}
                  />
                  <div className="list-card-actions">
                    <button
                      className="button-ghost"
                      onClick={() =>
                        onUpdate((current) => ({
                          ...current,
                          documents: current.documents.filter((item) => item.id !== entry.id),
                        }))
                      }
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>資料リンクはまだありません。</p>
              </div>
            )}
          </CompanyArraySection>

          <CompanyArraySection
            title="連絡先メモ"
            description="採用担当、OB/OG、面接官との接点を残しておけます。"
            actionLabel="連絡先追加"
            onAdd={() =>
              onUpdate((current) => ({
                ...current,
                contacts: [
                  {
                    id: makeId("contact"),
                    name: "",
                    role: "",
                    channel: "",
                    email: "",
                    notes: "",
                  },
                  ...current.contacts,
                ],
              }))
            }
          >
            {company.contacts.length ? (
              company.contacts.map((entry) => (
                <div className="list-card" key={entry.id}>
                  <div className="inline-grid">
                    <InputField
                      label="氏名"
                      value={entry.name}
                      onChange={(value) => updateContact(entry.id, { name: value })}
                    />
                    <InputField
                      label="役割"
                      value={entry.role}
                      onChange={(value) => updateContact(entry.id, { role: value })}
                    />
                    <InputField
                      label="連絡手段"
                      value={entry.channel}
                      onChange={(value) => updateContact(entry.id, { channel: value })}
                      placeholder="メール / X / LinkedIn"
                    />
                    <InputField
                      label="メール"
                      value={entry.email}
                      onChange={(value) => updateContact(entry.id, { email: value })}
                    />
                  </div>
                  <TextAreaField
                    label="メモ"
                    value={entry.notes}
                    onChange={(value) => updateContact(entry.id, { notes: value })}
                  />
                  <div className="list-card-actions">
                    <button
                      className="button-ghost"
                      onClick={() =>
                        onUpdate((current) => ({
                          ...current,
                          contacts: current.contacts.filter((item) => item.id !== entry.id),
                        }))
                      }
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>連絡先メモはまだありません。</p>
              </div>
            )}
          </CompanyArraySection>
        </div>
      ) : null}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-tile">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function CompanyArraySection({
  title,
  description,
  actionLabel,
  onAdd,
  children,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAdd: () => void;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="section-header">
        <div>
          <h3 className="section-title">{title}</h3>
          <p className="section-copy">{description}</p>
        </div>
        <button className="button-secondary" onClick={onAdd}>
          {actionLabel}
        </button>
      </div>
      <div className="entity-list">{children}</div>
    </section>
  );
}
