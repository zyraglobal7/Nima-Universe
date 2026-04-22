import { View, TouchableOpacity, Pressable } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import { cn } from "@/lib/utils";
import { Heart } from "lucide-react-native";
import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";

export interface ApparelItem {
  _id: Id<"items">;
  publicId: string;
  name: string;
  brand?: string;
  category: string;
  price: number;
  currency: string;
  originalPrice?: number;
  colors: string[];
  primaryImageUrl?: string;
  isFeatured?: boolean;
  material?: string;
  occasion?: string[];
  tags?: string[];
}

interface ApparelItemCardProps {
  item: ApparelItem;
  index?: number;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: (itemId: Id<"items">) => void;
  isLiked?: boolean;
  onToggleLike?: (itemId: Id<"items">) => void;
  isInfiniteScrollLoad?: boolean;
}

export function ApparelItemCard({
  item,
  index = 0,
  isSelectionMode = false,
  isSelected = false,
  onSelect,
  isLiked = false,
  onToggleLike,
  isInfiniteScrollLoad = false,
}: ApparelItemCardProps) {
  const router = useRouter();
  const [imageLoaded, setImageLoaded] = useState(false);

  const handlePress = () => {
    if (isSelectionMode && onSelect) {
      onSelect(item._id);
    } else {
      router.push(`/product/${item.publicId}` as any);
    }
  };

  const handleLikePress = (e: any) => {
    e.stopPropagation();
    if (onToggleLike) {
      onToggleLike(item._id);
    }
  };

  const hasDiscount = item.originalPrice && item.originalPrice > item.price;
  const discountPercent = hasDiscount
    ? Math.round(
        ((item.originalPrice! - item.price) / item.originalPrice!) * 100,
      )
    : 0;

  return (
    <Pressable
      onPress={handlePress}
      className={cn(
        "rounded-2xl bg-surface dark:bg-surface-dark border border-border/30 dark:border-border-dark/30 overflow-hidden mb-4",
        isSelected && "border-2 border-primary dark:border-primary-dark",
        "active:opacity-80",
      )}
    >
      {/* Image container */}
      <View className="relative aspect-[3/4] bg-surface-alt dark:bg-surface-alt-dark">
        {!imageLoaded && (
          <View className="absolute inset-0 bg-surface-alt dark:bg-surface-alt-dark animate-pulse" />
        )}

        {item.primaryImageUrl && (
          <Image
            source={{ uri: item.primaryImageUrl }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={300}
            onLoad={() => setImageLoaded(true)}
          />
        )}

        {/* Selection overlay */}
        {isSelectionMode && (
          <View className="absolute inset-0 bg-black/20">
            <View className="absolute top-2 right-2 w-6 h-6 rounded-full border-2 border-white bg-white items-center justify-center">
              {isSelected && (
                <View className="w-4 h-4 rounded-full bg-primary dark:bg-primary-dark" />
              )}
            </View>
          </View>
        )}

        {/* Like button */}
        {!isSelectionMode && onToggleLike && (
          <TouchableOpacity
            onPress={handleLikePress}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/90 dark:bg-background-dark/90 items-center justify-center"
          >
            <Heart
              size={18}
              color={isLiked ? "#A67C52" : "#9C948A"}
              fill={isLiked ? "#A67C52" : "transparent"}
            />
          </TouchableOpacity>
        )}

        {/* Discount badge */}
        {hasDiscount && (
          <View className="absolute top-2 left-2 bg-destructive dark:bg-destructive-dark px-2 py-1 rounded-full">
            <Text className="text-destructive-foreground dark:text-destructive-dark-foreground text-xs font-semibold">
              -{discountPercent}%
            </Text>
          </View>
        )}

        {/* Featured badge */}
        {item.isFeatured && (
          <View className="absolute bottom-2 left-2 bg-primary/90 dark:bg-primary-dark/90 px-2 py-0.5 rounded-full">
            <Text className="text-primary-foreground dark:text-primary-dark-foreground text-xs font-medium">
              Featured
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View className="p-3">
        {item.brand && (
          <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground mb-1">
            {item.brand}
          </Text>
        )}
        <Text
          className="text-sm font-medium text-foreground dark:text-foreground-dark mb-1"
          numberOfLines={2}
        >
          {item.name}
        </Text>

        <View className="flex-row items-center gap-2">
          <Text className="text-base font-semibold text-foreground dark:text-foreground-dark">
            {item.currency} {item.price.toLocaleString()}
          </Text>
          {hasDiscount && (
            <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground line-through">
              {item.currency} {item.originalPrice!.toLocaleString()}
            </Text>
          )}
        </View>

        {/* Color indicators */}
        {item.colors && item.colors.length > 0 && (
          <View className="flex-row gap-1 mt-2">
            {item.colors.slice(0, 3).map((color, idx) => (
              <View
                key={idx}
                className="w-4 h-4 rounded-full border border-border/30 dark:border-border-dark/30"
                style={{ backgroundColor: color.toLowerCase() }}
              />
            ))}
            {item.colors.length > 3 && (
              <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground ml-1">
                +{item.colors.length - 3}
              </Text>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}
