import { View, TouchableOpacity, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { formatPrice } from "@/lib/utils/format";
import { Sparkles, ShoppingBag } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import type { Id } from "@/convex/_generated/dataModel";

type LookbookDetailItem =
  | {
      lookbookItem: any;
      type: "look";
      look: {
        _id: Id<"looks">;
        publicId: string;
        occasion?: string;
        totalPrice: number;
        currency: string;
      };
      lookImageUrl: string | null;
    }
  | {
      lookbookItem: any;
      type: "item";
      item: {
        _id: Id<"items">;
        publicId: string;
        name: string;
        brand?: string;
        category: string;
        price: number;
        currency: string;
        colors: string[];
      };
      itemImageUrl: string | null;
    };

interface LookbookItemGridProps {
  items: LookbookDetailItem[];
}

export function LookbookItemGrid({ items }: LookbookItemGridProps) {
  const router = useRouter();
  const { isDark } = useTheme();
  const { width } = useWindowDimensions();
  const cardWidth = (width - 48) / 2;

  if (items.length === 0) {
    return (
      <View className="items-center py-16 px-6">
        <ShoppingBag size={32} color={isDark ? "#706B63" : "#9C948A"} />
        <Text className="text-lg font-medium text-foreground dark:text-foreground-dark mt-4">
          This lookbook is empty
        </Text>
        <Text className="text-muted-foreground dark:text-muted-dark-foreground text-center mt-2">
          Save looks and items from your feed to add them here.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-row flex-wrap px-4 gap-3">
      {items.map((entry, index) => {
        const isLook = entry.type === "look";
        const imageUrl = isLook ? entry.lookImageUrl : entry.itemImageUrl;
        const title = isLook ? entry.look.occasion || "Look" : entry.item.name;
        const subtitle = isLook
          ? formatPrice(entry.look.totalPrice, entry.look.currency)
          : entry.item.brand ||
            formatPrice(entry.item.price, entry.item.currency);

        const handlePress = () => {
          if (isLook) {
            router.push(`/look/${entry.look.publicId}` as any);
          } else {
            router.push(`/product/${entry.item.publicId}` as any);
          }
        };

        return (
          <Animated.View
            key={entry.lookbookItem._id || index}
            entering={FadeInDown.delay(index * 60).duration(300)}
            style={{ width: cardWidth }}
          >
            <TouchableOpacity
              onPress={handlePress}
              activeOpacity={0.7}
              className="bg-surface dark:bg-surface-dark border border-border/30 dark:border-border-dark/30 rounded-2xl overflow-hidden"
            >
              <View style={{ aspectRatio: 3 / 4 }}>
                {imageUrl ? (
                  <Image
                    source={{ uri: imageUrl }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View className="flex-1 bg-surface-alt dark:bg-surface-alt-dark items-center justify-center">
                    {isLook ? (
                      <Sparkles
                        size={20}
                        color={isDark ? "#706B63" : "#9C948A"}
                      />
                    ) : (
                      <ShoppingBag
                        size={20}
                        color={isDark ? "#706B63" : "#9C948A"}
                      />
                    )}
                  </View>
                )}
                {/* Type badge */}
                <View className="absolute top-2 left-2 px-2 py-0.5 bg-background/70 dark:bg-background-dark/70 rounded-full">
                  <Text className="text-[10px] font-medium text-foreground dark:text-foreground-dark uppercase">
                    {isLook ? "Look" : "Item"}
                  </Text>
                </View>
              </View>
              <View className="p-2.5">
                <Text
                  className="text-sm font-medium text-foreground dark:text-foreground-dark"
                  numberOfLines={1}
                >
                  {title}
                </Text>
                <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground mt-0.5">
                  {subtitle}
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
  );
}
