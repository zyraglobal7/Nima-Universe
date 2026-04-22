import { View, TouchableOpacity } from "react-native";
import { Text } from "@/components/ui/Text";
import Animated, { FadeInUp, FadeIn } from "react-native-reanimated";
import { useState, useEffect } from "react";
import { quickPrompts, shuffleArray } from "@/lib/mock-chat-data";

interface PromptSuggestionsProps {
  onSelect: (prompt: string) => void;
  displayCount?: number;
}

export function PromptSuggestions({
  onSelect,
  displayCount = 4,
}: PromptSuggestionsProps) {
  const [selectedPrompts, setSelectedPrompts] = useState(
    quickPrompts.slice(0, displayCount),
  );

  // Shuffle on mount (client-side only)
  useEffect(() => {
    setSelectedPrompts(shuffleArray(quickPrompts).slice(0, displayCount));
  }, [displayCount]);

  return (
    <View className="gap-3 w-full px-4">
      <Animated.View entering={FadeIn.duration(300)}>
        <Text className="text-sm font-medium text-muted-foreground dark:text-muted-dark-foreground text-center mb-1">
          Try asking for:
        </Text>
      </Animated.View>

      {selectedPrompts.map((prompt, index) => (
        <Animated.View
          key={prompt.id}
          entering={FadeInUp.duration(350).delay(100 + index * 80)}
        >
          <TouchableOpacity
            onPress={() => onSelect(prompt.text)}
            activeOpacity={0.7}
            className="flex-row items-center gap-2.5 bg-surface/80 dark:bg-surface-dark/80 border border-border/30 dark:border-border-dark/30 rounded-2xl px-3 py-2.5"
          >
            <Text className="text-base">{prompt.icon}</Text>
            <Text className="flex-1 text-sm text-foreground dark:text-foreground-dark font-sans">
              {prompt.text}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      ))}
    </View>
  );
}

// Compact prompt chips for inline use in chat
interface PromptChipsProps {
  onSelect: (prompt: string) => void;
  count?: number;
}

export function PromptChips({ onSelect, count = 3 }: PromptChipsProps) {
  const [chips, setChips] = useState(quickPrompts.slice(0, count));

  useEffect(() => {
    setChips(shuffleArray(quickPrompts).slice(0, count));
  }, [count]);

  return (
    <Animated.View
      entering={FadeInUp.duration(300)}
      className="flex-row flex-wrap gap-2 px-4 mb-4"
    >
      {chips.map((chip) => (
        <TouchableOpacity
          key={chip.id}
          onPress={() => onSelect(chip.text)}
          activeOpacity={0.7}
          className="bg-surface/60 dark:bg-surface-dark/60 border border-border/30 dark:border-border-dark/30 rounded-full px-3 py-1.5"
        >
          <Text className="text-sm text-foreground dark:text-foreground-dark">
            {chip.icon} {chip.text}
          </Text>
        </TouchableOpacity>
      ))}
    </Animated.View>
  );
}
