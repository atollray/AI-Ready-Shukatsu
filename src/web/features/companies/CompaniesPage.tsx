import { type Company, type CompanyStage, generateId } from "@/core/client";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { createCompany, deleteCompanyApi } from "../../api/client";
import { useWorkspace } from "../../api/use-workspace";
import { CompanyDetail } from "./CompanyDetail";

const STAGE_OPTIONS: { value: CompanyStage; label: string }[] = [
  { value: "wishlist", label: "気になる" },
  { value: "researching", label: "企業調査中" },
  { value: "applied", label: "応募・ES中" },
  { value: "interview", label: "面接中" },
  { value: "offer", label: "内定" },
  { value: "paused", label: "保留" },
  { value: "rejected", label: "お見送り" },
];

export function CompaniesPage() {
  const { data, isLoading, refetch, setSaveStatus } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("all");

  const companies = data?.companies || [];
  const selectedId = searchParams.get("selected") || companies[0]?.id || "";

  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const matchSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.industry.toLowerCase().includes(search.toLowerCase()) ||
        c.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));

      const matchStage = selectedStage === "all" || c.stage === selectedStage;
      return matchSearch && matchStage;
    });
  }, [companies, search, selectedStage]);

  const selectedCompany = companies.find((c) => c.id === selectedId) || null;

  const handleSelectCompany = (id: string) => {
    setSearchParams({ selected: id });
  };

  const handleCreateCompany = async () => {
    const now = new Date().toISOString();
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
      stage: "researching",
      currentTrack: "本選考",
      stageHistory: [
        {
          at: now,
          track: "本選考",
          from: "wishlist",
          to: "researching",
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
      setSearchParams({ selected: saved.id });
    } catch (err) {
      alert("企業の作成に失敗しました: " + (err as Error).message);
    }
  };

  const handleDeleteCompany = async (id: string) => {
    try {
      await deleteCompanyApi(id);
      await refetch();
      const remaining = companies.filter((c) => c.id !== id);
      if (remaining.length > 0) {
        setSearchParams({ selected: remaining[0]!.id });
      } else {
        setSearchParams({});
      }
    } catch (err) {
      alert("企業の削除に失敗しました: " + (err as Error).message);
    }
  };

  if (isLoading || !data) {
    return <div style={{ padding: "40px", textAlign: "center" }}>企業データを読み込み中...</div>;
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
      {/* Left Column: Company List */}
      <div style={{ display: "grid", gap: "12px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            placeholder="企業名・業界・タグで検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, padding: "8px 12px", borderRadius: "var(--radius-md)" }}
          />
          <button
            type="button"
            className="button-primary"
            onClick={handleCreateCompany}
            style={{ whiteSpace: "nowrap", padding: "8px 14px" }}
          >
            + 追加
          </button>
        </div>

        {/* Stage Filter */}
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          <button
            type="button"
            className={`button-ghost ${selectedStage === "all" ? "button-primary" : ""}`}
            style={{ fontSize: "0.78rem", padding: "4px 8px" }}
            onClick={() => setSelectedStage("all")}
          >
            すべて ({companies.length})
          </button>
          {STAGE_OPTIONS.map((st) => {
            const count = companies.filter((c) => c.stage === st.value).length;
            if (count === 0 && selectedStage !== st.value) return null;
            return (
              <button
                key={st.value}
                type="button"
                className={`button-ghost ${selectedStage === st.value ? "button-primary" : ""}`}
                style={{ fontSize: "0.78rem", padding: "4px 8px" }}
                onClick={() => setSelectedStage(st.value)}
              >
                {st.label} ({count})
              </button>
            );
          })}
        </div>

        {/* List items */}
        <div
          style={{
            display: "grid",
            gap: "8px",
            maxHeight: "calc(100vh - 260px)",
            overflowY: "auto",
            paddingRight: "4px",
          }}
        >
          {filteredCompanies.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: "0.88rem", padding: "16px 0" }}>
              一致する企業はありません。
            </p>
          ) : (
            filteredCompanies.map((c) => {
              const isSelected = c.id === selectedId;
              return (
                <div
                  key={c.id}
                  onClick={() => handleSelectCompany(c.id)}
                  style={{
                    padding: "12px 14px",
                    background: isSelected ? "var(--surface-strong)" : "var(--surface)",
                    border: isSelected ? "2px solid var(--accent)" : "1px solid var(--line)",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{c.name}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                      ★{c.interestScore}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "4px",
                      fontSize: "0.8rem",
                      color: "var(--muted)",
                    }}
                  >
                    <span>{c.industry || "業界未設定"}</span>
                    <span>{c.currentTrack}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Company Detail */}
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
          <div
            className="card"
            style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}
          >
            企業を選択するか、左上の「+ 追加」ボタンから新しい企業を追加してください。
          </div>
        )}
      </div>
    </div>
  );
}
