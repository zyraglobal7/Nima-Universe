import { View } from "react-native";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  return (
    <View className="flex-row items-center justify-center gap-2 py-4">
      {Array.from({ length: totalSteps }, (_, i) => (
        <View
          key={i}
          className={`h-2 rounded-full ${
            i === currentStep
              ? "w-8 bg-primary"
              : i < currentStep
                ? "w-2 bg-primary/60"
                : "w-2 bg-border"
          }`}
        />
      ))}
    </View>
  );
}
