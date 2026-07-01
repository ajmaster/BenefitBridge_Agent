import type { ReactNode } from "react";
import { BenefitBridgeProvider } from "@/components/workspace/BenefitBridgeProvider";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";

// Mounting `BenefitBridgeProvider` here (once, at the shared workspace layout level) is
// what makes the controller state - and therefore the chat conversation - survive
// navigation between `/app/*` routes: Next.js keeps this layout mounted across route
// changes within the `(workspace)` group, so `WorkspaceShell`'s single `ConversationPanel`
// instance never remounts when `children` swaps between section pages.
export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <BenefitBridgeProvider>
      <WorkspaceShell>{children}</WorkspaceShell>
    </BenefitBridgeProvider>
  );
}
