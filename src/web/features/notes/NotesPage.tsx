import { type NoteItem, generateId } from "@/core/client";
import { useMemo, useState } from "react";
import { createNote, deleteNoteApi, patchNote } from "../../api/client";
import { useWorkspace } from "../../api/use-workspace";

export function NotesPage() {
  const { data, isLoading, refetch, setSaveStatus } = useWorkspace();
  const [search, setSearch] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState<string>("");

  const notes = data?.notes || [];
  const companies = data?.companies || [];
  const companyMap = useMemo(() => new Map(companies.map((c) => [c.id, c.name])), [companies]);

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const q = search.toLowerCase();
      return !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
    });
  }, [notes, search]);

  const activeNote = notes.find((n) => n.id === selectedNoteId) || filteredNotes[0] || null;

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

    setSaveStatus("saving");
    try {
      const saved = await createNote(newNote);
      await refetch();
      setSelectedNoteId(saved.id);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  };

  const handleUpdateActiveNote = async (patch: Partial<NoteItem>) => {
    if (!activeNote) return;
    setSaveStatus("saving");
    try {
      await patchNote(activeNote.id, patch, activeNote.rev);
      await refetch();
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!window.confirm("このノートを削除しますか？")) return;
    try {
      await deleteNoteApi(id);
      await refetch();
      setSelectedNoteId("");
    } catch (err) {
      alert("ノートの削除に失敗しました: " + (err as Error).message);
    }
  };

  if (isLoading || !data) {
    return <div style={{ padding: "40px", textAlign: "center" }}>ノートデータを読み込み中...</div>;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(280px, 340px) 1fr",
        gap: "24px",
        alignItems: "start",
      }}
    >
      {/* Left Column: Note List */}
      <div style={{ display: "grid", gap: "12px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            placeholder="ノート内を検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, padding: "8px 12px", borderRadius: "var(--radius-md)" }}
          />
          <button
            type="button"
            className="button-primary"
            onClick={handleCreateNote}
            style={{ padding: "8px 14px" }}
          >
            + 追加
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gap: "8px",
            maxHeight: "calc(100vh - 240px)",
            overflowY: "auto",
          }}
        >
          {filteredNotes.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: "0.88rem", padding: "16px 0" }}>
              ノートがありません。
            </p>
          ) : (
            filteredNotes.map((n) => {
              const isSelected = activeNote?.id === n.id;
              const companyName = n.companyId ? companyMap.get(n.companyId) : "共通";

              return (
                <div
                  key={n.id}
                  onClick={() => setSelectedNoteId(n.id)}
                  style={{
                    padding: "12px 14px",
                    background: isSelected ? "var(--surface-strong)" : "var(--surface)",
                    border: isSelected ? "2px solid var(--accent)" : "1px solid var(--line)",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{n.title}</div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.8rem",
                      color: "var(--muted)",
                      marginTop: "4px",
                    }}
                  >
                    <span>{companyName}</span>
                    <span>{n.date}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Note Editor */}
      <div>
        {activeNote ? (
          <div className="card" style={{ padding: "24px", display: "grid", gap: "16px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <input
                type="text"
                value={activeNote.title}
                onChange={(e) => handleUpdateActiveNote({ title: e.target.value })}
                style={{ fontSize: "1.3rem", fontWeight: 700, flex: 1, padding: "4px 8px" }}
                placeholder="タイトル"
              />
              <button
                type="button"
                className="button-ghost"
                style={{ color: "var(--danger)", fontSize: "0.85rem" }}
                onClick={() => handleDeleteNote(activeNote.id)}
              >
                🗑️ 削除
              </button>
            </div>

            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "0.85rem" }}>
              <div>
                <label style={{ marginRight: "6px" }}>日付:</label>
                <input
                  type="date"
                  value={activeNote.date}
                  onChange={(e) => handleUpdateActiveNote({ date: e.target.value })}
                  style={{ padding: "4px 8px" }}
                />
              </div>
              <div>
                <label style={{ marginRight: "6px" }}>関連企業:</label>
                <select
                  value={activeNote.companyId}
                  onChange={(e) => handleUpdateActiveNote({ companyId: e.target.value })}
                  style={{ padding: "4px 8px" }}
                >
                  <option value="">共通 (企業に紐づかない)</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <textarea
                rows={14}
                value={activeNote.content}
                onChange={(e) => handleUpdateActiveNote({ content: e.target.value })}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "var(--radius-md)",
                  lineHeight: 1.6,
                }}
                placeholder="面接の振り返り、企業説明会のメモ、日々の気づきなどを自由に記録..."
              />
            </div>
          </div>
        ) : (
          <div
            className="card"
            style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}
          >
            ノートを選択するか、「+ 追加」ボタンから作成してください。
          </div>
        )}
      </div>
    </div>
  );
}
