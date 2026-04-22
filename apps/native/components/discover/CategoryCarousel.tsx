import { View, TouchableOpacity, FlatList } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/Skeleton";

interface CategoryCarouselProps {
  userGender?: "male" | "female" | "prefer-not-to-say";
  isInlineVariant?: boolean;
}

export function CategoryCarousel({
  userGender,
  isInlineVariant = false,
}: CategoryCarouselProps) {
  const router = useRouter();
  const categorySamples = useQuery(
    api.items.queries.getCategorySamplesWithGender,
    { userGender },
  );

  if (categorySamples === undefined) {
    return (
      <View
        className={cn(
          isInlineVariant
            ? "py-6 border-y border-border/30 dark:border-border-dark/30"
            : "mb-6",
        )}
      >
        <View className="flex-row items-center justify-between mb-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-20" />
        </View>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[1, 2, 3, 4, 5, 6]}
          keyExtractor={(item) => `skeleton-${item}`}
          renderItem={() => (
            <View className="flex-col items-center gap-2 w-20 mr-4">
              <Skeleton className="w-16 h-16 rounded-full" />
              <Skeleton className="h-3 w-12 rounded" />
            </View>
          )}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        />
      </View>
    );
  }

  if (!categorySamples || categorySamples.length === 0) {
    return null;
  }

  return (
    <View
      className={cn(
        isInlineVariant
          ? "py-6 border-y border-border/30 dark:border-border-dark/30"
          : "mb-6",
      )}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3 px-4">
        <Text className="text-lg font-medium text-foreground dark:text-foreground-dark">
          {isInlineVariant ? "Explore Categories" : "Shop by Category"}
        </Text>
        <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground">
          {categorySamples.length} categories
        </Text>
      </View>

      {/* Horizontal scrolling circular categories */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={categorySamples}
        keyExtractor={(item) => item.category}
        renderItem={({ item: category }) => {
          const isGenderCategory = category.isGenderCategory;
          const href = isGenderCategory
            ? `/discover/gender/${category.category}?from=apparel`
            : `/discover/category/${category.category}?from=apparel`;

          return (
            <TouchableOpacity
              onPress={() => router.push(href as any)}
              className="flex-col items-center gap-2 w-20 mr-4"
            >
              {/* Circular image container */}
              <View
                className={cn(
                  "relative w-16 h-16 rounded-full overflow-hidden bg-surface-alt dark:bg-surface-alt-dark border-2 transition-all duration-200",
                  isGenderCategory
                    ? "border-primary/50 dark:border-primary-dark/50"
                    : "border-border/30 dark:border-border-dark/30",
                )}
              >
                {category.sampleImageUrl ? (
                  <Image
                    source={{ uri: category.sampleImageUrl }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                    transition={300}
                  />
                ) : (
                  <View className="w-full h-full items-center justify-center bg-gradient-to-br from-surface to-surface-alt dark:from-surface-dark dark:to-surface-alt-dark">
                    <Text className="text-2xl opacity-60">
                      {getCategoryEmoji(category.category)}
                    </Text>
                  </View>
                )}

                {/* Featured dot indicator for gender categories */}
                {isGenderCategory && (
                  <View className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary dark:bg-primary-dark rounded-full border-2 border-background dark:border-background-dark" />
                )}
              </View>

              {/* Label */}
              <Text
                className={cn(
                  "text-xs font-medium text-center leading-tight transition-colors",
                  isGenderCategory
                    ? "text-primary dark:text-primary-dark"
                    : "text-foreground dark:text-foreground-dark",
                )}
                numberOfLines={2}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      />
    </View>
  );
}

function getCategoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    top: "👕",
    bottom: "👖",
    dress: "👗",
    outfit: "🎭",
    outerwear: "🧥",
    shoes: "👟",
    accessory: "🎀",
    bag: "👜",
    jewelry: "💎",
    male: "👔",
    female: "👗",
    swimwear: "👙",
  };
  return emojis[category] || "✨";
}
