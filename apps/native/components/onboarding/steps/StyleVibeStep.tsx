import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  Dimensions,
  LayoutChangeEvent,
} from "react-native";
import { StepProps, STYLE_VIBE_CARDS } from "../types";
import {
  trackStepCompleted,
  trackBackClicked,
  trackStylePreferenceToggled,
  ONBOARDING_STEPS,
} from "@/lib/analytics";

const CARD_GAP = 12;

export function StyleVibeStep({ updateFormData, onNext, onBack }: StepProps) {
  const [containerWidth, setContainerWidth] = useState(
    Dimensions.get("window").width - 32, // fallback: screen width minus px-4 padding on each side
  );
  const cardWidth = Math.floor((containerWidth - CARD_GAP) / 2);
  const cardHeight = Math.floor((cardWidth * 4) / 3);

  const onGridLayout = (e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w > 0 && w !== containerWidth) {
      setContainerWidth(w);
    }
  };

  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(
    new Set(),
  );

  const toggleCard = (cardId: string) => {
    const card = STYLE_VIBE_CARDS.find((c) => c.id === cardId);
    if (!card) return;

    const isCurrentlySelected = selectedCardIds.has(cardId);
    trackStylePreferenceToggled(card.title, !isCurrentlySelected);

    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (isCurrentlySelected) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  // Collect all tags from selected cards
  const selectedTags = STYLE_VIBE_CARDS.filter((c) =>
    selectedCardIds.has(c.id),
  ).flatMap((c) => c.tags);

  // Deduplicate tags
  const uniqueTags = [...new Set(selectedTags)];

  const handleContinue = () => {
    trackStepCompleted(ONBOARDING_STEPS.STYLE_VIBE, {
      style_count: selectedCardIds.size,
      styles: uniqueTags,
    });
    updateFormData({ stylePreferences: uniqueTags });
    onNext();
  };

  return (
    <View className="flex-1">
      {/* Header */}
      <View className="px-4 py-6 border-b border-border/50">
        <View className="max-w-md w-full mx-auto">
          <View className="flex-row items-center gap-4 mb-4">
            <Pressable
              onPress={() => {
                trackBackClicked(ONBOARDING_STEPS.STYLE_VIBE);
                onBack?.();
              }}
              className="p-2 -ml-2 rounded-full"
            >
              <Text className="text-2xl text-muted-foreground">←</Text>
            </Pressable>
            <View className="flex-1">
              <Text className="text-2xl font-serif font-semibold text-foreground">
                What's your vibe?
              </Text>
              <Text className="text-sm text-muted-foreground mt-1">
                Tap the styles that resonate with you
              </Text>
            </View>
          </View>

          {/* Selection counter */}
          <View className="flex-row justify-between">
            <Text className="text-xs text-muted-foreground">
              {selectedCardIds.size} selected{" "}
              {selectedCardIds.size > 0 && "✓"}
            </Text>
            <Text className="text-xs text-muted-foreground">
              Select at least 3
            </Text>
          </View>
        </View>
      </View>

      {/* Style Cards Grid */}
      <ScrollView
        className="flex-1 px-4 py-6"
        contentContainerClassName="max-w-md mx-auto pb-4"
      >
        {/* Measurement wrapper — always full-width so onLayout fires even when grid is empty */}
        <View style={{ width: "100%" }} onLayout={onGridLayout}>
          <View className="flex-row flex-wrap" style={{ gap: CARD_GAP }}>
            {STYLE_VIBE_CARDS.map((card) => {
            const isSelected = selectedCardIds.has(card.id);
            return (
              <View
                key={card.id}
                style={{
                  width: cardWidth,
                  height: cardHeight,
                  borderRadius: 16,
                  overflow: "hidden",
                }}
              >
                <Pressable
                  onPress={() => toggleCard(card.id)}
                  style={({ pressed }) => ({
                    width: cardWidth,
                    height: cardHeight,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  {/* Image */}
                  <Image
                    source={card.image}
                    style={{
                      width: cardWidth,
                      height: cardHeight,
                      position: "absolute",
                      top: 0,
                      left: 0,
                    }}
                    resizeMode="cover"
                  />

                  {/* Dark overlay at bottom for title */}
                  <View
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: cardHeight * 0.35,
                      backgroundColor: "rgba(0,0,0,0.45)",
                      justifyContent: "flex-end",
                      paddingHorizontal: 12,
                      paddingBottom: 12,
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 14,
                        fontWeight: "600",
                      }}
                    >
                      {card.title}
                    </Text>
                  </View>

                  {/* Selected overlay */}
                  {isSelected && (
                    <View
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        borderRadius: 16,
                        borderWidth: 3,
                        borderColor: "#5C2A33",
                      }}
                    >
                      {/* Checkmark badge */}
                      <View
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: "#5C2A33",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 14,
                            fontWeight: "700",
                          }}
                        >
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
        </View>
      </ScrollView>

      {/* Footer CTA */}
      <View className="bg-background border-t border-border/50 p-4">
        <Pressable
          onPress={handleContinue}
          disabled={selectedCardIds.size < 3}
          className={`w-full py-4 rounded-full items-center ${
            selectedCardIds.size >= 3 ? "bg-primary" : "bg-primary/50"
          }`}
          style={({ pressed }) => ({
            opacity: selectedCardIds.size >= 3 && pressed ? 0.85 : 1,
          })}
        >
          <Text className="text-primary-foreground text-base font-semibold tracking-wide">
            {selectedCardIds.size < 3
              ? `Select ${3 - selectedCardIds.size} more`
              : "Continue"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
