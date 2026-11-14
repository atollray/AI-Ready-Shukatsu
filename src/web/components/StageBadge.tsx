import type { CompanyStage } from "@/core/client";
import { STAGE_MAP } from "../constants/meta";

interface StageBadgeProps {
  stage: CompanyStage;
  track?: string;
}

export function StageBadge({ stage, track }: StageBadgeProps) {
  const meta = STAGE_MAP[stage] || STAGE_MAP.researching;
  return (
    <span className={`gh-label ${meta.labelClass}`}>
      <span className="gh-dot" style={{ backgroundColor: meta.dotColor }} aria-hidden="true" />
      <span>{meta.label}</span>
      {track ? <span style={{ opacity: 0.75 }}>({track})</span> : null}
    </span>
  );
}
