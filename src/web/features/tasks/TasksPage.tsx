import { type TaskItem, type TaskState, generateId } from "@/core/client";
import { useMemo, useState } from "react";
import { createTask, deleteTaskApi, patchTask } from "../../api/client";
import { useWorkspace } from "../../api/use-workspace";

export function TasksPage() {
  const { data, isLoading, refetch, setSaveStatus } = useWorkspace();
  const [stateFilter, setStateFilter] = useState<"all" | "open" | "done">("open");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue] = useState("");
  const [newCompanyId, setNewCompanyId] = useState("");

  const tasks = data?.tasks || [];
  const companies = data?.companies || [];
  const companyMap = useMemo(() => new Map(companies.map((c) => [c.id, c.name])), [companies]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchState =
        stateFilter === "all" ||
        (stateFilter === "open" && t.state !== "done") ||
        (stateFilter === "done" && t.state === "done");

      const matchCompany = companyFilter === "all" || t.companyId === companyFilter;
      return matchState && matchCompany;
    });
  }, [tasks, stateFilter, companyFilter]);

  const handleToggleState = async (task: TaskItem) => {
    const nextState: TaskState = task.state === "done" ? "todo" : "done";
    setSaveStatus("saving");
    try {
      await patchTask(task.id, { state: nextState }, task.rev);
      await refetch();
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setSaveStatus("saving");
    const newTask: TaskItem = {
      id: generateId("tk"),
      rev: 1,
      updatedAt: new Date().toISOString(),
      isSample: false,
      title: newTitle.trim(),
      state: "todo",
      due: newDue,
      companyId: newCompanyId,
      notes: "",
    };

    try {
      await createTask(newTask);
      setNewTitle("");
      setNewDue("");
      setNewCompanyId("");
      await refetch();
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTaskApi(id);
      await refetch();
    } catch (err) {
      alert("タスクの削除に失敗しました: " + (err as Error).message);
    }
  };

  if (isLoading || !data) {
    return <div style={{ padding: "40px", textAlign: "center" }}>タスクデータを読み込み中...</div>;
  }

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      {/* Create Task Bar */}
      <form
        onSubmit={handleCreateTask}
        className="card"
        style={{
          padding: "16px",
          display: "flex",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          placeholder="新しいタスクを入力..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          style={{
            flex: 1,
            minWidth: "200px",
            padding: "8px 12px",
            borderRadius: "var(--radius-md)",
          }}
        />
        <input
          type="date"
          value={newDue}
          onChange={(e) => setNewDue(e.target.value)}
          style={{ padding: "7px 10px", borderRadius: "var(--radius-md)" }}
        />
        <select
          value={newCompanyId}
          onChange={(e) => setNewCompanyId(e.target.value)}
          style={{ padding: "7px 10px", borderRadius: "var(--radius-md)", maxWidth: "180px" }}
        >
          <option value="">関連企業なし (共通)</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button type="submit" className="button-primary" style={{ padding: "8px 16px" }}>
          + タスク追加
        </button>
      </form>

      {/* Filter Controls */}
      <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            className={`button-ghost ${stateFilter === "open" ? "button-primary" : ""}`}
            style={{ fontSize: "0.85rem", padding: "4px 12px" }}
            onClick={() => setStateFilter("open")}
          >
            未完了 ({tasks.filter((t) => t.state !== "done").length})
          </button>
          <button
            type="button"
            className={`button-ghost ${stateFilter === "all" ? "button-primary" : ""}`}
            style={{ fontSize: "0.85rem", padding: "4px 12px" }}
            onClick={() => setStateFilter("all")}
          >
            すべて ({tasks.length})
          </button>
          <button
            type="button"
            className={`button-ghost ${stateFilter === "done" ? "button-primary" : ""}`}
            style={{ fontSize: "0.85rem", padding: "4px 12px" }}
            onClick={() => setStateFilter("done")}
          >
            完了済み ({tasks.filter((t) => t.state === "done").length})
          </button>
        </div>

        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          style={{ padding: "4px 8px", fontSize: "0.85rem", borderRadius: "6px" }}
        >
          <option value="all">すべての企業</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tasks List */}
      <div style={{ display: "grid", gap: "8px" }}>
        {filteredTasks.length === 0 ? (
          <div
            className="card"
            style={{ padding: "30px", textAlign: "center", color: "var(--muted)" }}
          >
            表示するタスクはありません。
          </div>
        ) : (
          filteredTasks.map((t) => {
            const isDone = t.state === "done";
            const companyName = t.companyId ? companyMap.get(t.companyId) || "不明な企業" : "共通";

            return (
              <div
                key={t.id}
                className="card"
                style={{
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "14px",
                  opacity: isDone ? 0.6 : 1,
                  background: isDone ? "var(--bg-accent)" : "var(--surface)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                  <input
                    type="checkbox"
                    checked={isDone}
                    onChange={() => handleToggleState(t)}
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                  <div>
                    <div
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: 600,
                        textDecoration: isDone ? "line-through" : "none",
                      }}
                    >
                      {t.title}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "2px" }}>
                      <span>🏢 {companyName}</span>
                      {t.due && <span style={{ marginLeft: "10px" }}>⏰ 期限: {t.due}</span>}
                      {t.notes && <span style={{ marginLeft: "10px" }}>📝 {t.notes}</span>}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="button-ghost"
                  style={{ color: "var(--danger)", fontSize: "0.82rem" }}
                  onClick={() => handleDeleteTask(t.id)}
                >
                  削除
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
