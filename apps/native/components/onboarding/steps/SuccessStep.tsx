import { useEffect, useState } from "react";
import { View, Text, Pressable, Image, Animated } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { StepProps } from "../types";

export function SuccessStep(_props: StepProps) {
  const router = useRouter();
  const [showContent, setShowContent] = useState(false);
  const sparkleAnim = new Animated.Value(0);

  const lookPreviews = useQuery(api.workflows.index.getOnboardingLookPreviews);

  useEffect(() => {
    const t = setTimeout(() => setShowContent(true), 300);

    Animated.sequence([
      Animated.timing(sparkleAnim, {
        toValue: 1.2,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(sparkleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();

    return () => clearTimeout(t);
  }, []);

  const handleCheckItOut = () => {
    router.replace("/(tabs)/discover");
  };

  return (
    <View className="flex-1 items-center justify-center px-6">
      {/* Decorative glows */}
      <View className="absolute top-1/4 left-1/5 w-64 h-64 bg-primary/5 rounded-full" />
      <View className="absolute bottom-1/4 right-1/5 w-48 h-48 bg-secondary/5 rounded-full" />

      <Animated.View
        className="items-center gap-7 max-w-sm w-full"
        style={{ opacity: showContent ? 1 : 0 }}
      >
        {/* Sparkle icon */}
        <Animated.View
          className="w-24 h-24 rounded-full bg-primary items-center justify-center"
          style={{ transform: [{ scale: sparkleAnim }] }}
        >
          <Text style={{ fontSize: 40 }}>✨</Text>
        </Animated.View>

        {/* Headline */}
        <View className="items-center gap-2">
          <Text className="text-4xl font-serif font-semibold text-foreground text-center">
            Your Looks{"\n"}are ready
          </Text>
          <Text className="text-muted-foreground text-base text-center">
            Styled just for you by Nima
          </Text>
        </View>

        {/* 5 credits gift banner */}
        <View className="bg-primary/10 border border-primary/20 rounded-2xl px-5 py-4 w-full flex-row items-center gap-3">
          <Text style={{ fontSize: 28 }}>🎁</Text>
          <View className="flex-1">
            <Text className="text-foreground text-sm font-semibold">
              5 free looks gifted!
            </Text>
            <Text className="text-muted-foreground text-xs mt-0.5">
              Explore your personalized feed
            </Text>
          </View>
        </View>

        {/* Look previews — 3 overlapping circles */}
        {lookPreviews && lookPreviews.length > 0 && (
          <View className="items-center py-2">
            <View className="flex-row" style={{ height: 80 }}>
              {lookPreviews.slice(0, 3).map((preview, i) => (
                <View
                  key={preview.lookId}
                  className="w-20 h-20 rounded-full bg-surface border-2 border-background overflow-hidden"
                  style={{
                    marginLeft: i > 0 ? -16 : 0,
                    zIndex: lookPreviews.length - i,
                  }}
                >
                  {preview.imageUrl ? (
                    <Image
                      source={{ uri: preview.imageUrl }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="flex-1 bg-primary/20 items-center justify-center">
                      <Text style={{ fontSize: 24 }}>👗</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
            <Text className="text-xs text-muted-foreground mt-2">
              {lookPreviews.length} look{lookPreviews.length !== 1 ? "s" : ""} curated for you
            </Text>
          </View>
        )}

        {/* CTA */}
        <Pressable
          onPress={handleCheckItOut}
          className="w-full bg-primary py-4 rounded-full items-center"
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <Text className="text-primary-foreground text-base font-semibold tracking-wide">
            Check it Out
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
