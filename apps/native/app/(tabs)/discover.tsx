import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Text } from "@/components/ui/Text";
import { CategoryCarousel } from "@/components/discover/CategoryCarousel";
import { ApparelGrid } from "@/components/discover/ApparelGrid";
import { FilterTabs, type FilterType } from "@/components/discover/FilterTabs";
import { ApparelSearchBar } from "@/components/discover/ApparelSearchBar";
import { LookGrid } from "@/components/discover/LookGrid";
import { CreateLookSheet } from "@/components/discover/CreateLookSheet";
import type { ApparelItem } from "@/components/discover/ApparelItemCard";
import type { LookWithStatus, Product } from "@/components/discover/LookCard";
import type { LookWithCreator } from "@/components/discover/LookCardWithCreator";
import { useSelection } from "@/lib/contexts/SelectionContext";
import { Sparkles, Users } from "lucide-react-native";
import {
  FloatingLookLoader,
  type FloatingLoaderRef,
} from "@/components/discover/FloatingLookLoader";

const ITEMS_PER_PAGE = 20;

export default function DiscoverScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterType>("my-look");
  const [apparelCursor, setApparelCursor] = useState<string | null>(null);
  const [accumulatedItems, setAccumulatedItems] = useState<ApparelItem[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [apparelSearchQuery, setApparelSearchQuery] = useState("");
  const [showCreateLookSheet, setShowCreateLookSheet] = useState(false);
  const [workflowStarted, setWorkflowStarted] = useState(false);

  // Selection context
  const {
    isSelectionMode,
    selectedItemIds,
    selectedItems,
    setSelectionMode,
    toggleItemSelection,
    clearSelection,
    selectedCount,
  } = useSelection();

  // Track processed cursors to prevent re-processing
  const processedCursorsRef = useRef<Set<string | null>>(new Set());

  // Floating loader ref for workflow status
  const floatingLoaderRef = useRef<FloatingLoaderRef>(null);

  // Get current user for gender-based filtering
  const currentUser = useQuery(api.users.queries.getCurrentUser);
  const userGenderFilter =
    currentUser?.gender === "male" || currentUser?.gender === "female"
      ? currentUser.gender
      : undefined;

  // ──────────────────────────────────────────────
  // Workflow queries and mutations
  // ──────────────────────────────────────────────
  const shouldStartWorkflow = useQuery(
    api.workflows.index.shouldStartOnboardingWorkflow
  );
  const workflowStatus = useQuery(api.workflows.index.getOnboardingWorkflowStatus);
  const startWorkflow = useMutation(api.workflows.index.startOnboardingWorkflow);

  // ──────────────────────────────────────────────
  // Apparel tab queries
  // ──────────────────────────────────────────────
  const rawItemsData = useQuery(
    api.items.queries.listItemsWithImages,
    activeFilter === "apparel"
      ? {
          gender: userGenderFilter,
          limit: ITEMS_PER_PAGE,
          cursor: apparelCursor ?? undefined,
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

  // ──────────────────────────────────────────────
  // My Look tab query
  // ──────────────────────────────────────────────
  const myLooksData = useQuery(
    api.looks.queries.getMyLooksByCreator,
    activeFilter === "my-look" ? { createdBy: "system", limit: 50 } : "skip",
  );

  // ──────────────────────────────────────────────
  // Explore tab query
  // ──────────────────────────────────────────────
  const publicLooksData = useQuery(
    api.looks.queries.getPublicLooks,
    activeFilter === "explore" ? { limit: 50 } : "skip",
  );

  // ──────────────────────────────────────────────
  // Transform My Looks data → LookWithStatus[]
  // ──────────────────────────────────────────────
  const myLooks = useMemo((): LookWithStatus[] => {
    if (activeFilter !== "my-look" || !myLooksData) return [];

    const heights: Array<"short" | "medium" | "tall" | "extra-tall"> = [
      "medium",
      "tall",
      "short",
      "extra-tall",
    ];

    return myLooksData.map((lookData, index) => {
      const products: Product[] = lookData.items.map((itemData) => ({
        id: itemData.item._id,
        name: itemData.item.name,
        brand: itemData.item.brand || "Unknown",
        category: itemData.item.category as Product["category"],
        price: itemData.item.price,
        currency: itemData.item.currency,
        imageUrl: itemData.primaryImageUrl || "",
        storeUrl: "#",
        storeName: itemData.item.brand || "Store",
        color: itemData.item.colors[0] || "Mixed",
      }));

      const imageUrl = lookData.lookImage?.imageUrl || "";
      const isGenerating =
        lookData.lookImage?.status === "pending" ||
        lookData.lookImage?.status === "processing";
      const generationFailed = lookData.lookImage?.status === "failed";

      return {
        id: lookData.look._id,
        imageUrl,
        products,
        totalPrice: lookData.look.totalPrice,
        currency: lookData.look.currency,
        styleTags: lookData.look.styleTags,
        occasion: lookData.look.occasion || "Everyday",
        nimaNote: lookData.look.nimaComment || "A look curated just for you!",
        createdAt: new Date(lookData.look._creationTime),
        height: heights[index % heights.length],
        isGenerating,
        generationFailed,
      };
    });
  }, [myLooksData, activeFilter]);

  // ──────────────────────────────────────────────
  // Transform Explore data → LookWithCreator[]
  // ──────────────────────────────────────────────
  const exploreLooks = useMemo((): LookWithCreator[] => {
    if (activeFilter !== "explore" || !publicLooksData) return [];

    const heights: Array<"short" | "medium" | "tall" | "extra-tall"> = [
      "medium",
      "tall",
      "short",
      "extra-tall",
    ];

    const validLooks = publicLooksData.looks.filter(
      (lookData) => lookData.itemCount > 0,
    );

    return validLooks.map((lookData, index) => {
      const products: Product[] = lookData.items.map((itemData) => ({
        id: itemData.item._id,
        name: itemData.item.name,
        brand: itemData.item.brand || "Unknown",
        category: itemData.item.category as Product["category"],
        price: itemData.item.price,
        currency: itemData.item.currency,
        imageUrl: itemData.primaryImageUrl || "",
        storeUrl: "#",
        storeName: itemData.item.brand || "Store",
        color: itemData.item.colors[0] || "Mixed",
      }));

      const imageUrl = lookData.lookImage?.imageUrl || "";
      const isGenerating =
        lookData.lookImage?.status === "pending" ||
        lookData.lookImage?.status === "processing";
      const generationFailed = lookData.lookImage?.status === "failed";

      return {
        id: lookData.look._id,
        imageUrl,
        products,
        totalPrice: lookData.look.totalPrice,
        currency: lookData.look.currency,
        styleTags: lookData.look.styleTags,
        occasion: lookData.look.occasion || "Everyday",
        nimaNote: lookData.look.nimaComment || "A beautifully curated look!",
        createdAt: new Date(lookData.look._creationTime),
        height: heights[index % heights.length],
        isGenerating,
        generationFailed,
        creator: lookData.creator,
        isFriend: lookData.isFriend,
        hasPendingRequest: lookData.hasPendingRequest,
      };
    });
  }, [publicLooksData, activeFilter]);

  // ──────────────────────────────────────────────
  // Apparel search filter
  // ──────────────────────────────────────────────
  const filteredApparelItems = useMemo(() => {
    if (!apparelSearchQuery.trim()) return accumulatedItems;

    const query = apparelSearchQuery.toLowerCase().trim();
    return accumulatedItems.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.brand?.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.colors.some((c) => c.toLowerCase().includes(query)) ||
        item.material?.toLowerCase().includes(query) ||
        item.occasion?.some((o) => o.toLowerCase().includes(query)) ||
        item.tags?.some((t) => t.toLowerCase().includes(query)),
    );
  }, [accumulatedItems, apparelSearchQuery]);

  // ──────────────────────────────────────────────
  // Handlers
  // ──────────────────────────────────────────────

  const handleFilterChange = useCallback(
    (filter: FilterType) => {
      // Prevent resetting state if clicking the already active tab
      if (filter === activeFilter) return;

      setActiveFilter(filter);
      if (filter === "apparel") {
        setApparelCursor(null);
        setAccumulatedItems([]);
        processedCursorsRef.current = new Set();
      }
      setApparelSearchQuery("");
      // Exit selection mode when switching tabs
      if (filter !== "apparel") {
        clearSelection();
      }
    },
    [clearSelection, activeFilter],
  );

  const handleItemSelect = useCallback(
    (itemId: Id<"items">) => {
      // Find the item from accumulated items
      const item = accumulatedItems.find((i) => i._id === itemId);
      if (item) {
        toggleItemSelection(item);
      }
    },
    [accumulatedItems, toggleItemSelection],
  );

  const handleToggleSelectionMode = useCallback(() => {
    if (isSelectionMode) {
      clearSelection();
    } else {
      setSelectionMode(true);
    }
  }, [isSelectionMode, clearSelection, setSelectionMode]);

  // Accumulate items for infinite scroll
  useEffect(() => {
    if (activeFilter === "apparel" && rawItemsData?.items) {
      const cursorKey = apparelCursor ?? "initial";
      if (processedCursorsRef.current.has(cursorKey)) return;
      processedCursorsRef.current.add(cursorKey);

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
        material: item.material,
        occasion: item.occasion,
        tags: item.tags,
      }));

      setAccumulatedItems((prev) => {
        const existingIds = new Set(prev.map((item) => item._id));
        const uniqueNewItems = newItems.filter(
          (item) => !existingIds.has(item._id),
        );
        if (uniqueNewItems.length === 0) return prev;
        return [...prev, ...uniqueNewItems];
      });
      setIsLoadingMore(false);
    }
  }, [rawItemsData, activeFilter, apparelCursor]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (rawItemsData?.hasMore && rawItemsData?.nextCursor && !isLoadingMore) {
      setIsLoadingMore(true);
      setApparelCursor(rawItemsData.nextCursor);
    }
  }, [rawItemsData, isLoadingMore]);

  // Detect scroll near bottom for infinite scroll (replaces FlatList onEndReached)
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (activeFilter !== "apparel") return;

      const { layoutMeasurement, contentOffset, contentSize } =
        event.nativeEvent;
      const distanceFromBottom =
        contentSize.height - layoutMeasurement.height - contentOffset.y;

      // Trigger load more when within 300px of the bottom
      if (distanceFromBottom < 300) {
        handleLoadMore();
      }
    },
    [activeFilter, handleLoadMore],
  );

  // ──────────────────────────────────────────────
  // Workflow trigger - start onboarding workflow if needed
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (shouldStartWorkflow?.shouldStart && !workflowStarted) {
      console.log("[DISCOVER] Starting onboarding workflow...");
      setWorkflowStarted(true);

      startWorkflow()
        .then((result) => {
          if (result.success) {
            console.log("[DISCOVER] Workflow started:", result.workflowId);
            // Show the floating loader in workflow mode
            floatingLoaderRef.current?.startWorkflowLoading();
          } else {
            console.error("[DISCOVER] Failed to start workflow:", result.error);
          }
        })
        .catch((error) => {
          console.error("[DISCOVER] Error starting workflow:", error);
        });
    }
  }, [shouldStartWorkflow, workflowStarted, startWorkflow]);

  // Check workflow status and update floating loader when complete
  useEffect(() => {
    if (
      workflowStatus &&
      workflowStatus.isComplete &&
      workflowStatus.completedCount > 0
    ) {
      console.log("[DISCOVER] Workflow complete!");
      // Loader will automatically update via its internal useEffect
    }
  }, [workflowStatus]);

  // Get selected items array for CreateLookSheet
  const selectedItemsArray = Array.from(selectedItems.values());

  // ──────────────────────────────────────────────
  // Header text
  // ──────────────────────────────────────────────
  const headerTitle =
    activeFilter === "my-look"
      ? "Your curated looks ✨"
      : activeFilter === "explore"
        ? "Discover new styles ✨"
        : "Shop the collection ✨";

  const headerSubtitle =
    activeFilter === "my-look"
      ? myLooks.length > 0
        ? `${myLooks.length} looks curated by Nima`
        : "Looks curated by Nima for you"
      : activeFilter === "explore"
        ? exploreLooks.length > 0
          ? `${exploreLooks.length} looks from the community`
          : "Explore looks shared by others"
        : accumulatedItems.length > 0
          ? `${accumulatedItems.length} items${rawItemsData?.hasMore ? "+" : ""}`
          : "Browse apparel items";

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        onScroll={handleScroll}
        scrollEventThrottle={200}
      >
        {/* Header */}
        <View className="px-4 pt-6 pb-4">
          <Text className="text-2xl font-serif text-foreground dark:text-foreground-dark">
            {headerTitle}
          </Text>
          <Text className="text-muted-foreground dark:text-muted-dark-foreground mt-1">
            {headerSubtitle}
          </Text>
        </View>

        {/* Filter Tabs (sticky) */}
        <View className="bg-background dark:bg-background-dark">
          <FilterTabs
            activeFilter={activeFilter}
            onFilterChange={handleFilterChange}
            isSelectionMode={isSelectionMode}
            onToggleSelectionMode={handleToggleSelectionMode}
          />
        </View>

        {/* Selection mode indicator */}
        {isSelectionMode && activeFilter === "apparel" && (
          <View className="mx-4 mb-4 px-4 py-3 bg-primary/10 dark:bg-primary-dark/10 rounded-xl flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Sparkles size={16} color="#A67C52" />
              <Text className="text-sm text-primary dark:text-primary-dark font-medium">
                Select 2-6 items ({selectedCount} selected)
              </Text>
            </View>
            {selectedCount >= 2 && (
              <TouchableOpacity
                onPress={() => setShowCreateLookSheet(true)}
                className="bg-primary dark:bg-primary-dark px-3 py-1.5 rounded-full flex-row items-center gap-1.5"
              >
                <Sparkles size={12} color="#FFF" />
                <Text className="text-xs font-medium text-primary-foreground dark:text-primary-dark-foreground">
                  Try On Selected
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ──── My Look Tab ──── */}
        {activeFilter === "my-look" && (
          <LookGrid
            looks={myLooks}
            isLoading={myLooksData === undefined}
            emptyIcon={<Sparkles size={32} color="#9C948A" />}
            emptyTitle="No looks from Nima yet"
            emptyMessage="Complete your onboarding to get personalized looks curated by Nima."
          />
        )}

        {/* ──── Explore Tab ──── */}
        {activeFilter === "explore" && (
          <LookGrid
            looksWithCreators={exploreLooks}
            isLoading={publicLooksData === undefined}
            emptyIcon={<Users size={32} color="#9C948A" />}
            emptyTitle="No looks to explore yet"
            emptyMessage="Check back soon for looks shared by the community."
          />
        )}

        {/* ──── Apparel Tab ──── */}
        {activeFilter === "apparel" && (
          <>
            {/* Search bar */}
            <ApparelSearchBar
              value={apparelSearchQuery}
              onChange={setApparelSearchQuery}
              placeholder="Search by name, brand, category, color, material, occasion..."
            />

            {/* Category Carousel */}
            <CategoryCarousel userGender={currentUser?.gender} />

            {/* Apparel Grid */}
            <ApparelGrid
              items={filteredApparelItems}
              isSelectionMode={isSelectionMode}
              selectedItemIds={selectedItemIds}
              onItemSelect={handleItemSelect}
              isLoading={
                accumulatedItems.length === 0 && rawItemsData === undefined
              }
              isLoadingMore={isLoadingMore}
              likedItemIds={likedItemIdsSet}
              onToggleLike={handleToggleLike}
            />
          </>
        )}
      </ScrollView>

      {/* Floating "Try On Selected" button (fixed at bottom) */}
      {isSelectionMode && selectedCount >= 2 && activeFilter === "apparel" && !showCreateLookSheet && (
        <View
          className="absolute bottom-6 left-4 right-4"
          style={{ zIndex: 50 }}
        >
          <TouchableOpacity
            onPress={() => setShowCreateLookSheet(true)}
            className="bg-primary dark:bg-primary-dark py-4 rounded-2xl flex-row items-center justify-center gap-2"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <Sparkles size={20} color="#FFF" />
            <Text className="text-base font-medium text-primary-foreground dark:text-primary-dark-foreground">
              Try On {selectedCount} Selected Items
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Create Look FAB — visible only on My Look tab */}
      {activeFilter === "my-look" && !showCreateLookSheet && (
        <View
          style={{ position: "absolute", bottom: 24, right: 16, zIndex: 50 }}
        >
          <TouchableOpacity
            onPress={() => {
              handleFilterChange("apparel");
              setSelectionMode(true);
            }}
            className="bg-primary dark:bg-primary-dark px-5 py-3 rounded-full flex-row items-center gap-2"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 10,
              elevation: 8,
            }}
            activeOpacity={0.85}
          >
            <Sparkles size={16} color="#FFF" />
            <Text className="text-sm font-semibold text-primary-foreground dark:text-primary-dark-foreground">
              Create Look
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Create Look Bottom Sheet */}
      <CreateLookSheet
        isOpen={showCreateLookSheet}
        onClose={() => setShowCreateLookSheet(false)}
        selectedItems={selectedItemsArray}
        onClearSelection={clearSelection}
      />

      {/* Floating Loader for workflow status */}
      <FloatingLookLoader ref={floatingLoaderRef} />
    </View>
  );
}
