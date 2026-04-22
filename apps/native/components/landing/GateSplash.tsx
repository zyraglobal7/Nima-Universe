import React, { useEffect, useRef, useState } from "react";
import { View, Animated, Easing, Dimensions, StyleSheet } from "react-native";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { LinearGradient } from "expo-linear-gradient";
import { ChatBubble } from "./ChatBubble";
import { useRouter } from "expo-router";
import { launchWorkOSAuth } from "@/lib/auth";
import { useTheme } from "@/lib/contexts/ThemeContext";

interface GateSplashProps {
  /** @deprecated No longer used — auth is initiated directly from the splash */
  onGetStarted?: () => void;
}

export function GateSplash({ onGetStarted }: GateSplashProps) {
  const router = useRouter();
  const { isDark } = useTheme();

  // Animations
  const sunAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Rising Sun Animation Loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(sunAnim, {
          toValue: 1,
          duration: 8000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false, // color interpolation not supported on native driver
        }),
        Animated.timing(sunAnim, {
          toValue: 0,
          duration: 8000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    ).start();

    // Content Entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Interpolated Background Values
  const sunPositionY = sunAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["100%", "0%"],
  });

  const sunOpacity = sunAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.6, 0.4],
  });

  const handleSignIn = async () => {
    try {
      const result = await launchWorkOSAuth("sign-in");
      if (result) {
        // Auth state is already updated via callLogin() inside launchWorkOSAuth.
        // Navigate to "/" so index.tsx can run onboarding checks and redirect
        // to the right screen (discover or onboarding) with a fully authenticated
        // Convex client.
        router.replace("/");
      }
      // If result is null, user cancelled — do nothing
    } catch (err) {
      console.error("[SIGN_IN] Error:", err);
    }
  };

  return (
    <View className="flex-1 bg-background dark:bg-background-dark relative overflow-hidden">
      {/* Animated Background Layers */}
      {/* We use absolute positioned views with gradients to simulate the CSS radial gradients */}

      {/* Subtle animated gradient layer */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: sunOpacity }]}>
        {/* Layer 1: Subtle warm glow at bottom */}
        <LinearGradient
          colors={
            isDark
              ? ["transparent", "rgba(201, 160, 122, 0.08)"]
              : ["transparent", "rgba(92, 42, 51, 0.12)"]
          }
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0.3 }}
          end={{ x: 0.5, y: 1 }}
        />
        {/* Layer 2: Rising warmth effect */}
        <LinearGradient
          colors={
            isDark
              ? ["transparent", "rgba(166, 107, 115, 0.06)", "rgba(201, 160, 122, 0.1)"]
              : ["transparent", "rgba(166, 124, 82, 0.1)", "rgba(201, 160, 122, 0.15)"]
          }
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>

      {/* Content Container */}
      <View className="flex-1 items-center justify-center px-6 py-12">
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            alignItems: "center",
            width: "100%",
            maxWidth: 400,
          }}
        >
          {/* Logo */}
          <View className="items-center mb-8">
            <Text
              variant="h1"
              className="text-5xl md:text-6xl tracking-tight text-center"
            >
              Nima
            </Text>
            <Text className="text-sm uppercase tracking-[0.3em] text-muted-foreground dark:text-muted-dark-foreground mt-2 font-light">
              AI Stylist
            </Text>
          </View>

          {/* Chat Bubble */}
          <View className="mb-10 items-center">
            <ChatBubble />
          </View>

          {/* Tagline */}
          <View className="items-center mb-12 space-y-3">
            <Text className="text-center leading-8 text-xl font-serif font-medium text-foreground dark:text-foreground-dark">
              Your personal AI stylist.
            </Text>
            <Text
              variant="large"
              className="text-muted-foreground dark:text-muted-dark-foreground font-light text-center"
            >
              See yourself in every outfit.
            </Text>
          </View>

          {/* Actions */}
          <View className="w-full max-w-[18rem]">
            <Button
              size="lg"
              label="Continue with Google"
              onPress={handleSignIn}
              className="w-full dark:bg-primary-dark"
            />
          </View>
        </Animated.View>
      </View>

      {/* Bottom Fade */}
      <LinearGradient
        colors={
          isDark
            ? ["transparent", "rgba(26, 22, 20, 0.4)"]
            : ["transparent", "rgba(237, 230, 220, 0.3)"]
        }
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 120,
        }}
        pointerEvents="none"
      />
    </View>
  );
}
