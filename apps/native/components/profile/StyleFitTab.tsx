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
  ChevronDown,
  Loader2,
} from "lucide-react-native";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Toast from "react-native-toast-message";
import {
  STYLE_OUTFIT_IMAGES,
  SIZE_OPTIONS,
  BudgetRange,
} from "@/lib/profile_constants";
import { Picker } from "@react-native-picker/picker";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/lib/contexts/ThemeContext";

// Web Parity: Style Options with Emojis
const STYLE_OPTIONS_MAP = [
  { id: "minimalist", label: "Minimalist", emoji: "◻️" },
  { id: "classic", label: "Classic", emoji: "👔" },
  { id: "streetwear", label: "Streetwear", emoji: "🧢" },
  { id: "bohemian", label: "Bohemian", emoji: "🌻" },
  { id: "sporty", label: "Sporty", emoji: "⚽" },
  { id: "elegant", label: "Elegant", emoji: "✨" },
  { id: "casual", label: "Casual", emoji: "👕" },
  { id: "vintage", label: "Vintage", emoji: "📻" },
  { id: "bold", label: "Bold & Colorful", emoji: "🎨" },
  { id: "preppy", label: "Preppy", emoji: "🎾" },
  { id: "edgy", label: "Edgy", emoji: "🖤" },
  { id: "romantic", label: "Romantic", emoji: "🌹" },
];

const BUDGET_OPTS = [
  { value: "low", label: "Budget", icon: "💰" },
  { value: "mid", label: "Mid-Range", icon: "💎" },
  { value: "premium", label: "Premium", icon: "👑" },
];

export function StyleFitTab() {
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

  const [isEditingStyle, setIsEditingStyle] = useState(false);
  const [selectedOutfits, setSelectedOutfits] = useState<string[]>([]);
  const [savingStyle, setSavingStyle] = useState(false);

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
    if (selectedOutfits.includes(id)) {
      setSelectedOutfits((prev) => prev.filter((i) => i !== id));
    } else {
      setSelectedOutfits((prev) => [...prev, id]);
    }
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

  const { isDark } = useTheme();

  if (!currentUser) return <ActivityIndicator color={isDark ? "#C9A07A" : "#5C2A33"} />;

  const btnFg = isDark ? "#1A1614" : "#fff";

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 80 }}
    >
      {/* Style Vibes */}
      <View className="mb-8">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-xl font-serif font-medium text-foreground dark:text-foreground-dark">
            Your Style Vibe
          </Text>
          {!isEditingStyle && (
            <TouchableOpacity
              onPress={startEditingStyle}
              className="flex-row items-center bg-surface-alt dark:bg-surface-alt-dark px-3 py-1.5 rounded-lg"
            >
              <Pencil size={14} className="text-foreground dark:text-foreground-dark" />
              <Text className="text-foreground dark:text-foreground-dark ml-1.5 font-sans font-medium text-sm">
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
            <View className="flex-row flex-wrap gap-3">
              {STYLE_OUTFIT_IMAGES.map((outfit) => {
                const isSelected = selectedOutfits.includes(outfit.id);
                return (
                  <TouchableOpacity
                    key={outfit.id}
                    onPress={() => toggleOutfit(outfit.id)}
                    className={`w-[48%] md:w-[30%] aspect-[3/4] rounded-xl overflow-hidden relative ${isSelected ? "border-2 border-primary dark:border-primary-dark" : ""}`}
                  >
                    <Image
                      source={outfit.source}
                      className="w-full h-full"
                      contentFit="cover"
                    />

                    {/* Gradient Overlay with Tags */}
                    <LinearGradient
                      colors={["transparent", "rgba(0,0,0,0.7)"]}
                      className="absolute bottom-0 left-0 right-0 p-3 pt-6"
                    >
                      <View className="flex-row flex-wrap gap-1">
                        {outfit.tags.map((tag) => (
                          <View
                            key={tag}
                            className="bg-white/20 px-2 py-0.5 rounded-full"
                          >
                            <Text className="text-[10px] text-white font-medium">
                              {tag}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </LinearGradient>

                    {/* Selection Indicator */}
                    <View
                      className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center ${isSelected ? "bg-primary dark:bg-primary-dark" : "bg-white/30 backdrop-blur-sm"}`}
                    >
                      {isSelected ? (
                        <Check size={14} color={btnFg} />
                      ) : (
                        <Heart size={14} color="white" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View className="flex-row justify-end mt-4 space-x-2">
              <TouchableOpacity
                onPress={() => setIsEditingStyle(false)}
                className="px-4 py-2 border border-border dark:border-border-dark rounded-lg"
                disabled={savingStyle}
              >
                <View className="flex-row items-center">
                  <X size={16} className="text-foreground dark:text-foreground-dark mr-1" />
                  <Text className="text-foreground dark:text-foreground-dark font-sans font-medium">
                    Cancel
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveStyles}
                disabled={savingStyle}
                className="px-4 py-2 bg-primary dark:bg-primary-dark rounded-lg flex-row items-center"
              >
                {savingStyle ? (
                  <ActivityIndicator size="small" color={btnFg} />
                ) : (
                  <>
                    <Save size={16} color={btnFg} className="mr-1.5" />
                    <Text className="text-primary-foreground dark:text-primary-dark-foreground font-medium font-sans">
                      Save Styles
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="flex-row flex-wrap gap-2">
            {(currentUser.stylePreferences || []).length > 0 ? (
              currentUser.stylePreferences?.map((styleId) => {
                // Find matching style option or fallback
                const styleOption = STYLE_OPTIONS_MAP.find(
                  (s) => s.id.toLowerCase() === styleId.toLowerCase(),
                ) ||
                  STYLE_OPTIONS_MAP.find(
                    (s) => s.label.toLowerCase() === styleId.toLowerCase(),
                  ) || { id: styleId, label: styleId, emoji: "✨" };

                return (
                  <View
                    key={styleId}
                    className="px-3 py-1.5 rounded-full bg-primary/10 dark:bg-primary-dark/10 border border-primary/20 dark:border-primary-dark/20 flex-row items-center gap-1.5"
                  >
                    <Text className="text-sm">{styleOption.emoji}</Text>
                    <Text className="text-sm font-medium font-sans text-foreground dark:text-foreground-dark">
                      {styleOption.label}
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

      <View className="h-[1px] bg-border dark:bg-border-dark mb-6" />

      {/* Budget Range */}
      <View className="mb-8">
        <Text className="text-xl font-serif font-medium text-foreground dark:text-foreground-dark mb-2">
          Budget Range
        </Text>
        <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground mb-4 font-sans">
          Help us find items that match your budget
        </Text>

        <View className="flex-row flex-wrap gap-2 mb-4">
          {BUDGET_OPTS.map((option) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => setBudgetRange(option.value as BudgetRange)}
              className={`px-4 py-2.5 rounded-full border flex-row items-center space-x-2 transition-all ${
                budgetRange === option.value
                  ? "bg-primary dark:bg-primary-dark border-primary dark:border-primary-dark"
                  : "bg-surface dark:bg-surface-dark border-border dark:border-border-dark"
              }`}
            >
              <Text className="text-base">{option.icon}</Text>
              <Text
                className={`font-medium font-sans ${budgetRange === option.value ? "text-primary-foreground dark:text-primary-dark-foreground" : "text-foreground dark:text-foreground-dark"}`}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className="flex-row items-end justify-between">
          <View>
            <Text className="text-sm font-medium text-foreground dark:text-foreground-dark mb-1.5 font-sans">
              Preferred Currency
            </Text>
            <View className="bg-background dark:bg-background-dark border border-border dark:border-border-dark rounded-lg px-3 py-2 w-28 flex-row items-center justify-between h-[42px]">
              <Text className="text-foreground dark:text-foreground-dark font-medium font-sans">
                {currency}
              </Text>
              <ChevronDown size={16} className="text-muted-foreground dark:text-muted-dark-foreground" />
            </View>
          </View>
          <TouchableOpacity
            onPress={saveBudget}
            disabled={savingBudget}
            className="bg-primary dark:bg-primary-dark px-6 py-2.5 rounded-lg items-center shadow-sm h-[42px] justify-center"
          >
            {savingBudget ? (
              <ActivityIndicator color={btnFg} size="small" />
            ) : (
              <Text className="text-primary-foreground dark:text-primary-dark-foreground font-medium font-sans">
                Save Budget
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View className="h-[1px] bg-border dark:bg-border-dark mb-6" />

      {/* Sizes */}
      <View>
        <Text className="text-xl font-serif font-medium text-foreground dark:text-foreground-dark mb-6">
          Size & Fit
        </Text>

        <View className="flex-row gap-4 mb-4">
          <View className="flex-1">
            <Text className="text-sm font-medium text-foreground dark:text-foreground-dark mb-1.5 font-sans">
              Shirt Size
            </Text>
            <View className="bg-background dark:bg-background-dark border border-border dark:border-border-dark rounded-lg overflow-hidden h-[48px] justify-center">
              <Picker
                selectedValue={shirtSize}
                onValueChange={setShirtSize}
                style={{ width: "100%", color: isDark ? "#F5F0E8" : undefined }}
                dropdownIconColor={isDark ? "#C4B8A8" : undefined}
              >
                <Picker.Item label="Select" value="" color={isDark ? "#8C8078" : "#9CA3AF"} />
                {SIZE_OPTIONS.shirt.map((s) => (
                  <Picker.Item key={s} label={s} value={s} color={isDark ? "#F5F0E8" : undefined} />
                ))}
              </Picker>
            </View>
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-foreground dark:text-foreground-dark mb-1.5 font-sans">
              Waist Size
            </Text>
            <View className="bg-background dark:bg-background-dark border border-border dark:border-border-dark rounded-lg overflow-hidden h-[48px] justify-center">
              <Picker
                selectedValue={waistSize}
                onValueChange={setWaistSize}
                style={{ width: "100%", color: isDark ? "#F5F0E8" : undefined }}
                dropdownIconColor={isDark ? "#C4B8A8" : undefined}
              >
                <Picker.Item label="Select" value="" color={isDark ? "#8C8078" : "#9CA3AF"} />
                {SIZE_OPTIONS.waist.map((s) => (
                  <Picker.Item key={s} label={`${s}"`} value={s} color={isDark ? "#F5F0E8" : undefined} />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        <View className="flex-row gap-4 mb-6">
          <View className="flex-1">
            <Text className="text-sm font-medium text-foreground dark:text-foreground-dark mb-1.5 font-sans">
              Height
            </Text>
            <View className="flex-row gap-2">
              <TextInput
                value={height}
                onChangeText={setHeight}
                placeholder={heightUnit === "cm" ? "175" : "5'9"}
                placeholderTextColor={isDark ? "#8C8078" : "#9CA3AF"}
                className="flex-1 bg-background dark:bg-background-dark border border-border dark:border-border-dark rounded-lg px-3 h-[48px] text-foreground dark:text-foreground-dark font-sans"
              />
              <View className="w-24 bg-background dark:bg-background-dark border border-border dark:border-border-dark rounded-lg justify-center overflow-hidden h-[48px]">
                <Picker
                  selectedValue={heightUnit}
                  onValueChange={setHeightUnit}
                  style={{ width: "100%", color: isDark ? "#F5F0E8" : undefined }}
                  dropdownIconColor={isDark ? "#C4B8A8" : undefined}
                >
                  <Picker.Item label="cm" value="cm" color={isDark ? "#F5F0E8" : undefined} />
                  <Picker.Item label="ft" value="ft" color={isDark ? "#F5F0E8" : undefined} />
                </Picker>
              </View>
            </View>
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-foreground dark:text-foreground-dark mb-1.5 font-sans">
              Shoe Size
            </Text>
            <View className="flex-row gap-2">
              <TextInput
                value={shoeSize}
                onChangeText={setShoeSize}
                placeholder="10"
                placeholderTextColor={isDark ? "#8C8078" : "#9CA3AF"}
                className="flex-1 bg-background dark:bg-background-dark border border-border dark:border-border-dark rounded-lg px-3 h-[48px] text-foreground dark:text-foreground-dark font-sans"
              />
              <View className="w-24 bg-background dark:bg-background-dark border border-border dark:border-border-dark rounded-lg justify-center overflow-hidden h-[48px]">
                <Picker
                  selectedValue={shoeSizeUnit}
                  onValueChange={setShoeSizeUnit}
                  style={{ width: "100%", color: isDark ? "#F5F0E8" : undefined }}
                  dropdownIconColor={isDark ? "#C4B8A8" : undefined}
                >
                  <Picker.Item label="US" value="US" color={isDark ? "#F5F0E8" : undefined} />
                  <Picker.Item label="EU" value="EU" color={isDark ? "#F5F0E8" : undefined} />
                  <Picker.Item label="UK" value="UK" color={isDark ? "#F5F0E8" : undefined} />
                </Picker>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={saveSizes}
          disabled={savingSize}
          className="bg-primary dark:bg-primary-dark w-full py-3.5 rounded-lg flex-row items-center justify-center space-x-2 shadow-sm"
        >
          {savingSize ? (
            <ActivityIndicator color={btnFg} />
          ) : (
            <>
              <Save size={18} color={btnFg} />
              <Text className="text-primary-foreground dark:text-primary-dark-foreground font-medium font-sans">
                Save Size Preferences
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
