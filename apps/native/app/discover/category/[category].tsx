import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ApparelItemCard, type ApparelItem } from "@/components/discover/ApparelItemCard";
import { CreateLookSheet } from "@/components/discover/CreateLookSheet";
import { useSelection } from "@/lib/contexts/SelectionContext";
import { ArrowLeft, Sparkles } from "lucide-react-native";

const ITEMS_PER_PAGE = 20;

// Category display names
const CATEGORY_LABELS: Record<string, string> = {
  top: "Tops",
  bottom: "Bottoms",
  dress: "Dresses",
  outfit: "Outfits",
  outerwear: "Outerwear",
  shoes: "Shoes",
  accessory: "Accessories",
  bag: "Bags",
  jewelry: "Jewelry",
  swimwear: "Swimwear",
};

type CategoryType =
  | "top"
  | "bottom"
  | "dress"
  | "outfit"
  | "outerwear"
  | "shoes"
  | "accessory"
  | "bag"
  | "jewelry"
  | "swimwear";

export default function DiscoverCategoryScreen() {
  const router = useRouter();
  const { category: categoryParam } = useLocalSearchParams<{ category: string }>();

  // Get current user for gender-based filtering
  const currentUser = useQuery(api.users.queries.getCurrentUser);
  const userGenderFilter =
    currentUser?.gender === "male" || currentUser?.gender === "female"
      ? currentUser.gender
      : undefined;

  // Validate category
  const isValidCategory = Object.keys(CATEGORY_LABELS).includes(categoryParam);
  const category = isValidCategory ? (categoryParam as CategoryType) : null;
  const categoryLabel = category ? CATEGORY_LABELS[category] : "Unknown";

  // Infinite scroll state
  const [cursor, setCursor] = useState<string | null>(null);
  const [accumulatedItems, setAccumulatedItems] = useState<ApparelItem[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Selection mode for Create a Look
  const {
    isSelectionMode,
    selectedItemIds,
    selectedItems,
    selectedCount,
    setSelectionMode,
    toggleItemSelection,
    clearSelection,
  } = useSelection();
  const [showCreateLookSheet, setShowCreateLookSheet] = useState(false);

  // Fetch items with category filter (and optional gender filter based on user)
  const rawItemsData = useQuery(
    api.items.queries.listItemsWithImages,
    category
      ? {
          category,
          gender: userGenderFilter,
          limit: ITEMS_PER_PAGE,
          cursor: cursor ?? undefined,
        }
      : "skip",
  );

  // Liked items
  const likedItemIds = useQuery(api.items.likes.getLikedItemIds) ?? [];
  const likedItemIdsSet = useMemo(() => new Set(likedItemIds), [likedItemIds]);

  // Toggle like mutation
  const toggleLikeMutation = useMutation(api.items.likes.toggleLike);

  const handleToggleLike = useCallback(
    async (itemId: Id<"items">) => {
      await toggleLikeMutation({ itemId });
    },
    [toggleLikeMutation],
  );

  // Accumulate items as they come in
  useEffect(() => {
    if (!rawItemsData?.items) return;

    const newItems: ApparelItem[] = rawItemsData.items.map((item) => ({
      _id: item._id,
      publicId: item.publicId,
      name: item.name,
      brand: item.brand,
      category: item.category,
      price: item.price,
      currency: item.currency,
      originalPrice: item.originalPrice,
      colors: item.colors,
      primaryImageUrl: item.primaryImageUrl ?? undefined,
      isFeatured: item.isFeatured,
    }));

    if (cursor === null) {
      // First page - replace items
      setAccumulatedItems(newItems);
    } else {
      // Subsequent pages - append items
      setAccumulatedItems((prev) => {
        const existingIds = new Set(prev.map((item) => item._id));
        const uniqueNewItems = newItems.filter((item) => !existingIds.has(item._id));
        return [...prev, ...uniqueNewItems];
      });
    }
    setIsLoadingMore(false);
  }, [rawItemsData, cursor]);

  // Handle scroll to load more
  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isNearBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 200;

    if (
      isNearBottom &&
      !isLoadingMore &&
      rawItemsData?.hasMore &&
      rawItemsData?.nextCursor
    ) {
      setIsLoadingMore(true);
      setCursor(rawItemsData.nextCursor);
    }
  };

  // Get selected items array
  const selectedItemsArray = Array.from(selectedItems.values());

  // Invalid category - show error
  if (!isValidCategory) {
    return (
      <SafeAreaView className="flex-1 bg-background dark:bg-background-dark">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-2xl font-serif text-foreground dark:text-foreground-dark mb-2">
            Invalid Category
          </Text>
          <Text className="text-muted-foreground dark:text-muted-dark-foreground mb-4 text-center">
            The category "{categoryParam}" doesn't exist.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="px-6 py-3 bg-primary dark:bg-primary-dark rounded-full"
          >
            <Text className="text-primary-foreground dark:text-primary-dark-foreground font-medium">
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-background-dark">
      {/* Header */}
      <View className="border-b border-border dark:border-border-dark px-4 py-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => router.back()}
              className="p-2 -ml-2 rounded-full"
            >
              <ArrowLeft size={24} className="text-foreground dark:text-foreground-dark" />
            </TouchableOpacity>
            <Text className="text-xl font-serif font-semibold text-foreground dark:text-foreground-dark">
              {categoryLabel} ✨
            </Text>
          </View>
          {accumulatedItems.length > 0 && (
            <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground">
              {accumulatedItems.length} items{rawItemsData?.hasMore ? "+" : ""}
            </Text>
          )}
        </View>
      </View>

      {/* Create a Look button */}
      <View className="px-4 pt-4 pb-2">
        <Pressable
          onPress={() => {
            if (isSelectionMode) {
              clearSelection();
            } else {
              setSelectionMode(true);
            }
          }}
          className={`py-3 rounded-full items-center flex-row justify-center gap-2 ${
            isSelectionMode
              ? "bg-destructive dark:bg-destructive-dark"
              : "bg-secondary dark:bg-secondary-dark"
          }`}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Sparkles size={16} className="text-secondary-foreground dark:text-secondary-dark-foreground" />
          <Text
            className={`font-medium ${
              isSelectionMode
                ? "text-destructive-foreground dark:text-destructive-dark-foreground"
                : "text-secondary-foreground dark:text-secondary-dark-foreground"
            }`}
          >
            {isSelectionMode ? "Cancel Selection" : "Create a Look"}
          </Text>
        </Pressable>
      </View>

      {/* Selection mode indicator */}
      {isSelectionMode && (
        <View className="mx-4 mb-2 bg-primary/10 dark:bg-primary-dark/10 border border-primary/30 dark:border-primary-dark/30 rounded-xl p-3">
          <Text className="text-sm text-primary dark:text-primary-dark font-medium text-center">
            Select 2-6 items to create your look
            {selectedCount > 0 && ` (${selectedCount} selected)`}
          </Text>
        </View>
      )}

      {/* Items Grid */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        contentContainerClassName="px-4 pb-6"
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={400}
      >
        {accumulatedItems.length === 0 && rawItemsData === undefined ? (
          // Loading state
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" color="#A67C52" />
            <Text className="text-muted-foreground dark:text-muted-dark-foreground mt-4">
              Loading items...
            </Text>
          </View>
        ) : accumulatedItems.length > 0 ? (
          <>
            <View className="flex-row flex-wrap gap-3">
              {accumulatedItems.map((item, index) => (
                <View key={item._id} className="w-[48%]">
                  <ApparelItemCard
                    item={item}
                    isLiked={likedItemIdsSet.has(item._id)}
                    onToggleLike={handleToggleLike}
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedItemIds.has(item._id)}
                    onSelect={(itemId) => toggleItemSelection(item)}
                  />
                </View>
              ))}
            </View>

            {/* Load more indicator */}
            {isLoadingMore && (
              <View className="py-6 items-center">
                <ActivityIndicator size="small" color="#A67C52" />
                <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground mt-2">
                  Loading more...
                </Text>
              </View>
            )}

            {!rawItemsData?.hasMore && accumulatedItems.length > 0 && (
              <View className="py-6 items-center">
                <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground">
                  You've seen all {accumulatedItems.length} {categoryLabel.toLowerCase()}
                </Text>
              </View>
            )}
          </>
        ) : (
          // Empty state
          <View className="items-center justify-center py-20 px-6">
            <Text className="text-4xl mb-4">✨</Text>
            <Text className="text-lg font-medium text-foreground dark:text-foreground-dark mb-2">
              No {categoryLabel.toLowerCase()} yet
            </Text>
            <Text className="text-muted-foreground dark:text-muted-dark-foreground text-center">
              Check back soon for new items in this category.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Floating "Try On Selected" button */}
      {isSelectionMode && selectedItemIds.size >= 2 && (
        <View className="absolute bottom-0 left-0 right-0 px-4 pb-4 bg-background/95 dark:bg-background-dark/95 backdrop-blur-md border-t border-border dark:border-border-dark">
          <TouchableOpacity
            onPress={() => setShowCreateLookSheet(true)}
            className="w-full py-4 bg-primary dark:bg-primary-dark rounded-2xl items-center flex-row justify-center gap-2"
            activeOpacity={0.85}
          >
            <Sparkles size={20} className="text-primary-foreground dark:text-primary-dark-foreground" />
            <Text className="text-primary-foreground dark:text-primary-dark-foreground font-semibold text-base">
              Try On Selected ({selectedCount})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Create Look Sheet */}
      <CreateLookSheet
        isOpen={showCreateLookSheet}
        onClose={() => setShowCreateLookSheet(false)}
        selectedItems={selectedItemsArray}
        onClearSelection={clearSelection}
      />
    </SafeAreaView>
  );
}
