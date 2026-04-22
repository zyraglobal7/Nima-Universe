import { useState, useCallback, useEffect } from "react";
import { View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PhotoUploadStep } from "./steps/PhotoUploadStep";
import { StyleChatStep } from "./steps/StyleChatStep";
import { LoadingStep } from "./steps/LoadingStep";
import { SuccessStep } from "./steps/SuccessStep";
import { OnboardingFormData, TOTAL_STEPS } from "./types";

// Two-dot progress indicator — visible only on steps 0 and 1
function ProgressDots({ step }: { step: number }) {
  return (
    <View className="flex-row gap-2 items-center justify-center py-3">
      {[0, 1].map((i) => (
        <View
          key={i}
          style={{
            width: i === step ? 16 : 8,
            height: 8,
            borderRadius: 4,
          }}
          className={i === step ? "bg-primary" : "bg-border"}
        />
      ))}
    </View>
  );
}

function generateOnboardingToken(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `onb_${result}`;
}

async function getOrCreateOnboardingToken(): Promise<string> {
  const stored = await AsyncStorage.getItem("nima-onboarding-token");
  if (stored) return stored;
  const newToken = generateOnboardingToken();
  await AsyncStorage.setItem("nima-onboarding-token", newToken);
  return newToken;
}

const initialFormData: OnboardingFormData = {
  gender: "",
  stylePreferences: [],
  occasions: [],
  budgetRange: "mid",
  uploadedImages: [],
  onboardingToken: "",
};

interface OnboardingWizardProps {
  onComplete: () => void;
  /** @deprecated No back button in new flow — kept for API compat */
  onBack?: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<OnboardingFormData>(initialFormData);

  useEffect(() => {
    getOrCreateOnboardingToken().then((token) => {
      setFormData((prev) => ({ ...prev, onboardingToken: token }));
    });
  }, []);

  const updateFormData = useCallback((data: Partial<OnboardingFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onComplete();
    }
  }, [currentStep, onComplete]);

  const showDots = currentStep < 2;

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <PhotoUploadStep
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
          />
        );
      case 1:
        return (
          <StyleChatStep
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
          />
        );
      case 2:
        return (
          <LoadingStep
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
          />
        );
      case 3:
        return (
          <SuccessStep
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View className="flex-1 bg-background">
      {showDots && <ProgressDots step={currentStep} />}
      <View className="flex-1">{renderStep()}</View>
    </View>
  );
}
