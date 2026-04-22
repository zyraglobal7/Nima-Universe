import { ScrollView, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react-native";

export type FilterType = "my-look" | "explore" | "apparel";

interface FilterTabsProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  /** Show "Create Look" / "Cancel" pill when Apparel is active */
  isSelectionMode?: boolean;
  onToggleSelectionMode?: () => void;
}

const filters: { id: FilterType; label: string }[] = [
  { id: "my-look", label: "My Look" },
  { id: "explore", label: "Explore" },
  { id: "apparel", label: "Apparel" },
];

export function FilterTabs({
  activeFilter,
  onFilterChange,
  isSelectionMode = false,
  onToggleSelectionMode,
}: FilterTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mb-4"
      contentContainerStyle={{
        paddingHorizontal: 16,
        gap: 8,
        alignItems: "center",
      }}
    >
      {filters.map((filter) => (
        <TouchableOpacity
          key={filter.id}
          onPress={() => onFilterChange(filter.id)}
          className={cn(
            "px-4 py-2 rounded-full",
            activeFilter === filter.id
              ? "bg-primary dark:bg-primary-dark"
              : "bg-surface dark:bg-surface-dark border border-border/50 dark:border-border-dark/50",
          )}
        >
          <Text
            className={cn(
              "text-sm font-medium",
              activeFilter === filter.id
                ? "text-primary-foreground dark:text-primary-dark-foreground"
                : "text-foreground dark:text-foreground-dark",
            )}
          >
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}

      {/* Create Look / Cancel button — only when Apparel is active */}
      {activeFilter === "apparel" && onToggleSelectionMode && (
        <TouchableOpacity
          onPress={onToggleSelectionMode}
          className={cn(
            "px-4 py-2 rounded-full flex-row items-center gap-1.5",
            isSelectionMode
              ? "bg-destructive/10 dark:bg-destructive-dark/10 border border-destructive/50 dark:border-destructive-dark/50"
              : "bg-primary/10 dark:bg-primary-dark/10 border border-primary/50 dark:border-primary-dark/50",
          )}
        >
          {!isSelectionMode && <Sparkles size={14} color="#A67C52" />}
          <Text
            className={cn(
              "text-sm font-medium",
              isSelectionMode
                ? "text-destructive dark:text-destructive-dark"
                : "text-primary dark:text-primary-dark",
            )}
          >
            {isSelectionMode ? "Cancel" : "Create Look"}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
