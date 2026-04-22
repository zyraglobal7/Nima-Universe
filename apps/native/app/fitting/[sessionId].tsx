import { useMemo, useState, useCallback } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Text } from "@/components/ui/Text";
import {
  LookCarousel,
  type FittingLook,
} from "@/components/fitting/LookCarousel";
import { ProductItem, type Product } from "@/components/fitting/ProductItem";
import { Sparkles, ArrowLeft, Share2 } from "lucide-react-native";
import { ShareOptionsModal } from "@/components/ui/ShareOptionsModal";
import { LinearGradient }  from "expo-linear-gradient";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useTheme } from "@/lib/contexts/ThemeContext";

export default function FittingRoomScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const { isDark } = useTheme();

  const [currentLookIndex, setCurrentLookIndex] = useState(0);
  const [likedLooks, setLikedLooks] = useState<Set<string>>(new Set());
  const [savedLooks, setSavedLooks] = useState<Set<string>>(new Set());
  const [likedProducts, setLikedProducts] = useState<Set<string>>(new Set());
  const [savedProducts, setSavedProducts] = useState<Set<string>>(new Set());
  const [showShareModal, setShowShareModal] = useState(false);

  // Parse look IDs from sessionId (comma-separated)
  const lookIds = useMemo(() => {
    if (!sessionId) return [];
    return sessionId.split(",").filter(Boolean) as Id<"looks">[];
  }, [sessionId]);

  // Fetch full details for each look (up to 3)
  const look1 = useQuery(
    api.looks.queries.getLookWithFullDetails,
    lookIds[0] ? { lookId: lookIds[0] } : "skip",
  );
  const look2 = useQuery(
    api.looks.queries.getLookWithFullDetails,
    lookIds[1] ? { lookId: lookIds[1] } : "skip",
  );
  const look3 = useQuery(
    api.looks.queries.getLookWithFullDetails,
    lookIds[2] ? { lookId: lookIds[2] } : "skip",
  );

  // Combine look data
  const allLookData = useMemo(() => {
    return [look1, look2, look3].filter(
      (d): d is NonNullable<typeof d> => d !== null && d !== undefined,
    );
  }, [look1, look2, look3]);

  // Loading state
  const isLoading = lookIds.length > 0 && allLookData.length === 0;

  // Transform to FittingLook format for carousel
  const fittingLooks = useMemo((): FittingLook[] => {
    return allLookData.map((data) => {
      const imageStatus = data.lookImage?.status || "pending";
      const isGenerating =
        imageStatus === "pending" || imageStatus === "processing";
      const isFailed = imageStatus === "failed";

      return {
        id: data.look._id,
        imageUrl: data.lookImage?.imageUrl || null,
        isGenerating,
        isFailed,
        styleTags: data.look.styleTags || [],
        occasion: data.look.occasion || "Everyday",
        totalPrice: data.look.totalPrice,
        currency: data.look.currency,
        nimaNote:
          data.look.nimaComment ||
          "I curated this look just for you! The pieces work beautifully together.",
        isLiked: likedLooks.has(data.look._id),
        isSaved: savedLooks.has(data.look._id),
      };
    });
  }, [allLookData, likedLooks, savedLooks]);

  // Current look's products
  const currentProducts = useMemo((): Product[] => {
    if (currentLookIndex >= allLookData.length) return [];
    const lookData = allLookData[currentLookIndex];
    if (!lookData) return [];

    return lookData.items.map((itemData) => ({
      id: itemData.item._id,
      name: itemData.item.name,
      brand: itemData.item.brand || "Unknown",
      category: itemData.item.category,
      price: itemData.item.price,
      currency: itemData.item.currency,
      imageUrl: itemData.primaryImageUrl || "",
      storeUrl: itemData.item.sourceUrl || "#",
      storeName: itemData.item.sourceStore || itemData.item.brand || "Store",
      color: itemData.item.colors?.[0] || "Mixed",
      isLiked: likedProducts.has(itemData.item._id),
      isSaved: savedProducts.has(itemData.item._id),
    }));
  }, [allLookData, currentLookIndex, likedProducts, savedProducts]);

  // Current look data
  const currentLook = fittingLooks[currentLookIndex];
  const currentLookData = allLookData[currentLookIndex];

  // Format price
  const formatPrice = (price: number, currency: string) => {
    if (currency === "KES") return `KSh ${price.toLocaleString()}`;
    return `${currency} ${price.toLocaleString()}`;
  };

  // Actions
  const handleLikeLook = useCallback((lookId: string) => {
    setLikedLooks((prev) => {
      const next = new Set(prev);
      if (next.has(lookId)) next.delete(lookId);
      else next.add(lookId);
      return next;
    });
  }, []);

  const handleSaveLook = useCallback((lookId: string) => {
    setSavedLooks((prev) => {
      const next = new Set(prev);
      if (next.has(lookId)) next.delete(lookId);
      else next.add(lookId);
      return next;
    });
  }, []);

  const handleDislikeLook = useCallback((_lookId: string) => {
    // Could navigate to next look or provide feedback
  }, []);

  const handleLikeProduct = useCallback((productId: string) => {
    setLikedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }, []);

  const handleSaveProduct = useCallback((productId: string) => {
    setSavedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }, []);

  const shareUrl = currentLookData
    ? `https://www.shopnima.ai/look/${currentLookData.look.publicId}`
    : "";
  const shareTitle = currentLook?.occasion
    ? `${currentLook.occasion} Look`
    : "This Look";

  // Loading skeleton
  if (isLoading) {
    return (
      <View className="flex-1 bg-background dark:bg-background-dark items-center justify-center">
        <Stack.Screen
          options={{
            headerShown: false,
          }}
        />
        <View className="items-center gap-3">
          <View className="w-16 h-16 rounded-full bg-primary/10 dark:bg-primary-dark/10 items-center justify-center">
            <Sparkles size={28} color={isDark ? "#C9A07A" : "#A67C52"} />
          </View>
          <Text className="text-lg font-medium text-foreground dark:text-foreground-dark">
            Loading your looks...
          </Text>
          <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground">
            Getting everything ready
          </Text>
        </View>
      </View>
    );
  }

  // Not found
  if (!isLoading && fittingLooks.length === 0) {
    return (
      <View className="flex-1 bg-background dark:bg-background-dark items-center justify-center px-8">
        <Stack.Screen
          options={{
            headerShown: false,
          }}
        />
        <Text className="text-lg font-medium text-foreground dark:text-foreground-dark mb-2">
          No looks found
        </Text>
        <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground text-center mb-6">
          These looks may have expired or been removed.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-primary dark:bg-primary-dark rounded-xl px-6 py-3"
          activeOpacity={0.8}
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Custom header */}
      <View
        className="flex-row items-center px-4 border-b border-border/20 dark:border-border-dark/20 bg-background/95 dark:bg-background-dark/95"
        style={{
          paddingTop: Platform.OS === "ios" ? 56 : 12,
          paddingBottom: 12,
          marginTop:25
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          className="w-9 h-9 rounded-full items-center justify-center mr-3"
        >
          <ArrowLeft size={22} color={isDark ? "#E0D8CC" : "#2D2926"} />
        </TouchableOpacity>

        <View className="flex-1 flex-row items-center gap-2">
          <View className="w-7 h-7 rounded-full bg-primary dark:bg-primary-dark items-center justify-center">
            <Sparkles size={12} color="#FAF8F5" />
          </View>
          <Text className="text-lg font-serif text-foreground dark:text-foreground-dark">
            Fitting Room
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowShareModal(true)}
          activeOpacity={0.7}
          className="w-9 h-9 rounded-full items-center justify-center"
        >
          <Share2 size={20} color={isDark ? "#E0D8CC" : "#2D2926"} />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Look Carousel */}
        <View className="mt-4">
          <LookCarousel
            looks={fittingLooks}
            currentIndex={currentLookIndex}
            onIndexChange={setCurrentLookIndex}
            onLike={handleLikeLook}
            onSave={handleSaveLook}
            onDislike={handleDislikeLook}
          />
        </View>

        {/* Nima's Note */}
        {currentLook && (
          <Animated.View
            entering={FadeInUp.duration(300)}
            className="mx-4 mt-6 mb-2"
          >
            <View className="flex-row items-start gap-3 bg-surface/80 dark:bg-surface-dark/80 rounded-2xl p-4 border border-border/20 dark:border-border-dark/20">
              <View className="w-9 h-9 rounded-full bg-primary/10 dark:bg-primary-dark/10 items-center justify-center mt-0.5">
                <Sparkles size={16} color={isDark ? "#C9A07A" : "#A67C52"} />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-semibold text-primary dark:text-primary-dark mb-1">
                  Nima's Note
                </Text>
                <Text className="text-sm text-foreground/80 dark:text-foreground-dark/80 leading-relaxed font-sans">
                  {currentLook.nimaNote}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Price summary */}
        {currentLook && (
          <View className="mx-4 my-4 flex-row items-center justify-between bg-surface dark:bg-surface-dark rounded-2xl px-5 py-4 border border-border/20 dark:border-border-dark/20">
            <View>
              <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground mb-0.5">
                Total for {currentProducts.length} items
              </Text>
              <Text className="text-xl font-bold text-foreground dark:text-foreground-dark">
                {formatPrice(currentLook.totalPrice, currentLook.currency)}
              </Text>
            </View>
            {currentLook.occasion && (
              <View className="px-3 py-1.5 bg-primary/10 dark:bg-primary-dark/10 rounded-full">
                <Text className="text-primary dark:text-primary-dark text-xs font-medium capitalize">
                  {currentLook.occasion}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Products list */}
        {currentProducts.length > 0 && (
          <View className="mb-4 mt-2">
            <Text className="text-sm font-semibold text-muted-foreground dark:text-muted-dark-foreground uppercase tracking-wider px-4 mb-3">
              Items in this look
            </Text>
            {currentProducts.map((product, index) => (
              <ProductItem
                key={product.id}
                product={product}
                index={index}
                onLike={handleLikeProduct}
                onSave={handleSaveProduct}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Fixed bottom CTA */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-background/95 dark:bg-background-dark/95 border-t border-border/20 dark:border-border-dark/20"
        style={{
          paddingBottom: Platform.OS === "ios" ? 34 : 16,
          paddingTop: 12,
          paddingHorizontal: 16,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          className="rounded-xl overflow-hidden"
          onPress={() => {
            Alert.alert(
              "Coming Soon! ✨",
              "Buy With Nima is launching soon. We'll notify you when it's ready!",
              [{ text: "OK" }],
            );
          }}
        >
          <LinearGradient
            colors={isDark ? ["#C9A07A", "#A67C52"] : ["#A67C52", "#8B6A42"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              paddingVertical: 16,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
            }}
          >
            <Sparkles size={18} color="#FFFFFF" />
            <Text className="text-white text-base font-semibold">
              Buy With Nima
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Share Options Modal */}
      <ShareOptionsModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={shareUrl}
        title={shareTitle}
        lookId={lookIds[currentLookIndex]}
      />
    </View>
  );
}
