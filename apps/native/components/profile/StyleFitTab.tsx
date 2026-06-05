import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import {
  Check,
  Heart,
  Save,
  Pencil,
  X,
  Sparkles,
  RefreshCw,
  Wallet,
  Gem,
  Crown,
  type LucideIcon,
} from "lucide-react-native";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import Toast from "react-native-toast-message";
import {
  STYLE_OUTFIT_IMAGES,
  SIZE_OPTIONS,
  BudgetRange,
} from "@/lib/profile_constants";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/lib/contexts/ThemeContext";

const STYLE_LABELS: Record<string, string> = {
  minimalist: "Minimalist",
  classic: "Classic",
  streetwear: "Streetwear",
  bohemian: "Bohemian",
  sporty: "Sporty",
  elegant: "Elegant",
  casual: "Casual",
  vintage: "Vintage",
  bold: "Bold & Colorful",
  preppy: "Preppy",
  edgy: "Edgy",
  romantic: "Romantic",
};

const BUDGET_OPTS: { value: BudgetRange; label: string; icon: LucideIcon }[] = [
  { value: "low", label: "Budget", icon: Wallet },
  { value: "mid", label: "Mid-Range", icon: Gem },
  { value: "premium", label: "Premium", icon: Crown },
];

const CURRENCIES = ["KES", "USD", "EUR", "GBP"];

export function StyleFitTab() {
  const { isDark } = useTheme();
  const currentUser = useQuery(api.users.queries.getCurrentUser);
  const updateStylePreferences = useMutation(
    api.users.mutations.updateStylePreferences,
  );
  const updateSizePreferences = useMutation(
    api.users.mutations.updateSizePreferences,
  );
  const updateBudgetPreferences = useMutation(
    api.users.mutations.updateBudgetPreferences,
  );
  const generateStyleProfile = useAction(
    api.users.actions.generateMyStyleProfile,
  );

  const [isEditingStyle, setIsEditingStyle] = useState(false);
  const [selectedOutfits, setSelectedOutfits] = useState<string[]>([]);
  const [savingStyle, setSavingStyle] = useState(false);
  const [generatingProfile, setGeneratingProfile] = useState(false);

  // Size State
  const [shirtSize, setShirtSize] = useState(currentUser?.shirtSize || "");
  const [waistSize, setWaistSize] = useState(currentUser?.waistSize || "");
  const [shoeSize, setShoeSize] = useState(currentUser?.shoeSize || "");
  const [shoeSizeUnit, setShoeSizeUnit] = useState<"EU" | "US" | "UK">(
    (currentUser?.shoeSizeUnit as any) || "US",
  );
  const [height, setHeight] = useState(currentUser?.height || "");
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">(
    (currentUser?.heightUnit as any) || "cm",
  );
  const [savingSize, setSavingSize] = useState(false);

  // Budget State
  const [budgetRange, setBudgetRange] = useState<BudgetRange>(
    (currentUser?.budgetRange as any) || "mid",
  );
  const [currency, setCurrency] = useState(currentUser?.currency || "KES");
  const [savingBudget, setSavingBudget] = useState(false);

  const startEditingStyle = () => {
    const currentStyles = currentUser?.stylePreferences || [];
    const matching = STYLE_OUTFIT_IMAGES.filter((o) =>
      o.tags.some((tag) => currentStyles.includes(tag)),
    ).map((o) => o.id);
    setSelectedOutfits(matching);
    setIsEditingStyle(true);
  };

  const toggleOutfit = (id: string) => {
    setSelectedOutfits((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const saveStyles = async () => {
    setSavingStyle(true);
    try {
      const selectedTags = new Set<string>();
      selectedOutfits.forEach((id) => {
        const outfit = STYLE_OUTFIT_IMAGES.find((o) => o.id === id);
        outfit?.tags.forEach((tag) => selectedTags.add(tag));
      });
      await updateStylePreferences({
        stylePreferences: Array.from(selectedTags),
      });
      setIsEditingStyle(false);
      Toast.show({ type: "success", text1: "Style preferences updated!" });
    } catch (e) {
      Toast.show({ type: "error", text1: "Failed to update styles" });
    } finally {
      setSavingStyle(false);
    }
  };

  const saveSizes = async () => {
    setSavingSize(true);
    try {
      await updateSizePreferences({
        shirtSize: shirtSize || undefined,
        waistSize: waistSize || undefined,
        shoeSize: shoeSize || undefined,
        shoeSizeUnit,
        height: height || undefined,
        heightUnit,
      });
      Toast.show({ type: "success", text1: "Size preferences updated!" });
    } catch (e) {
      Toast.show({ type: "error", text1: "Failed to update sizes" });
    } finally {
      setSavingSize(false);
    }
  };

  const saveBudget = async () => {
    setSavingBudget(true);
    try {
      await updateBudgetPreferences({ budgetRange, currency });
      Toast.show({ type: "success", text1: "Budget preferences updated!" });
    } catch (e) {
      Toast.show({ type: "error", text1: "Failed to update budget" });
    } finally {
      setSavingBudget(false);
    }
  };

  const handleGenerateProfile = async () => {
    setGeneratingProfile(true);
    try {
      await generateStyleProfile({});
      Toast.show({ type: "success", text1: "Style profile ready!" });
    } catch (e) {
      Toast.show({
        type: "error",
        text1: "Couldn't generate profile",
        text2: "Please try again in a moment.",
      });
    } finally {
      setGeneratingProfile(false);
    }
  };

  if (!currentUser)
    return <ActivityIndicator color={isDark ? "#C9A07A" : "#5C2A33"} />;

  const accent = isDark ? "#C9A07A" : "#5C2A33";
  const accentFg = isDark ? "#1A1614" : "#FAF8F5";
  const muted = isDark ? "#8C8078" : "#9C948A";
  const styleProfile = currentUser.styleProfile;

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 80 }}
    >
      {/* ─── AI Style Profile ─────────────────────────────────────────── */}
      <View className="mb-8">
        {styleProfile ? (
          <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark p-5">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <Sparkles size={18} color={accent} />
                <Text className="text-lg font-serif font-medium text-foreground dark:text-foreground-dark">
                  Your Style Profile
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleGenerateProfile}
                disabled={generatingProfile}
                hitSlop={8}
                className="flex-row items-center px-2.5 py-1.5 rounded-lg bg-surface-alt dark:bg-surface-alt-dark"
                style={{ gap: 5 }}
              >
                {generatingProfile ? (
                  <ActivityIndicator size="small" color={muted} />
                ) : (
                  <RefreshCw size={13} color={muted} />
                )}
                <Text
                  className="text-xs font-medium font-sans"
                  style={{ color: muted }}
                >
                  {generatingProfile ? "Working…" : "Regenerate"}
                </Text>
              </TouchableOpacity>
            </View>
            <Text className="text-sm text-foreground dark:text-foreground-dark font-sans" style={{ lineHeight: 22, opacity: 0.9 }}>
              {styleProfile}
            </Text>
          </View>
        ) : (
          <View className="rounded-2xl overflow-hidden border border-border dark:border-border-dark">
            <LinearGradient
              colors={
                isDark
                  ? ["#252220", "#2A211C"]
                  : ["#F5F0E8", "#EFE7DA"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 20, alignItems: "center" }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isDark
                    ? "rgba(201,160,122,0.16)"
                    : "rgba(92,42,51,0.08)",
                  marginBottom: 12,
                }}
              >
                <Sparkles size={22} color={accent} />
              </View>
              <Text className="text-lg font-serif font-medium text-foreground dark:text-foreground-dark mb-1.5 text-center">
                Generate your Style Profile
              </Text>
              <Text
                className="text-sm font-sans text-center mb-5"
                style={{ color: isDark ? "#C4B8A8" : "#6B635B", lineHeight: 20, maxWidth: 280 }}
              >
                A personalized AI summary of your aesthetic, built from your
                vibes, sizes and budget — used to tailor every recommendation.
              </Text>
              <TouchableOpacity
                onPress={handleGenerateProfile}
                disabled={generatingProfile}
                activeOpacity={0.85}
                className="flex-row items-center justify-center rounded-xl"
                style={{
                  backgroundColor: accent,
                  paddingHorizontal: 22,
                  paddingVertical: 12,
                  gap: 8,
                  opacity: generatingProfile ? 0.7 : 1,
                }}
              >
                {generatingProfile ? (
                  <ActivityIndicator size="small" color={accentFg} />
                ) : (
                  <Sparkles size={16} color={accentFg} />
                )}
                <Text
                  className="text-sm font-semibold font-sans"
                  style={{ color: accentFg }}
                >
                  {generatingProfile ? "Generating…" : "Get Yours"}
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}
      </View>

      {/* ─── Style Vibe ──────────────────────────────────────────────── */}
      <View className="mb-8">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-serif font-medium text-foreground dark:text-foreground-dark">
            Your Style Vibe
          </Text>
          {!isEditingStyle && (
            <TouchableOpacity
              onPress={startEditingStyle}
              activeOpacity={0.7}
              className="flex-row items-center bg-surface-alt dark:bg-surface-alt-dark px-3 py-1.5 rounded-lg"
              style={{ gap: 6 }}
            >
              <Pencil size={13} color={muted} />
              <Text className="text-foreground dark:text-foreground-dark font-sans font-medium text-[13px]">
                Edit
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {isEditingStyle ? (
          <View>
            <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground mb-4 font-sans">
              Tap outfits that match your style ({selectedOutfits.length}{" "}
              selected)
            </Text>
            <View className="flex-row flex-wrap" style={{ gap: 12 }}>
              {STYLE_OUTFIT_IMAGES.map((outfit) => {
                const isSelected = selectedOutfits.includes(outfit.id);
                return (
                  <TouchableOpacity
                    key={outfit.id}
                    onPress={() => toggleOutfit(outfit.id)}
                    activeOpacity={0.85}
                    style={{
                      width: "47%",
                      aspectRatio: 3 / 4,
                      borderRadius: 16,
                      overflow: "hidden",
                      borderWidth: isSelected ? 2 : 0,
                      borderColor: accent,
                    }}
                  >
                    <Image
                      source={outfit.source}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                    <LinearGradient
                      colors={["transparent", "rgba(0,0,0,0.7)"]}
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: 10,
                        paddingTop: 24,
                      }}
                    >
                      <View className="flex-row flex-wrap" style={{ gap: 4 }}>
                        {outfit.tags.slice(0, 2).map((tag) => (
                          <View
                            key={tag}
                            className="bg-white/20 px-2 py-0.5 rounded-full"
                          >
                            <Text className="text-[10px] text-white font-medium capitalize">
                              {tag}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </LinearGradient>
                    <View
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isSelected
                          ? accent
                          : "rgba(255,255,255,0.3)",
                      }}
                    >
                      {isSelected ? (
                        <Check size={14} color={accentFg} />
                      ) : (
                        <Heart size={13} color="white" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View className="flex-row justify-end mt-4" style={{ gap: 8 }}>
              <TouchableOpacity
                onPress={() => setIsEditingStyle(false)}
                disabled={savingStyle}
                activeOpacity={0.7}
                className="flex-row items-center px-4 py-2.5 border border-border dark:border-border-dark rounded-xl"
                style={{ gap: 5 }}
              >
                <X size={15} color={muted} />
                <Text className="text-foreground dark:text-foreground-dark font-sans font-medium text-[13px]">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveStyles}
                disabled={savingStyle}
                activeOpacity={0.85}
                className="flex-row items-center px-4 py-2.5 rounded-xl"
                style={{ backgroundColor: accent, gap: 6 }}
              >
                {savingStyle ? (
                  <ActivityIndicator size="small" color={accentFg} />
                ) : (
                  <Save size={15} color={accentFg} />
                )}
                <Text
                  className="font-semibold font-sans text-[13px]"
                  style={{ color: accentFg }}
                >
                  Save Styles
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {(currentUser.stylePreferences || []).length > 0 ? (
              currentUser.stylePreferences?.map((styleId: string) => {
                const label =
                  STYLE_LABELS[styleId.toLowerCase()] ||
                  styleId.charAt(0).toUpperCase() + styleId.slice(1);
                return (
                  <View
                    key={styleId}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 999,
                      backgroundColor: isDark
                        ? "rgba(201,160,122,0.12)"
                        : "rgba(92,42,51,0.07)",
                      borderWidth: 1,
                      borderColor: isDark
                        ? "rgba(201,160,122,0.25)"
                        : "rgba(92,42,51,0.18)",
                    }}
                  >
                    <Text
                      className="text-[13px] font-medium font-sans"
                      style={{ color: accent }}
                    >
                      {label}
                    </Text>
                  </View>
                );
              })
            ) : (
              <Text className="text-muted-foreground dark:text-muted-dark-foreground italic font-sans">
                No styles selected. Tap Edit to choose.
              </Text>
            )}
          </View>
        )}
      </View>

      <View className="h-px bg-border dark:bg-border-dark mb-7" />

      {/* ─── Budget ──────────────────────────────────────────────────── */}
      <View className="mb-8">
        <Text className="text-lg font-serif font-medium text-foreground dark:text-foreground-dark mb-1.5">
          Budget Range
        </Text>
        <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground mb-4 font-sans">
          Help us find items that match your budget
        </Text>

        <View className="flex-row" style={{ gap: 8 }}>
          {BUDGET_OPTS.map((option) => {
            const active = budgetRange === option.value;
            const Icon = option.icon;
            return (
              <TouchableOpacity
                key={option.value}
                onPress={() => setBudgetRange(option.value)}
                activeOpacity={0.8}
                className="flex-1 items-center rounded-2xl"
                style={{
                  paddingVertical: 14,
                  backgroundColor: active
                    ? accent
                    : isDark ? "#252220" : "#F5F0E8",
                  borderWidth: 1,
                  borderColor: active
                    ? accent
                    : isDark ? "#3D3835" : "#E0D8CC",
                  gap: 7,
                }}
              >
                <Icon
                  size={20}
                  color={active ? accentFg : muted}
                />
                <Text
                  className="text-[13px] font-medium font-sans"
                  style={{
                    color: active
                      ? accentFg
                      : isDark ? "#C4B8A8" : "#6B635B",
                  }}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text className="text-[13px] font-medium text-foreground dark:text-foreground-dark mt-5 mb-2 font-sans">
          Preferred Currency
        </Text>
        <Segmented
          isDark={isDark}
          value={currency}
          onChange={setCurrency}
          options={CURRENCIES.map((c) => ({ label: c, value: c }))}
        />

        <TouchableOpacity
          onPress={saveBudget}
          disabled={savingBudget}
          activeOpacity={0.85}
          className="flex-row items-center justify-center rounded-xl mt-4"
          style={{ backgroundColor: accent, paddingVertical: 13, gap: 8 }}
        >
          {savingBudget ? (
            <ActivityIndicator size="small" color={accentFg} />
          ) : (
            <Save size={16} color={accentFg} />
          )}
          <Text
            className="font-semibold font-sans text-[14px]"
            style={{ color: accentFg }}
          >
            Save Budget
          </Text>
        </TouchableOpacity>
      </View>

      <View className="h-px bg-border dark:bg-border-dark mb-7" />

      {/* ─── Size & Fit ──────────────────────────────────────────────── */}
      <View>
        <Text className="text-lg font-serif font-medium text-foreground dark:text-foreground-dark mb-5">
          Size & Fit
        </Text>

        {/* Shirt */}
        <FieldLabel>Shirt Size</FieldLabel>
        <View className="flex-row flex-wrap mb-5" style={{ gap: 8 }}>
          {SIZE_OPTIONS.shirt.map((s) => (
            <Chip
              key={s}
              label={s}
              active={shirtSize === s}
              onPress={() => setShirtSize(shirtSize === s ? "" : s)}
              isDark={isDark}
            />
          ))}
        </View>

        {/* Waist */}
        <FieldLabel>Waist Size</FieldLabel>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-5"
          contentContainerStyle={{ gap: 8, paddingRight: 8 }}
        >
          {SIZE_OPTIONS.waist.map((s) => (
            <Chip
              key={s}
              label={`${s}"`}
              active={waistSize === s}
              onPress={() => setWaistSize(waistSize === s ? "" : s)}
              isDark={isDark}
            />
          ))}
        </ScrollView>

        {/* Height */}
        <FieldLabel>Height</FieldLabel>
        <View className="flex-row mb-5" style={{ gap: 10 }}>
          <TextInput
            value={height}
            onChangeText={setHeight}
            placeholder={heightUnit === "cm" ? "175" : "5'9"}
            placeholderTextColor={muted}
            keyboardType="numbers-and-punctuation"
            className="flex-1 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl px-4 text-foreground dark:text-foreground-dark font-sans"
            style={{ height: 46, fontSize: 15 }}
          />
          <View style={{ width: 130 }}>
            <Segmented
              isDark={isDark}
              value={heightUnit}
              onChange={(v) => setHeightUnit(v as "cm" | "ft")}
              options={[
                { label: "cm", value: "cm" },
                { label: "ft", value: "ft" },
              ]}
            />
          </View>
        </View>

        {/* Shoe */}
        <FieldLabel>Shoe Size</FieldLabel>
        <View className="flex-row mb-2" style={{ gap: 10 }}>
          <TextInput
            value={shoeSize}
            onChangeText={setShoeSize}
            placeholder="10"
            placeholderTextColor={muted}
            keyboardType="numbers-and-punctuation"
            className="flex-1 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl px-4 text-foreground dark:text-foreground-dark font-sans"
            style={{ height: 46, fontSize: 15 }}
          />
          <View style={{ width: 160 }}>
            <Segmented
              isDark={isDark}
              value={shoeSizeUnit}
              onChange={(v) => setShoeSizeUnit(v as "EU" | "US" | "UK")}
              options={[
                { label: "US", value: "US" },
                { label: "EU", value: "EU" },
                { label: "UK", value: "UK" },
              ]}
            />
          </View>
        </View>

        <TouchableOpacity
          onPress={saveSizes}
          disabled={savingSize}
          activeOpacity={0.85}
          className="flex-row items-center justify-center rounded-xl mt-5"
          style={{ backgroundColor: accent, paddingVertical: 14, gap: 8 }}
        >
          {savingSize ? (
            <ActivityIndicator size="small" color={accentFg} />
          ) : (
            <Save size={17} color={accentFg} />
          )}
          <Text
            className="font-semibold font-sans text-[14px]"
            style={{ color: accentFg }}
          >
            Save Size Preferences
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

/* ─── Primitives ──────────────────────────────────────────────────────────── */

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-[13px] font-medium text-foreground dark:text-foreground-dark mb-2.5 font-sans">
      {children}
    </Text>
  );
}

function Chip({
  label,
  active,
  onPress,
  isDark,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  isDark: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        minWidth: 46,
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 999,
        backgroundColor: active
          ? isDark ? "#C9A07A" : "#5C2A33"
          : isDark ? "#252220" : "#F5F0E8",
        borderWidth: 1,
        borderColor: active
          ? isDark ? "#C9A07A" : "#5C2A33"
          : isDark ? "#3D3835" : "#E0D8CC",
      }}
    >
      <Text
        className="text-[13px] font-sans"
        style={{
          fontWeight: active ? "600" : "500",
          color: active
            ? isDark ? "#1A1614" : "#FAF8F5"
            : isDark ? "#C4B8A8" : "#6B635B",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Segmented({
  options,
  value,
  onChange,
  isDark,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
  isDark: boolean;
}) {
  return (
    <View
      className="flex-row bg-surface-alt dark:bg-surface-alt-dark rounded-xl"
      style={{ padding: 3, gap: 2 }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.7}
            className="flex-1 items-center justify-center rounded-lg"
            style={{
              paddingVertical: 9,
              backgroundColor: active
                ? isDark ? "#1A1614" : "#FFFFFF"
                : "transparent",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: active ? 0.06 : 0,
              shadowRadius: 2,
              elevation: active ? 1 : 0,
            }}
          >
            <Text
              className="text-[13px] font-sans"
              style={{
                fontWeight: active ? "600" : "500",
                color: active
                  ? isDark ? "#F5F0E8" : "#2D2926"
                  : isDark ? "#8C8078" : "#9C948A",
              }}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
