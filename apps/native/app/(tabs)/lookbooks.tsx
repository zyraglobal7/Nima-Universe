import { useState, useMemo } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { LookbookCard } from "@/components/lookbooks/LookbookCard";
import { CreateLookbookModal } from "@/components/lookbooks/CreateLookbookModal";
import { Sparkles, Heart, BookOpen, Plus, AlertCircle } from "lucide-react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatPrice } from "@/lib/utils/format";
import Animated, { FadeInDown } from "react-native-reanimated";

type TabId = "saved" | "liked" | "lookbooks";

const TABS: { id: TabId; label: string; icon: typeof Sparkles }[] = [
  { id: "saved", label: "Saved Looks", icon: Sparkles },
  { id: "liked", label: "Liked Items", icon: Heart },
  { id: "lookbooks", label: "Lookbooks", icon: BookOpen },
];

export default function LookbooksScreen() {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [activeTab, setActiveTab] = useState<TabId>("saved");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Queries
  const savedLooks = useQuery(api.looks.queries.getSavedLooks, { limit: 50 });
  const likedItems = useQuery(api.items.likes.getLikedItems, { limit: 50 });
  const lookbooksRaw = useQuery(api.lookbooks.queries.listUserLookbooks, {});
  const lookbooksWithCovers = useQuery(api.lookbooks.queries.listUserLookbooksWithCovers, {});
  const lookbooks = lookbooksRaw;

  const isLoading =
    (activeTab === "saved" && savedLooks === undefined) ||
    (activeTab === "liked" && likedItems === undefined) ||
    (activeTab === "lookbooks" && lookbooks === undefined);

  const cardWidth = (width - 48) / 2; // 2 columns with padding

  /* ─── Tab Switcher ─── */
  const renderTabSwitcher = () => (
    <View className="flex-row bg-surface dark:bg-surface-dark rounded-xl p-1 mx-4 mb-4">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-lg ${
              isActive ? "bg-primary dark:bg-primary-dark" : "bg-transparent"
            }`}
          >
            <Icon
              size={14}
              color={isActive ? "#FFF" : isDark ? "#9C948A" : "#706B63"}
            />
            <Text
              className={`text-xs font-medium ${
                isActive
                  ? "text-primary-foreground dark:text-primary-dark-foreground"
                  : "text-muted-foreground dark:text-muted-dark-foreground"
              }`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  /* ─── Saved Looks Grid ─── */
  const renderSavedLooks = () => {
    if (!savedLooks) return null;
    if (savedLooks.length === 0) {
      return (
        <View className="flex-1 items-center justify-center px-6 py-20">
          <Sparkles size={32} color={isDark ? "#706B63" : "#9C948A"} />
          <Text className="text-lg font-medium text-foreground dark:text-foreground-dark mt-4">
            No saved looks yet
          </Text>
          <Text className="text-muted-foreground dark:text-muted-dark-foreground text-center mt-2">
            Your looks from Nima will appear here. Try asking Nima for outfit
            ideas!
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={savedLooks}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          gap: 12,
          paddingBottom: 20,
        }}
        showsVerticalScrollIndicator={false}
        keyExtractor={(item) => item.look._id}
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeInDown.delay(index * 60).duration(300)}
            style={{ width: cardWidth }}
          >
            <TouchableOpacity
              onPress={() => router.push(`/look/${item.look.publicId}` as any)}
              activeOpacity={0.7}
              className="bg-surface dark:bg-surface-dark border border-border/30 dark:border-border-dark/30 rounded-2xl overflow-hidden"
            >
              <View style={{ aspectRatio: 3 / 4 }}>
                {item.lookImage?.imageUrl ? (
                  <Image
                    source={{ uri: item.lookImage.imageUrl }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View className="flex-1 bg-surface-alt dark:bg-surface-alt-dark items-center justify-center">
                    {item.lookImage?.status === "pending" ||
                    item.lookImage?.status === "processing" ? (
                      <ActivityIndicator
                        size="small"
                        color={isDark ? "#C9A07A" : "#A67C52"}
                      />
                    ) : item.lookImage?.status === "failed" ? (
                      <View className="items-center gap-1.5">
                        <AlertCircle
                          size={20}
                          color={isDark ? "#D4807A" : "#B85C5C"}
                        />
                        <Text className="text-xs text-destructive dark:text-destructive-dark font-medium">
                          Failed
                        </Text>
                      </View>
                    ) : item.items?.[0]?.primaryImageUrl ? (
                      <Image
                        source={{ uri: item.items[0].primaryImageUrl }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                        transition={200}
                      />
                    ) : (
                      <Sparkles
                        size={20}
                        color={isDark ? "#706B63" : "#9C948A"}
                      />
                    )}
                  </View>
                )}
              </View>
              <View className="p-2.5">
                <Text
                  className="text-sm font-medium text-foreground dark:text-foreground-dark"
                  numberOfLines={1}
                >
                  {item.look.occasion || item.look.name || "Look"}
                </Text>
                <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground mt-0.5">
                  {formatPrice(item.look.totalPrice, item.look.currency)}
                  {" · "}
                  {item.items.length} items
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}
      />
    );
  };

  /* ─── Liked Items Grid ─── */
  const renderLikedItems = () => {
    if (!likedItems) return null;
    if (likedItems.length === 0) {
      return (
        <View className="flex-1 items-center justify-center px-6 py-20">
          <Heart size={32} color={isDark ? "#706B63" : "#9C948A"} />
          <Text className="text-lg font-medium text-foreground dark:text-foreground-dark mt-4">
            No liked items yet
          </Text>
          <Text className="text-muted-foreground dark:text-muted-dark-foreground text-center mt-2">
            Tap the heart on any item you love to save it here.
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={likedItems}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          gap: 12,
          paddingBottom: 20,
        }}
        showsVerticalScrollIndicator={false}
        keyExtractor={(item) => item._id}
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeInDown.delay(index * 60).duration(300)}
            style={{ width: cardWidth }}
          >
            <TouchableOpacity
              onPress={() => router.push(`/product/${item.publicId}` as any)}
              activeOpacity={0.7}
              className="bg-surface dark:bg-surface-dark border border-border/30 dark:border-border-dark/30 rounded-2xl overflow-hidden"
            >
              <View style={{ aspectRatio: 3 / 4 }}>
                {item.primaryImageUrl ? (
                  <Image
                    source={{ uri: item.primaryImageUrl }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View className="flex-1 bg-surface-alt dark:bg-surface-alt-dark items-center justify-center">
                    <Text className="text-muted-foreground dark:text-muted-dark-foreground font-serif text-lg">
                      {item.category.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View className="p-2.5">
                {item.brand && (
                  <Text className="text-[10px] text-muted-foreground dark:text-muted-dark-foreground uppercase tracking-wider">
                    {item.brand}
                  </Text>
                )}
                <Text
                  className="text-sm font-medium text-foreground dark:text-foreground-dark"
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text className="text-sm font-semibold text-foreground dark:text-foreground-dark mt-0.5">
                  {formatPrice(item.price, item.currency)}
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}
      />
    );
  };

  /* ─── Lookbooks Grid ─── */
  const renderLookbooks = () => {
    if (!lookbooks) return null;

    // Build a map from lookbook ID -> cover data for quick lookup
    const coverMap = new Map<string, { coverImageUrl: string | null; previewImageUrls: string[] }>();
    if (lookbooksWithCovers) {
      for (const entry of lookbooksWithCovers) {
        coverMap.set(entry.lookbook._id, {
          coverImageUrl: entry.coverImageUrl,
          previewImageUrls: entry.previewImageUrls,
        });
      }
    }

    return (
      <View className="flex-1">
        {/* Create button */}
        <TouchableOpacity
          onPress={() => setShowCreateModal(true)}
          className="flex-row items-center justify-center gap-2 mx-4 mb-4 py-3 border border-dashed border-border dark:border-border-dark rounded-xl bg-surface/50 dark:bg-surface-dark/50"
        >
          <Plus size={18} color={isDark ? "#C9A07A" : "#A67C52"} />
          <Text className="text-primary dark:text-primary-dark font-medium">
            Create Lookbook
          </Text>
        </TouchableOpacity>

        {lookbooks.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6 py-16">
            <BookOpen size={32} color={isDark ? "#706B63" : "#9C948A"} />
            <Text className="text-lg font-medium text-foreground dark:text-foreground-dark mt-4">
              No lookbooks yet
            </Text>
            <Text className="text-muted-foreground dark:text-muted-dark-foreground text-center mt-2">
              Create collections to organize your favorite looks and items.
            </Text>
          </View>
        ) : (
          <FlatList
            data={lookbooks}
            numColumns={2}
            columnWrapperStyle={{ gap: 12 }}
            contentContainerStyle={{
              paddingHorizontal: 16,
              gap: 12,
              paddingBottom: 20,
            }}
            showsVerticalScrollIndicator={false}
            keyExtractor={(item) => item._id}
            renderItem={({ item, index }) => {
              const coverData = coverMap.get(item._id);
              return (
                <View style={{ width: cardWidth }}>
                  <LookbookCard
                    lookbook={{
                      _id: item._id,
                      name: item.name,
                      description: item.description,
                      itemCount: item.itemCount,
                      isPrivate: !item.isPublic,
                    }}
                    coverImageUrl={coverData?.coverImageUrl}
                    previewImageUrls={coverData?.previewImageUrls}
                    index={index}
                  />
                </View>
              );
            }}
          />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView
      className="flex-1 bg-background dark:bg-background-dark"
      edges={["top"]}
    >
      {/* Header */}
      <View className="px-4 pt-2 pb-4">
        <Text className="text-2xl font-serif font-semibold text-foreground dark:text-foreground-dark">
          My Collection
        </Text>
      </View>

      {/* Tab Switcher */}
      {renderTabSwitcher()}

      {/* Loading */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator
            size="large"
            color={isDark ? "#C9A07A" : "#A67C52"}
          />
        </View>
      ) : (
        <View className="flex-1">
          {activeTab === "saved" && renderSavedLooks()}
          {activeTab === "liked" && renderLikedItems()}
          {activeTab === "lookbooks" && renderLookbooks()}
        </View>
      )}

      {/* Create Lookbook Modal */}
      <CreateLookbookModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(id) => router.push(`/lookbook/${id}` as any)}
      />
    </SafeAreaView>
  );
}
