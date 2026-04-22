import { View, TouchableOpacity } from "react-native";
import { Text } from "@/components/ui/Text";
import { Compass, ArrowRight } from "lucide-react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/lib/contexts/ThemeContext";

interface ExploreCardProps {
  animate?: boolean;
  onExplore: () => void;
}

export function ExploreCard({ animate = true, onExplore }: ExploreCardProps) {
  const { isDark } = useTheme();

  return (
    <Animated.View
      entering={animate ? FadeInUp.duration(400) : undefined}
      className="mb-4 px-4"
    >
      <View className="rounded-2xl overflow-hidden border border-border/30 dark:border-border-dark/30 bg-surface dark:bg-surface-dark p-5">
        {/* Icon + Message */}
        <View className="flex-row items-start gap-3 mb-4">
          <View className="w-10 h-10 rounded-full bg-secondary/10 dark:bg-secondary-dark/10 items-center justify-center">
            <Compass size={20} color={isDark ? "#C9A07A" : "#A67C52"} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-foreground dark:text-foreground-dark mb-1">
              No exact matches found
            </Text>
            <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground leading-relaxed font-sans">
              I couldn't find items that perfectly match your request right now.
              Try exploring public looks for inspiration!
            </Text>
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity
          onPress={onExplore}
          activeOpacity={0.7}
          className="flex-row items-center justify-center gap-2 bg-surface-alt dark:bg-surface-alt-dark rounded-xl py-3 px-4 border border-border/30 dark:border-border-dark/30"
        >
          <Compass size={16} color={isDark ? "#C9A07A" : "#A67C52"} />
          <Text className="text-sm font-semibold text-primary dark:text-primary-dark">
            Explore Public Looks
          </Text>
          <ArrowRight size={14} color={isDark ? "#C9A07A" : "#A67C52"} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
