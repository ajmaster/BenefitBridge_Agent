"use client";

import { createContext, useContext } from "react";
import type { useBenefitBridgeController } from "@/components/conversation-atlas/useBenefitBridgeController";

type BenefitBridgeContextValue = ReturnType<typeof useBenefitBridgeController>;

export const BenefitBridgeContext = createContext<BenefitBridgeContextValue | null>(null);

export function useBenefitBridgeContext(): BenefitBridgeContextValue {
  const value = useContext(BenefitBridgeContext);
  if (!value) {
    throw new Error("useBenefitBridgeContext must be used within BenefitBridgeProvider");
  }
  return value;
}
