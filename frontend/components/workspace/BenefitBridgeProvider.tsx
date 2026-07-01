"use client";

import type { ReactNode } from "react";
import { useBenefitBridgeController } from "@/components/conversation-atlas/useBenefitBridgeController";
import { BenefitBridgeContext } from "./BenefitBridgeContext";

export function BenefitBridgeProvider({ children }: { children: ReactNode }) {
  const controller = useBenefitBridgeController();
  return (
    <BenefitBridgeContext.Provider value={controller}>{children}</BenefitBridgeContext.Provider>
  );
}
