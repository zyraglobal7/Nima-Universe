import { View, TouchableOpacity, Linking } from "react-native";
import { Text } from "@/components/ui/Text";
import { Image } from "expo-image";
import {
  Heart,
  Bookmark,
  ArrowRightLeft,
  ExternalLink,
} from "lucide-react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { cn } from "@/lib/utils";

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
  isLiked?: boolean;
  isSaved?: boolean;
}

interface ProductItemProps {
  product: Product;
  index?: number;
  animate?: boolean;
  onLike?: (productId: string) => void;
  onSave?: (productId: string) => void;
  onSwap?: (productId: string) => void;
}

export function ProductItem({
  product,
  index = 0,
  animate = true,
  onLike,
  onSave,
  onSwap,
}: ProductItemProps) {
  const { isDark } = useTheme();

  const formatPrice = (price: number, currency: string) => {
    if (currency === "KES") {
      return `KSh ${price.toLocaleString()}`;
    }
    return `${currency} ${price.toLocaleString()}`;
  };

  const handleShop = () => {
    if (product.storeUrl && product.storeUrl !== "#") {
      Linking.openURL(product.storeUrl);
    }
  };

  return (
    <Animated.View
      entering={animate ? FadeInUp.duration(300).delay(index * 80) : undefined}
      className="flex-row bg-surface dark:bg-surface-dark rounded-xl border border-border/20 dark:border-border-dark/20 p-3 mb-3 mx-4"
    >
      {/* Product image */}
      <View className="w-20 h-20 rounded-lg overflow-hidden bg-surface-alt dark:bg-surface-alt-dark mr-3">
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={{ width: 80, height: 80 }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground">
              No image
            </Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View className="flex-1 justify-between">
        <View>
          <Text
            className="text-xs text-muted-foreground dark:text-muted-dark-foreground uppercase tracking-wider"
            numberOfLines={1}
          >
            {product.brand}
          </Text>
          <Text
            className="text-sm font-medium text-foreground dark:text-foreground-dark mt-0.5"
            numberOfLines={2}
          >
            {product.name}
          </Text>
          <View className="flex-row items-center gap-2 mt-0.5">
            <Text className="text-xs text-muted-foreground/70 dark:text-muted-dark-foreground/70 capitalize">
              {product.color}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between mt-1">
          <Text className="text-sm font-semibold text-foreground dark:text-foreground-dark">
            {formatPrice(product.price, product.currency)}
          </Text>

          {/* Action buttons */}
          <View className="flex-row items-center gap-1">
            {onLike && (
              <TouchableOpacity
                onPress={() => onLike(product.id)}
                activeOpacity={0.7}
                className="w-7 h-7 rounded-full items-center justify-center"
              >
                <Heart
                  size={14}
                  color={
                    product.isLiked ? "#EF4444" : isDark ? "#9C948A" : "#7A7269"
                  }
                  fill={product.isLiked ? "#EF4444" : "transparent"}
                />
              </TouchableOpacity>
            )}
            {onSave && (
              <TouchableOpacity
                onPress={() => onSave(product.id)}
                activeOpacity={0.7}
                className="w-7 h-7 rounded-full items-center justify-center"
              >
                <Bookmark
                  size={14}
                  color={
                    product.isSaved
                      ? isDark
                        ? "#C9A07A"
                        : "#A67C52"
                      : isDark
                        ? "#9C948A"
                        : "#7A7269"
                  }
                  fill={
                    product.isSaved
                      ? isDark
                        ? "#C9A07A"
                        : "#A67C52"
                      : "transparent"
                  }
                />
              </TouchableOpacity>
            )}
            {onSwap && (
              <TouchableOpacity
                onPress={() => onSwap(product.id)}
                activeOpacity={0.7}
                className="w-7 h-7 rounded-full items-center justify-center"
              >
                <ArrowRightLeft
                  size={14}
                  color={isDark ? "#9C948A" : "#7A7269"}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleShop}
              activeOpacity={0.7}
              className="w-7 h-7 rounded-full items-center justify-center"
            >
              <ExternalLink size={14} color={isDark ? "#C9A07A" : "#A67C52"} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
