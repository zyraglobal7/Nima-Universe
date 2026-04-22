import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Sparkles } from "lucide-react-native";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";

interface NimaChatBubbleProps {
  message: string;
}

export function NimaChatBubble({ message }: NimaChatBubbleProps) {
  const { isDark } = useTheme();

  return (
    <View className="flex-row gap-3 items-start">
      {/* Nima Avatar */}
      <View className="w-8 h-8 rounded-full overflow-hidden">
        <LinearGradient
          colors={isDark ? ["#C9A07A", "#A67C52"] : ["#A67C52", "#8B6843"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Sparkles size={14} color="#FFF" />
        </LinearGradient>
      </View>

      {/* Chat bubble */}
      <View className="flex-1 bg-surface dark:bg-surface-dark border border-border/30 dark:border-border-dark/30 rounded-2xl rounded-tl-sm px-4 py-3">
        <Text className="text-sm text-foreground dark:text-foreground-dark leading-relaxed">
          {message}
        </Text>
      </View>
    </View>
  );
}
