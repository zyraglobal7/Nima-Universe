import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  Animated,
} from "react-native";
import { WifiOff, RefreshCw } from "lucide-react-native";
import { useNetwork } from "@/lib/contexts/NetworkContext";

/**
 * A persistent banner shown when the device has no internet connection.
 * Themed to match the Nima brand (warm luxury colors).
 */
export function NoInternetBanner() {
  const { isConnected, isInternetReachable, refresh } = useNetwork();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Show the banner when explicitly disconnected OR when internet is unreachable
  const isOffline = !isConnected || isInternetReachable === false;

  if (!isOffline) {
    return null;
  }

  const bg = isDark ? "#302B28" : "#EDE6DC";
  const border = isDark ? "#3D3835" : "#E0D8CC";
  const textColor = isDark ? "#F5F0E8" : "#2D2926";
  const mutedColor = isDark ? "#C4B8A8" : "#6B635B";
  const accent = isDark ? "#C9A07A" : "#5C2A33";
  const iconColor = isDark ? "#D4807A" : "#B85C5C";

  return (
    <View
      style={{
        backgroundColor: bg,
        borderBottomWidth: 1,
        borderBottomColor: border,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: isDark ? "rgba(212, 128, 122, 0.15)" : "rgba(184, 92, 92, 0.1)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <WifiOff size={18} color={iconColor} />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: textColor,
          }}
        >
          No internet connection
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: mutedColor,
            marginTop: 1,
          }}
        >
          Some features may be unavailable
        </Text>
      </View>

      <TouchableOpacity
        onPress={refresh}
        activeOpacity={0.7}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: accent,
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
        }}
      >
        <RefreshCw size={12} color={accent} />
        <Text
          style={{
            fontSize: 12,
            fontWeight: "600",
            color: accent,
          }}
        >
          Retry
        </Text>
      </TouchableOpacity>
    </View>
  );
}

