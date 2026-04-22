import { View, Text, Pressable, TextInput, ScrollView } from "react-native";
import { StepProps, GENDER_OPTIONS, Gender } from "../types";
import {
  trackStepCompleted,
  trackBackClicked,
  trackGenderSelected,
  ONBOARDING_STEPS,
} from "@/lib/analytics";

export function GenderAgeStep({
  formData,
  updateFormData,
  onNext,
  onBack,
}: StepProps) {
  const isComplete = formData.gender !== "";

  return (
    <View className="flex-1">
      {/* Header */}
      <View className="px-4 py-6">
        <View className="max-w-md w-full mx-auto">
          <View className="flex-row items-center gap-4 mb-6">
            <Pressable
              onPress={() => {
                trackBackClicked(ONBOARDING_STEPS.GENDER_AGE);
                onBack?.();
              }}
              className="p-2 -ml-2 rounded-full"
            >
              <Text className="text-2xl text-muted-foreground">←</Text>
            </Pressable>
            <View className="flex-1">
              <Text className="text-2xl font-serif font-semibold text-foreground">
                Tell me about yourself
              </Text>
              <Text className="text-sm text-muted-foreground mt-1">
                So I can personalize your experience
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Form */}
      <ScrollView
        className="flex-1 px-4 pb-6"
        contentContainerClassName="max-w-md mx-auto gap-8"
      >
        {/* Nima Chat Bubble */}
        <View className="bg-surface/80 border border-border/50 rounded-2xl p-4">
          <View className="flex-row items-start gap-3">
            <View className="w-8 h-8 rounded-full bg-primary items-center justify-center">
              <Text className="text-xs text-primary-foreground">💬</Text>
            </View>
            <Text className="flex-1 text-sm text-foreground leading-5">
              This helps me recommend styles that suit you best. Fashion is for
              everyone, and I want to show you looks you'll love!
            </Text>
          </View>
        </View>

        {/* Gender Selection */}
        <View className="gap-3">
          <Text className="text-sm font-medium text-foreground">
            How do you identify?
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {GENDER_OPTIONS.map((option) => {
              const isSelected = formData.gender === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    trackGenderSelected(option.value);
                    updateFormData({ gender: option.value as Gender });
                  }}
                  className={`flex-1 min-w-[45%] p-4 rounded-xl border-2 ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-surface"
                  }`}
                >
                  <View className="flex-row items-center gap-3">
                    <Text className="text-2xl">{option.icon}</Text>
                    <Text className="font-medium text-foreground">
                      {option.label}
                    </Text>
                  </View>
                  {isSelected && (
                    <View className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary items-center justify-center">
                      <Text className="text-xs text-primary-foreground">✓</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Age Input */}
        <View className="gap-3">
          <View className="flex-row items-center gap-2">
            <Text className="text-lg">🎂</Text>
            <Text className="text-sm font-medium text-foreground">
              How old are you?
            </Text>
            <Text className="text-xs text-muted-foreground">(optional)</Text>
          </View>
          <View className="flex-row items-center bg-surface border border-border rounded-xl h-12 px-4">
            <TextInput
              placeholder="e.g., 25"
              value={formData.age}
              onChangeText={(text) =>
                updateFormData({ age: text.replace(/[^0-9]/g, "") })
              }
              keyboardType="number-pad"
              maxLength={3}
              className="flex-1 text-lg text-foreground"
              placeholderTextColor="#6B635B"
            />
            <Text className="text-sm text-muted-foreground">years</Text>
          </View>
          <Text className="text-xs text-muted-foreground">
            This helps me suggest age-appropriate trends
          </Text>
        </View>

        {/* Privacy Note */}
        <View className="bg-surface-alt rounded-xl p-4">
          <Text className="text-sm text-muted-foreground">
            🔒 Your information is private and only used to personalize your
            styling recommendations.
          </Text>
        </View>
      </ScrollView>

      {/* Footer CTA */}
      <View className="bg-background border-t border-border/50 p-4">
        <Pressable
          onPress={() => {
            trackStepCompleted(ONBOARDING_STEPS.GENDER_AGE, {
              gender: formData.gender,
              age: formData.age || undefined,
            });
            onNext();
          }}
          disabled={!isComplete}
          className={`w-full py-4 rounded-full items-center ${
            isComplete ? "bg-primary" : "bg-primary/50"
          }`}
          style={({ pressed }) => ({
            opacity: isComplete && pressed ? 0.85 : 1,
          })}
        >
          <Text className="text-primary-foreground text-base font-semibold tracking-wide">
            Continue
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
