import { generateId } from "@/core/client";
import {
  Building2,
  CheckSquare,
  CornerDownLeft,
  FileText,
  LayoutDashboard,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { createCompany, createNote } from "../api/client";
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
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
}

export function CommandPalette({ open, onClose, theme, onToggleTheme }: CommandPaletteProps) {
  const { data, refetch, showToast } = useWorkspace();
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
    const actionItems: CommandItem[] = [
      ...(onToggleTheme
        ? [
            {
              id: "act-theme",
              group: "アクション",
              label: theme === "dark" ? "ライトテーマに切り替え" : "ダークテーマに切り替え",
              meta: "Theme",
              icon: theme === "dark" ? <Sun size={15} /> : <Moon size={15} />,
              onSelect: () => onToggleTheme(),
            },
          ]
        : []),
      {
        id: "act-new-company",
        group: "アクション",
        label: "新しい企業を追加",
        meta: "Create Company",
        icon: <Plus size={15} />,
        onSelect: async () => {
          const now = new Date().toISOString();
          try {
            const saved = await createCompany({
              id: generateId("co"),
              rev: 1,
              updatedAt: now,
              isSample: false,
              name: "新規企業",
              industry: "",
              headquarters: "",
              urls: { careers: "", application: "" },
              tags: [],
              stage: "researching",
              currentTrack: "本選考",
              stageHistory: [{ at: now, track: "本選考", from: "wishlist", to: "researching" }],
              interestScore: 3,
              fitScore: 3,
              motivation: "",
              sellingPoints: "",
              concerns: "",
              conditions: "",
              memo: "",
              esEntries: [],
              events: [],
              contacts: [],
              documents: [],
            });
            await refetch();
            navigate(`/companies?selected=${saved.id}`);
          } catch (err) {
            showToast({
              message: `企業の作成に失敗しました: ${(err as Error).message}`,
              variant: "error",
            });
          }
        },
      },
      {
        id: "act-new-note",
        group: "アクション",
        label: "新しいノートを作成",
        meta: "Create Note",
        icon: <Plus size={15} />,
        onSelect: async () => {
          const now = new Date().toISOString();
          try {
            const saved = await createNote({
              id: generateId("nt"),
              rev: 1,
              updatedAt: now,
              isSample: false,
              title: "新規ノート",
              date: now.slice(0, 10),
              companyId: "",
              content: "",
            });
            await refetch();
            navigate(`/notes?selected=${saved.id}`);
          } catch (err) {
            showToast({
              message: `ノートの作成に失敗しました: ${(err as Error).message}`,
              variant: "error",
            });
          }
        },
      },
    ];

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

    const all = [...actionItems, ...navItems, ...companyItems, ...noteItems];
    const q = query.trim().toLowerCase();
    if (!q) return all.slice(0, 12);
    return all
      .filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.group.toLowerCase().includes(q) ||
          (item.meta || "").toLowerCase().includes(q),
      )
      .slice(0, 15);
  }, [data, navigate, onToggleTheme, query, refetch, showToast, theme]);

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
