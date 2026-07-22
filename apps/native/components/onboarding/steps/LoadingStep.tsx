import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { StepProps } from "../types";

const COOKING_MESSAGES = [
  "Sautéing the vibes...",
  "Mixing in your style DNA...",
  "Plating the outfits...",
  "Sprinkling some Nima magic...",
  "Garnishing with good taste...",
  "Almost at the table...",
  "Pouring the finishing touches...",
  "Your looks are almost ready...",
];

// If nothing has completed within this window, the background workflow has
// likely failed outright (e.g. an AI provider outage/quota error) rather
// than just running slow — stop spinning forever and let the user retry.
const TIMEOUT_MS = 90_000;

export function LoadingStep({ formData, onNext }: StepProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [workflowStarted, setWorkflowStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  // Bumped on every setup/retry attempt so the timeout effect below always
  // restarts its clock, even when workflowStarted stays `true` across a retry.
  const [attempt, setAttempt] = useState(0);
  const hasRunSetup = useRef(false);

  const claimImages = useMutation(api.userImages.mutations.claimOnboardingImages);
  const startWorkflow = useMutation(api.workflows.index.startOnboardingWorkflow);

  // Poll workflow status
  const workflowStatus = useQuery(api.workflows.index.getOnboardingWorkflowStatus);

  // Cycle through cooking messages every 3s
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % COOKING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const runSetup = useCallback(async () => {
    try {
      // 1. Claim onboarding images
      const token = await AsyncStorage.getItem("nima-onboarding-token");
      if (token) {
        await claimImages({ onboardingToken: token });
      }

      // 2. Start the look-generation workflow
      const result = await startWorkflow({});
      if (!result.success && result.error !== "Looks already exist or are being generated") {
        console.error("[LoadingStep] startWorkflow failed:", result.error);
        // Not fatal — user might have looks already (edge case)
      }

      setWorkflowStarted(true);
    } catch (err) {
      console.error("[LoadingStep] setup error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      // Even on error, mark as started so we can poll
      setWorkflowStarted(true);
    }
  }, [claimImages, startWorkflow]);

  // On mount: claim images + start workflow (runs once)
  useEffect(() => {
    if (hasRunSetup.current) return;
    hasRunSetup.current = true;
    runSetup();
  }, [runSetup]);

  // Advance when workflow completes
  useEffect(() => {
    if (!workflowStarted) return;
    if (!workflowStatus) return;
    if (workflowStatus.isComplete && workflowStatus.completedCount > 0) {
      onNext();
    }
  }, [workflowStarted, workflowStatus, onNext]);

  // Give up spinning after TIMEOUT_MS with nothing to show for it.
  useEffect(() => {
    if (!workflowStarted) return;
    setTimedOut(false);
    const timer = setTimeout(() => setTimedOut(true), TIMEOUT_MS);
    return () => clearTimeout(timer);
    // `attempt` restarts the clock on every retry, even though
    // `workflowStarted` itself stays `true` across attempts.
  }, [workflowStarted, attempt]);

  // Stop showing the timeout state the moment real progress shows up.
  useEffect(() => {
    if (workflowStatus && workflowStatus.totalCount > 0) {
      setTimedOut(false);
    }
  }, [workflowStatus]);

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    setError(null);
    setAttempt((prev) => prev + 1);
    try {
      await runSetup();
    } finally {
      setIsRetrying(false);
    }
  }, [runSetup]);

  const showTimeoutState =
    timedOut && !(workflowStatus && workflowStatus.totalCount > 0);

  if (showTimeoutState) {
    return (
      <View className="flex-1 items-center justify-center px-8 gap-6">
        <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center">
          <Text className="text-3xl">🕐</Text>
        </View>
        <View className="items-center gap-2">
          <Text className="text-2xl font-serif font-semibold text-foreground text-center">
            This is taking longer than usual
          </Text>
          <Text className="text-sm text-muted-foreground text-center">
            Nima's styling engine is a bit backed up right now. You can try again, or check back in a few minutes.
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleRetry}
          disabled={isRetrying}
          className="w-full max-w-xs bg-primary py-4 rounded-full items-center"
        >
          {isRetrying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-base">Try Again</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center px-8 gap-8">
      {/* Decorative background circles */}
      <View className="absolute top-1/4 left-1/4 w-48 h-48 bg-primary/5 rounded-full" />
      <View className="absolute bottom-1/3 right-1/4 w-32 h-32 bg-secondary/5 rounded-full" />

      {/* Spinner */}
      <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center">
        <ActivityIndicator size="large" color="#5C2A33" />
      </View>

      {/* Headline */}
      <View className="items-center gap-2">
        <Text className="text-2xl font-serif font-semibold text-foreground text-center">
          Curating your looks
        </Text>
        <Text className="text-sm text-muted-foreground text-center">
          This takes about a minute — Nima is working hard
        </Text>
      </View>

      {/* Cooking message */}
      <View className="bg-surface border border-border/50 rounded-2xl px-6 py-4 w-full">
        <Text className="text-foreground text-sm text-center font-medium">
          {error ? "Almost there..." : COOKING_MESSAGES[messageIndex]}
        </Text>
      </View>

      {/* Progress dots */}
      {workflowStatus && workflowStatus.totalCount > 0 && (
        <View className="flex-row gap-2 items-center">
          {Array.from({ length: workflowStatus.totalCount }).map((_, i) => (
            <View
              key={i}
              className={`w-2 h-2 rounded-full ${
                i < workflowStatus.completedCount
                  ? "bg-green-500"
                  : i < workflowStatus.completedCount + workflowStatus.processingCount
                  ? "bg-primary"
                  : "bg-border"
              }`}
            />
          ))}
        </View>
      )}
    </View>
  );
}
