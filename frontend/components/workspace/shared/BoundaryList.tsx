import AtlasIcon from "@/components/workspace/icons/AtlasIcon";

// Ported from `BoundaryList` in `frontend/components/BenefitBridgeDashboard.tsx`
// (source lines 1097-1114; `.boundaryList`/`.boundaryListCompact` styling from
// `frontend/components/conversation-atlas/ConversationAtlas.module.css`). Prop-based in the
// source (received `copy`/`compact` from callers throughout the monolith, e.g. the "chat"
// section copy column and the packet actions aside) - kept prop-based here.

export function BoundaryList({
  copy,
  compact = false,
}: {
  copy: string[];
  compact?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <AtlasIcon name="shield" className="mt-0.5 h-5 w-5 shrink-0 text-ink-soft" />
      <ul className={compact ? "grid gap-1.5 text-xs text-muted" : "grid gap-1.5 text-sm text-muted"}>
        {copy.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
