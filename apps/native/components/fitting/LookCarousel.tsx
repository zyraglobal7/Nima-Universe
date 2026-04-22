import { View, Dimensions, TouchableOpacity } from "react-native";
import { Text } from "@/components/ui/Text";
import { Image } from "expo-image";
import { Heart, Bookmark, ThumbsDown, Sparkles } from "lucide-react-native";
import Animated, { FadeIn, FadeInRight } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useRef, useState } from "react";
import { FlatList } from "react-native";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { cn } from "@/lib/utils";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 48;
const CARD_HEIGHT = CARD_WIDTH * 1.35;

export interface FittingLook {
  id: string;
  imageUrl: string | null;
  isGenerating: boolean;
  isFailed: boolean;
  styleTags: string[];
  occasion: string;
  totalPrice: number;
  currency: string;
  nimaNote: string;
  isLiked: boolean;
  isSaved: boolean;
}

interface LookCarouselProps {
  looks: FittingLook[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onLike: (lookId: string) => void;
  onSave: (lookId: string) => void;
  onDislike: (lookId: string) => void;
}

export function LookCarousel({
  looks,
  currentIndex,
  onIndexChange,
  onLike,
  onSave,
  onDislike,
}: LookCarouselProps) {
  const { isDark } = useTheme();
  const flatListRef = useRef<FlatList>(null);

  const renderLookCard = ({
    item,
    index,
  }: {
    item: FittingLook;
    index: number;
  }) => {
    return (
      <Animated.View
        entering={FadeInRight.duration(400).delay(index * 100)}
        style={{ width: CARD_WIDTH, marginHorizontal: 24, marginBottom: 16 }}
      >
        <View
          className="rounded-2xl overflow-hidden bg-surface dark:bg-surface-dark border border-border/20 dark:border-border-dark/20"
          style={{ height: CARD_HEIGHT }}
        >
          {/* Image or state */}
          {item.isGenerating ? (
            <View className="flex-1 items-center justify-center bg-surface-alt dark:bg-surface-alt-dark">
              <Animated.View entering={FadeIn.duration(300)}>
                <View className="items-center gap-3">
                  <View className="w-16 h-16 rounded-full bg-primary/10 dark:bg-primary-dark/10 items-center justify-center">
                    <Sparkles
                      size={28}
                      color={isDark ? "#C9A07A" : "#A67C52"}
                    />
                  </View>
                  <Text className="text-base font-medium text-foreground dark:text-foreground-dark">
                    Generating your look...
                  </Text>
                  <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground text-center px-8">
                    This may take a moment as we create your personalized image
                  </Text>
                </View>
              </Animated.View>
            </View>
          ) : item.isFailed ? (
            <View className="flex-1 items-center justify-center bg-surface-alt dark:bg-surface-alt-dark">
              <Text className="text-base text-muted-foreground dark:text-muted-dark-foreground">
                Image generation failed
              </Text>
              <Text className="text-sm text-muted-foreground/60 dark:text-muted-dark-foreground/60 mt-1">
                Please try generating again
              </Text>
            </View>
          ) : item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={{ flex: 1 }}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <View className="flex-1 items-center justify-center bg-surface-alt dark:bg-surface-alt-dark">
              <Sparkles size={24} color={isDark ? "#C9A07A" : "#A67C52"} />
              <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground mt-2">
                Loading look...
              </Text>
            </View>
          )}

          {/* Overlay: style tags */}
          {item.styleTags.length > 0 && (
            <View className="absolute top-3 left-3 flex-row flex-wrap gap-1.5">
              {item.styleTags.slice(0, 3).map((tag, i) => (
                <View key={i} className="bg-black/50 rounded-full px-2.5 py-1">
                  <Text className="text-xs text-white font-medium capitalize">
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Overlay: occasion badge */}
          {item.occasion && (
            <View className="absolute top-3 right-3 bg-primary/80 dark:bg-primary-dark/80 rounded-full px-3 py-1">
              <Text className="text-xs text-white font-medium capitalize">
                {item.occasion}
              </Text>
            </View>
          )}

          {/* Overlay: action buttons */}
          <View className="absolute bottom-3 right-3 flex-row gap-2">
            <TouchableOpacity
              onPress={() => onLike(item.id)}
              className={cn(
                "w-10 h-10 rounded-full items-center justify-center",
                item.isLiked ? "bg-red-500" : "bg-black/40",
              )}
              activeOpacity={0.7}
            >
              <Heart
                size={18}
                color="#FFFFFF"
                fill={item.isLiked ? "#FFFFFF" : "transparent"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onSave(item.id)}
              className={cn(
                "w-10 h-10 rounded-full items-center justify-center",
                item.isSaved
                  ? "bg-primary dark:bg-primary-dark"
                  : "bg-black/40",
              )}
              activeOpacity={0.7}
            >
              <Bookmark
                size={18}
                color="#FFFFFF"
                fill={item.isSaved ? "#FFFFFF" : "transparent"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <View>
      <FlatList
        ref={flatListRef}
        data={looks}
        keyExtractor={(item) => item.id}
        renderItem={renderLookCard}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + 48}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: 8 }}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(
            e.nativeEvent.contentOffset.x / (CARD_WIDTH + 48),
          );
          onIndexChange(index);
        }}
      />

      {/* Pagination dots */}
      {looks.length > 1 && (
        <View className="flex-row items-center justify-center gap-2 mt-2">
          {looks.map((_, i) => (
            <View
              key={i}
              className={cn(
                "rounded-full",
                i === currentIndex
                  ? "w-6 h-2 bg-primary dark:bg-primary-dark"
                  : "w-2 h-2 bg-border dark:bg-border-dark",
              )}
            />
          ))}
        </View>
      )}

      {/* Quick actions */}
      {looks.length > 0 && (
        <View className="flex-row items-center justify-center gap-8 mt-4 px-8">
          <TouchableOpacity
            onPress={() => onDislike(looks[currentIndex]?.id || "")}
            className="items-center gap-1"
            activeOpacity={0.7}
          >
            <View className="w-12 h-12 rounded-full bg-surface dark:bg-surface-dark border border-border/30 dark:border-border-dark/30 items-center justify-center">
              <ThumbsDown size={20} color={isDark ? "#9C948A" : "#7A7269"} />
            </View>
            <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground">
              Not me
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onLike(looks[currentIndex]?.id || "")}
            className="items-center gap-1"
            activeOpacity={0.7}
          >
            <View
              className={cn(
                "w-14 h-14 rounded-full items-center justify-center",
                looks[currentIndex]?.isLiked
                  ? "bg-red-500"
                  : "bg-primary dark:bg-primary-dark",
              )}
            >
              <Heart
                size={24}
                color="#FFFFFF"
                fill={looks[currentIndex]?.isLiked ? "#FFFFFF" : "transparent"}
              />
            </View>
            <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground">
              Love it
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onSave(looks[currentIndex]?.id || "")}
            className="items-center gap-1"
            activeOpacity={0.7}
          >
            <View
              className={cn(
                "w-12 h-12 rounded-full items-center justify-center border border-border/30 dark:border-border-dark/30",
                looks[currentIndex]?.isSaved
                  ? "bg-primary dark:bg-primary-dark"
                  : "bg-surface dark:bg-surface-dark",
              )}
            >
              <Bookmark
                size={20}
                color={
                  looks[currentIndex]?.isSaved
                    ? "#FFFFFF"
                    : isDark
                      ? "#9C948A"
                      : "#7A7269"
                }
                fill={looks[currentIndex]?.isSaved ? "#FFFFFF" : "transparent"}
              />
            </View>
            <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground">
              Save
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
