import { TouchableOpacity, View, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Sparkles } from "lucide-react-native";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/lib/contexts/ThemeContext";

interface FloatingAskNimaButtonProps {
  visible: boolean;
  onPress: () => void;
}

export function FloatingAskNimaButton({ visible, onPress }: FloatingAskNimaButtonProps) {
  const { isDark } = useTheme();

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={styles.container}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={[
          styles.pill,
          {
            backgroundColor: isDark
              ? "rgba(37, 34, 32, 0.92)"
              : "rgba(250, 248, 245, 0.92)",
            borderColor: "rgba(255, 255, 255, 0.2)",
          },
        ]}
      >
        {/* Sparkles icon with gradient background */}
        <View style={styles.iconWrapper}>
          <LinearGradient
            colors={isDark ? ["#C9A07A", "#A67C52"] : ["#5C2A33", "#A67C52"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconGradient}
          >
            <Sparkles size={14} color="#FAF8F5" />
          </LinearGradient>
        </View>

        <Text
          style={[
            styles.label,
            { color: isDark ? "#F5F0E8" : "#2D2926" },
          ]}
        >
          Ask Nima
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 82,
    alignSelf: "center",
    zIndex: 40,
    left: 0,
    right: 0,
    alignItems: "center",
    pointerEvents: "box-none",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 50,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    gap: 8,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: "hidden",
  },
  iconGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
    fontFamily: "DMSans_400Regular",
  },
});
