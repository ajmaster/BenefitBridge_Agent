// Ported from `frontend/components/BenefitBridgeDashboard.tsx` (BrandMark, source lines
// 1163-1171). Pure relocation - markup and behavior are unchanged. The accompanying
// `BrandMark.module.css` is a verbatim copy of the `.brandMark` rules from
// `conversation-atlas/ConversationAtlas.module.css` so this file does not depend on the
// conversation-atlas module that ships with the monolith BenefitBridgeDashboard.tsx, which
// is unaffected by this change and keeps its own inline copy.
import styles from "./BrandMark.module.css";

export default function BrandMark() {
  return (
    <span className={styles.brandMark} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}
