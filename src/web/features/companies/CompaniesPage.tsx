import { type Company, type CompanyStage, generateId } from "@/core/client";
import { ArrowUpDown, Building2, Search, Star, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { createCompany, deleteCompanyApi } from "../../api/client";
import { useWorkspace } from "../../api/use-workspace";
import { STAGE_LIST, STAGE_MAP } from "../../constants/meta";
import { CompanyDetail } from "./CompanyDetail";

type SortKey = "score" | "updated" | "name";

export function CompaniesPage() {
  const { data, isLoading, refetch, setSaveStatus, showToast } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("score");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedStage = searchParams.get("stage") || "all";
  const companies = data?.companies || [];

  const filteredCompanies = useMemo(() => {
    const filtered = companies.filter((c) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.industry.toLowerCase().includes(q) ||
        c.currentTrack.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q));

      const matchStage = selectedStage === "all" || c.stage === selectedStage;
      return matchSearch && matchStage;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name, "ja");
      if (sortBy === "updated") return b.updatedAt.localeCompare(a.updatedAt);
      const scoreDiff = b.interestScore + b.fitScore - (a.interestScore + a.fitScore);
      if (scoreDiff !== 0) return scoreDiff;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [companies, search, selectedStage, sortBy]);

  const rawSelectedId = searchParams.get("selected");
  const selectedId =
    rawSelectedId && companies.some((c) => c.id === rawSelectedId)
      ? rawSelectedId
      : filteredCompanies[0]?.id || companies[0]?.id || "";

  const selectedCompany = companies.find((c) => c.id === selectedId) || null;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA" &&
        document.activeElement?.tagName !== "SELECT"
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const updateParams = (patch: { selected?: string | null; stage?: string | null }) => {
    const next = new URLSearchParams(searchParams);
    if (patch.selected !== undefined) {
      if (patch.selected) next.set("selected", patch.selected);
      else next.delete("selected");
    }
    if (patch.stage !== undefined) {
      if (patch.stage && patch.stage !== "all") next.set("stage", patch.stage);
      else next.delete("stage");
    }
    setSearchParams(next);
  };

  const handleSelectCompany = (id: string) => {
    updateParams({ selected: id });
  };

  const handleStageFilter = (stage: string) => {
    updateParams({ stage });
  };

  const handleCreateCompany = async () => {
    const now = new Date().toISOString();
    const initialStage: CompanyStage =
      selectedStage !== "all" ? (selectedStage as CompanyStage) : "researching";
    const newCo: Company = {
      id: generateId("co"),
      rev: 1,
      updatedAt: now,
      isSample: false,
      name: "新規企業",
      industry: "",
      headquarters: "",
      urls: { careers: "", application: "" },
      tags: [],
      stage: initialStage,
      currentTrack: "本選考",
      stageHistory: [
        {
          at: now,
          track: "本選考",
          from: "wishlist",
          to: initialStage,
        },
      ],
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
    };

    try {
      const saved = await createCompany(newCo);
      await refetch();
      updateParams({ selected: saved.id });
    } catch (err) {
      showToast({
        message: `企業の作成に失敗しました: ${(err as Error).message}`,
        variant: "error",
      });
    }
  };

  const handleDeleteCompany = async (id: string) => {
    const target = companies.find((c) => c.id === id);
    const snapshot = target ? { ...target, deletedAt: undefined } : null;
    try {
      await deleteCompanyApi(id);
      await refetch();
      const remaining = companies.filter((c) => c.id !== id);
      updateParams({ selected: remaining[0]?.id || null });
      if (snapshot) {
        showToast({
          message: `「${snapshot.name}」を削除しました`,
          variant: "info",
          actionLabel: "元に戻す",
          onAction: async () => {
            try {
              const restored = await createCompany(snapshot);
              await refetch();
              updateParams({ selected: restored.id });
              showToast({ message: `「${restored.name}」を復元しました`, variant: "success" });
            } catch (err) {
              showToast({
                message: `企業の復元に失敗しました: ${(err as Error).message}`,
                variant: "error",
              });
            }
          },
        });
      }
    } catch (err) {
      showToast({
        message: `企業の削除に失敗しました: ${(err as Error).message}`,
        variant: "error",
      });
    }
  };

  if (isLoading || !data) {
    return (
      <div className="gh-empty">
        <span>企業データを読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="gh-master-detail">
      {/* Left Sidebar: Company Directory */}
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
                ref={searchInputRef}
                type="text"
                placeholder="企業名・業界・タグで検索"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  paddingLeft: "28px",
                  paddingRight: search ? "26px" : "10px",
                }}
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="検索をクリア"
                  style={{
                    position: "absolute",
                    right: "6px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    padding: "2px",
                    display: "inline-flex",
                    color: "var(--fg-muted)",
                  }}
                >
                  <X size={13} />
                </button>
              ) : null}
            </div>
            <button
              type="button"
              className="button-primary btn-sm"
              onClick={handleCreateCompany}
              style={{ height: "32px" }}
            >
              + 追加
            </button>
          </div>

          {/* Stage Filter & Sort */}
          <div style={{ width: "100%", display: "grid", gap: "8px", marginTop: "4px" }}>
            <div className="gh-filter-pills">
              <button
                type="button"
                className={`gh-filter-pill ${selectedStage === "all" ? "active" : ""}`}
                onClick={() => handleStageFilter("all")}
              >
                すべて ({companies.length})
              </button>
              {STAGE_LIST.map((st) => {
                const count = companies.filter((c) => c.stage === st.value).length;
                if (count === 0 && selectedStage !== st.value) return null;
                return (
                  <button
                    key={st.value}
                    type="button"
                    className={`gh-filter-pill ${selectedStage === st.value ? "active" : ""}`}
                    onClick={() => handleStageFilter(st.value)}
                  >
                    <span
                      className="gh-dot"
                      style={{ backgroundColor: st.dotColor, width: "6px", height: "6px" }}
                    />
                    <span>
                      {st.shortLabel} ({count})
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="gh-row-between" style={{ fontSize: "12px" }}>
              <span className="gh-muted">{filteredCompanies.length} 社表示</span>
              <label className="gh-row-gap gh-muted" style={{ gap: "4px" }}>
                <ArrowUpDown size={12} />
                <select
                  aria-label="並び替え"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  style={{ padding: "2px 6px", fontSize: "12px", height: "24px" }}
                >
                  <option value="score">志望度・マッチ順</option>
                  <option value="updated">更新日時順</option>
                  <option value="name">企業名順</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        <div className="gh-sidebar-list">
          {filteredCompanies.length === 0 ? (
            <div className="gh-empty" style={{ padding: "28px 16px" }}>
              <Building2 size={20} className="gh-subtle" />
              <span style={{ fontSize: "13px" }}>一致する企業はありません。</span>
            </div>
          ) : (
            filteredCompanies.map((c) => {
              const isSelected = c.id === selectedId;
              const stageMeta = STAGE_MAP[c.stage] || STAGE_MAP.researching;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectCompany(c.id)}
                  className={`gh-list-item ${isSelected ? "selected" : ""}`}
                >
                  <div className="gh-row-between" style={{ width: "100%", flexWrap: "nowrap" }}>
                    <span
                      className="gh-row-gap"
                      style={{ gap: "7px", minWidth: 0, flexWrap: "nowrap" }}
                    >
                      <span
                        className="gh-dot"
                        style={{ backgroundColor: stageMeta.dotColor }}
                        title={stageMeta.label}
                      />
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: "13px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c.name}
                      </span>
                    </span>
                    <span
                      className="gh-row-gap gh-muted mono"
                      style={{ gap: "2px", fontSize: "11px", flexShrink: 0 }}
                    >
                      <Star size={11} style={{ color: "var(--attention-fg)" }} />
                      <span>{c.interestScore}</span>
                    </span>
                  </div>

                  <div
                    className="gh-row-between gh-muted"
                    style={{ width: "100%", fontSize: "12px", paddingLeft: "15px" }}
                  >
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.industry || "業界未設定"}
                    </span>
                    <span style={{ flexShrink: 0, fontSize: "11px" }}>{c.currentTrack}</span>
                  </div>

                  {(c.esEntries.length > 0 || c.events.length > 0) && (
                    <div
                      className="gh-row-gap gh-subtle"
                      style={{ fontSize: "11px", paddingLeft: "15px" }}
                    >
                      {c.esEntries.length > 0 ? <span>ES {c.esEntries.length}</span> : null}
                      {c.events.length > 0 ? <span>予定 {c.events.length}</span> : null}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Right Main Pane: Company Detail */}
      <div>
        {selectedCompany ? (
          <CompanyDetail
            key={selectedCompany.id}
            company={selectedCompany}
            onCompanyUpdated={() => refetch()}
            onCompanyDeleted={handleDeleteCompany}
            setSaveStatus={setSaveStatus}
          />
        ) : (
          <div className="card gh-empty" style={{ padding: "56px 24px" }}>
            <Building2 size={28} className="gh-subtle" />
            <span>企業を選択するか、左上の「+ 追加」ボタンから新しい企業を追加してください。</span>
          </div>
        )}
      </div>
    </div>
  );
}
