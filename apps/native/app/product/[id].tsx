import { useState, useEffect, useRef } from "react";
import {
  View,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Modal,
  Linking,
  Dimensions,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { formatPrice } from "@/lib/utils/format";
import {
  Heart,
  Share2,
  Sparkles,
  ChevronLeft,
  ShoppingCart,
  ShoppingBag,
  ExternalLink,
  Check,
  AlertCircle,
  Bookmark,
  BookmarkCheck,
} from "lucide-react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Clipboard from "expo-clipboard";
import { CreditsModal } from "@/components/credits/CreditsModal";
import { ShareOptionsModal } from "@/components/ui/ShareOptionsModal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type TryOnStatus =
  | "idle"
  | "starting"
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [tryOnStatus, setTryOnStatus] = useState<TryOnStatus>("idle");
  const [tryOnId, setTryOnId] = useState<Id<"item_try_ons"> | null>(null);
  const [showTryOnResult, setShowTryOnResult] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [isSavingTryOn, setIsSavingTryOn] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // Step 1: Resolve publicId → full item doc
  const item = useQuery(api.items.queries.getItemByPublicId, {
    publicId: id || "",
  });

  // Step 2: Get images and try-on status using internal _id
  const itemImages = useQuery(
    api.items.queries.getItemImages,
    item ? { itemId: item._id } : "skip",
  );
  const existingTryOn = useQuery(
    api.itemTryOns.queries.getItemTryOnForUser,
    item ? { itemId: item._id } : "skip",
  );

  // Mutations
  const startTryOn = useMutation(api.workflows.index.startItemTryOn);
  const quickSave = useMutation(api.lookbooks.mutations.quickSave);
  const saveTryOn = useMutation(api.lookbooks.mutations.saveTryOnToLookbook);
  const addToCartMut = useMutation(api.cart.mutations.addToCart);

  // Poll for try-on status updates
  const tryOnResult = useQuery(
    api.itemTryOns.queries.getItemTryOnWithDetails,
    tryOnId ? { itemTryOnId: tryOnId } : "skip",
  );

  // Check if try-on is saved
  const isSaved = useQuery(
    api.lookbooks.queries.isTryOnSaved,
    tryOnId ? { itemTryOnId: tryOnId } : "skip",
  );

  // Sync try-on from existing data
  useEffect(() => {
    if (!existingTryOn) return;
    const { tryOn } = existingTryOn;
    setTryOnId(tryOn._id);
    if (tryOn.status === "completed") setTryOnStatus("completed");
    else if (tryOn.status === "pending" || tryOn.status === "processing")
      setTryOnStatus(tryOn.status);
    else if (tryOn.status === "failed") setTryOnStatus("failed");
  }, [existingTryOn]);

  // Watch try-on result for completion
  useEffect(() => {
    if (!tryOnResult) return;
    const { tryOn } = tryOnResult;
    if (tryOn.status === "completed" && tryOnResult.imageUrl) {
      setTryOnStatus("completed");
    } else if (tryOn.status === "failed") {
      setTryOnStatus("failed");
      Alert.alert("Try-on Failed", tryOn.errorMessage || "Generation failed");
    } else if (tryOn.status === "processing") {
      setTryOnStatus("processing");
    } else if (tryOn.status === "pending") {
      setTryOnStatus("pending");
    }
  }, [tryOnResult]);

  const images = itemImages?.filter((img) => img.url) || [];
  const hasMultipleImages = images.length > 1;

  /* ─── Handlers ─── */

  const handleTryOn = async () => {
    if (!item) return;
    if (tryOnStatus === "completed") {
      setShowTryOnResult(true);
      return;
    }
    if (["starting", "pending", "processing"].includes(tryOnStatus)) return;

    if (item.colors.length > 0 && !selectedColor) {
      Alert.alert("Select Color", "Please select a color first");
      return;
    }
    if (item.sizes.length > 0 && !selectedSize) {
      Alert.alert("Select Size", "Please select a size first");
      return;
    }

    setTryOnStatus("starting");
    try {
      const result = await startTryOn({
        itemId: item._id,
        selectedSize: selectedSize || undefined,
        selectedColor: selectedColor || undefined,
      });
      if (result.success && result.tryOnId) {
        setTryOnId(result.tryOnId);
        setTryOnStatus("pending");
      } else if (result.error === "insufficient_credits") {
        setTryOnStatus("idle");
        setShowCreditsModal(true);
      } else {
        setTryOnStatus("failed");
        Alert.alert("Error", result.error || "Failed to start try-on");
      }
    } catch (error) {
      setTryOnStatus("failed");
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Something went wrong",
      );
    }
  };

  const handleFavorite = async () => {
    if (!item) return;
    try {
      await quickSave({ itemType: "item", itemId: item._id });
      setIsLiked(true);
    } catch {
      Alert.alert("Error", "Failed to save");
    }
  };

  const productUrl = `https://www.shopnima.ai/product/${id}`;
  const shareTitle = item?.name ?? "this item";

  const handleAddToCart = async () => {
    if (!item || addedToCart) return;
    setIsAddingToCart(true);
    try {
      const result = await addToCartMut({ itemId: item._id });
      if (result.success) {
        setAddedToCart(true);
        setShowTryOnResult(false);
        setTimeout(() => setAddedToCart(false), 3000);
      } else {
        Alert.alert("Error", result.message || "Failed to add to cart");
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to add to cart",
      );
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleSaveTryOn = async () => {
    if (!tryOnId) return;
    setIsSavingTryOn(true);
    try {
      const result = await saveTryOn({ itemTryOnId: tryOnId });
      if (result.success) {
        Alert.alert("Saved", result.message);
      } else {
        Alert.alert("Error", "Failed to save to lookbook");
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to save",
      );
    } finally {
      setIsSavingTryOn(false);
    }
  };

  /* ─── Loading state ─── */

  if (item === undefined) {
    return (
      <SafeAreaView className="flex-1 bg-background dark:bg-background-dark items-center justify-center">
        <ActivityIndicator
          size="large"
          color={isDark ? "#C9A07A" : "#A67C52"}
        />
      </SafeAreaView>
    );
  }

  if (item === null) {
    return (
      <SafeAreaView className="flex-1 bg-background dark:bg-background-dark items-center justify-center px-6">
        <AlertCircle size={40} color={isDark ? "#C9A07A" : "#A67C52"} />
        <Text className="text-lg font-medium text-foreground dark:text-foreground-dark mt-4">
          Product not found
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-6 px-6 py-3 bg-primary dark:bg-primary-dark rounded-full"
        >
          <Text className="text-primary-foreground dark:text-primary-dark-foreground font-medium">
            Go Back
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const primaryImageUrl = images[0]?.url;
  const hasDiscount =
    item.originalPrice !== undefined && item.originalPrice > item.price;
  const discountPercent = hasDiscount
    ? Math.round((1 - item.price / item.originalPrice!) * 100)
    : 0;

  const onImageScroll = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / SCREEN_WIDTH);
    if (idx !== currentImageIndex) setCurrentImageIndex(idx);
  };

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
      >
        {/* Floating header */}
        <View
          style={{ paddingTop: insets.top + 8 }}
          className="absolute z-10 w-full flex-row justify-end px-4"
        >
          {/* <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-background/80 dark:bg-background-dark/80 border border-border/50 dark:border-border-dark/50 items-center justify-center"
          >
            <ChevronLeft size={22} color={isDark ? "#E8E2DA" : "#2D2926"} />
          </TouchableOpacity> */}
          <TouchableOpacity
            onPress={() => setShowShareModal(true)}
            className="w-10 h-10 rounded-full bg-background/80 dark:bg-background-dark/80 border border-border/50 dark:border-border-dark/50 items-center justify-center"
          >
            <Share2 size={20} color={isDark ? "#E8E2DA" : "#2D2926"} />
          </TouchableOpacity>
        </View>

        {/* Image Carousel */}
        <View
          style={{ width: SCREEN_WIDTH, aspectRatio: 3 / 4 }}
          className="bg-surface-alt dark:bg-surface-alt-dark"
        >
          {images.length > 0 ? (
            <FlatList
              ref={flatListRef}
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onImageScroll}
              keyExtractor={(_, i) => i.toString()}
              renderItem={({ item: img }) => (
                <View style={{ width: SCREEN_WIDTH, height: "100%" }}>
                  <Image
                    source={{ uri: img.url! }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                    transition={200}
                  />
                </View>
              )}
            />
          ) : primaryImageUrl ? (
            <Image
              source={{ uri: primaryImageUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <ShoppingBag size={40} color={isDark ? "#C9A07A" : "#A67C52"} />
            </View>
          )}

          {/* Page indicators */}
          {hasMultipleImages && (
            <View className="absolute bottom-4 left-0 right-0 flex-row justify-center gap-1.5">
              {images.map((_, i) => (
                <View
                  key={i}
                  className={`h-2 rounded-full ${
                    i === currentImageIndex
                      ? "w-4 bg-primary dark:bg-primary-dark"
                      : "w-2 bg-foreground/30 dark:bg-foreground-dark/30"
                  }`}
                />
              ))}
            </View>
          )}
        </View>

        {/* Product Info */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          className="px-4 py-6 gap-5"
        >
          {/* Brand */}
          <View>
            {item.brand && (
              <Text className="text-xs font-medium text-muted-foreground dark:text-muted-dark-foreground uppercase tracking-widest mb-1">
                {item.brand}
              </Text>
            )}
            <Text className="text-2xl font-semibold text-foreground dark:text-foreground-dark">
              {item.name}
            </Text>
          </View>

          {/* Price */}
          <View className="flex-row items-baseline gap-3">
            <Text className="text-2xl font-bold text-foreground dark:text-foreground-dark">
              {formatPrice(item.price, item.currency)}
            </Text>
            {hasDiscount && (
              <>
                <Text className="text-lg text-muted-foreground dark:text-muted-dark-foreground line-through">
                  {formatPrice(item.originalPrice!, item.currency)}
                </Text>
                <View className="px-2 py-0.5 bg-destructive/10 dark:bg-destructive-dark/10 rounded-full">
                  <Text className="text-destructive dark:text-destructive-dark text-sm font-medium">
                    {discountPercent}% OFF
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Description */}
          {item.description && (
            <Text className="text-muted-foreground dark:text-muted-dark-foreground leading-relaxed">
              {item.description}
            </Text>
          )}

          {/* Colors */}
          {item.colors.length > 0 && (
            <View>
              <Text className="text-sm font-medium text-foreground dark:text-foreground-dark mb-2">
                Colors
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {item.colors.map((color, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setSelectedColor(color)}
                    className={`flex-row items-center gap-2 px-3 py-1.5 rounded-full border ${
                      selectedColor === color
                        ? "bg-primary/10 dark:bg-primary-dark/10 border-primary dark:border-primary-dark"
                        : "bg-surface dark:bg-surface-dark border-border dark:border-border-dark"
                    }`}
                  >
                    <View
                      className="w-4 h-4 rounded-full border border-border dark:border-border-dark"
                      style={{ backgroundColor: color.toLowerCase() }}
                    />
                    <Text
                      className={`text-sm ${
                        selectedColor === color
                          ? "font-medium text-primary dark:text-primary-dark"
                          : "text-foreground dark:text-foreground-dark"
                      }`}
                    >
                      {color}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Sizes */}
          {item.sizes.length > 0 && (
            <View>
              <Text className="text-sm font-medium text-foreground dark:text-foreground-dark mb-2">
                Sizes
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {item.sizes.map((size, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setSelectedSize(size)}
                    className={`px-4 py-2 rounded-lg border ${
                      selectedSize === size
                        ? "bg-primary dark:bg-primary-dark border-primary dark:border-primary-dark"
                        : "bg-surface dark:bg-surface-dark border-border dark:border-border-dark"
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        selectedSize === size
                          ? "text-primary-foreground dark:text-primary-dark-foreground font-medium"
                          : "text-foreground dark:text-foreground-dark"
                      }`}
                    >
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Category & Tags */}
          <View className="flex-row flex-wrap gap-2">
            <View className="px-3 py-1 bg-primary/10 dark:bg-primary-dark/10 rounded-full">
              <Text className="text-primary dark:text-primary-dark text-sm font-medium capitalize">
                {item.category}
              </Text>
            </View>
            {item.tags.slice(0, 4).map((tag, index) => (
              <View
                key={index}
                className="px-3 py-1 bg-surface dark:bg-surface-dark rounded-full"
              >
                <Text className="text-muted-foreground dark:text-muted-dark-foreground text-sm">
                  {tag}
                </Text>
              </View>
            ))}
          </View>

          {/* Source URL */}
          {item.sourceUrl && (
            <TouchableOpacity
              onPress={() => Linking.openURL(item.sourceUrl!)}
              className="flex-row items-center justify-center gap-2 py-3 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl"
            >
              <ShoppingBag size={20} color={isDark ? "#E8E2DA" : "#2D2926"} />
              <Text className="font-medium text-foreground dark:text-foreground-dark">
                View at {item.sourceStore || "Store"}
              </Text>
              <ExternalLink size={16} color={isDark ? "#E8E2DA" : "#2D2926"} />
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>

      {/* Fixed Bottom Action Bar */}
      <View
        style={{ paddingBottom: insets.bottom + 8 }}
        className="absolute bottom-0 left-0 right-0 bg-background/95 dark:bg-background-dark/95 border-t border-border dark:border-border-dark px-4 pt-3"
      >
        <View className="flex-row gap-3">
          {/* Favorite */}
          <TouchableOpacity
            onPress={handleFavorite}
            disabled={isLiked}
            className={`p-4 rounded-xl border ${
              isLiked
                ? "bg-destructive/10 dark:bg-destructive-dark/10 border-destructive/30 dark:border-destructive-dark/30"
                : "bg-surface dark:bg-surface-dark border-border dark:border-border-dark"
            }`}
          >
            <Heart
              size={24}
              color={
                isLiked
                  ? isDark
                    ? "#F87171"
                    : "#DC2626"
                  : isDark
                    ? "#E8E2DA"
                    : "#2D2926"
              }
              fill={isLiked ? (isDark ? "#F87171" : "#DC2626") : "transparent"}
            />
          </TouchableOpacity>

          {/* Add to Cart */}
          <TouchableOpacity
            onPress={handleAddToCart}
            disabled={isAddingToCart || !item.inStock || addedToCart}
            className={`flex-1 py-4 rounded-xl items-center justify-center flex-row gap-2 ${
              addedToCart ? "bg-green-600" : "bg-primary dark:bg-primary-dark"
            } ${!item.inStock || isAddingToCart ? "opacity-50" : ""}`}
          >
            {isAddingToCart ? (
              <>
                <ActivityIndicator size="small" color="#FFF" />
                <Text className="text-primary-foreground dark:text-primary-dark-foreground font-medium">
                  Adding...
                </Text>
              </>
            ) : addedToCart ? (
              <>
                <Check size={20} color="#FFF" />
                <Text className="text-white font-medium">Added</Text>
              </>
            ) : !item.inStock ? (
              <>
                <AlertCircle size={20} color="#FFF" />
                <Text className="text-primary-foreground dark:text-primary-dark-foreground font-medium">
                  Out of Stock
                </Text>
              </>
            ) : (
              <>
                <ShoppingCart size={20} color="#FFF" />
                <Text className="text-primary-foreground dark:text-primary-dark-foreground font-medium">
                  Add to Cart
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Try On */}
          <TouchableOpacity
            onPress={handleTryOn}
            disabled={tryOnStatus === "starting"}
            className={`flex-1 py-4 rounded-xl items-center justify-center flex-row gap-2 border ${
              tryOnStatus === "completed"
                ? "bg-green-600 border-green-600"
                : ["starting", "pending", "processing"].includes(tryOnStatus)
                  ? "bg-primary/50 dark:bg-primary-dark/50 border-primary/50 dark:border-primary-dark/50"
                  : "bg-surface dark:bg-surface-dark border-border dark:border-border-dark"
            }`}
          >
            {["starting", "pending", "processing"].includes(tryOnStatus) ? (
              <>
                <ActivityIndicator
                  size="small"
                  color={isDark ? "#C9A07A" : "#A67C52"}
                />
                <Text className="text-foreground dark:text-foreground-dark font-medium">
                  Generating...
                </Text>
              </>
            ) : tryOnStatus === "completed" ? (
              <>
                <Check size={20} color="#FFF" />
                <Text className="text-white font-medium">View Try-On</Text>
              </>
            ) : (
              <>
                <Sparkles size={20} color={isDark ? "#E8E2DA" : "#2D2926"} />
                <Text className="text-foreground dark:text-foreground-dark font-medium">
                  {tryOnStatus === "failed" ? "Retry" : "Try On"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Try-On Result Modal */}
      <Modal
        visible={showTryOnResult && !!tryOnResult?.imageUrl}
        animationType="fade"
        transparent
        onRequestClose={() => setShowTryOnResult(false)}
      >
        <Pressable
          onPress={() => setShowTryOnResult(false)}
          className="flex-1 bg-black/80 items-center justify-center p-4"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-[400px] bg-background dark:bg-background-dark rounded-3xl overflow-hidden"
          >
            {/* Try-on image */}
            <View style={{ aspectRatio: 3 / 4 }}>
              {tryOnResult?.imageUrl && (
                <Image
                  source={{ uri: tryOnResult.imageUrl }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              )}
            </View>

            {/* Info bar */}
            <View className="p-4 bg-surface dark:bg-surface-dark border-t border-border dark:border-border-dark">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-1">
                  <Text className="font-medium text-foreground dark:text-foreground-dark">
                    {item.name}
                  </Text>
                  <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground">
                    {formatPrice(item.price, item.currency)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleFavorite}
                  className="p-2 rounded-full bg-background dark:bg-background-dark"
                >
                  <Heart
                    size={20}
                    color={
                      isLiked
                        ? isDark
                          ? "#F87171"
                          : "#DC2626"
                        : isDark
                          ? "#E8E2DA"
                          : "#2D2926"
                    }
                    fill={
                      isLiked ? (isDark ? "#F87171" : "#DC2626") : "transparent"
                    }
                  />
                </TouchableOpacity>
              </View>

              <View className="flex-row gap-3">
                {/* Save Look */}
                <TouchableOpacity
                  onPress={handleSaveTryOn}
                  disabled={isSavingTryOn || !!isSaved}
                  className={`flex-1 py-3 rounded-xl border items-center justify-center flex-row gap-2 ${
                    isSaved
                      ? "bg-green-600 border-green-600"
                      : "bg-surface dark:bg-surface-dark border-border dark:border-border-dark"
                  } ${isSavingTryOn ? "opacity-80" : ""}`}
                >
                  {isSavingTryOn ? (
                    <ActivityIndicator
                      size="small"
                      color={isDark ? "#C9A07A" : "#A67C52"}
                    />
                  ) : isSaved ? (
                    <BookmarkCheck size={20} color="#FFF" />
                  ) : (
                    <Bookmark
                      size={20}
                      color={isDark ? "#E8E2DA" : "#2D2926"}
                    />
                  )}
                  <Text
                    className={`font-medium ${
                      isSaved
                        ? "text-white"
                        : "text-foreground dark:text-foreground-dark"
                    }`}
                  >
                    {isSaved ? "Saved" : "Save Look"}
                  </Text>
                </TouchableOpacity>

                {/* Add to Cart */}
                <TouchableOpacity
                  onPress={handleAddToCart}
                  disabled={isAddingToCart || addedToCart}
                  className={`flex-1 py-3 rounded-xl items-center justify-center flex-row gap-2 ${
                    addedToCart
                      ? "bg-green-600"
                      : "bg-primary dark:bg-primary-dark"
                  } ${isAddingToCart ? "opacity-50" : ""}`}
                >
                  {isAddingToCart ? (
                    <>
                      <ActivityIndicator size="small" color="#FFF" />
                      <Text className="text-white font-medium">Adding...</Text>
                    </>
                  ) : addedToCart ? (
                    <>
                      <Check size={20} color="#FFF" />
                      <Text className="text-white font-medium">Added</Text>
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={20} color="#FFF" />
                      <Text className="text-primary-foreground dark:text-primary-dark-foreground font-medium">
                        Add to Cart
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Share Options Modal */}
      <ShareOptionsModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={productUrl}
        title={shareTitle}
      />

      {/* Credits Modal */}
      <CreditsModal
        visible={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
      />
    </View>
  );
}
