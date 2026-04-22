import { View, Text, Pressable, ScrollView } from "react-native";
import { StepProps, COUNTRIES, BUDGET_OPTIONS, BudgetRange } from "../types";
import {
  trackStepCompleted,
  trackBackClicked,
  ONBOARDING_STEPS,
} from "@/lib/analytics";

export function LocationBudgetStep({
  formData,
  updateFormData,
  onNext,
  onBack,
}: StepProps) {
  const handleCountryChange = (countryCode: string) => {
    const country = COUNTRIES.find((c) => c.code === countryCode);
    if (country) {
      updateFormData({
        country: country.name,
        currency: country.currency,
      });
    }
  };

  const isComplete = formData.country !== "" && formData.budgetRange !== "mid";

  return (
    <View className="flex-1">
      {/* Header */}
      <View className="px-4 py-6">
        <View className="max-w-md w-full mx-auto">
          <View className="flex-row items-center gap-4 mb-6">
            <Pressable
              onPress={() => {
                trackBackClicked(ONBOARDING_STEPS.LOCATION_BUDGET);
                onBack?.();
              }}
              className="p-2 -ml-2 rounded-full"
            >
              <Text className="text-2xl text-muted-foreground">←</Text>
            </Pressable>
            <View className="flex-1">
              <Text className="text-2xl font-serif font-semibold text-foreground">
                Where & Budget
              </Text>
              <Text className="text-sm text-muted-foreground mt-1">
                So I can show you what's available near you
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Form */}
      <ScrollView
        className="flex-1 px-4 pb-6"
        contentContainerStyle={{ gap: 32, paddingBottom: 24 }}
      >
        {/* Nima Chat Bubble */}
        <View className="bg-surface/80 border border-border/50 rounded-2xl p-4">
          <View className="flex-row items-start gap-3">
            <View className="w-8 h-8 rounded-full bg-primary items-center justify-center">
              <Text className="text-xs text-primary-foreground">📍</Text>
            </View>
            <Text className="flex-1 text-sm text-foreground leading-5">
              This helps me find stores and brands available in your area, and
              show prices in your local currency!
            </Text>
          </View>
        </View>

        {/* Country Selection */}
        <View className="gap-3">
          <Text className="text-sm font-medium text-foreground">
            Where are you based?
          </Text>
          <View className="gap-2">
            {COUNTRIES.map((country) => {
              const isSelected = formData.country === country.name;
              return (
                <Pressable
                  key={country.code}
                  onPress={() => handleCountryChange(country.code)}
                  className={`flex-row items-center p-4 rounded-xl border-2 ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-surface"
                  }`}
                >
                  <Text className="text-2xl mr-3">{country.emoji}</Text>
                  <View className="flex-1">
                    <Text className="font-medium text-foreground">
                      {country.name}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      Currency: {country.currency}
                    </Text>
                  </View>
                  {isSelected && (
                    <View className="w-6 h-6 rounded-full bg-primary items-center justify-center">
                      <Text className="text-xs text-primary-foreground">✓</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Budget Range */}
        <View className="gap-3">
          <Text className="text-sm font-medium text-foreground">
            What's your typical budget per item?
          </Text>
          <View className="gap-3">
            {BUDGET_OPTIONS.map((option) => {
              const isSelected = formData.budgetRange === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() =>
                    updateFormData({ budgetRange: option.value as BudgetRange })
                  }
                  className={`p-4 rounded-xl border-2 ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-surface"
                  }`}
                >
                  <View className="flex-row items-center gap-3">
                    <Text className="text-2xl">{option.icon}</Text>
                    <View className="flex-1">
                      <Text className="font-medium text-foreground">
                        {option.label}
                      </Text>
                      <Text className="text-xs text-muted-foreground mt-0.5">
                        {option.description}
                      </Text>
                      <Text className="text-xs text-primary font-medium mt-1">
                        {option.range}
                      </Text>
                    </View>
                    {isSelected && (
                      <View className="w-6 h-6 rounded-full bg-primary items-center justify-center">
                        <Text className="text-xs text-primary-foreground">
                          ✓
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Bottom spacer */}
        <View className="h-4" />
      </ScrollView>

      {/* Footer CTA */}
      <View className="bg-background border-t border-border/50 p-4">
        <Pressable
          onPress={() => {
            trackStepCompleted(ONBOARDING_STEPS.LOCATION_BUDGET, {
              country: formData.country,
              currency: formData.currency,
              budget_range: formData.budgetRange,
            });
            onNext();
          }}
          className={`w-full py-4 rounded-full items-center ${
            formData.country ? "bg-primary" : "bg-primary/50"
          }`}
          disabled={!formData.country}
          style={({ pressed }) => ({
            opacity: formData.country && pressed ? 0.85 : 1,
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
