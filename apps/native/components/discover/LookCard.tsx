import { View, Pressable } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import { Heart, Sparkles, AlertCircle } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { formatPrice } from "@/lib/utils/format";
import type { Id } from "@/convex/_generated/dataModel";
import { ActivityIndicator } from "react-native";

/* ─── Types (matches Next.js LookCard) ─── */

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  currency: string;
  imageUrl: string;
  storeUrl: string;
  storeName: string;
  color: string;
}

export interface Look {
  id: string;
  imageUrl: string;
  products: Product[];
  totalPrice: number;
  currency: string;
  styleTags: string[];
  occasion: string;
  nimaNote: string;
  createdAt: Date;
  height: "short" | "medium" | "tall" | "extra-tall";
  isLiked?: boolean;
}

export interface LookWithStatus extends Look {
  isGenerating?: boolean;
  generationFailed?: boolean;
}

/* ─── Height map ─── */

const heightMap: Record<string, number> = {
  short: 200,
  medium: 280,
  tall: 340,
  "extra-tall": 400,
};

/* ─── Component ─── */

interface LookCardProps {
  look: LookWithStatus;
  index: number;
}

export function LookCard({ look, index }: LookCardProps) {
  const router = useRouter();
  const hasImage = look.imageUrl && look.imageUrl.length > 0;
  const isGenerating = look.isGenerating;
  const generationFailed = look.generationFailed;
  const h = heightMap[look.height] ?? 280;

  const handlePress = () => {
    router.push(`/look/${look.id}` as any);
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).duration(500)}
      style={{ marginBottom: 16 }}
    >
      <Pressable
        onPress={handlePress}
        className="rounded-2xl bg-surface dark:bg-surface-dark border border-border/30 dark:border-border-dark/30 overflow-hidden active:opacity-80"
      >
        {/* Image / Generating / Failed / Fallback */}
        <View style={{ height: h, position: "relative" }}>
          {hasImage ? (
            <Image
              source={{ uri: look.imageUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={300}
              priority={index < 2 ? "high" : "low"}
            />
          ) : isGenerating ? (
            <View className="flex-1 bg-surface-alt dark:bg-surface-alt-dark items-center justify-center">
              <ActivityIndicator size="large" color="#A67C52" />
              <View className="flex-row items-center gap-2 mt-3">
                <Sparkles size={14} color="#A67C52" />
                <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground">
                  Generating look...
                </Text>
              </View>
            </View>
          ) : generationFailed ? (
            <View className="flex-1 bg-surface-alt dark:bg-surface-alt-dark items-center justify-center px-4">
              <AlertCircle size={24} color="#D97706" />
              <Text className="text-sm text-foreground dark:text-foreground-dark mt-2 text-center">
                Image generation failed
              </Text>
              <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground mt-1 text-center">
                Tap to view look and retry
              </Text>
              {/* Small product previews */}
              <View className="flex-row gap-1 mt-3">
                {look.products.slice(0, 3).map((p) => (
                  <View
                    key={p.id}
                    className="w-10 h-10 rounded-lg bg-surface dark:bg-surface-dark border border-border/50 dark:border-border-dark/50 overflow-hidden"
                  >
                    {p.imageUrl ? (
                      <Image
                        source={{ uri: p.imageUrl }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                      />
                    ) : (
                      <View className="flex-1 items-center justify-center">
                        <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground">
                          {p.category.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          ) : (
            /* Fallback – product thumbnails */
            <View className="flex-1 bg-surface-alt dark:bg-surface-alt-dark items-center justify-center px-4">
              <View className="flex-row flex-wrap gap-1 justify-center mb-2">
                {look.products.slice(0, 3).map((p) => (
                  <View
                    key={p.id}
                    className="w-12 h-12 rounded-lg bg-surface dark:bg-surface-dark border border-border/50 dark:border-border-dark/50 overflow-hidden"
                  >
                    {p.imageUrl ? (
                      <Image
                        source={{ uri: p.imageUrl }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                      />
                    ) : (
                      <View className="flex-1 items-center justify-center">
                        <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground">
                          {p.category.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
              <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground">
                {look.products.length} items
              </Text>
            </View>
          )}

          {/* Price badge */}
          <View className="absolute bottom-3 right-3 px-3 py-1.5 bg-background/90 dark:bg-background-dark/90 rounded-full border border-border/50 dark:border-border-dark/50">
            <Text className="text-xs font-medium text-foreground dark:text-foreground-dark">
              {formatPrice(look.totalPrice, look.currency)}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View className="p-3">
          <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground">
            {look.occasion} • {look.products.length} items
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
