import {
  View,
  FlatList,
  ActivityIndicator,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { Text } from "@/components/ui/Text";
import { Sparkles } from "lucide-react-native";
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
  const { width } = useWindowDimensions();
  const isCreatorMode = !!looksWithCreators;
  const data = isCreatorMode ? looksWithCreators! : (looks ?? []);

  // Explicit column width: screen width minus horizontal padding (16*2) minus gap (16), divided by 2
  const columnWidth = (width - 32 - 16) / 2;

  // Loading skeleton
  if (isLoading) {
    return (
      <View className="px-4">
        <View style={{ flexDirection: "row", gap: 16 }}>
          <View style={{ width: columnWidth }}>
            <LookSkeleton />
            <LookSkeleton />
          </View>
          <View style={{ width: columnWidth }}>
            <LookSkeleton />
            <LookSkeleton />
          </View>
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

  // Masonry-style 2-column layout using dual column approach
  // Split data into two columns for a Pinterest/masonry effect
  const leftColumn: typeof data = [];
  const rightColumn: typeof data = [];
  data.forEach((item, i) => {
    if (i % 2 === 0) leftColumn.push(item);
    else rightColumn.push(item);
  });

  return (
    <View className="px-4" style={{ flexDirection: "row", gap: 16 }}>
      {/* Left column */}
      <View style={{ width: columnWidth }}>
        {leftColumn.map((item, i) =>
          isCreatorMode ? (
            <LookCardWithCreator
              key={(item as LookWithCreator).id}
              look={item as LookWithCreator}
              index={i * 2}
            />
          ) : (
            <LookCard
              key={(item as LookWithStatus).id}
              look={item as LookWithStatus}
              index={i * 2}
            />
          ),
        )}
      </View>
      {/* Right column */}
      <View style={{ width: columnWidth }}>
        {rightColumn.map((item, i) =>
          isCreatorMode ? (
            <LookCardWithCreator
              key={(item as LookWithCreator).id}
              look={item as LookWithCreator}
              index={i * 2 + 1}
            />
          ) : (
            <LookCard
              key={(item as LookWithStatus).id}
              look={item as LookWithStatus}
              index={i * 2 + 1}
            />
          ),
        )}
      </View>
    </View>
  );
}
