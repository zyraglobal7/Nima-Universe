import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useCallback } from "react";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * Hook to manage user credit state and purchasing flow
 *
 * - Exposes real-time credit balances (free remaining, purchased, total)
 * - Provides the credit packages for purchase
 * - Handles initiating a credit purchase via M-Pesa STK Push
 * - Tracks the purchase status after initiation
 */
export function useCredits() {
  // Real-time credit balance
  const credits = useQuery(api.credits.queries.getUserCredits);

  // Available packages
  const packages = useQuery(api.credits.queries.getCreditPackages);

  // Purchase history
  const history = useQuery(api.credits.queries.getPurchaseHistory);

  // Purchase mutation
  const initiatePurchase = useMutation(api.credits.mutations.initiatePurchase);

  // Local state for active purchase
  const [activePurchaseId, setActivePurchaseId] = useState<Id<"credit_purchases"> | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  // Poll purchase status when we have an active purchase
  const purchaseStatus = useQuery(
    api.credits.queries.getPurchaseStatus,
    activePurchaseId ? { purchaseId: activePurchaseId } : "skip",
  );

  /**
   * Initiate a credit purchase via M-Pesa STK Push
   */
  const buyCredits = useCallback(
    async (packageId: string, phoneNumber: string) => {
      setIsPurchasing(true);
      setPurchaseError(null);

      try {
        const result = await initiatePurchase({ packageId, phoneNumber });
        if (result.success && result.purchaseId) {
          setActivePurchaseId(result.purchaseId);
          return { success: true as const };
        } else {
          setPurchaseError(result.error || "Failed to initiate purchase");
          return { success: false as const, error: result.error };
        }
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "Something went wrong";
        setPurchaseError(msg);
        return { success: false as const, error: msg };
      } finally {
        setIsPurchasing(false);
      }
    },
    [initiatePurchase],
  );

  /**
   * Reset purchase state (e.g., after closing modal)
   */
  const resetPurchase = useCallback(() => {
    setActivePurchaseId(null);
    setIsPurchasing(false);
    setPurchaseError(null);
  }, []);

  const hasCredits = (credits?.total ?? 0) > 0;
  const isLow = (credits?.total ?? 0) <= 2;

  return {
    // Balance
    freeRemaining: credits?.freeRemaining ?? 0,
    purchased: credits?.purchased ?? 0,
    total: credits?.total ?? 0,
    freePerWeek: credits?.freePerWeek ?? 5,
    hasCredits,
    isLow,
    isLoading: credits === undefined,

    // Packages
    packages: packages ?? [],

    // Purchase flow
    buyCredits,
    resetPurchase,
    isPurchasing,
    purchaseError,
    activePurchaseId,
    purchaseStatus: purchaseStatus?.status ?? null,
    purchaseFailureReason: purchaseStatus?.failureReason ?? null,

    // History
    history: history ?? [],
  };
}

