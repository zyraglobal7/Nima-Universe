import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Sparkles } from "lucide-react-native";
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useEffect, useState, useRef } from "react";
import { searchingMessages } from "@/lib/mock-chat-data";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/lib/contexts/ThemeContext";

interface SearchingCardProps {
  animate?: boolean;
}

export function SearchingCard({ animate = true }: SearchingCardProps) {
  const { isDark } = useTheme();
  const [currentMessage, setCurrentMessage] = useState(searchingMessages[0]);
  const messageIndex = useRef(0);

  // Rotate through searching messages
  useEffect(() => {
    const interval = setInterval(() => {
      messageIndex.current =
        (messageIndex.current + 1) % searchingMessages.length;
      setCurrentMessage(searchingMessages[messageIndex.current]);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Sparkle rotation
  const rotation = useSharedValue(0);
  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  const sparkleStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${rotation.value}deg` }],
  }));

  // Shimmer opacity
  const shimmerOpacity = useSharedValue(0.3);
  useEffect(() => {
    shimmerOpacity.value = withRepeat(
      withTiming(0.8, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmerOpacity.value,
  }));

  return (
    <Animated.View
      entering={animate ? FadeInUp.duration(400) : undefined}
      className="mb-4 px-4"
    >
      <View className="rounded-2xl overflow-hidden border border-primary/20 dark:border-primary-dark/20">
        {/* Shimmer gradient overlay */}
        <Animated.View
          style={[
            shimmerStyle,
            {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1,
            },
          ]}
        >
          <LinearGradient
            colors={
              isDark
                ? [
                    "rgba(166,124,82,0.05)",
                    "rgba(201,160,122,0.1)",
                    "rgba(166,124,82,0.05)",
                  ]
                : [
                    "rgba(166,124,82,0.03)",
                    "rgba(201,160,122,0.08)",
                    "rgba(166,124,82,0.03)",
                  ]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
          />
        </Animated.View>

        <View className="bg-surface dark:bg-surface-dark p-5">
          {/* Sparkle icon + header */}
          <View className="flex-row items-center gap-3 mb-4">
            <View className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary-dark/10 items-center justify-center">
              <Animated.View style={sparkleStyle}>
                <Sparkles size={20} color={isDark ? "#C9A07A" : "#A67C52"} />
              </Animated.View>
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-foreground dark:text-foreground-dark">
                Nima is searching...
              </Text>
            </View>
          </View>

          {/* Rotating message */}
          <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground mb-3 font-sans">
            {currentMessage}
          </Text>

          {/* Progress dots */}
          <View className="flex-row items-center gap-1.5">
            <ProgressDot delay={0} isDark={isDark} />
            <ProgressDot delay={300} isDark={isDark} />
            <ProgressDot delay={600} isDark={isDark} />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

function ProgressDot({ delay, isDark }: { delay: number; isDark: boolean }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  // Apply the delay by starting the animation later
  const dotStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      entering={FadeInUp.duration(200).delay(delay)}
      style={[dotStyle]}
      className="w-2 h-2 rounded-full bg-primary dark:bg-primary-dark"
    />
  );
}
