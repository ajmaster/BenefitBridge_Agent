import type { ReactNode } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { BenefitBridgeProvider } from "@/components/workspace/BenefitBridgeProvider";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";

// Mounting `BenefitBridgeProvider` here (once, at the shared workspace layout level) is
// what makes the controller state - and therefore the chat conversation - survive
// navigation between `/app/*` routes: Next.js keeps this layout mounted across route
// changes within the `(workspace)` group, so `WorkspaceShell`'s single `ConversationPanel`
// instance never remounts when `children` swaps between section pages.
//
// `AuthGate` wraps the whole workspace (not just its children) so the sign-in
// screen replaces the entire `/app/*` surface, including the sidebar/chat
// shell, until the demo gate is satisfied.
export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <BenefitBridgeProvider>
        <WorkspaceShell>{children}</WorkspaceShell>
      </BenefitBridgeProvider>
    </AuthGate>
  );
}
