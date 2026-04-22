import React, { useState, useEffect, useRef } from "react";
import { Text, View, Animated } from "react-native";
import { cn } from "@/lib/utils";

interface TypingTextProps {
  text: string;
  className?: string;
  textClassName?: string;
}

export function TypingText({
  text,
  className,
  textClassName,
}: TypingTextProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setDisplayedText("");
    setShowCursor(true);
    let index = 0;

    // Typing effect
    const typingInterval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(typingInterval);
      }
    }, 50);

    return () => clearInterval(typingInterval);
  }, [text]);

  // Blink cursor
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.delay(500),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.delay(500),
      ]).start();
      setShowCursor((prev) => !prev);
    }, 500);

    return () => clearInterval(blinkInterval);
  }, []);

  return (
    <View className={cn("flex-row items-center", className)}>
      <Text
        className={cn("text-sm font-medium text-foreground dark:text-foreground-dark", textClassName)}
      >
        {displayedText}
      </Text>
      <Animated.View style={{ opacity: showCursor ? 1 : 0 }}>
        <View className="ml-0.5 w-0.5 h-4 bg-foreground dark:bg-foreground-dark" />
      </Animated.View>
    </View>
  );
}
