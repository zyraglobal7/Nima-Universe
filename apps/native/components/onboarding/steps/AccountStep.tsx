import { useState, useEffect } from "react";
import { View, Text, Pressable, ActivityIndicator, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { StepProps, OnboardingFormData } from "../types";
import {
  trackStepCompleted,
  trackBackClicked,
  trackSignupInitiated,
  trackCompleteProfileClicked,
  ONBOARDING_STEPS,
} from "@/lib/analytics";
import { launchWorkOSAuth } from "@/lib/auth";

const ONBOARDING_STORAGE_KEY = "nima-onboarding-data";

/**
 * Save onboarding data to AsyncStorage.
 * Persists data across the auth redirect.
 */
export async function saveOnboardingData(
  formData: OnboardingFormData,
): Promise<void> {
  const dataToStore = {
    gender: formData.gender,
    age: formData.age,
    stylePreferences: formData.stylePreferences,
    shirtSize: formData.shirtSize,
    waistSize: formData.waistSize,
    height: formData.height,
    heightUnit: formData.heightUnit,
    shoeSize: formData.shoeSize,
    shoeSizeUnit: formData.shoeSizeUnit,
    country: formData.country,
    currency: formData.currency,
    budgetRange: formData.budgetRange,
    email: formData.email,
    onboardingToken: formData.onboardingToken,
    uploadedImageIds: formData.uploadedImages.map((img) => img.imageId),
    savedAt: Date.now(),
  };
  await AsyncStorage.setItem(
    ONBOARDING_STORAGE_KEY,
    JSON.stringify(dataToStore),
  );
}

/** Get onboarding data from AsyncStorage */
export async function getOnboardingData(): Promise<Partial<OnboardingFormData> | null> {
  const stored = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/** Clear onboarding data from AsyncStorage */
export async function clearOnboardingData(): Promise<void> {
  await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
}

export function AccountStep({ formData, onNext, onBack }: StepProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already authenticated
  const currentUser = useQuery(api.users.queries.getCurrentUser);

  // Save form data whenever it changes
  useEffect(() => {
    saveOnboardingData(formData);
  }, [formData]);

  const handleCompleteProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      trackCompleteProfileClicked();
      trackStepCompleted(ONBOARDING_STEPS.ACCOUNT, {
        method: "complete_profile",
      });

      await saveOnboardingData(formData);
      // Wait briefly for async save
      await new Promise((resolve) => setTimeout(resolve, 500));

      onNext();
    } catch (err) {
      console.error("Error completing profile:", err);
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  const handleContinueToAuth = async () => {
    try {
      setIsLoading(true);
      setError(null);

      trackSignupInitiated("email");
      trackStepCompleted(ONBOARDING_STEPS.ACCOUNT, { method: "signup" });

      // Save the current form data
      await saveOnboardingData(formData);

      // Launch WorkOS auth
      const result = await launchWorkOSAuth("sign-up");
      if (result) {
        onNext();
      } else {
        setError("Sign-in was cancelled. Please try again.");
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Error during auth:", err);
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1">
      {/* Header */}
      <View className="px-4 py-6">
        <View className="max-w-md w-full mx-auto">
          <View className="flex-row items-center gap-4 mb-6">
            <Pressable
              onPress={() => {
                trackBackClicked(ONBOARDING_STEPS.ACCOUNT);
                onBack?.();
              }}
              className="p-2 -ml-2 rounded-full"
              disabled={isLoading}
            >
              <Text className="text-2xl text-muted-foreground">←</Text>
            </Pressable>
            <View className="flex-1">
              <Text className="text-2xl font-serif font-semibold text-foreground">
                Almost there!
              </Text>
              <Text className="text-sm text-muted-foreground mt-1">
                Create your account to save your style profile
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Form */}
      <View className="flex-1 px-4 pb-6">
        <View className="max-w-md w-full mx-auto gap-6">
          {/* Error */}
          {error && (
            <View className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <Text className="text-sm text-red-500">{error}</Text>
            </View>
          )}

          {/* Show Complete Profile for auth'd users, else Sign Up */}
          {currentUser ? (
            <Pressable
              onPress={handleCompleteProfile}
              disabled={isLoading}
              className={`w-full py-4 rounded-full items-center ${
                isLoading ? "bg-primary/70" : "bg-primary"
              }`}
              style={({ pressed }) => ({
                opacity: !isLoading && pressed ? 0.85 : 1,
              })}
            >
              {isLoading ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator size="small" color="#FAF8F5" />
                  <Text className="text-primary-foreground text-base font-semibold">
                    Saving your profile...
                  </Text>
                </View>
              ) : (
                <Text className="text-primary-foreground text-base font-semibold tracking-wide">
                  Complete Profile
                </Text>
              )}
            </Pressable>
          ) : (
            <>
              <Pressable
                onPress={handleContinueToAuth}
                disabled={isLoading}
                className={`w-full py-4 rounded-full items-center ${
                  isLoading ? "bg-primary/70" : "bg-primary"
                }`}
                style={({ pressed }) => ({
                  opacity: !isLoading && pressed ? 0.85 : 1,
                })}
              >
                {isLoading ? (
                  <View className="flex-row items-center gap-2">
                    <ActivityIndicator size="small" color="#FAF8F5" />
                    <Text className="text-primary-foreground text-base font-semibold">
                      Redirecting...
                    </Text>
                  </View>
                ) : (
                  <Text className="text-primary-foreground text-base font-semibold tracking-wide">
                    Continue to Sign In
                  </Text>
                )}
              </Pressable>

              {/* Terms */}
              <Text className="text-xs text-muted-foreground text-center">
                By continuing, you agree to our{" "}
                <Text
                  className="text-secondary underline"
                  onPress={() => Linking.openURL("https://www.shopnima.ai/termsAndConditions")}
                >
                  Terms of Service
                </Text>{" "}
                and{" "}
                <Text
                  className="text-secondary underline"
                  onPress={() => Linking.openURL("https://www.shopnima.ai/privacyPolicy")}
                >
                  Privacy Policy
                </Text>
              </Text>
            </>
          )}

          {/* Summary of collected data */}
          <View className="bg-surface rounded-2xl p-5 gap-3 mt-4">
            <Text className="text-sm font-medium text-foreground">
              Your profile so far:
            </Text>
            {formData.gender && (
              <Text className="text-xs text-muted-foreground">
                👤{" "}
                {formData.gender === "male"
                  ? "Man"
                  : formData.gender === "female"
                    ? "Woman"
                    : "Prefer not to say"}
                {formData.age ? `, ${formData.age} years old` : ""}
              </Text>
            )}
            {formData.stylePreferences.length > 0 && (
              <Text className="text-xs text-muted-foreground">
                🎨 {formData.stylePreferences.slice(0, 4).join(", ")}
                {formData.stylePreferences.length > 4 &&
                  ` +${formData.stylePreferences.length - 4} more`}
              </Text>
            )}
            {formData.shirtSize && (
              <Text className="text-xs text-muted-foreground">
                👕 {formData.shirtSize} top, {formData.waistSize}" waist,{" "}
                {formData.shoeSize} {formData.shoeSizeUnit} shoe
              </Text>
            )}
            {formData.country && (
              <Text className="text-xs text-muted-foreground">
                📍 {formData.country} • {formData.budgetRange} budget
              </Text>
            )}
            {formData.uploadedImages.length > 0 && (
              <Text className="text-xs text-muted-foreground">
                📸 {formData.uploadedImages.length} photo(s) uploaded
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
