import React, { useState, useEffect, useRef } from "react";
import { View, Animated, Easing } from "react-native";
import { MessageCircle } from "lucide-react-native";
import { TypingText } from "./TypingText";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/lib/contexts/ThemeContext";

const CHAT_MESSAGES = [
  "You'd look so good in this...",
  "See yourself in every outfit...",
  "Let me style you today...",
  "Ready to discover your look?",
  "Your perfect fit awaits...",
];

export function ChatBubble() {
  const { isDark } = useTheme();
  const [messageIndex, setMessageIndex] = useState(0);
  const [key, setKey] = useState(0);

  // Animations
  const floatAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const textFadeAnim = useRef(new Animated.Value(1)).current;

  // Float loop
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  // Entrance
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Message cycle
  useEffect(() => {
    const interval = setInterval(() => {
      // Text fade out
      Animated.timing(textFadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setMessageIndex((prev) => (prev + 1) % CHAT_MESSAGES.length);
        setKey((prev) => prev + 1);
        // Text fade in
        Animated.timing(textFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: floatAnim }, { scale: scaleAnim }],
      }}
    >
      <View className="relative">
        {/* Chat bubble */}
        <View className="bg-surface dark:bg-surface-dark border border-border/50 dark:border-border-dark/50 rounded-2xl px-5 py-3 shadow-lg flex-row items-center gap-3">
          {/* Icon Circle */}
          <LinearGradient
            colors={isDark ? ["#C9A07A", "#A66B73"] : ["#5C2A33", "#A67C52"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="w-8 h-8 rounded-full items-center justify-center"
          >
            <MessageCircle size={16} color={isDark ? "#1A1614" : "#FAF8F5"} />
          </LinearGradient>

          {/* Text Area */}
          <View className="min-w-[180px]">
            <Animated.View style={{ opacity: textFadeAnim }}>
              <TypingText key={key} text={CHAT_MESSAGES[messageIndex]} />
            </Animated.View>
          </View>
        </View>
        {/* Bubble tail */}
        <View className="absolute -bottom-2 left-8 w-4 h-4 bg-surface dark:bg-surface-dark border-b border-r border-border/50 dark:border-border-dark/50 transform rotate-45" />
      </View>
    </Animated.View>
  );
}
