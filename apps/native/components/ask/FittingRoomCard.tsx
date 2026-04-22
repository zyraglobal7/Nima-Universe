import { View, TouchableOpacity } from "react-native";
import { Text } from "@/components/ui/Text";
import { Sparkles, ArrowRight } from "lucide-react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/lib/contexts/ThemeContext";

interface FittingRoomCardProps {
  sessionId: string;
  lookCount?: number;
  animate?: boolean;
  onPress: () => void;
  variant?: "fresh" | "remix";
}

export function FittingRoomCard({
  sessionId,
  lookCount = 3,
  animate = true,
  onPress,
  variant = "fresh",
}: FittingRoomCardProps) {
  const { isDark } = useTheme();

  const isRemix = variant === "remix";

  return (
    <Animated.View
      entering={animate ? FadeInUp.duration(400).springify() : undefined}
      className="mb-4 px-4"
    >
      <View className="rounded-2xl overflow-hidden border border-primary/20 dark:border-primary-dark/20">
        {/* Gradient header */}
        <LinearGradient
          colors={
            isRemix
              ? isDark
                ? ["#5B3A8C", "#8B5CF6"]
                : ["#7C3AED", "#A78BFA"]
              : isDark
                ? ["#A67C52", "#C9A07A"]
                : ["#C9A07A", "#A67C52"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingVertical: 14, paddingHorizontal: 16 }}
        >
          <View className="flex-row items-center gap-2">
            <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center">
              <Sparkles size={16} color="#FFFFFF" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-white">
                {isRemix ? "Remixed Look Ready! ✨" : "Looks Ready! ✨"}
              </Text>
              <Text className="text-xs text-white/80 mt-0.5">
                {isRemix
                  ? "Your remix is ready to try on"
                  : `${lookCount} look${lookCount !== 1 ? "s" : ""} curated just for you`}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Body */}
        <View className="bg-surface dark:bg-surface-dark p-4">
          <Text className="text-sm text-foreground/80 dark:text-foreground-dark/80 mb-4 font-sans">
            {isRemix
              ? "I've remixed your look with a fresh twist. Step in and see how it looks!"
              : "I've found pieces that match your style perfectly. Try them on in the fitting room!"}
          </Text>

          {/* CTA Button */}
          <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            className="overflow-hidden rounded-xl"
          >
            <LinearGradient
              colors={
                isRemix
                  ? ["#7C3AED", "#A78BFA"]
                  : isDark
                    ? ["#C9A07A", "#A67C52"]
                    : ["#A67C52", "#8B6A42"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                paddingVertical: 14,
                paddingHorizontal: 20,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text className="text-white font-semibold text-base mr-2">
                Step into the Fitting Room
              </Text>
              <ArrowRight size={18} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}
