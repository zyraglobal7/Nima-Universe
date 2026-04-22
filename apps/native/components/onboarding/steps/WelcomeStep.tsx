import { View, Text, Pressable } from "react-native";
import { StepProps } from "../types";
import {
  trackStepCompleted,
  trackBackClicked,
  ONBOARDING_STEPS,
} from "@/lib/analytics";

export function WelcomeStep({ onNext, onBack }: StepProps) {
  const steps = [
    { emoji: "👤", text: "A bit about you" },
    { emoji: "🎨", text: "Your style vibe" },
    { emoji: "📏", text: "Your perfect fit" },
    { emoji: "📍", text: "Where you are & your budget" },
    { emoji: "📸", text: "How you look (the fun part!)" },
  ];

  return (
    <View className="flex-1 justify-center items-center px-6 py-12">
      {/* Back button */}
      <Pressable
        onPress={() => {
          trackBackClicked(ONBOARDING_STEPS.WELCOME);
          onBack?.();
        }}
        className="absolute top-6 left-6 p-2 rounded-full"
      >
        <Text className="text-2xl text-muted-foreground">←</Text>
      </Pressable>

      <View className="w-full max-w-sm items-center gap-8">
        {/* Avatar */}
        <View className="w-32 h-32 rounded-full bg-primary/20 items-center justify-center border-2 border-primary/10">
          <Text className="text-5xl">✨</Text>
        </View>

        {/* Greeting */}
        <View className="items-center gap-4">
          <Text className="text-3xl font-serif font-semibold text-foreground">
            Hey there!
          </Text>
          <Text className="text-lg text-muted-foreground leading-7 text-center">
            I'm <Text className="text-primary font-medium">Nima</Text>, your
            personal AI stylist. This is what I'll need from you to get started.
          </Text>
        </View>

        {/* What to expect */}
        <View className="bg-surface rounded-2xl p-6 w-full gap-4">
          <Text className="text-sm font-medium text-foreground">
            In the next few steps, I'll learn about:
          </Text>
          <View className="gap-3">
            {steps.map((item, i) => (
              <View key={i} className="flex-row items-center gap-3">
                <Text className="text-lg">{item.emoji}</Text>
                <Text className="text-sm text-muted-foreground">
                  {item.text}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Time estimate */}
        <Text className="text-xs text-muted-foreground">
          Takes about 2-3 minutes
        </Text>

        {/* CTA */}
        <Pressable
          onPress={() => {
            trackStepCompleted(ONBOARDING_STEPS.WELCOME);
            onNext();
          }}
          className="w-full max-w-xs bg-primary py-4 rounded-full items-center"
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <Text className="text-primary-foreground text-base font-semibold tracking-wide">
            Let's do this
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
