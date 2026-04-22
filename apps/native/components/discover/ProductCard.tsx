import { View, TouchableOpacity, Linking } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { formatPrice } from "@/lib/utils/format";
import { ExternalLink } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

interface ProductCardProps {
  product: {
    _id: string;
    publicId: string;
    name: string;
    brand?: string;
    category: string;
    price: number;
    currency: string;
    primaryImageUrl: string | null;
    sourceUrl?: string;
    sourceStore?: string;
  };
  index: number;
}

export function ProductCard({ product, index }: ProductCardProps) {
  const router = useRouter();
  const { isDark } = useTheme();

  const handlePress = () => {
    router.push(`/product/${product.publicId}` as any);
  };

  const handleStorePress = () => {
    if (product.sourceUrl) {
      Linking.openURL(product.sourceUrl);
    }
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(400)}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        className="flex-row bg-surface dark:bg-surface-dark border border-border/30 dark:border-border-dark/30 rounded-2xl overflow-hidden mb-3"
      >
        {/* Product Image */}
        <View className="w-24 h-24 bg-surface-alt dark:bg-surface-alt-dark">
          {product.primaryImageUrl ? (
            <Image
              source={{ uri: product.primaryImageUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-muted-foreground dark:text-muted-dark-foreground text-lg font-serif">
                {product.category.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View className="flex-1 p-3 justify-center">
          {product.brand && (
            <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground uppercase tracking-wider mb-0.5">
              {product.brand}
            </Text>
          )}
          <Text
            className="text-sm font-medium text-foreground dark:text-foreground-dark mb-1"
            numberOfLines={2}
          >
            {product.name}
          </Text>
          <Text className="text-sm font-semibold text-foreground dark:text-foreground-dark">
            {formatPrice(product.price, product.currency)}
          </Text>
        </View>

        {/* External link */}
        {product.sourceUrl && (
          <TouchableOpacity
            onPress={handleStorePress}
            className="p-3 justify-center"
          >
            <ExternalLink size={18} color={isDark ? "#9C948A" : "#706B63"} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}
