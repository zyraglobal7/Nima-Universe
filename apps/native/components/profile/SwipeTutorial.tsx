import React, { useEffect } from "react";
import { View, TouchableOpacity } from "react-native";
import { Text } from "@/components/ui/Text";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useTheme } from "@/lib/contexts/ThemeContext";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  FadeIn,
  FadeOut,
  Easing,
} from "react-native-reanimated";

interface SwipeTutorialProps {
  onDismiss: () => void;
}

export function SwipeTutorial({ onDismiss }: SwipeTutorialProps) {
  const { isDark } = useTheme();

  // Animated horizontal translate for the swipe indicator
  const translateX = useSharedValue(0);

  useEffect(() => {
    // Animate a lateral sway: left → center → right → center
    translateX.value = withRepeat(
      withSequence(
        withTiming(-18, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(18, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 400, easing: Easing.inOut(Easing.ease) })
      ),
      -1, // infinite
      false
    );

    // Auto-dismiss after 5 seconds
    const timeout = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timeout);
  }, []);

  const swipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const chevronColor = isDark ? "#C9A07A" : "#5C2A33";

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      className="absolute inset-0 z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onDismiss}
        className="flex-1 items-center justify-center px-8"
      >
        {/* Card */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          className="bg-surface dark:bg-surface-dark rounded-2xl px-8 py-8 items-center w-full max-w-[320px]"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          {/* Swipe indicator row */}
          <Animated.View
            style={swipeStyle}
            className="flex-row items-center gap-4 mb-5"
          >
            <ChevronLeft size={28} color={chevronColor} />
            <View
              className="w-12 h-12 rounded-full items-center justify-center bg-primary/10 dark:bg-primary-dark/10"
            >
              <Text className="text-2xl">👆</Text>
            </View>
            <ChevronRight size={28} color={chevronColor} />
          </Animated.View>

          {/* Instruction text */}
          <Text className="text-base font-serif font-semibold text-foreground dark:text-foreground-dark text-center mb-2">
            Swipe to switch tabs
          </Text>
          <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground text-center mb-6">
            Swipe left or right to navigate between Settings, Photos, Style &
            Fit, and Account.
          </Text>

          {/* Dismiss button */}
          <TouchableOpacity
            onPress={onDismiss}
            className="bg-primary dark:bg-primary-dark px-8 py-3 rounded-xl"
          >
            <Text className="text-sm font-semibold text-primary-foreground dark:text-primary-dark-foreground">
              Got it
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}


