import { View, ActivityIndicator } from "react-native";
import { ApparelItemCard, type ApparelItem } from "./ApparelItemCard";
import { Text } from "@/components/ui/Text";
import { Shirt } from "lucide-react-native";
import type { Id } from "@/convex/_generated/dataModel";
import { useResponsiveLayout } from "@/lib/hooks/useResponsiveLayout";

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
  const { columns, horizontalPadding } = useResponsiveLayout(2, 3);

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

  // Build N-column rows from the flat items array (N is responsive).
  const rows: Array<Array<ApparelItem | undefined>> = [];
  for (let i = 0; i < items.length; i += columns) {
    const row: Array<ApparelItem | undefined> = [];
    for (let c = 0; c < columns; c++) {
      row.push(items[i + c]);
    }
    rows.push(row);
  }

  return (
    <View style={{ paddingHorizontal: horizontalPadding }}>
      {rows.map((row, rowIndex) => (
        <View
          key={row[0]?._id ?? `row-${rowIndex}`}
          style={{ flexDirection: "row", gap: 16, marginBottom: 16 }}
        >
          {row.map((item, colIndex) => (
            <View key={item?._id ?? `empty-${colIndex}`} style={{ flex: 1 }}>
              {item ? (
                <ApparelItemCard
                  item={item}
                  index={rowIndex * columns + colIndex}
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedItemIds.has(item._id)}
                  onSelect={onItemSelect}
                  isLiked={likedItemIds.has(item._id)}
                  onToggleLike={onToggleLike}
                />
              ) : null}
            </View>
          ))}
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
