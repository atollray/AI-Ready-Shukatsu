import { type NoteItem, generateId } from "@/core/client";
import { Building2, Calendar, FileText, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { createNote, deleteNoteApi, patchNote } from "../../api/client";
import { useWorkspace } from "../../api/use-workspace";
import { MarkdownPreview } from "../../components/MarkdownPreview";

export function NotesPage() {
  const { data, isLoading, refetch, setSaveStatus } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"write" | "preview">("write");

  const notes = data?.notes || [];
  const companies = data?.companies || [];
  const companyMap = useMemo(() => new Map(companies.map((c) => [c.id, c.name])), [companies]);

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes.filter((n) => {
      return !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
    });
  }, [notes, search]);

  const selectedFromParam = searchParams.get("selected");
  const matchedNote = selectedFromParam ? notes.find((n) => n.id === selectedFromParam) : undefined;
  const activeNote = selectedFromParam ? matchedNote || null : filteredNotes[0] || notes[0] || null;

  const [draft, setDraft] = useState<NoteItem | null>(activeNote);
  const draftRef = useRef<NoteItem | null>(activeNote);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRevRef = useRef<number>(activeNote?.rev ?? 1);
  const activeIdRef = useRef<string | null>(activeNote?.id ?? null);
  const creatingIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (creatingIdRef.current && activeIdRef.current === creatingIdRef.current) {
      return;
    }
    if (!activeNote) {
      if (selectedFromParam && draftRef.current?.id === selectedFromParam) {
        return;
      }
      if (!selectedFromParam && !draftRef.current) {
        setDraft(null);
        activeIdRef.current = null;
      }
      return;
    }
    if (activeIdRef.current !== activeNote.id) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      setDraft(activeNote);
      draftRef.current = activeNote;
      latestRevRef.current = activeNote.rev;
      activeIdRef.current = activeNote.id;
    } else if (!saveTimeoutRef.current) {
      setDraft(activeNote);
      draftRef.current = activeNote;
      latestRevRef.current = activeNote.rev;
    }
  }, [activeNote, selectedFromParam]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleSelectNote = (id: string) => {
    setSearchParams({ selected: id });
  };

  const handleCreateNote = async () => {
    const now = new Date().toISOString();
    const newNote: NoteItem = {
      id: generateId("nt"),
      rev: 1,
      updatedAt: now,
      isSample: false,
      title: "新規ノート",
      date: now.slice(0, 10),
      companyId: "",
      content: "",
    };

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    creatingIdRef.current = newNote.id;
    activeIdRef.current = newNote.id;
    latestRevRef.current = 1;
    draftRef.current = newNote;
    setDraft(newNote);
    setMode("write");
    setSaveStatus("saving");

    try {
      const saved = await createNote(newNote);
      latestRevRef.current = saved.rev;
      // Preserve any edits typed while POST was in-flight
      const current = draftRef.current;
      if (
        current &&
        current.id === saved.id &&
        (current.title !== newNote.title ||
          current.content !== newNote.content ||
          current.companyId !== newNote.companyId ||
          current.date !== newNote.date)
      ) {
        const patched = await patchNote(
          saved.id,
          {
            title: current.title,
            date: current.date,
            companyId: current.companyId,
            content: current.content,
          },
          saved.rev,
        );
        latestRevRef.current = patched.rev;
      }
      creatingIdRef.current = null;
      await refetch();
      setSearchParams({ selected: saved.id });
      setSaveStatus("saved");
    } catch {
      creatingIdRef.current = null;
      setSaveStatus("error");
    }
  };

  const triggerUpdateDraft = (patch: Partial<NoteItem>) => {
    const base = draftRef.current;
    if (!base) return;
    const nextDraft = { ...base, ...patch };
    draftRef.current = nextDraft;
    setDraft(nextDraft);
    setSaveStatus("saving");

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const targetId = nextDraft.id;
    saveTimeoutRef.current = setTimeout(async () => {
      saveTimeoutRef.current = null;
      if (creatingIdRef.current === targetId) return;
      const latest = draftRef.current;
      if (!latest || latest.id !== targetId) return;
      try {
        const saved = await patchNote(
          targetId,
          {
            title: latest.title,
            date: latest.date,
            companyId: latest.companyId,
            content: latest.content,
          },
          latestRevRef.current,
        );
        latestRevRef.current = saved.rev;
        await refetch();
        setSaveStatus("saved");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "";
        setSaveStatus(msg.startsWith("CONFLICT") ? "conflict" : "error");
      }
    }, 550);
  };

  const handleDeleteNote = async (id: string) => {
    if (!window.confirm("このノートを削除しますか？")) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    try {
      await deleteNoteApi(id);
      activeIdRef.current = null;
      draftRef.current = null;
      await refetch();
      setSearchParams({});
    } catch (err) {
      alert("ノートの削除に失敗しました: " + (err as Error).message);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="gh-empty">
        <span>ノートデータを読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="gh-master-detail">
      {/* Left Column: Note List */}
      <aside className="card">
        <div className="gh-box-header" style={{ padding: "10px 12px" }}>
          <div className="gh-row-gap" style={{ width: "100%" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
              <Search
                size={14}
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
                placeholder="ノート内を検索..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: "100%", paddingLeft: "28px" }}
              />
            </div>
            <button
              type="button"
              className="button-primary btn-sm"
              onClick={handleCreateNote}
              style={{ height: "32px" }}
            >
              + 追加
            </button>
          </div>
        </div>

        <div className="gh-sidebar-list">
          {filteredNotes.length === 0 ? (
            <div className="gh-empty" style={{ padding: "28px 16px" }}>
              <FileText size={20} className="gh-subtle" />
              <span style={{ fontSize: "13px" }}>ノートがありません。</span>
            </div>
          ) : (
            filteredNotes.map((n) => {
              const isSelected = activeNote?.id === n.id;
              const companyName = n.companyId ? companyMap.get(n.companyId) : "共通";

              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleSelectNote(n.id)}
                  className={`gh-list-item ${isSelected ? "selected" : ""}`}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "13px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      width: "100%",
                    }}
                  >
                    {n.title || "無題のノート"}
                  </div>
                  <div
                    className="gh-row-between gh-muted"
                    style={{ fontSize: "11px", width: "100%" }}
                  >
                    <span>{companyName}</span>
                    <span className="mono">{n.date}</span>
                  </div>
                  {n.content ? (
                    <div
                      className="gh-subtle"
                      style={{
                        fontSize: "11px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        width: "100%",
                      }}
                    >
                      {n.content}
                    </div>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Right Column: Note Editor */}
      <div>
        {draft ? (
          <div className="card">
            <div className="gh-box-header">
              <div style={{ flex: 1, minWidth: "220px" }}>
                <input
                  type="text"
                  className="gh-title-input"
                  value={draft.title}
                  onChange={(e) => triggerUpdateDraft({ title: e.target.value })}
                  placeholder="タイトル"
                  style={{ fontSize: "18px" }}
                />
              </div>

              <div className="gh-row-gap">
                <div className="gh-segmented">
                  <button
                    type="button"
                    className={`gh-segmented-btn ${mode === "write" ? "active" : ""}`}
                    onClick={() => setMode("write")}
                  >
                    Write
                  </button>
                  <button
                    type="button"
                    className={`gh-segmented-btn ${mode === "preview" ? "active" : ""}`}
                    onClick={() => setMode("preview")}
                  >
                    Preview
                  </button>
                </div>

                <button
                  type="button"
                  className="button-danger btn-sm"
                  onClick={() => handleDeleteNote(draft.id)}
                >
                  <Trash2 size={13} />
                  <span>削除</span>
                </button>
              </div>
            </div>

            <div className="gh-box-body gh-stack">
              <div className="gh-row-gap" style={{ gap: "16px", fontSize: "12px" }}>
                <label className="gh-row-gap" style={{ gap: "6px" }}>
                  <Calendar size={13} className="gh-muted" />
                  <span className="gh-field-label">日付:</span>
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(e) => triggerUpdateDraft({ date: e.target.value })}
                  />
                </label>

                <label className="gh-row-gap" style={{ gap: "6px" }}>
                  <Building2 size={13} className="gh-muted" />
                  <span className="gh-field-label">関連企業:</span>
                  <select
                    value={draft.companyId}
                    onChange={(e) => triggerUpdateDraft({ companyId: e.target.value })}
                  >
                    <option value="">共通 (企業に紐づかない)</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>

                <span className="mono gh-muted" style={{ marginLeft: "auto" }}>
                  {draft.content.length} 字
                </span>
              </div>

              {mode === "write" ? (
                <textarea
                  rows={16}
                  value={draft.content}
                  onChange={(e) => triggerUpdateDraft({ content: e.target.value })}
                  style={{ width: "100%", lineHeight: 1.65 }}
                  placeholder="面接の振り返り、企業説明会のメモ、日々の気づきなどを自由に記録（Markdown 記法対応）..."
                />
              ) : (
                <div
                  style={{
                    minHeight: "280px",
                    padding: "16px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-subtle)",
                    border: "1px solid var(--border-muted)",
                  }}
                >
                  <MarkdownPreview
                    content={draft.content}
                    emptyText="ノート本文がまだありません。「Write」から入力できます。"
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card gh-empty" style={{ padding: "56px 24px" }}>
            <FileText size={28} className="gh-subtle" />
            <span>ノートを選択するか、「+ 追加」ボタンから作成してください。</span>
          </div>
        )}
      </div>
    </div>
  );
}
