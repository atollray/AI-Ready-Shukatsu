import {
  Building2,
  CheckSquare,
  CornerDownLeft,
  FileText,
  LayoutDashboard,
  Search,
  Settings,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useWorkspace } from "../api/use-workspace";
import { STAGE_MAP } from "../constants/meta";

interface CommandItem {
  id: string;
  group: string;
  label: string;
  meta?: string;
  icon: ReactNode;
  onSelect: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const { data } = useWorkspace();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const items = useMemo<CommandItem[]>(() => {
    const navItems: CommandItem[] = [
      {
        id: "nav-dashboard",
        group: "ページ移動",
        label: "ダッシュボード",
        meta: "/",
        icon: <LayoutDashboard size={15} />,
        onSelect: () => navigate("/"),
      },
      {
        id: "nav-companies",
        group: "ページ移動",
        label: "企業管理",
        meta: "/companies",
        icon: <Building2 size={15} />,
        onSelect: () => navigate("/companies"),
      },
      {
        id: "nav-tasks",
        group: "ページ移動",
        label: "タスク",
        meta: "/tasks",
        icon: <CheckSquare size={15} />,
        onSelect: () => navigate("/tasks"),
      },
      {
        id: "nav-notes",
        group: "ページ移動",
        label: "ノート",
        meta: "/notes",
        icon: <FileText size={15} />,
        onSelect: () => navigate("/notes"),
      },
      {
        id: "nav-settings",
        group: "ページ移動",
        label: "設定",
        meta: "/settings",
        icon: <Settings size={15} />,
        onSelect: () => navigate("/settings"),
      },
    ];

    const companyItems: CommandItem[] = (data?.companies || []).map((c) => ({
      id: `co-${c.id}`,
      group: "企業",
      label: c.name,
      meta: `${STAGE_MAP[c.stage]?.label || c.stage} · ${c.currentTrack}`,
      icon: <Building2 size={15} />,
      onSelect: () => navigate(`/companies?selected=${c.id}`),
    }));

    const noteItems: CommandItem[] = (data?.notes || []).map((n) => ({
      id: `nt-${n.id}`,
      group: "ノート",
      label: n.title || "無題のノート",
      meta: n.date,
      icon: <FileText size={15} />,
      onSelect: () => navigate(`/notes?selected=${n.id}`),
    }));

    const all = [...navItems, ...companyItems, ...noteItems];
    const q = query.trim().toLowerCase();
    if (!q) return all.slice(0, 12);
    return all
      .filter(
        (item) =>
          item.label.toLowerCase().includes(q) || (item.meta || "").toLowerCase().includes(q),
      )
      .slice(0, 15);
  }, [data, navigate, query]);

  if (!open) return null;

  const handleSelect = (item: CommandItem) => {
    item.onSelect();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (items.length ? (prev + 1) % items.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (items.length ? (prev - 1 + items.length) % items.length : 0));
    } else if (e.key === "Enter" && items[activeIndex]) {
      e.preventDefault();
      handleSelect(items[activeIndex]);
    }
  };

  return (
    <div className="gh-modal-backdrop" onClick={onClose}>
      <dialog
        open
        className="gh-modal"
        aria-label="クイックジャンプ"
        style={{ padding: 0, color: "var(--fg-default)" }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="gh-cmd-input-wrap">
          <Search size={16} className="gh-muted" />
          <input
            ref={inputRef}
            type="text"
            className="gh-cmd-input"
            placeholder="ページ・企業・ノートを検索して移動..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
          />
          <span className="gh-kbd">Esc</span>
        </div>

        <div className="gh-cmd-list">
          {items.length === 0 ? (
            <div className="gh-empty" style={{ padding: "24px" }}>
              <span>該当する項目が見つかりません</span>
            </div>
          ) : (
            items.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                className={`gh-cmd-item ${idx === activeIndex ? "active" : ""}`}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                <span className="gh-row-gap" style={{ minWidth: 0 }}>
                  <span className="gh-muted" style={{ display: "inline-flex" }}>
                    {item.icon}
                  </span>
                  <span style={{ fontWeight: 500 }}>{item.label}</span>
                  <span className="gh-label gh-label-neutral" style={{ fontSize: "11px" }}>
                    {item.group}
                  </span>
                </span>
                <span className="gh-row-gap gh-muted" style={{ fontSize: "12px" }}>
                  {item.meta ? <span>{item.meta}</span> : null}
                  {idx === activeIndex ? <CornerDownLeft size={13} /> : null}
                </span>
              </button>
            ))
          )}
        </div>
      </dialog>
    </div>
  );
}
