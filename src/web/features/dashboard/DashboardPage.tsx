import { deriveNextAction } from "@/core/client";
import { calculateStageCounts, getTopScoredCompanies } from "@/core/client";
import { buildUpcomingItems } from "@/core/client";
import { Link } from "react-router";
import { useWorkspace } from "../../api/use-workspace";

const STAGE_LABELS: Record<string, string> = {
  wishlist: "気になる",
  researching: "企業調査中",
  applied: "応募・ES中",
  interview: "面接進行中",
  offer: "内定・内々定",
  paused: "保留",
  rejected: "お見送り",
};

export function DashboardPage() {
  const { data, isLoading } = useWorkspace();

  if (isLoading || !data) {
    return <div style={{ padding: "40px", textAlign: "center" }}>データを読み込み中...</div>;
  }

  const { profile, companies, tasks } = data;
  const stageCounts = calculateStageCounts(companies);
  const upcomingItems = buildUpcomingItems(companies, tasks, { includeSample: true, limit: 8 });
  const topCompanies = getTopScoredCompanies(companies, 5, true);

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      {/* Profile Banner */}
      <section className="card" style={{ padding: "20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <h2 style={{ margin: "0 0 6px 0", fontSize: "1.3rem" }}>
              {profile.name ? `${profile.name} さんの就活ダッシュボード` : "就活ダッシュボード"}
            </h2>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.9rem" }}>
              {profile.school} {profile.graduationYear && `(${profile.graduationYear})`}
              {profile.desiredRoles.length > 0 && ` | 志望職種: ${profile.desiredRoles.join(", ")}`}
            </p>
          </div>
          <Link to="/settings" className="button-ghost" style={{ fontSize: "0.85rem" }}>
            プロフィールを編集 →
          </Link>
        </div>

        {profile.weeklyFocus && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              background: "var(--accent-soft)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent-strong)" }}>
              🎯 今週のフォーカス:
            </span>
            <div style={{ marginTop: "4px", fontSize: "0.9rem", whiteSpace: "pre-wrap" }}>
              {profile.weeklyFocus}
            </div>
          </div>
        )}
      </section>

      {/* Stage Stats Tiles */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "12px",
        }}
      >
        {Object.entries(STAGE_LABELS).map(([stage, label]) => {
          const count = stageCounts[stage as keyof typeof stageCounts] || 0;
          return (
            <div
              key={stage}
              className="card"
              style={{
                padding: "14px",
                textAlign: "center",
                borderLeft: count > 0 ? "4px solid var(--accent)" : "1px solid var(--line)",
              }}
            >
              <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{label}</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, margin: "4px 0" }}>{count}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>社</div>
            </div>
          );
        })}
      </section>

      {/* 2-Column: Upcoming & Top Companies */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "24px",
        }}
      >
        {/* Upcoming List */}
        <section className="card" style={{ padding: "20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "1.1rem" }}>📅 直近の予定・締切</h3>
            <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
              {upcomingItems.length} 件
            </span>
          </div>

          {upcomingItems.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>直近の予定はありません。</p>
          ) : (
            <div style={{ display: "grid", gap: "10px" }}>
              {upcomingItems.map((item) => (
                <div
                  key={`${item.source}-${item.id}`}
                  style={{
                    padding: "10px 14px",
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--radius-md)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.92rem", fontWeight: 600 }}>{item.title}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "2px" }}>
                      {item.companyName} {item.location && `| ${item.location}`}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: "var(--accent-strong)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.date}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Top Companies */}
        <section className="card" style={{ padding: "20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "1.1rem" }}>⭐ 注目・高志望度企業</h3>
            <Link to="/companies" className="button-ghost" style={{ fontSize: "0.82rem" }}>
              全企業一覧 →
            </Link>
          </div>

          {topCompanies.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>企業が登録されていません。</p>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {topCompanies.map((c) => {
                const nextAction = deriveNextAction(c.id, tasks);
                return (
                  <Link
                    key={c.id}
                    to={`/companies?selected=${c.id}`}
                    style={{
                      display: "block",
                      padding: "12px 14px",
                      background: "var(--surface)",
                      border: "1px solid var(--line)",
                      borderRadius: "var(--radius-md)",
                      transition: "border-color 0.15s ease",
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
                      <span
                        style={{
                          fontSize: "0.78rem",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          background: "var(--bg-accent)",
                        }}
                      >
                        {STAGE_LABELS[c.stage] || c.stage} ({c.currentTrack})
                      </span>
                    </div>

                    <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: "4px" }}>
                      志望度: {c.interestScore}/5 | マッチ度: {c.fitScore}/5 |{" "}
                      {c.industry || "業界未設定"}
                    </div>

                    {nextAction && (
                      <div
                        style={{
                          fontSize: "0.82rem",
                          color: "var(--accent-strong)",
                          marginTop: "6px",
                          fontWeight: 500,
                        }}
                      >
                        次: {nextAction}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
