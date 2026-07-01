import AtlasIcon from "@/components/workspace/icons/AtlasIcon";
import type { copyFor } from "@/components/conversation-atlas/i18n";
import type { ReadinessResult } from "@/lib/types";

// Ported from `ReadinessPanel` in `frontend/components/BenefitBridgeDashboard.tsx`
// (source lines 989-1032; `.readinessPanel`/`.cardHeader`/`.readinessGrid`/`.metricList`/
// `.metricRow` styling from
// `frontend/components/conversation-atlas/ConversationAtlas.module.css`). Prop-based in the
// source (received `readiness`/`copy` from `PreparePanel`) - kept prop-based here.

type AtlasCopy = ReturnType<typeof copyFor>;

export function ReadinessPanel({
  readiness,
  copy,
}: {
  readiness: ReadinessResult | null;
  copy: AtlasCopy;
}) {
  const metrics = readiness?.evals.latest_grade_summary?.metrics ?? [];

  return (
    <aside
      className="grid gap-4 rounded-lg border border-line bg-surface p-4 shadow-atlas-soft"
      aria-label="Readiness checks"
    >
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <AtlasIcon name="check" className="h-5 w-5 text-ink-soft" />
          <h3 className="text-base font-semibold text-ink">{copy.readiness}</h3>
        </div>
        <span className="text-xs font-extrabold text-green-dark">
          {readiness ? copy.loaded : copy.fallback}
        </span>
      </div>
      <dl className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-line p-2.5">
          <dt className="text-xs font-extrabold text-muted">{copy.sourcesMetric}</dt>
          <dd className="mt-1 font-extrabold text-ink">
            {String(readiness?.source_pack.approved_sources ?? "demo")}
          </dd>
        </div>
        <div className="rounded-lg border border-line p-2.5">
          <dt className="text-xs font-extrabold text-muted">{copy.datasetsMetric}</dt>
          <dd className="mt-1 font-extrabold text-ink">
            {Object.keys(readiness?.evals.datasets ?? {}).length}
          </dd>
        </div>
        <div className="rounded-lg border border-line p-2.5">
          <dt className="text-xs font-extrabold text-muted">{copy.outOfRange}</dt>
          <dd className="mt-1 font-extrabold text-ink">
            {readiness?.evals.latest_grade_summary?.out_of_range_scores ?? 0}
          </dd>
        </div>
      </dl>
      <div className="grid gap-2">
        {(metrics.length > 0 ? metrics : [{ metric_name: "local safety gates", mean_score: null }])
          .slice(0, 4)
          .map((metric) => (
            <div
              key={metric.metric_name}
              className="flex items-center justify-between gap-2.5 rounded-lg border border-line px-2.5 py-2 text-muted"
            >
              <span>{metric.metric_name.replaceAll("_", " ")}</span>
              <strong className="text-green-dark">{metric.mean_score ?? "n/a"}</strong>
            </div>
          ))}
      </div>
    </aside>
  );
}
