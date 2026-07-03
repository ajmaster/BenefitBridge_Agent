"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { cn } from "@/lib/utils";
import { useAuthState } from "@/components/auth/AuthState";
import { authEnabled, getFirebaseAuth } from "@/lib/firebase";
import AtlasIcon from "@/components/workspace/icons/AtlasIcon";
import { useBenefitBridgeContext } from "./BenefitBridgeContext";

const sections = [
  { href: "/app/chat/", icon: "chat", label: { en: "Chat", es: "Chat" } },
  { href: "/app/prepare/", icon: "prepare", label: { en: "Prepare", es: "Preparar" } },
  { href: "/app/sources/", icon: "source", label: { en: "Sources", es: "Fuentes" } },
  { href: "/app/resources/", icon: "map", label: { en: "Resources", es: "Recursos" } },
  { href: "/app/packet/", icon: "document", label: { en: "Packet", es: "Paquete" } },
  { href: "/app/california/", icon: "map", label: { en: "California", es: "California" } },
] as const;

export function WorkspaceSidebarNav() {
  const pathname = usePathname();
  const { snapshot } = useBenefitBridgeContext();
  const { user } = useAuthState();
  const locale = snapshot.language;

  return (
    <nav className="flex flex-col gap-1 p-4" aria-label="Workspace sections">
      {sections.map((section) => {
        const active = pathname === section.href || pathname === section.href.replace(/\/$/, "");
        return (
          <Link
            key={section.href}
            href={section.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-sky text-blue-dark" : "text-ink-soft hover:bg-sky/50",
            )}
          >
            <AtlasIcon name={section.icon} className="h-5 w-5" />
            <span>{section.label[locale]}</span>
          </Link>
        );
      })}

      {authEnabled && user && (
        <button
          type="button"
          onClick={() => signOut(getFirebaseAuth())}
          className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-soft transition-colors hover:bg-sky/50"
        >
          Sign out ({user.email ?? "account"})
        </button>
      )}
    </nav>
  );
}
