import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Id } from "@/convex/_generated/dataModel";
import type { ApparelItem } from "@/components/discover/ApparelItemCard";

interface SelectionContextValue {
  /** Whether selection mode is active */
  isSelectionMode: boolean;
  /** Set of selected item IDs */
  selectedItemIds: Set<Id<"items">>;
  /** Map of selected items (id -> item) — preserves data across category navigation */
  selectedItems: Map<string, ApparelItem>;
  /** Enable or disable selection mode */
  setSelectionMode: (mode: boolean) => void;
  /** Toggle an item's selection state */
  toggleItemSelection: (item: ApparelItem) => void;
  /** Clear all selections and exit selection mode */
  clearSelection: () => void;
  /** Get the count of selected items */
  selectedCount: number;
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

const MAX_SELECTION_SIZE = 6;

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [isSelectionMode, setIsSelectionModeState] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Map<string, ApparelItem>>(
    new Map(),
  );

  const setSelectionMode = useCallback((mode: boolean) => {
    setIsSelectionModeState(mode);
    if (!mode) {
      setSelectedItems(new Map());
    }
  }, []);

  const toggleItemSelection = useCallback((item: ApparelItem) => {
    setSelectedItems((prev) => {
      const newMap = new Map(prev);
      const itemId = item._id;

      if (newMap.has(itemId)) {
        newMap.delete(itemId);
      } else if (newMap.size < MAX_SELECTION_SIZE) {
        newMap.set(itemId, item);
      }
      return newMap;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Map());
    setIsSelectionModeState(false);
  }, []);

  const selectedItemIds = new Set(
    Array.from(selectedItems.keys()) as Id<"items">[],
  );

  const value: SelectionContextValue = {
    isSelectionMode,
    selectedItemIds,
    selectedItems,
    setSelectionMode,
    toggleItemSelection,
    clearSelection,
    selectedCount: selectedItems.size,
  };

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection(): SelectionContextValue {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error("useSelection must be used within a SelectionProvider");
  }
  return context;
}
