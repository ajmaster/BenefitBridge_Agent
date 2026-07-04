"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { WorkspaceSidebarNav } from "./WorkspaceSidebarNav";
import { ConversationPanel } from "./ConversationPanel";

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const normalizedPath = pathname.replace(/\/$/, "");
  const isChatRoute = normalizedPath === "/app/chat";

  return (
    <div
      className={cn(
        "grid min-h-dvh grid-cols-1 lg:h-dvh lg:overflow-hidden",
        isChatRoute ? "lg:grid-cols-[240px_minmax(0,1fr)]" : "lg:grid-cols-[240px_1fr_380px]",
      )}
    >
      <aside className="order-1 border-b border-line bg-surface lg:order-none lg:h-dvh lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <WorkspaceSidebarNav />
      </aside>

      <main
        className={cn(
          "order-2 min-w-0 lg:order-none lg:h-dvh",
          isChatRoute ? "overflow-hidden p-0" : "overflow-y-auto p-6",
        )}
      >
        {children}
      </main>

      {!isChatRoute && (
        <aside className="order-3 min-h-0 border-t border-line bg-surface lg:order-none lg:h-dvh lg:overflow-hidden lg:border-t-0 lg:border-l">
          <ConversationPanel variant="rail" />
        </aside>
      )}
    </div>
  );
}
