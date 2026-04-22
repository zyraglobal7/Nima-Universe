import { View, Dimensions } from "react-native";
import { Text } from "@/components/ui/Text";
import { Sparkles } from "lucide-react-native";
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useState, useEffect, useCallback } from "react";
import { getRandomGreeting } from "@/lib/mock-chat-data";

interface WelcomeHeroProps {
  className?: string;
}

// Typing text animation component
function TypingText({ text }: { text: string }) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    setDisplayedText("");
    setIsTyping(true);
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.substring(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 35);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <Text className="text-lg text-foreground dark:text-foreground-dark text-center font-sans leading-relaxed">
      {displayedText}
      {isTyping && (
        <Text className="text-primary dark:text-primary-dark">|</Text>
      )}
    </Text>
  );
}

export function WelcomeHero({ className }: WelcomeHeroProps) {
  const [greeting] = useState(() => getRandomGreeting());

  // Glow pulse animation
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.4);

  useEffect(() => {
    glowScale.value = withRepeat(
      withTiming(1.3, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    glowOpacity.value = withRepeat(
      withTiming(0.7, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  return (
    <Animated.View
      entering={FadeInDown.duration(600).springify()}
      className={className}
    >
      <View className="items-center">
        {/* Nima icon with glow */}
        <View className="items-center justify-center mb-6">
          {/* Glow ring */}
          <Animated.View
            style={[
              glowStyle,
              {
                position: "absolute",
                width: 96,
                height: 96,
                borderRadius: 48,
              },
            ]}
          >
            <LinearGradient
              colors={[
                "rgba(166, 124, 82, 0.3)",
                "rgba(201, 160, 122, 0.2)",
                "transparent",
              ]}
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
              }}
            />
          </Animated.View>

          {/* Icon circle */}
          <View className="w-20 h-20 rounded-full items-center justify-center overflow-hidden">
            <LinearGradient
              colors={["#A67C52", "#C9A07A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
              }}
            />
            <Sparkles size={36} color="#FAF8F5" />
          </View>
        </View>

        {/* Title */}
        <Animated.View entering={FadeIn.duration(400).delay(200)}>
          <Text className="text-3xl font-serif text-foreground dark:text-foreground-dark text-center mb-4">
            Ask Nima
          </Text>
        </Animated.View>

        {/* Animated greeting */}
        <Animated.View entering={FadeIn.duration(400).delay(400)}>
          <View className="max-w-[280px]">
            <TypingText text={greeting} />
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}
