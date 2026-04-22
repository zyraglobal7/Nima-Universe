import React, { useEffect } from "react";
import { View, Animated, Easing } from "react-native"; // Native Animated
import { Loader2 } from "lucide-react-native";
import { Text } from "./Text";

interface LoaderProps {
  message?: string;
  className?: string;
  size?: number;
  color?: string;
}

export function Loader({
  message,
  className,
  size = 48,
  color = "#5C2A33", // Primary Burgundy
}: LoaderProps) {
  const spinValue = new Animated.Value(0);

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1200, // Slightly slower for elegance
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View
      className={`flex-1 flex-col items-center justify-center px-6 py-12 ${className || ""}`}
    >
      <View className="max-w-md items-center space-y-6">
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Loader2 size={size} color={color} />
        </Animated.View>

        {message && (
          <Text className="text-muted-foreground text-center mt-4">
            {message}
          </Text>
        )}
      </View>
    </View>
  );
}
