import { View, ActivityIndicator } from "react-native";
import { ApparelItemCard, type ApparelItem } from "./ApparelItemCard";
import { Text } from "@/components/ui/Text";
import { Shirt } from "lucide-react-native";
import type { Id } from "@/convex/_generated/dataModel";

interface ApparelGridProps {
  items: ApparelItem[];
  isSelectionMode?: boolean;
  selectedItemIds?: Set<Id<"items">>;
  onItemSelect?: (itemId: Id<"items">) => void;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  likedItemIds?: Set<Id<"items">>;
  onToggleLike?: (itemId: Id<"items">) => void;
}

export function ApparelGrid({
  items,
  isSelectionMode = false,
  selectedItemIds = new Set(),
  onItemSelect,
  isLoading = false,
  isLoadingMore = false,
  likedItemIds = new Set(),
  onToggleLike,
}: ApparelGridProps) {
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center py-16">
        <ActivityIndicator size="large" color="#A67C52" />
        <Text className="text-muted-foreground dark:text-muted-dark-foreground mt-4">
          Loading items...
        </Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-16">
        <View className="w-16 h-16 rounded-full bg-surface-alt dark:bg-surface-alt-dark items-center justify-center mb-4">
          <Shirt size={32} color="#9C948A" />
        </View>
        <Text className="text-lg font-medium text-foreground dark:text-foreground-dark mb-2">
          No items yet
        </Text>
        <Text className="text-muted-foreground dark:text-muted-dark-foreground max-w-md text-center">
          Check back soon for new apparel items.
        </Text>
      </View>
    );
  }

  // Build 2-column rows from the flat items array
  const rows: Array<[ApparelItem, ApparelItem | undefined]> = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push([items[i], items[i + 1]]);
  }

  return (
    <View className="px-4">
      {rows.map((row, rowIndex) => (
        <View
          key={row[0]._id}
          style={{ flexDirection: "row", gap: 16, marginBottom: 16 }}
        >
          <View style={{ flex: 1 }}>
            <ApparelItemCard
              item={row[0]}
              index={rowIndex * 2}
              isSelectionMode={isSelectionMode}
              isSelected={selectedItemIds.has(row[0]._id)}
              onSelect={onItemSelect}
              isLiked={likedItemIds.has(row[0]._id)}
              onToggleLike={onToggleLike}
            />
          </View>
          <View style={{ flex: 1 }}>
            {row[1] ? (
              <ApparelItemCard
                item={row[1]}
                index={rowIndex * 2 + 1}
                isSelectionMode={isSelectionMode}
                isSelected={selectedItemIds.has(row[1]._id)}
                onSelect={onItemSelect}
                isLiked={likedItemIds.has(row[1]._id)}
                onToggleLike={onToggleLike}
              />
            ) : null}
          </View>
        </View>
      ))}

      {/* Loading more indicator */}
      {isLoadingMore && (
        <View className="py-4 items-center">
          <ActivityIndicator size="small" color="#A67C52" />
          <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground mt-2">
            Loading more...
          </Text>
        </View>
      )}
    </View>
  );
}
