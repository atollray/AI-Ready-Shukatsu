import { type TaskItem, type TaskState, generateId } from "@/core/client";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Edit3,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { createTask, deleteTaskApi, patchTask } from "../../api/client";
import { useWorkspace } from "../../api/use-workspace";
import { TASK_STATE_META, formatRelativeDate } from "../../constants/meta";

export function TasksPage() {
  const { data, isLoading, refetch, setSaveStatus, showToast } = useWorkspace();
  const [stateFilter, setStateFilter] = useState<"all" | "open" | "done">("open");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue] = useState("");
  const [newCompanyId, setNewCompanyId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const tasks = data?.tasks || [];
  const companies = data?.companies || [];
  const companyMap = useMemo(() => new Map(companies.map((c) => [c.id, c.name])), [companies]);

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      const matchState =
        stateFilter === "all" ||
        (stateFilter === "open" && t.state !== "done") ||
        (stateFilter === "done" && t.state === "done");
      const matchCompany = companyFilter === "all" || t.companyId === companyFilter;
      const matchSearch =
        !q || t.title.toLowerCase().includes(q) || t.notes.toLowerCase().includes(q);
      return matchState && matchCompany && matchSearch;
    });
  }, [tasks, stateFilter, companyFilter, search]);

  const handleToggleState = async (task: TaskItem) => {
    const nextState: TaskState = task.state === "done" ? "todo" : "done";
    setSaveStatus("saving");
    try {
      await patchTask(task.id, { state: nextState }, task.rev);
      await refetch();
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
      showToast({ message: "タスクの更新に失敗しました", variant: "error" });
    }
  };

  const handlePatchTask = async (task: TaskItem, patch: Partial<TaskItem>) => {
    setSaveStatus("saving");
    try {
      await patchTask(task.id, patch, task.rev);
      await refetch();
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
      showToast({ message: "タスクの更新に失敗しました", variant: "error" });
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
      showToast({ message: "タスクの作成に失敗しました", variant: "error" });
    }
  };

  const handleDeleteTask = async (task: TaskItem) => {
    const snapshot: TaskItem = { ...task, deletedAt: undefined };
    try {
      await deleteTaskApi(task.id);
      if (editingId === task.id) setEditingId(null);
      await refetch();
      showToast({
        message: `タスク「${task.title}」を削除しました`,
        variant: "info",
        actionLabel: "元に戻す",
        onAction: async () => {
          try {
            await createTask(snapshot);
            await refetch();
            showToast({ message: "タスクを復元しました", variant: "success" });
          } catch (err) {
            showToast({
              message: `タスクの復元に失敗しました: ${(err as Error).message}`,
              variant: "error",
            });
          }
        },
      });
    } catch (err) {
      showToast({
        message: `タスクの削除に失敗しました: ${(err as Error).message}`,
        variant: "error",
      });
    }
  };

  if (isLoading || !data) {
    return (
      <div className="gh-empty">
        <span>タスクデータを読み込み中...</span>
      </div>
    );
  }

  const openCount = tasks.filter((t) => t.state !== "done").length;
  const doneCount = tasks.filter((t) => t.state === "done").length;

  return (
    <div className="gh-stack">
      {/* Quick Add Task Bar */}
      <form onSubmit={handleCreateTask} className="card gh-box-body">
        <div className="gh-row-gap" style={{ width: "100%" }}>
          <input
            type="text"
            placeholder="新しいタスクを入力..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            style={{ flex: 1, minWidth: "220px" }}
          />
          <input
            type="date"
            aria-label="期限"
            value={newDue}
            onChange={(e) => setNewDue(e.target.value)}
          />
          <select
            aria-label="関連企業"
            value={newCompanyId}
            onChange={(e) => setNewCompanyId(e.target.value)}
            style={{ maxWidth: "200px" }}
          >
            <option value="">関連企業なし (共通)</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button type="submit" className="button-primary">
            + タスク追加
          </button>
        </div>
      </form>

      {/* Issues-style Task List Container */}
      <div className="gh-box">
        <div className="gh-box-header">
          <div className="gh-row-gap">
            <button
              type="button"
              className={`btn btn-sm ${stateFilter === "open" ? "btn-accent" : "btn-invisible"}`}
              onClick={() => setStateFilter("open")}
            >
              <Circle size={13} />
              <span>未完了 ({openCount})</span>
            </button>
            <button
              type="button"
              className={`btn btn-sm ${stateFilter === "all" ? "btn-accent" : "btn-invisible"}`}
              onClick={() => setStateFilter("all")}
            >
              <span>すべて ({tasks.length})</span>
            </button>
            <button
              type="button"
              className={`btn btn-sm ${stateFilter === "done" ? "btn-accent" : "btn-invisible"}`}
              onClick={() => setStateFilter("done")}
            >
              <CheckCircle2 size={13} />
              <span>完了済み ({doneCount})</span>
            </button>
          </div>

          <div className="gh-row-gap">
            <div style={{ position: "relative" }}>
              <Search
                size={13}
                className="gh-muted"
                style={{
                  position: "absolute",
                  left: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                }}
              />
              <input
                type="text"
                placeholder="タスクを検索..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: "26px", width: "180px", height: "28px", fontSize: "12px" }}
              />
            </div>

            <select
              aria-label="企業で絞り込み"
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              style={{ height: "28px", fontSize: "12px", padding: "2px 8px" }}
            >
              <option value="all">すべての企業</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          {filteredTasks.length === 0 ? (
            <div className="gh-empty">
              <CheckCircle2 size={24} className="gh-subtle" />
              <span>表示するタスクはありません。</span>
            </div>
          ) : (
            filteredTasks.map((t) => {
              const isDone = t.state === "done";
              const isEditing = editingId === t.id;
              const companyName = t.companyId
                ? companyMap.get(t.companyId) || "不明な企業"
                : "共通";
              const stateMeta = TASK_STATE_META[t.state] || TASK_STATE_META.todo;
              const dueRel = t.due ? formatRelativeDate(t.due) : null;

              return (
                <div
                  key={t.id}
                  className="card gh-box-row gh-box-row-interactive"
                  style={{
                    border: "none",
                    borderRadius: 0,
                    borderBottom: "1px solid var(--border-muted)",
                    backgroundColor: isDone ? "var(--bg-subtle)" : "transparent",
                  }}
                >
                  <div className="gh-row-between" style={{ alignItems: "flex-start" }}>
                    <div
                      className="gh-row-gap"
                      style={{ alignItems: "flex-start", gap: "10px", flex: 1, minWidth: 0 }}
                    >
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() => handleToggleState(t)}
                        aria-label={`${t.title} を完了にする`}
                        style={{
                          width: "16px",
                          height: "16px",
                          marginTop: "3px",
                          cursor: "pointer",
                          accentColor: "var(--success-emphasis)",
                        }}
                      />

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="gh-row-gap" style={{ gap: "8px" }}>
                          <span
                            style={{
                              fontSize: "14px",
                              fontWeight: 600,
                              textDecoration: isDone ? "line-through" : "none",
                              color: isDone ? "var(--fg-muted)" : "var(--fg-default)",
                            }}
                          >
                            {t.title}
                          </span>
                          <span
                            className={`gh-label ${stateMeta.labelClass}`}
                            style={{ fontSize: "11px" }}
                          >
                            {stateMeta.label}
                          </span>
                        </div>

                        <div
                          className="gh-row-gap gh-muted"
                          style={{ fontSize: "12px", marginTop: "4px", gap: "12px" }}
                        >
                          <span className="gh-row-gap" style={{ gap: "4px" }}>
                            <Building2 size={12} />
                            <span>{companyName}</span>
                          </span>
                          {t.due ? (
                            <span className="gh-row-gap" style={{ gap: "4px" }}>
                              <Calendar size={12} />
                              <span className="mono">{t.due}</span>
                              {!isDone && dueRel?.text ? (
                                <span
                                  className={`gh-label ${dueRel.urgent ? "gh-label-danger" : "gh-label-neutral"}`}
                                  style={{ fontSize: "11px", padding: "0 6px" }}
                                >
                                  <Clock size={10} />
                                  <span>{dueRel.text}</span>
                                </span>
                              ) : null}
                            </span>
                          ) : null}
                          {t.notes ? <span>{t.notes}</span> : null}
                        </div>
                      </div>
                    </div>

                    <div className="gh-row-gap">
                      <button
                        type="button"
                        className="btn btn-sm btn-invisible"
                        onClick={() => setEditingId(isEditing ? null : t.id)}
                        title="タスクを編集"
                      >
                        <Edit3 size={13} />
                        <span>{isEditing ? "閉じる" : "編集"}</span>
                      </button>
                      <button
                        type="button"
                        className="button-danger btn-sm"
                        onClick={() => handleDeleteTask(t)}
                      >
                        <Trash2 size={13} />
                        <span>削除</span>
                      </button>
                    </div>
                  </div>

                  {isEditing && (
                    <div
                      style={{
                        marginTop: "10px",
                        marginLeft: "26px",
                        padding: "12px",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: "var(--bg-subtle)",
                        border: "1px solid var(--border-default)",
                        display: "grid",
                        gap: "10px",
                      }}
                    >
                      <div className="gh-row-gap">
                        <input
                          type="text"
                          defaultValue={t.title}
                          onBlur={(e) => {
                            if (e.target.value !== t.title && e.target.value.trim()) {
                              handlePatchTask(t, { title: e.target.value.trim() });
                            }
                          }}
                          style={{ flex: 2, minWidth: "200px" }}
                          placeholder="タスク名"
                        />
                        <select
                          value={t.state}
                          onChange={(e) =>
                            handlePatchTask(t, { state: e.target.value as TaskState })
                          }
                        >
                          <option value="todo">未着手</option>
                          <option value="doing">進行中</option>
                          <option value="done">完了</option>
                        </select>
                        <input
                          type="date"
                          value={t.due}
                          onChange={(e) => handlePatchTask(t, { due: e.target.value })}
                        />
                        <select
                          value={t.companyId}
                          onChange={(e) => handlePatchTask(t, { companyId: e.target.value })}
                        >
                          <option value="">関連企業なし (共通)</option>
                          {companies.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="text"
                        defaultValue={t.notes}
                        onBlur={(e) => {
                          if (e.target.value !== t.notes) {
                            handlePatchTask(t, { notes: e.target.value });
                          }
                        }}
                        placeholder="メモ・補足..."
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
