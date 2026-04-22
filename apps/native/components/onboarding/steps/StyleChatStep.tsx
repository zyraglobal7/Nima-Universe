import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  StepProps,
  GENDER_OPTIONS,
  STYLE_VIBE_CARDS,
  OCCASION_OPTIONS,
  BUDGET_OPTIONS,
  Gender,
  BudgetRange,
} from "../types";

type SubStage = "gender" | "style" | "occasions" | "budget";
const SUB_STAGES: SubStage[] = ["gender", "style", "occasions", "budget"];

const NIMA_MESSAGES: Record<SubStage, string> = {
  gender: "What style are we shopping for?",
  style: "Tap the looks that are SO you — pick at least 2!",
  occasions: "What do you dress for most?",
  budget: "What's your budget vibe?",
};

// Nima's avatar initial
function NimaAvatar() {
  return (
    <View className="w-8 h-8 rounded-full bg-primary items-center justify-center flex-shrink-0">
      <Text className="text-white text-xs font-bold">N</Text>
    </View>
  );
}

// Nima message bubble (left)
function NimaBubble({ text, visible }: { text: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <View className="flex-row gap-2 items-end mb-3">
      <NimaAvatar />
      <View
        className="bg-surface border border-border/50 rounded-2xl rounded-bl-sm px-4 py-3 max-w-[75%]"
      >
        <Text className="text-foreground text-sm leading-5">{text}</Text>
      </View>
    </View>
  );
}

// User's reply bubble (right)
function UserBubble({ text }: { text: string }) {
  return (
    <View className="flex-row justify-end mb-4">
      <View className="bg-primary rounded-2xl rounded-br-sm px-4 py-3 max-w-[75%]">
        <Text className="text-primary-foreground text-sm">{text}</Text>
      </View>
    </View>
  );
}

// Per-stage input panels
function GenderPanel({
  onSelect,
}: {
  onSelect: (g: Gender) => void;
}) {
  return (
    <View className="flex-row gap-2 flex-wrap">
      {GENDER_OPTIONS.map((opt) => (
        <Pressable
          key={opt.value}
          onPress={() => onSelect(opt.value)}
          className="bg-surface border border-border rounded-full px-5 py-3"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Text className="text-foreground text-sm font-medium">{opt.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function StylePanel({
  selected,
  onToggle,
  onConfirm,
}: {
  selected: Set<string>;
  onToggle: (id: string) => void;
  onConfirm: () => void;
}) {
  const screenWidth = Dimensions.get("window").width;
  const cardWidth = Math.floor((screenWidth - 48 - 8) / 2); // px-6 on each side + gap
  const cardHeight = Math.floor((cardWidth * 4) / 3);

  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        {STYLE_VIBE_CARDS.map((card) => {
          const isSelected = selected.has(card.id);
          return (
            <View
              key={card.id}
              style={{
                width: cardWidth,
                height: cardHeight,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <Pressable
                onPress={() => onToggle(card.id)}
                style={({ pressed }) => ({
                  width: cardWidth,
                  height: cardHeight,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Image
                  source={card.image}
                  style={{ width: cardWidth, height: cardHeight, position: "absolute" }}
                  resizeMode="cover"
                />
                <View
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: cardHeight * 0.35,
                    backgroundColor: "rgba(0,0,0,0.45)",
                    justifyContent: "flex-end",
                    paddingHorizontal: 8,
                    paddingBottom: 8,
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
                    {card.title}
                  </Text>
                </View>
                {isSelected && (
                  <View
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: 12,
                      borderWidth: 3,
                      borderColor: "#5C2A33",
                    }}
                  >
                    <View
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: "#5C2A33",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
                        ✓
                      </Text>
                    </View>
                  </View>
                )}
              </Pressable>
            </View>
          );
        })}
      </View>

      <Pressable
        onPress={onConfirm}
        disabled={selected.size < 2}
        className={`py-3 rounded-full items-center ${selected.size >= 2 ? "bg-primary" : "bg-primary/40"}`}
        style={({ pressed }) => ({
          opacity: selected.size >= 2 && pressed ? 0.85 : 1,
        })}
      >
        <Text className="text-primary-foreground text-sm font-semibold">
          {selected.size < 2
            ? `Select ${2 - selected.size} more`
            : `These ${selected.size} are so me →`}
        </Text>
      </Pressable>
    </View>
  );
}

function OccasionsPanel({
  selected,
  onToggle,
  onConfirm,
}: {
  selected: Set<string>;
  onToggle: (v: string) => void;
  onConfirm: () => void;
}) {
  return (
    <View className="gap-3">
      <View className="gap-2">
        {OCCASION_OPTIONS.map((opt) => {
          const isSelected = selected.has(opt.value);
          return (
            <Pressable
              key={opt.value}
              onPress={() => onToggle(opt.value)}
              className={`flex-row items-center gap-3 px-4 py-3 rounded-xl border ${
                isSelected
                  ? "bg-primary/10 border-primary"
                  : "bg-surface border-border"
              }`}
              style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
            >
              <View
                className={`w-5 h-5 rounded-md border-2 items-center justify-center ${
                  isSelected ? "bg-primary border-primary" : "border-border"
                }`}
              >
                {isSelected && (
                  <Text className="text-white text-xs font-bold">✓</Text>
                )}
              </View>
              <Text
                className={`text-sm font-medium ${isSelected ? "text-primary" : "text-foreground"}`}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={onConfirm}
        disabled={selected.size === 0}
        className={`py-3 rounded-full items-center ${selected.size > 0 ? "bg-primary" : "bg-primary/40"}`}
        style={({ pressed }) => ({
          opacity: selected.size > 0 && pressed ? 0.85 : 1,
        })}
      >
        <Text className="text-primary-foreground text-sm font-semibold">
          {selected.size > 0 ? "Got it →" : "Pick at least one"}
        </Text>
      </Pressable>
    </View>
  );
}

function BudgetPanel({
  onSelect,
  saving,
}: {
  onSelect: (b: BudgetRange) => void;
  saving: boolean;
}) {
  if (saving) {
    return (
      <View className="items-center py-4 gap-2">
        <ActivityIndicator color="#5C2A33" />
        <Text className="text-xs text-muted-foreground">Working my magic...</Text>
      </View>
    );
  }

  return (
    <View className="gap-2">
      {BUDGET_OPTIONS.map((opt) => (
        <Pressable
          key={opt.value}
          onPress={() => onSelect(opt.value)}
          className="bg-surface border border-border rounded-xl px-4 py-4 gap-1"
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
        >
          <Text className="text-foreground text-sm font-semibold">
            {opt.label}
          </Text>
          <Text className="text-muted-foreground text-xs">{opt.range}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function StyleChatStep({
  formData,
  updateFormData,
  onNext,
}: StepProps) {
  const [subStageIndex, setSubStageIndex] = useState(0);
  const [selectedStyleIds, setSelectedStyleIds] = useState(new Set<string>());
  const [selectedOccasions, setSelectedOccasions] = useState(new Set<string>());
  const [saving, setSaving] = useState(false);

  // Chat history: each entry is { stage, userReply }
  const [history, setHistory] = useState<
    Array<{ stage: SubStage; userReply: string }>
  >([]);

  const scrollRef = useRef<ScrollView>(null);
  const completeOnboardingV2 = useMutation(api.users.mutations.completeOnboardingV2);

  const currentStage = SUB_STAGES[subStageIndex];

  // Scroll to bottom when new messages appear
  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, [subStageIndex, history.length]);

  const advance = (userReply: string, stage: SubStage) => {
    setHistory((prev) => [...prev, { stage, userReply }]);
    setSubStageIndex((prev) => prev + 1);
  };

  const handleGender = (g: Gender) => {
    updateFormData({ gender: g });
    const label = GENDER_OPTIONS.find((o) => o.value === g)?.label ?? g;
    advance(label, "gender");
  };

  const handleStyleToggle = (id: string) => {
    setSelectedStyleIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleStyleConfirm = () => {
    const tags = STYLE_VIBE_CARDS.filter((c) => selectedStyleIds.has(c.id)).flatMap(
      (c) => c.tags
    );
    const unique = [...new Set(tags)];
    updateFormData({ stylePreferences: unique });
    const titles = STYLE_VIBE_CARDS.filter((c) => selectedStyleIds.has(c.id))
      .map((c) => c.title.split(",")[0])
      .join(", ");
    advance(titles, "style");
  };

  const handleOccasionToggle = (v: string) => {
    setSelectedOccasions((prev) => {
      const next = new Set(prev);
      next.has(v) ? next.delete(v) : next.add(v);
      return next;
    });
  };

  const handleOccasionsConfirm = () => {
    const occasions = Array.from(selectedOccasions);
    updateFormData({ occasions });
    const labels = OCCASION_OPTIONS.filter((o) => selectedOccasions.has(o.value))
      .map((o) => o.label)
      .join(", ");
    advance(labels, "occasions");
  };

  const handleBudget = async (b: BudgetRange) => {
    updateFormData({ budgetRange: b });
    const label = BUDGET_OPTIONS.find((o) => o.value === b)?.label ?? b;

    setSaving(true);
    try {
      await completeOnboardingV2({
        gender: formData.gender as Gender,
        stylePreferences: formData.stylePreferences,
        occasions: formData.occasions,
        budgetRange: b,
      });
    } catch (err) {
      console.error("[StyleChat] completeOnboardingV2 failed:", err);
    } finally {
      setSaving(false);
    }

    advance(label, "budget");
    // Short delay so the user sees their reply, then advance
    setTimeout(() => onNext(), 600);
  };

  const renderCurrentInput = () => {
    switch (currentStage) {
      case "gender":
        return <GenderPanel onSelect={handleGender} />;
      case "style":
        return (
          <StylePanel
            selected={selectedStyleIds}
            onToggle={handleStyleToggle}
            onConfirm={handleStyleConfirm}
          />
        );
      case "occasions":
        return (
          <OccasionsPanel
            selected={selectedOccasions}
            onToggle={handleOccasionToggle}
            onConfirm={handleOccasionsConfirm}
          />
        );
      case "budget":
        return <BudgetPanel onSelect={handleBudget} saving={saving} />;
    }
  };

  return (
    <View className="flex-1">
      <ScrollView
        ref={scrollRef}
        className="flex-1 px-4"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Render completed stages as chat history */}
        {history.map((entry, i) => (
          <View key={i}>
            <NimaBubble text={NIMA_MESSAGES[entry.stage]} visible />
            <UserBubble text={entry.userReply} />
          </View>
        ))}

        {/* Current Nima question */}
        <NimaBubble text={NIMA_MESSAGES[currentStage]} visible />

        {/* Current input */}
        <View className="mt-2 mb-2">{renderCurrentInput()}</View>
      </ScrollView>
    </View>
  );
}
