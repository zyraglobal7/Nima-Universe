import {
  View,
  FlatList,
  ScrollView,
  Image,
  TouchableOpacity,
  Pressable,
  Modal,
  Alert,
  Animated as RNAnimated,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useState, useRef, useCallback, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Sparkles,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Upload,
  FolderOpen,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Text } from "@/components/ui/Text";
import { RecommendationCard } from "@/components/engine/RecommendationCard";
import { WardrobeUploadSheet } from "@/components/wardrobe/WardrobeUploadSheet";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { useResponsiveLayout } from "@/lib/hooks/useResponsiveLayout";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const WARDROBE_COLUMN_GAP = 12;
const TILE_SIZE = (SCREEN_W - 32 - WARDROBE_COLUMN_GAP) / 2;

const CATEGORIES = ["All", "tops", "bottoms", "shoes", "outerwear", "accessories", "dresses"] as const;

// ─────────────────────────────────────────────
// Loading skeletons
// ─────────────────────────────────────────────
function RecommendationSkeleton() {
  const { isDark } = useTheme();
  const opacity = useRef(new RNAnimated.Value(0.4)).current;

  useEffect(() => {
    const anim = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        RNAnimated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const skeletonBg = isDark ? "#3D3835" : "#E0D8CC";

  return (
    <RNAnimated.View style={[styles.skeletonCard, { opacity, borderColor: isDark ? "#3D3835" : "#E0D8CC", backgroundColor: isDark ? "#252220" : "#F5F0E8" }]}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.skeletonImage, { backgroundColor: skeletonBg }]} />
        ))}
      </View>
      <View style={[styles.skeletonLine, { backgroundColor: skeletonBg, width: "40%", marginTop: 14 }]} />
      <View style={[styles.skeletonLine, { backgroundColor: skeletonBg, marginTop: 8 }]} />
      <View style={[styles.skeletonLine, { backgroundColor: skeletonBg, marginTop: 6, width: "80%" }]} />
    </RNAnimated.View>
  );
}

// ─────────────────────────────────────────────
// Full-screen item viewer
// ─────────────────────────────────────────────
interface ViewerItem {
  _id: Id<"wardrobeItems">;
  imageUrl: string | null;
  description: string;
  category: string;
  color: string;
  formality: string;
}

function WardrobeItemViewer({
  items,
  initialIndex,
  onClose,
  onRemove,
}: {
  items: ViewerItem[];
  initialIndex: number;
  onClose: () => void;
  onRemove: (id: Id<"wardrobeItems">) => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const touchStartX = useRef(0);
  const item = items[index];

  const goNext = () => setIndex((i) => Math.min(i + 1, items.length - 1));
  const goPrev = () => setIndex((i) => Math.max(i - 1, 0));

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={stylesViewer.container}>
        {/* Top bar */}
        <View style={stylesViewer.topBar}>
          <Text style={stylesViewer.counter}>
            {index + 1} / {items.length}
          </Text>
          <TouchableOpacity onPress={onClose} style={stylesViewer.closeBtn}>
            <X size={20} color="#FAF8F5" />
          </TouchableOpacity>
        </View>

        {/* Image */}
        <View
          style={{ flex: 1 }}
          onTouchStart={(e) => { touchStartX.current = e.nativeEvent.pageX; }}
          onTouchEnd={(e) => {
            const dx = e.nativeEvent.pageX - touchStartX.current;
            if (dx < -40) goNext();
            else if (dx > 40) goPrev();
          }}
        >
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={{ flex: 1 }}
              resizeMode="contain"
            />
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 64 }}>👗</Text>
            </View>
          )}
        </View>

        {/* Prev/next chevrons */}
        {index > 0 && (
          <TouchableOpacity style={[stylesViewer.chevron, { left: 16 }]} onPress={goPrev}>
            <ChevronLeft size={28} color="#FAF8F5" />
          </TouchableOpacity>
        )}
        {index < items.length - 1 && (
          <TouchableOpacity style={[stylesViewer.chevron, { right: 16 }]} onPress={goNext}>
            <ChevronRight size={28} color="#FAF8F5" />
          </TouchableOpacity>
        )}

        {/* Bottom info */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.8)"]}
          style={stylesViewer.bottomGradient}
        >
          <Text style={stylesViewer.itemDesc} numberOfLines={2}>
            {item.description ?? item.category}
          </Text>
          <Text style={stylesViewer.itemMeta}>
            {[item.category, item.color, item.formality].filter(Boolean).join(" · ")}
          </Text>

          <TouchableOpacity
            style={stylesViewer.removeBtn}
            onPress={() => {
              Alert.alert("Remove Item", "Remove this item from your wardrobe?", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Remove",
                  style: "destructive",
                  onPress: () => {
                    onRemove(item._id);
                    if (items.length <= 1) {
                      onClose();
                    } else if (index >= items.length - 1) {
                      setIndex(items.length - 2);
                    }
                  },
                },
              ]);
            }}
          >
            <Trash2 size={16} color="#FF6B6B" />
            <Text style={stylesViewer.removeBtnText}>Remove from wardrobe</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Dot indicators */}
        {items.length > 1 && (
          <View style={stylesViewer.dots}>
            {items.map((_, i) => (
              <View
                key={i}
                style={[
                  stylesViewer.dot,
                  i === index
                    ? stylesViewer.dotActive
                    : stylesViewer.dotInactive,
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// NEW sub-tab
// ─────────────────────────────────────────────
type FeedRow =
  | { kind: "title" }
  | { kind: "dateHeader"; date: string; label: string }
  | { kind: "rec"; rec: any };

function formatDateLabel(ms: number): { key: string; label: string } {
  const d = new Date(ms);
  const now = new Date();
  const key = d.toISOString().slice(0, 10);
  const todayKey = now.toISOString().slice(0, 10);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  let label: string;
  if (key === todayKey) label = "Today";
  else if (key === yesterdayKey) label = "Yesterday";
  else
    label = d.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

  return { key, label };
}

function NewTab() {
  const { isDark } = useTheme();
  const catalogRecs = useQuery(api.recommendations.queries.getWeeklyRecommendations, { includeWardrobe: false });
  const wardrobeRecs = useQuery(api.recommendations.queries.getWeeklyRecommendations, { includeWardrobe: true });
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const textPrimary = isDark ? "#F5F0E8" : "#2D2926";
  const textSecondary = isDark ? "#C4B8A8" : "#6B635B";
  const divider = isDark ? "#3D3835" : "#E0D8CC";

  const loading = catalogRecs === undefined || wardrobeRecs === undefined;

  const combined = [
    ...((catalogRecs ?? []) as any[]),
    ...((wardrobeRecs ?? []) as any[]),
  ]
    .filter((r) => !dismissed.has(r._id))
    .sort((a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0));

  // Build a flat list of rows, inserting a date header whenever the date changes.
  const rows: FeedRow[] = [{ kind: "title" }];
  let lastKey: string | null = null;
  for (const rec of combined) {
    const { key, label } = formatDateLabel(rec._creationTime ?? Date.now());
    if (key !== lastKey) {
      rows.push({ kind: "dateHeader", date: key, label });
      lastKey = key;
    }
    rows.push({ kind: "rec", rec });
  }

  if (loading) {
    return (
      <FlatList
        data={[0, 1, 2]}
        keyExtractor={(i) => String(i)}
        renderItem={() => <RecommendationSkeleton />}
        contentContainerStyle={{ paddingVertical: 12 }}
        showsVerticalScrollIndicator={false}
      />
    );
  }

  if (combined.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Sparkles size={48} color={isDark ? "#C9A07A" : "#5C2A33"} style={{ marginBottom: 16 }} />
        <Text style={[styles.emptyTitle, { color: isDark ? "#F5F0E8" : "#2D2926" }]}>
          Nima is curating your looks
        </Text>
        <Text style={[styles.emptySubtitle, { color: isDark ? "#C4B8A8" : "#6B635B" }]}>
          Your personalised daily picks will appear here.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(row, idx) => {
        if (row.kind === "title") return "title";
        if (row.kind === "dateHeader") return `hdr-${row.date}`;
        return row.rec._id ?? `row-${idx}`;
      }}
      renderItem={({ item, index }) => {
        if (item.kind === "title") {
          return (
            <Text style={[styles.sectionHeader, { color: textPrimary, marginTop: 4, marginBottom: 8 }]}>
              Here are your daily recommendations
            </Text>
          );
        }
        if (item.kind === "dateHeader") {
          const isFirstHeader = index === 1; // right after the title
          return (
            <View style={styles.dateHeader}>
              {!isFirstHeader && (
                <View style={[styles.dateDivider, { backgroundColor: divider }]} />
              )}
              <Text style={[styles.dateLabel, { color: textSecondary }]}>
                {item.label}
              </Text>
            </View>
          );
        }
        return (
          <RecommendationCard
            recommendation={item.rec}
            onDismiss={() => setDismissed((prev) => new Set([...prev, item.rec._id]))}
          />
        );
      }}
      contentContainerStyle={{ paddingVertical: 12, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    />
  );
}

// ─────────────────────────────────────────────
// MY WARDROBE sub-tab
// ─────────────────────────────────────────────
function WardrobeTab() {
  const { isDark } = useTheme();
  // Responsive tile grid: 2 columns on phones, 3+ on iPad. Computed from the
  // live window width (not the module-level Dimensions snapshot) so it adapts.
  const { width: winWidth, columns } = useResponsiveLayout(2, 3);
  const tileSize =
    (winWidth - 32 - WARDROBE_COLUMN_GAP * (columns - 1)) / columns;
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [showUploadSheet, setShowUploadSheet] = useState(false);
  const [uploadDefaultSource, setUploadDefaultSource] = useState<"single_upload" | "closet_scan" | undefined>();
  const [viewerItem, setViewerItem] = useState<{ items: ViewerItem[]; initialIndex: number } | null>(null);
  const [longPressId, setLongPressId] = useState<Id<"wardrobeItems"> | null>(null);

  const wardrobeItems = useQuery(
    api.wardrobe.queries.getWardrobeItems,
    { category: activeCategory === "All" ? undefined : activeCategory }
  );
  const wardrobeCount = useQuery(api.wardrobe.queries.getWardrobeItemCount, {});
  const removeWardrobeItemMutation = useMutation(api.wardrobe.mutations.removeWardrobeItem);

  const handleRemove = useCallback(
    async (itemId: Id<"wardrobeItems">) => {
      try {
        await removeWardrobeItemMutation({ itemId });
      } catch {
        Alert.alert("Error", "Failed to remove item. Please try again.");
      }
    },
    [removeWardrobeItemMutation]
  );

  const openUpload = (source?: "single_upload" | "closet_scan") => {
    setUploadDefaultSource(source);
    setShowUploadSheet(true);
  };

  const textPrimary = isDark ? "#F5F0E8" : "#2D2926";
  const textSecondary = isDark ? "#C4B8A8" : "#6B635B";
  const surface = isDark ? "#252220" : "#F5F0E8";
  const border = isDark ? "#3D3835" : "#E0D8CC";
  const accent = isDark ? "#C9A07A" : "#5C2A33";
  const activeChipBg = isDark ? "#C9A07A" : "#5C2A33";

  const itemsAsViewerItems: ViewerItem[] = (wardrobeItems ?? []).map((item) => ({
    _id: item._id,
    imageUrl: item.imageUrl,
    description: item.description,
    category: item.category,
    color: item.color,
    formality: item.formality,
  }));

  const countLabel =
    activeCategory === "All"
      ? `${wardrobeCount ?? 0} items`
      : `${wardrobeItems?.length ?? 0} items in ${activeCategory}`;

  const renderTile = ({ item, index }: { item: ViewerItem; index: number }) => (
    <Pressable
      onPress={() => setViewerItem({ items: itemsAsViewerItems, initialIndex: index })}
      onLongPress={() => setLongPressId(item._id)}
      style={[
        styles.wardrobeTile,
        { width: tileSize, height: tileSize, backgroundColor: surface, borderColor: border },
      ]}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.wardrobeTileImage} resizeMode="cover" />
      ) : (
        <View style={[styles.wardrobeTileImage, { alignItems: "center", justifyContent: "center" }]}>
          <Text style={{ fontSize: 36 }}>👗</Text>
        </View>
      )}

      {/* Description overlay */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.6)"]}
        style={styles.wardrobeTileOverlay}
      >
        <Text style={styles.wardrobeTileText} numberOfLines={2}>
          {item.description ?? item.category}
        </Text>
      </LinearGradient>

      {/* Long press delete overlay */}
      {longPressId === item._id && (
        <Pressable
          style={styles.wardrobeTileDeleteOverlay}
          onPress={() => {
            Alert.alert("Remove Item", "Remove this from your wardrobe?", [
              { text: "Cancel", onPress: () => setLongPressId(null) },
              {
                text: "Remove",
                style: "destructive",
                onPress: () => {
                  handleRemove(item._id);
                  setLongPressId(null);
                },
              },
            ]);
          }}
        >
          <View style={styles.wardrobeTileDeleteBtn}>
            <Trash2 size={18} color="#FF6B6B" />
          </View>
        </Pressable>
      )}
    </Pressable>
  );

  const items = wardrobeItems ?? [];

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={items as ViewerItem[]}
        keyExtractor={(item) => item._id}
        renderItem={renderTile}
        key={`wardrobe-cols-${columns}`}
        numColumns={columns}
        columnWrapperStyle={{ gap: WARDROBE_COLUMN_GAP }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, paddingTop: 4 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Category chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 12 }}
            >
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setActiveCategory(cat)}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: isActive ? activeChipBg : surface,
                        borderColor: isActive ? activeChipBg : border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        { color: isActive ? "#FAF8F5" : textSecondary },
                      ]}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Count */}
            <Text style={[styles.countText, { color: textSecondary }]}>{countLabel}</Text>

            {/* Empty state */}
            {items.length === 0 && wardrobeItems !== undefined && (
              <View style={styles.wardrobeEmpty}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>🗂️</Text>
                <Text style={[styles.emptyTitle, { color: textPrimary }]}>Your wardrobe is empty</Text>
                <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
                  Upload items from your closet so Nima can style them.
                </Text>
                <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
                  <TouchableOpacity
                    style={[styles.emptyBtn, { borderColor: border }]}
                    onPress={() => openUpload("single_upload")}
                  >
                    <Upload size={16} color={accent} />
                    <Text style={[styles.emptyBtnText, { color: textPrimary }]}>Upload an Item</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.emptyBtn, { borderColor: border }]}
                    onPress={() => openUpload("closet_scan")}
                  >
                    <FolderOpen size={16} color={accent} />
                    <Text style={[styles.emptyBtnText, { color: textPrimary }]}>Scan My Closet</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        }
      />

      {/* FAB */}
      {items.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: accent }]}
          onPress={() => openUpload()}
          activeOpacity={0.85}
        >
          <Text style={styles.fabText}>＋</Text>
        </TouchableOpacity>
      )}

      {/* Upload sheet */}
      <WardrobeUploadSheet
        visible={showUploadSheet}
        onClose={() => setShowUploadSheet(false)}
        defaultSource={uploadDefaultSource}
      />

      {/* Full-screen viewer */}
      {viewerItem && (
        <WardrobeItemViewer
          items={viewerItem.items}
          initialIndex={viewerItem.initialIndex}
          onClose={() => setViewerItem(null)}
          onRemove={(id) => {
            handleRemove(id);
            // Remove from viewer items
            const updated = viewerItem.items.filter((i) => i._id !== id);
            if (updated.length === 0) {
              setViewerItem(null);
            } else {
              setViewerItem({ items: updated, initialIndex: Math.min(viewerItem.initialIndex, updated.length - 1) });
            }
          }}
        />
      )}
    </View>
  );
}

function getGreeting(firstName?: string | null): string {
  const hour = new Date().getHours();
  let period: string;
  if (hour >= 5 && hour < 12) period = "Morning";
  else if (hour >= 12 && hour < 17) period = "Afternoon";
  else if (hour >= 17 && hour < 21) period = "Evening";
  else period = "Night";

  return firstName ? `${period}, ${firstName}` : `Good ${period}`;
}

// ─────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────
export default function EngineScreen() {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [subTab, setSubTab] = useState<"new" | "wardrobe">("new");
  const currentUser = useQuery(api.users.queries.getCurrentUser);

  const bg = isDark ? "#1A1614" : "#FAF8F5";
  const textPrimary = isDark ? "#F5F0E8" : "#2D2926";
  const textSecondary = isDark ? "#C4B8A8" : "#6B635B";
  const surface = isDark ? "#252220" : "#F5F0E8";
  const border = isDark ? "#3D3835" : "#E0D8CC";

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: border, paddingTop: insets.top + 4 }]}>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>
          {getGreeting(currentUser?.firstName)}
        </Text>

        {/* Sub-tabs */}
        <View style={[styles.subTabRow, { backgroundColor: surface }]}>
          {(["new", "wardrobe"] as const).map((tab) => {
            const isActive = subTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setSubTab(tab)}
                style={[
                  styles.subTab,
                  {
                    backgroundColor: isActive ? (isDark ? "#3D3835" : "#FFFFFF") : "transparent",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.subTabText,
                    { color: isActive ? textPrimary : textSecondary },
                  ]}
                >
                  {tab === "new" ? "New" : "My Wardrobe"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {subTab === "new" ? <NewTab /> : <WardrobeTab />}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: "CormorantGaramond",
    fontWeight: "400",
    marginBottom: 16,
  },
  subTabRow: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 3,
    borderRadius: 70,
  },
  subTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 70,
  },
  subTabText: {
    fontSize: 14,
    fontWeight: "800",
    fontFamily: "DMSans_400Regular",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    marginTop: SCREEN_H * 0.15,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "DMSans_400Regular",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  skeletonCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
  },
  skeletonImage: {
    width: 120,
    height: 160,
    borderRadius: 12,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    width: "100%",
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "500",
    fontFamily: "DMSans_400Regular",
  },
  countText: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    marginBottom: 12,
  },
  wardrobeEmpty: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  emptyBtnText: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    fontWeight: "600",
  },
  wardrobeTile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: WARDROBE_COLUMN_GAP,
    borderWidth: 1,
  },
  wardrobeTileImage: {
    width: "100%",
    height: "100%",
  },
  wardrobeTileOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
  },
  wardrobeTileText: {
    color: "#FAF8F5",
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    fontWeight: "500",
  },
  wardrobeTileDeleteOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  wardrobeTileDeleteBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  fabText: {
    color: "#FAF8F5",
    fontSize: 24,
    fontWeight: "300",
    lineHeight: 28,
  },
  sectionHeader: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "DMSans_400Regular",
    marginHorizontal: 16,
    marginBottom: 4,
  },
  dateHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  dateDivider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  dateLabel: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    fontWeight: "600",
    letterSpacing: 0.4,
  },
});

const stylesViewer = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
    zIndex: 10,
  },
  counter: {
    color: "#FAF8F5",
    fontSize: 15,
    fontFamily: "DMSans_400Regular",
    fontWeight: "600",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  chevron: {
    position: "absolute",
    top: "50%",
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  itemDesc: {
    color: "#FAF8F5",
    fontSize: 17,
    fontWeight: "600",
    fontFamily: "DMSans_400Regular",
    marginBottom: 4,
  },
  itemMeta: {
    color: "rgba(250,248,245,0.7)",
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    marginBottom: 20,
  },
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  removeBtnText: {
    color: "#FF6B6B",
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    fontWeight: "600",
  },
  dots: {
    position: "absolute",
    bottom: 8,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 18,
    backgroundColor: "#FAF8F5",
  },
  dotInactive: {
    width: 6,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
});
