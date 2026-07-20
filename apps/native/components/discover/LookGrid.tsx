import {
  View,
  FlatList,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { Text } from "@/components/ui/Text";
import { Sparkles } from "lucide-react-native";
import { useResponsiveLayout } from "@/lib/hooks/useResponsiveLayout";
import { LookCard, type LookWithStatus } from "./LookCard";
import {
  LookCardWithCreator,
  type LookWithCreator,
} from "./LookCardWithCreator";

/* ─── Types ─── */

interface LookGridProps {
  /** For My Look tab */
  looks?: LookWithStatus[];
  /** For Explore tab (with creator info) */
  looksWithCreators?: LookWithCreator[];
  isLoading?: boolean;
  emptyIcon?: React.ReactNode;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyCTA?: React.ReactNode;
}

/* ─── Skeleton ─── */

function LookSkeleton() {
  return (
    <View className="flex-1 rounded-2xl bg-surface-alt dark:bg-surface-alt-dark border border-border/30 dark:border-border-dark/30 overflow-hidden mb-4">
      <View className="aspect-[3/4] bg-surface dark:bg-surface-dark" />
      <View className="p-3 gap-2">
        <View className="h-3 bg-surface dark:bg-surface-dark rounded w-1/3" />
        <View className="h-4 bg-surface dark:bg-surface-dark rounded w-2/3" />
      </View>
    </View>
  );
}

/* ─── Component ─── */

export function LookGrid({
  looks,
  looksWithCreators,
  isLoading = false,
  emptyIcon,
  emptyTitle = "No looks yet",
  emptyMessage = "Check back soon!",
  emptyCTA,
}: LookGridProps) {
  const { width, columns, horizontalPadding } = useResponsiveLayout(2, 3);
  const isCreatorMode = !!looksWithCreators;
  const data = isCreatorMode ? looksWithCreators! : (looks ?? []);

  const GAP = 16;
  // Column width: screen width minus horizontal padding on both sides minus the
  // inter-column gaps, divided by the (responsive) number of columns.
  const columnWidth =
    (width - horizontalPadding * 2 - GAP * (columns - 1)) / columns;

  // Loading skeleton
  if (isLoading) {
    return (
      <View style={{ paddingHorizontal: horizontalPadding }}>
        <View style={{ flexDirection: "row", gap: GAP }}>
          {Array.from({ length: columns }).map((_, c) => (
            <View key={c} style={{ width: columnWidth }}>
              <LookSkeleton />
              <LookSkeleton />
            </View>
          ))}
        </View>
      </View>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-16 px-4">
        <View className="w-16 h-16 rounded-full bg-surface-alt dark:bg-surface-alt-dark items-center justify-center mb-4">
          {emptyIcon ?? <Sparkles size={32} color="#9C948A" />}
        </View>
        <Text className="text-lg font-medium text-foreground dark:text-foreground-dark mb-2 text-center">
          {emptyTitle}
        </Text>
        <Text className="text-muted-foreground dark:text-muted-dark-foreground text-center max-w-xs">
          {emptyMessage}
        </Text>
        {emptyCTA && <View className="mt-6">{emptyCTA}</View>}
      </View>
    );
  }

  // Masonry-style layout: distribute items across `columns` columns
  // round-robin for a Pinterest/masonry effect.
  const columnData: (typeof data)[] = Array.from({ length: columns }, () => []);
  data.forEach((item, i) => {
    columnData[i % columns].push(item);
  });

  return (
    <View
      style={{
        flexDirection: "row",
        gap: GAP,
        paddingHorizontal: horizontalPadding,
      }}
    >
      {columnData.map((column, colIndex) => (
        <View key={colIndex} style={{ width: columnWidth }}>
          {column.map((item, i) => {
            const originalIndex = i * columns + colIndex;
            return isCreatorMode ? (
              <LookCardWithCreator
                key={(item as LookWithCreator).id}
                look={item as LookWithCreator}
                index={originalIndex}
              />
            ) : (
              <LookCard
                key={(item as LookWithStatus).id}
                look={item as LookWithStatus}
                index={originalIndex}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}
