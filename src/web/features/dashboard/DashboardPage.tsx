import {
  buildUpcomingItems,
  calculateStageCounts,
  deriveNextAction,
  getTopScoredCompanies,
} from "@/core/client";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CheckSquare,
  FileSignature,
  GraduationCap,
  MapPin,
  Star,
  Target,
  UserCog,
} from "lucide-react";
import { Link } from "react-router";
import { useWorkspace } from "../../api/use-workspace";
import { StageBadge } from "../../components/StageBadge";
import { STAGE_LIST, formatRelativeDate } from "../../constants/meta";

export function DashboardPage() {
  const { data, isLoading } = useWorkspace();

  if (isLoading || !data) {
    return (
      <div className="gh-empty">
        <span>データを読み込み中...</span>
      </div>
    );
  }

  const { profile, companies, tasks } = data;
  const stageCounts = calculateStageCounts(companies);
  const totalCompanies = companies.length;
  const upcomingItems = buildUpcomingItems(companies, tasks, { includeSample: true, limit: 8 });
  const topCompanies = getTopScoredCompanies(companies, 5, true);

  return (
    <div className="gh-stack">
      {/* Profile & Weekly Focus */}
      <section className="card gh-dashboard-hero">
        <div className="gh-dashboard-hero-top">
          <div>
            <h2>
              {profile.name ? `${profile.name} さんの就活ダッシュボード` : "就活ダッシュボード"}
            </h2>
            <div className="gh-row-gap gh-muted" style={{ fontSize: "13px" }}>
              {profile.school ? (
                <span className="gh-row-gap" style={{ gap: "4px" }}>
                  <GraduationCap size={14} />
                  <span>
                    {profile.school}
                    {profile.graduationYear ? ` (${profile.graduationYear})` : ""}
                  </span>
                </span>
              ) : null}
              {profile.desiredRoles.length > 0 ? (
                <span>
                  {profile.school ? "· " : ""}志望職種: {profile.desiredRoles.join(", ")}
                </span>
              ) : null}
            </div>
          </div>

          <Link to="/settings" className="btn btn-sm">
            <UserCog size={14} />
            <span>プロフィールを編集</span>
          </Link>
        </div>

        {profile.weeklyFocus ? (
          <div className="gh-focus-callout">
            <div className="gh-focus-callout-title">
              <Target size={14} />
              <span>今週のフォーカス</span>
            </div>
            <div style={{ fontSize: "13px", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {profile.weeklyFocus}
            </div>
          </div>
        ) : null}
      </section>

      {/* Pipeline Summary */}
      <section className="card">
        <div className="gh-box-header">
          <h3 className="gh-box-title">
            <Building2 size={15} className="gh-muted" />
            <span>選考パイプライン</span>
          </h3>
          <span className="gh-muted" style={{ fontSize: "12px" }}>
            合計 <strong className="mono">{totalCompanies}</strong> 社
          </span>
        </div>

        <div className="gh-box-body" style={{ display: "grid", gap: "12px" }}>
          <div className="gh-pipeline-bar" aria-label="ステージ比率">
            {totalCompanies > 0 &&
              STAGE_LIST.map((stage) => {
                const count = stageCounts[stage.value] || 0;
                if (count === 0) return null;
                const pct = (count / totalCompanies) * 100;
                return (
                  <div
                    key={stage.value}
                    title={`${stage.label}: ${count}社`}
                    style={{
                      width: `${pct}%`,
                      backgroundColor: stage.dotColor,
                      minWidth: "6px",
                    }}
                  />
                );
              })}
          </div>

          <div className="gh-stats-grid">
            {STAGE_LIST.map((stage) => {
              const count = stageCounts[stage.value] || 0;
              return (
                <Link
                  key={stage.value}
                  to={`/companies?stage=${stage.value}`}
                  className="card gh-stat-tile"
                  style={{
                    borderTop: count > 0 ? `3px solid ${stage.dotColor}` : undefined,
                  }}
                >
                  <div className="gh-row-gap" style={{ gap: "6px" }}>
                    <span
                      className="gh-dot"
                      style={{ backgroundColor: stage.dotColor }}
                      aria-hidden="true"
                    />
                    <span className="gh-muted" style={{ fontSize: "12px", fontWeight: 500 }}>
                      {stage.label}
                    </span>
                  </div>
                  <div className="gh-row-gap" style={{ alignItems: "baseline", gap: "4px" }}>
                    <span className="gh-stat-count">{count}</span>
                    <span className="gh-muted" style={{ fontSize: "12px" }}>
                      社
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 2-Column: Upcoming & Top Companies */}
      <div className="gh-2col-equal">
        {/* Upcoming List */}
        <section className="card">
          <div className="gh-box-header">
            <h3 className="gh-box-title">
              <CalendarClock size={15} className="gh-muted" />
              <span>直近の予定・締切</span>
              <span className="gh-counter">{upcomingItems.length}</span>
            </h3>
            <Link to="/tasks" className="btn btn-sm btn-invisible">
              <span>タスク管理</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {upcomingItems.length === 0 ? (
            <div className="gh-empty">
              <CalendarClock size={22} className="gh-subtle" />
              <span>直近の予定はありません。</span>
            </div>
          ) : (
            <div>
              {upcomingItems.map((item) => {
                const rel = formatRelativeDate(item.date);
                const dest = item.companyId ? `/companies?selected=${item.companyId}` : "/tasks";
                const SourceIcon =
                  item.source === "task"
                    ? CheckSquare
                    : item.source === "es"
                      ? FileSignature
                      : CalendarClock;

                return (
                  <Link
                    key={`${item.source}-${item.id}`}
                    to={dest}
                    className="gh-box-row gh-box-row-interactive"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div className="gh-row-gap" style={{ gap: "6px" }}>
                        <SourceIcon size={14} className="gh-muted" style={{ flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, fontSize: "13px" }}>{item.title}</span>
                      </div>
                      <div
                        className="gh-row-gap gh-muted"
                        style={{ fontSize: "12px", marginTop: "3px", paddingLeft: "20px" }}
                      >
                        <span>{item.companyName}</span>
                        {item.location ? (
                          <span className="gh-row-gap" style={{ gap: "3px" }}>
                            <MapPin size={11} />
                            <span>{item.location}</span>
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: "2px",
                        flexShrink: 0,
                      }}
                    >
                      {rel.text ? (
                        <span
                          className={`gh-label ${rel.urgent ? "gh-label-danger" : "gh-label-accent"}`}
                          style={{ fontSize: "11px" }}
                        >
                          {rel.text}
                        </span>
                      ) : null}
                      <span className="mono gh-muted" style={{ fontSize: "11px" }}>
                        {item.date}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Top Companies */}
        <section className="card">
          <div className="gh-box-header">
            <h3 className="gh-box-title">
              <Star size={15} className="gh-muted" />
              <span>注目・高志望度企業</span>
            </h3>
            <Link to="/companies" className="btn btn-sm btn-invisible">
              <span>全企業一覧</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {topCompanies.length === 0 ? (
            <div className="gh-empty">
              <Building2 size={22} className="gh-subtle" />
              <span>企業が登録されていません。</span>
            </div>
          ) : (
            <div>
              {topCompanies.map((c) => {
                const nextAction = deriveNextAction(c.id, tasks);
                return (
                  <Link
                    key={c.id}
                    to={`/companies?selected=${c.id}`}
                    className="gh-box-row gh-box-row-interactive"
                    style={{ display: "block" }}
                  >
                    <div className="gh-row-between">
                      <span
                        style={{ fontWeight: 600, fontSize: "14px", color: "var(--accent-fg)" }}
                      >
                        {c.name}
                      </span>
                      <StageBadge stage={c.stage} track={c.currentTrack} />
                    </div>

                    <div className="gh-muted" style={{ fontSize: "12px", marginTop: "4px" }}>
                      志望度 <strong>{c.interestScore}/5</strong> · マッチ度{" "}
                      <strong>{c.fitScore}/5</strong> · {c.industry || "業界未設定"}
                    </div>

                    {nextAction ? (
                      <div
                        className="gh-row-gap"
                        style={{
                          fontSize: "12px",
                          color: "var(--accent-fg)",
                          marginTop: "6px",
                          fontWeight: 500,
                          gap: "5px",
                        }}
                      >
                        <ArrowRight size={12} />
                        <span>次: {nextAction}</span>
                      </div>
                    ) : null}
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
