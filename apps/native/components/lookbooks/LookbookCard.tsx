import { View, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { Sparkles, Lock } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

interface LookbookCardProps {
  lookbook: {
    _id: string;
    name: string;
    description?: string;
    itemCount: number;
    isPrivate?: boolean;
  };
  coverImageUrl?: string | null;
  previewImageUrls?: string[];
  index?: number;
  onPress?: () => void;
}

export function LookbookCard({
  lookbook,
  coverImageUrl,
  previewImageUrls = [],
  index = 0,
  onPress,
}: LookbookCardProps) {
  const router = useRouter();
  const { isDark } = useTheme();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/lookbook/${lookbook._id}` as any);
    }
  };

  // Show up to 4 preview images in a 2x2 grid
  const imageSlots = [...previewImageUrls.slice(0, 4)];
  while (imageSlots.length < 4) imageSlots.push("");

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(400)}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        className="bg-surface dark:bg-surface-dark border border-border/30 dark:border-border-dark/30 rounded-2xl overflow-hidden mb-4"
      >
        {/* Image Grid or Cover */}
        <View className="aspect-square overflow-hidden">
          {coverImageUrl ? (
            <Image
              source={{ uri: coverImageUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={200}
            />
          ) : previewImageUrls.length > 0 ? (
            <View className="flex-1 flex-row flex-wrap">
              {imageSlots.map((url, i) => (
                <View key={i} className="w-1/2 h-1/2">
                  {url ? (
                    <Image
                      source={{ uri: url }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                      transition={200}
                    />
                  ) : (
                    <View className="flex-1 bg-surface-alt dark:bg-surface-alt-dark" />
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View className="flex-1 bg-surface-alt dark:bg-surface-alt-dark items-center justify-center">
              <Sparkles size={28} color={isDark ? "#706B63" : "#9C948A"} />
            </View>
          )}
        </View>

        {/* Info */}
        <View className="p-3">
          <View className="flex-row items-center gap-1.5">
            <Text
              className="text-base font-medium text-foreground dark:text-foreground-dark flex-1"
              numberOfLines={1}
            >
              {lookbook.name}
            </Text>
            {lookbook.isPrivate && (
              <Lock size={14} color={isDark ? "#9C948A" : "#706B63"} />
            )}
          </View>
          <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground mt-0.5">
            {lookbook.itemCount} {lookbook.itemCount === 1 ? "item" : "items"}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
