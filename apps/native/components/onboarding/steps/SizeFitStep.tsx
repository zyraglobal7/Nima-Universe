import { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import {
  StepProps,
  SIZE_OPTIONS,
  ShoeSizeUnit,
  convertShoeSize,
} from "../types";
import {
  trackStepCompleted,
  trackBackClicked,
  ONBOARDING_STEPS,
} from "@/lib/analytics";
import { Slider } from "@/components/ui/Slider";

// Constants
const DEFAULT_SHIRT_SIZE = "M";
const DEFAULT_WAIST_SIZE = "32";
const DEFAULT_HEIGHT_CM = "170";
const DEFAULT_SHOE_SIZE_EU = "40";

const HEIGHT_CM_MIN = 140;
const HEIGHT_CM_MAX = 210;
const HEIGHT_FT_MIN = 4.6;
const HEIGHT_FT_MAX = 6.9;

const SHIRT_SIZES = SIZE_OPTIONS.shirt;
const WAIST_SIZES = SIZE_OPTIONS.waist;

function formatHeight(value: number, unit: "cm" | "ft"): string {
  if (unit === "cm") return `${Math.round(value)} cm`;
  const feet = Math.floor(value);
  const inches = Math.round((value - feet) * 12);
  return `${feet}'${inches}"`;
}

export function SizeFitStep({
  formData,
  updateFormData,
  onNext,
  onBack,
}: StepProps) {
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">(
    formData.heightUnit || "cm",
  );
  const [shoeSizeUnit, setShoeSizeUnit] = useState<ShoeSizeUnit>(
    formData.shoeSizeUnit || "EU",
  );

  // Initialize defaults on mount
  useEffect(() => {
    const updates: Partial<typeof formData> = {};
    if (!formData.shirtSize) updates.shirtSize = DEFAULT_SHIRT_SIZE;
    if (!formData.waistSize) updates.waistSize = DEFAULT_WAIST_SIZE;
    if (!formData.height)
      updates.height =
        heightUnit === "cm" ? DEFAULT_HEIGHT_CM : String(HEIGHT_FT_MIN);
    if (!formData.shoeSize) {
      updates.shoeSize =
        shoeSizeUnit === "EU"
          ? DEFAULT_SHOE_SIZE_EU
          : convertShoeSize(DEFAULT_SHOE_SIZE_EU, "EU", shoeSizeUnit);
    }
    if (Object.keys(updates).length > 0) updateFormData(updates);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleHeightUnitChange = (newUnit: "cm" | "ft") => {
    if (newUnit === heightUnit) return;
    const current = parseFloat(formData.height) || 170;
    const converted =
      newUnit === "cm"
        ? Math.round(current * 30.48).toString()
        : (current / 30.48).toFixed(1);
    setHeightUnit(newUnit);
    updateFormData({ height: converted, heightUnit: newUnit });
  };

  const handleShoeSizeUnitChange = (newUnit: ShoeSizeUnit) => {
    if (newUnit === shoeSizeUnit) return;
    const currentSize = formData.shoeSize || DEFAULT_SHOE_SIZE_EU;
    const converted = convertShoeSize(currentSize, shoeSizeUnit, newUnit);
    setShoeSizeUnit(newUnit);
    updateFormData({ shoeSize: converted, shoeSizeUnit: newUnit });
  };

  // Shirt slider
  const shirtIndex = Math.max(
    0,
    SHIRT_SIZES.indexOf(formData.shirtSize || DEFAULT_SHIRT_SIZE),
  );
  const handleShirtSlider = (v: number) =>
    updateFormData({ shirtSize: SHIRT_SIZES[Math.round(v)] });

  // Waist slider
  const waistIndex = Math.max(
    0,
    WAIST_SIZES.indexOf(formData.waistSize || DEFAULT_WAIST_SIZE),
  );
  const handleWaistSlider = (v: number) =>
    updateFormData({ waistSize: WAIST_SIZES[Math.round(v)] });

  // Height slider
  const heightValue =
    parseFloat(formData.height) ||
    (heightUnit === "cm" ? 170 : parseFloat(DEFAULT_HEIGHT_CM) / 30.48);
  const handleHeightSlider = (v: number) =>
    updateFormData({ height: v.toFixed(heightUnit === "cm" ? 0 : 1), heightUnit });

  // Shoe slider
  const shoeSizes = SIZE_OPTIONS.shoe[shoeSizeUnit];
  const shoeIndex = Math.max(
    0,
    shoeSizes.indexOf(
      formData.shoeSize ||
        (shoeSizeUnit === "EU"
          ? DEFAULT_SHOE_SIZE_EU
          : convertShoeSize(DEFAULT_SHOE_SIZE_EU, "EU", shoeSizeUnit)),
    ),
  );
  const handleShoeSlider = (v: number) =>
    updateFormData({ shoeSize: shoeSizes[Math.round(v)], shoeSizeUnit });

  return (
    <View className="flex-1">
      {/* Header */}
      <View className="px-4 py-6">
        <View className="max-w-md w-full mx-auto">
          <View className="flex-row items-center gap-4 mb-6">
            <Pressable
              onPress={() => {
                trackBackClicked(ONBOARDING_STEPS.SIZE_FIT);
                onBack?.();
              }}
              className="p-2 -ml-2 rounded-full"
            >
              <Text className="text-2xl text-muted-foreground">←</Text>
            </Pressable>
            <View className="flex-1">
              <Text className="text-2xl font-serif font-semibold text-foreground">
                Your perfect fit
              </Text>
              <Text className="text-sm text-muted-foreground mt-1">
                So I can recommend your ideal sizes
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
        {/* Chat Bubble */}
        <View className="bg-surface/80 border border-border/50 rounded-2xl p-4">
          <View className="flex-row items-start gap-3">
            <View className="w-8 h-8 rounded-full bg-primary items-center justify-center flex-shrink-0">
              <Text className="text-sm">💬</Text>
            </View>
            <Text className="flex-1 text-sm text-foreground leading-5">
              Don't worry, I won't judge! These help me find clothes that
              actually fit you — no more guessing games.
            </Text>
          </View>
        </View>

        {/* Shirt Size */}
        <View className="gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-medium text-foreground">
              👕 T-Shirt Size
            </Text>
            <Text className="text-lg font-semibold text-primary">
              {formData.shirtSize || DEFAULT_SHIRT_SIZE}
            </Text>
          </View>
          <Slider
            value={shirtIndex}
            min={0}
            max={SHIRT_SIZES.length - 1}
            step={1}
            onValueChange={handleShirtSlider}
          />
          <View className="flex-row justify-between">
            <Text className="text-xs text-muted-foreground">
              {SHIRT_SIZES[0]}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {SHIRT_SIZES[SHIRT_SIZES.length - 1]}
            </Text>
          </View>
        </View>

        {/* Waist Size */}
        <View className="gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-medium text-foreground">
              📏 Waist Size
            </Text>
            <Text className="text-lg font-semibold text-primary">
              {formData.waistSize || DEFAULT_WAIST_SIZE} in
            </Text>
          </View>
          <Slider
            value={waistIndex}
            min={0}
            max={WAIST_SIZES.length - 1}
            step={1}
            onValueChange={handleWaistSlider}
          />
          <View className="flex-row justify-between">
            <Text className="text-xs text-muted-foreground">
              {WAIST_SIZES[0]} in
            </Text>
            <Text className="text-xs text-muted-foreground">
              {WAIST_SIZES[WAIST_SIZES.length - 1]} in
            </Text>
          </View>
        </View>

        {/* Height */}
        <View className="gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-medium text-foreground">
              📐 Height
            </Text>
            <Text className="text-lg font-semibold text-primary">
              {formatHeight(heightValue, heightUnit)}
            </Text>
          </View>

          {/* Unit toggle */}
          <View className="flex-row gap-2 justify-center">
            {(["cm", "ft"] as const).map((unit) => (
              <Pressable
                key={unit}
                onPress={() => handleHeightUnitChange(unit)}
                className={`px-5 py-1.5 rounded-full border ${
                  heightUnit === unit
                    ? "bg-primary border-primary"
                    : "bg-surface border-border"
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    heightUnit === unit
                      ? "text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {unit === "ft" ? "ft / in" : "cm"}
                </Text>
              </Pressable>
            ))}
          </View>

          <Slider
            value={heightValue}
            min={heightUnit === "cm" ? HEIGHT_CM_MIN : HEIGHT_FT_MIN}
            max={heightUnit === "cm" ? HEIGHT_CM_MAX : HEIGHT_FT_MAX}
            step={heightUnit === "cm" ? 1 : 0.1}
            onValueChange={handleHeightSlider}
          />
          <View className="flex-row justify-between">
            <Text className="text-xs text-muted-foreground">
              {heightUnit === "cm" ? "140 cm" : `4'7"`}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {heightUnit === "cm" ? "210 cm" : `6'11"`}
            </Text>
          </View>
        </View>

        {/* Shoe Size */}
        <View className="gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-medium text-foreground">
              👟 Shoe Size
            </Text>
            <Text className="text-lg font-semibold text-primary">
              {formData.shoeSize ||
                (shoeSizeUnit === "EU"
                  ? DEFAULT_SHOE_SIZE_EU
                  : convertShoeSize(
                      DEFAULT_SHOE_SIZE_EU,
                      "EU",
                      shoeSizeUnit,
                    ))}{" "}
              {shoeSizeUnit}
            </Text>
          </View>

          {/* Unit toggle */}
          <View className="flex-row gap-2 justify-center">
            {(["EU", "US", "UK"] as const).map((unit) => (
              <Pressable
                key={unit}
                onPress={() => handleShoeSizeUnitChange(unit)}
                className={`px-5 py-1.5 rounded-full border ${
                  shoeSizeUnit === unit
                    ? "bg-primary border-primary"
                    : "bg-surface border-border"
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    shoeSizeUnit === unit
                      ? "text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {unit}
                </Text>
              </Pressable>
            ))}
          </View>

          <Slider
            value={shoeIndex}
            min={0}
            max={shoeSizes.length - 1}
            step={1}
            onValueChange={handleShoeSlider}
          />
          <View className="flex-row justify-between">
            <Text className="text-xs text-muted-foreground">
              {shoeSizes[0]}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {shoeSizes[shoeSizes.length - 1]}
            </Text>
          </View>
        </View>

        {/* Pro tip */}
        <View className="bg-surface rounded-xl p-4">
          <Text className="font-medium text-foreground mb-1">💡 Pro tip</Text>
          <Text className="text-sm text-muted-foreground">
            Not 100% sure? Go with your usual size — I'll help you find the
            perfect fit from there.
          </Text>
        </View>
      </ScrollView>

      {/* Footer CTA */}
      <View className="bg-background border-t border-border/50 p-4">
        <Pressable
          onPress={() => {
            trackStepCompleted(ONBOARDING_STEPS.SIZE_FIT, {
              shirt_size: formData.shirtSize,
              waist_size: formData.waistSize,
              height: formData.height,
              height_unit: formData.heightUnit,
              shoe_size: formData.shoeSize,
              shoe_unit: formData.shoeSizeUnit,
            });
            onNext();
          }}
          className="w-full bg-primary py-4 rounded-full items-center"
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <Text className="text-primary-foreground text-base font-semibold tracking-wide">
            Continue
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
