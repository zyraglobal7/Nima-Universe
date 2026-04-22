import { useState, useCallback, useMemo } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Alert,
  ActivityIndicator,
  Dimensions,
  TextInput,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { formatPrice } from "@/lib/utils/format";
import { NimaChatBubble } from "@/components/discover/NimaChatBubble";
import { ProductCard } from "@/components/discover/ProductCard";
import {
  ChevronLeft,
  Heart,
  ThumbsDown,
  Bookmark,
  Share2,
  Sparkles,
  ShoppingCart,
  Check,
  Loader2,
  Plus,
  AlertTriangle,
  Trash2,
  RefreshCw,
} from "lucide-react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Clipboard from "expo-clipboard";
import { ShareOptionsModal } from "@/components/ui/ShareOptionsModal";
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import { useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function LookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [newLookbookName, setNewLookbookName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRecreating, setIsRecreating] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["60%", "80%"], []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    [],
  );

  // Resolve look — try as ID first, fallback to publicId
  const isConvexId = id?.startsWith("j") || id?.startsWith("k");

  const lookByPublicId = useQuery(
    api.looks.queries.getLookByPublicId,
    !isConvexId && id ? { publicId: id } : "skip",
  );

  // Get the internal look ID
  const lookInternalId = isConvexId ? (id as Id<"looks">) : lookByPublicId?._id;

  // Full details query
  const lookData = useQuery(
    api.looks.queries.getLookWithFullDetails,
    lookInternalId ? { lookId: lookInternalId } : "skip",
  );

  // User interactions
  const userInteraction = useQuery(
    api.lookInteractions.queries.getUserInteractionForLook,
    lookInternalId ? { lookId: lookInternalId } : "skip",
  );
  const interactionCounts = useQuery(
    api.lookInteractions.queries.getLookInteractionCounts,
    lookInternalId ? { lookId: lookInternalId } : "skip",
  );

  // Lookbooks for save modal
  const userLookbooks = useQuery(api.lookbooks.queries.listUserLookbooks, {});

  // User
  const currentUser = useQuery(api.users.queries.getCurrentUser, {});

  // Mutations
  const toggleLove = useMutation(api.lookInteractions.mutations.toggleLove);
  const toggleDislike = useMutation(
    api.lookInteractions.mutations.toggleDislike,
  );
  const recordSave = useMutation(api.lookInteractions.mutations.recordSave);
  const addToLookbook = useMutation(api.lookbooks.mutations.addToLookbook);
  const createLookbook = useMutation(api.lookbooks.mutations.createLookbook);
  const addToCart = useMutation(api.cart.mutations.addToCart);
  const retryGeneration = useMutation(api.looks.mutations.retryLookGeneration);
  const deleteLook = useMutation(api.looks.mutations.deleteLookByUser);
  const recreateLook = useMutation(api.looks.mutations.recreateLook);

  // Saved status for lookbook modal
  const savedStatus = useQuery(
    api.lookbooks.queries.isItemSaved,
    lookInternalId
      ? { itemType: "look" as const, lookId: lookInternalId }
      : "skip",
  );

  /* ─── Handlers ─── */

  const handleLove = async () => {
    if (!lookInternalId) return;
    try {
      await toggleLove({ lookId: lookInternalId });
    } catch {
      Alert.alert("Error", "Failed to update");
    }
  };

  const handleDislike = async () => {
    if (!lookInternalId) return;
    try {
      await toggleDislike({ lookId: lookInternalId });
    } catch {
      Alert.alert("Error", "Failed to update");
    }
  };

  const handleSavePress = () => {
    bottomSheetRef.current?.present();
  };

  const shareUrl = `https://www.shopnima.ai/look/${lookData?.look.publicId || id}`;
  const shareTitle = lookData?.look.occasion
    ? `${lookData.look.occasion} Look`
    : lookData?.look.name || "This Look";

  const handleSaveToLookbook = async (lookbookId: Id<"lookbooks">) => {
    if (!lookInternalId || isSaving) return;
    setIsSaving(true);
    try {
      await addToLookbook({
        lookbookId,
        itemType: "look",
        lookId: lookInternalId,
      });
      await recordSave({ lookId: lookInternalId });
    } catch (error: any) {
      const message =
        error?.message?.includes("already exists") ||
        error?.data?.includes("already exists")
          ? "Already saved to this lookbook"
          : "Failed to save to lookbook";
      Alert.alert(message === "Already saved to this lookbook" ? "Already Saved" : "Error", message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateLookbook = async () => {
    if (!newLookbookName.trim() || isCreating) return;
    setIsCreating(true);
    try {
      const lookbookId = await createLookbook({ name: newLookbookName.trim() });
      if (lookInternalId) {
        await addToLookbook({
          lookbookId,
          itemType: "look",
          lookId: lookInternalId,
        });
        await recordSave({ lookId: lookInternalId });
      }
      setNewLookbookName("");
    } catch {
      Alert.alert("Error", "Failed to create lookbook");
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddLookToCart = async () => {
    if (!lookData || addedToCart) return;
    setIsAddingToCart(true);
    try {
      for (const { item } of lookData.items) {
        await addToCart({ itemId: item._id });
      }
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 3000);
    } catch {
      Alert.alert("Error", "Failed to add items to cart");
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleRetry = async () => {
    if (!lookInternalId) return;
    setIsRetrying(true);
    try {
      await retryGeneration({ lookId: lookInternalId });
    } catch {
      Alert.alert("Error", "Failed to retry generation");
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDelete = () => {
    if (!lookInternalId) return;
    Alert.alert(
      "Delete Look",
      "Are you sure you want to delete this look? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteLook({ lookId: lookInternalId });
              router.back();
            } catch {
              Alert.alert("Error", "Failed to delete look");
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  const handleRecreateLook = async () => {
    if (!lookInternalId || isRecreating) return;
    setIsRecreating(true);
    try {
      const result = await recreateLook({ lookId: lookInternalId });
      if (result.success && result.publicId) {
        router.push(`/look/${result.publicId}` as any);
      } else {
        Alert.alert("Error", result.error || "Failed to recreate look");
      }
    } catch {
      Alert.alert("Error", "Failed to recreate look");
    } finally {
      setIsRecreating(false);
    }
  };

  /* ─── Loading / Error states ─── */

  if (lookData === undefined) {
    return (
      <SafeAreaView className="flex-1 bg-background dark:bg-background-dark items-center justify-center">
        <ActivityIndicator
          size="large"
          color={isDark ? "#C9A07A" : "#A67C52"}
        />
      </SafeAreaView>
    );
  }

  if (lookData === null) {
    return (
      <SafeAreaView className="flex-1 bg-background dark:bg-background-dark items-center justify-center px-6">
        <Sparkles size={40} color={isDark ? "#C9A07A" : "#A67C52"} />
        <Text className="text-lg font-medium text-foreground dark:text-foreground-dark mt-4">
          Look not found
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

  const { look, lookImage, items } = lookData;
  const imageUrl = lookImage?.imageUrl;
  const isOwner = currentUser?._id === look.creatorUserId;
  const isGenerating =
    lookImage?.status === "pending" || lookImage?.status === "processing";
  const generationFailed = lookImage?.status === "failed";
  const products = items;

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
      >
        {/* Floating header */}
        <View
          style={{ paddingTop: 55 }}
          className="absolute z-10 w-full flex-row justify-between px-4"
        >
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-background/80 dark:bg-background-dark/80 border border-border/50 dark:border-border-dark/50 items-center justify-center"
          >
            <ChevronLeft size={22} color={isDark ? "#E8E2DA" : "#2D2926"} />
          </TouchableOpacity>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => setShowShareModal(true)}
              className="w-10 h-10 rounded-full bg-background/80 dark:bg-background-dark/80 border border-border/50 dark:border-border-dark/50 items-center justify-center"
            >
              <Share2 size={20} color={isDark ? "#E8E2DA" : "#2D2926"} />
            </TouchableOpacity>
            {isOwner && (
              <TouchableOpacity
                onPress={handleDelete}
                disabled={isDeleting}
                className="w-10 h-10 rounded-full bg-background/80 dark:bg-background-dark/80 border border-border/50 dark:border-border-dark/50 items-center justify-center"
              >
                {isDeleting ? (
                  <ActivityIndicator
                    size="small"
                    color={isDark ? "#F87171" : "#DC2626"}
                  />
                ) : (
                  <Trash2 size={20} color={isDark ? "#F87171" : "#DC2626"} />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Hero Image */}
        <View
          style={{ width: SCREEN_WIDTH, aspectRatio: 3 / 4, paddingTop: insets.top }}
          className="bg-surface-alt dark:bg-surface-alt-dark"
        >
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: "100%", height: "100%"  }}
              contentFit="cover"
              transition={300}
            />
          ) : isGenerating ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator
                size="large"
                color={isDark ? "#C9A07A" : "#A67C52"}
              />
              <View className="flex-row items-center gap-2 mt-4">
                <Sparkles size={16} color={isDark ? "#C9A07A" : "#A67C52"} />
                <Text className="text-muted-foreground dark:text-muted-dark-foreground">
                  Generating your look...
                </Text>
              </View>
            </View>
          ) : generationFailed ? (
            <View className="flex-1 items-center justify-center px-6">
              <AlertTriangle size={32} color="#D97706" />
              <Text className="text-foreground dark:text-foreground-dark font-medium mt-3 text-center">
                Image generation failed
              </Text>
              {isOwner && (
                <TouchableOpacity
                  onPress={handleRetry}
                  disabled={isRetrying}
                  className="mt-4 px-6 py-2 bg-primary dark:bg-primary-dark rounded-full flex-row items-center gap-2"
                >
                  {isRetrying ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <RefreshCw size={16} color="#FFF" />
                  )}
                  <Text className="text-primary-foreground dark:text-primary-dark-foreground font-medium">
                    {isRetrying ? "Retrying..." : "Retry"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View className="flex-1 items-center justify-center">
              <Sparkles size={32} color={isDark ? "#C9A07A" : "#A67C52"} />
            </View>
          )}

          {/* Style tags overlay */}
          {look.styleTags.length > 0 && imageUrl && (
            <View className="absolute bottom-3 left-3 flex-row flex-wrap gap-1">
              {look.styleTags.slice(0, 3).map((tag, i) => (
                <View
                  key={i}
                  className="px-2 py-1 bg-background/70 dark:bg-background-dark/70 rounded-full"
                >
                  <Text className="text-xs text-foreground dark:text-foreground-dark">
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Content */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          className="px-4 pt-5 pb-6"
        >
          {/* Action Buttons */}
          <View className="flex-row justify-center gap-8 mb-6 mt-10">
            {/* Dislike */}
            <TouchableOpacity
              onPress={handleDislike}
              className={`items-center gap-1.5 ${
                userInteraction?.isDisliked ? "opacity-100" : "opacity-60"
              }`}
            >
              <View
                className={`w-12 h-12 rounded-full items-center justify-center border ${
                  userInteraction?.isDisliked
                    ? "bg-destructive/10 dark:bg-destructive-dark/10 border-destructive/30 dark:border-destructive-dark/30"
                    : "bg-surface dark:bg-surface-dark border-border dark:border-border-dark"
                }`}
              >
                <ThumbsDown
                  size={20}
                  color={
                    userInteraction?.isDisliked
                      ? isDark
                        ? "#F87171"
                        : "#DC2626"
                      : isDark
                        ? "#E8E2DA"
                        : "#2D2926"
                  }
                  fill={
                    userInteraction?.isDisliked
                      ? isDark
                        ? "#F87171"
                        : "#DC2626"
                      : "transparent"
                  }
                />
              </View>
              <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground">
                Not for me
              </Text>
            </TouchableOpacity>

            {/* Love */}
            <TouchableOpacity
              onPress={handleLove}
              className="items-center gap-1.5"
            >
              <View
                className={`w-14 h-14 rounded-full items-center justify-center border-2 ${
                  userInteraction?.isLoved
                    ? "bg-primary/10 dark:bg-primary-dark/10 border-primary dark:border-primary-dark"
                    : "bg-surface dark:bg-surface-dark border-border dark:border-border-dark"
                }`}
              >
                <Heart
                  size={24}
                  color={
                    userInteraction?.isLoved
                      ? isDark
                        ? "#C9A07A"
                        : "#A67C52"
                      : isDark
                        ? "#E8E2DA"
                        : "#2D2926"
                  }
                  fill={
                    userInteraction?.isLoved
                      ? isDark
                        ? "#C9A07A"
                        : "#A67C52"
                      : "transparent"
                  }
                />
              </View>
              <Text className="text-xs text-foreground dark:text-foreground-dark font-medium">
                {interactionCounts?.loveCount || 0}
              </Text>
            </TouchableOpacity>

            {/* Save */}
            <TouchableOpacity
              onPress={handleSavePress}
              className="items-center gap-1.5"
            >
              <View
                className={`w-12 h-12 rounded-full items-center justify-center border ${
                  userInteraction?.isSaved
                    ? "bg-primary/10 dark:bg-primary-dark/10 border-primary/30 dark:border-primary-dark/30"
                    : "bg-surface dark:bg-surface-dark border-border dark:border-border-dark"
                }`}
              >
                <Bookmark
                  size={20}
                  color={
                    userInteraction?.isSaved
                      ? isDark
                        ? "#C9A07A"
                        : "#A67C52"
                      : isDark
                        ? "#E8E2DA"
                        : "#2D2926"
                  }
                  fill={
                    userInteraction?.isSaved
                      ? isDark
                        ? "#C9A07A"
                        : "#A67C52"
                      : "transparent"
                  }
                />
              </View>
              <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground">
                {interactionCounts?.saveCount || 0}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Nima Comment */}
          {look.nimaComment && (
            <View className="mb-6">
              <NimaChatBubble message={look.nimaComment} />
            </View>
          )}

          {/* Divider */}
          <View className="h-px bg-border/40 dark:bg-border-dark/40 mb-6" />

          {/* Price + Occasion */}
          <View className="flex-row items-center justify-between bg-surface dark:bg-surface-dark rounded-2xl p-5 border border-border/30 dark:border-border-dark/30 mb-6">
            <View>
              <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground mb-0.5">
                Total Price
              </Text>
              <Text className="text-2xl font-bold text-foreground dark:text-foreground-dark">
                {formatPrice(look.totalPrice, look.currency)}
              </Text>
              <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground mt-0.5">
                {products.length} items
              </Text>
            </View>
            {look.occasion && (
              <View className="px-3 py-1.5 bg-primary/10 dark:bg-primary-dark/10 rounded-full">
                <Text className="text-primary dark:text-primary-dark text-sm font-medium capitalize">
                  {look.occasion}
                </Text>
              </View>
            )}
          </View>

          {/* Products list */}
          <View>
            <Text className="text-lg font-semibold text-foreground dark:text-foreground-dark mb-4">
              Shop this look
            </Text>

            {/* Unavailable items notice */}
            {look.itemIds.length > products.length && products.length > 0 && (
              <View className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl mb-4 flex-row items-start gap-3">
                <AlertTriangle size={20} color="#D97706" />
                <View className="flex-1">
                  <Text className="font-medium text-amber-800 dark:text-amber-200 text-sm">
                    {look.itemIds.length - products.length} item
                    {look.itemIds.length - products.length > 1 ? "s" : ""} no
                    longer available
                  </Text>
                </View>
              </View>
            )}

            {products.length > 0 ? (
              <View className="gap-3">
                {products.map(({ item, primaryImageUrl }, index) => (
                  <ProductCard
                    key={item._id}
                    product={{
                      _id: item._id,
                      publicId: item.publicId,
                      name: item.name,
                      brand: item.brand,
                      category: item.category,
                      price: item.price,
                      currency: item.currency,
                      primaryImageUrl: primaryImageUrl,
                      sourceUrl: item.sourceUrl,
                      sourceStore: item.sourceStore,
                    }}
                    index={index}
                  />
                ))}
              </View>
            ) : (
              <View className="py-8 items-center">
                <Text className="text-muted-foreground dark:text-muted-dark-foreground">
                  No items available to display.
                </Text>
              </View>
            )}
          </View>

          
        </Animated.View>
      </ScrollView>

      {/* Fixed bottom CTA */}
      {products.length > 0 && (
        <View
          style={{ paddingBottom: insets.bottom + 8 }}
          className="absolute bottom-0 left-0 right-0 bg-background/95 dark:bg-background-dark/95 border-t border-border dark:border-border-dark px-4 pt-3"
        >
          {/* Recreate Look button - only for non-owners */}
          {!isOwner && (
            <TouchableOpacity
              onPress={handleRecreateLook}
              disabled={isRecreating}
              className={`h-12 rounded-full items-center justify-center flex-row gap-2 mb-2.5 border ${
                isRecreating
                  ? "opacity-60"
                  : ""
              }`}
              style={{
                backgroundColor: isDark ? "rgba(201,160,122,0.12)" : "rgba(166,124,82,0.08)",
                borderColor: isDark ? "rgba(201,160,122,0.3)" : "rgba(166,124,82,0.2)",
              }}
            >
              {isRecreating ? (
                <>
                  <ActivityIndicator
                    size="small"
                    color={isDark ? "#C9A07A" : "#A67C52"}
                  />
                  <Text
                    className="font-medium"
                    style={{ color: isDark ? "#C9A07A" : "#A67C52" }}
                  >
                    Recreating...
                  </Text>
                </>
              ) : (
                <>
                  <RefreshCw
                    size={18}
                    color={isDark ? "#C9A07A" : "#A67C52"}
                  />
                  <Text
                    className="font-medium"
                    style={{ color: isDark ? "#C9A07A" : "#A67C52" }}
                  >
                    Recreate Look
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <View className="flex-row gap-3">
            {/* Add to Cart */}
            <TouchableOpacity
              onPress={handleAddLookToCart}
              disabled={isAddingToCart || addedToCart}
              className={`flex-1 h-14 rounded-full items-center justify-center flex-row gap-2 border ${
                addedToCart
                  ? "bg-green-600 border-green-600"
                  : "bg-surface dark:bg-surface-dark border-border dark:border-border-dark"
              } ${isAddingToCart ? "opacity-50" : ""}`}
            >
              {isAddingToCart ? (
                <>
                  <ActivityIndicator
                    size="small"
                    color={isDark ? "#C9A07A" : "#A67C52"}
                  />
                  <Text className="text-foreground dark:text-foreground-dark font-medium">
                    Adding...
                  </Text>
                </>
              ) : addedToCart ? (
                <>
                  <Check size={20} color="#FFF" />
                  <Text className="text-white font-medium">Added to Cart</Text>
                </>
              ) : (
                <>
                  <ShoppingCart
                    size={20}
                    color={isDark ? "#E8E2DA" : "#2D2926"}
                  />
                  <Text className="text-foreground dark:text-foreground-dark font-medium">
                    Add to Cart
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Buy All */}
            <TouchableOpacity
              onPress={handleAddLookToCart}
              disabled={isAddingToCart}
              className="flex-1 h-14 bg-primary dark:bg-primary-dark rounded-full items-center justify-center flex-row gap-2"
            >
              <Sparkles size={20} color="#FFF" />
              <Text className="text-primary-foreground dark:text-primary-dark-foreground font-medium">
                Buy All • {formatPrice(look.totalPrice, look.currency)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Save to Lookbook Bottom Sheet */}
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        style={{
          marginHorizontal: 12,
        }}
        backgroundStyle={{
          backgroundColor: isDark ? "#1A1614" : "#FAF8F5",
          borderRadius: 24,
        }}
        handleIndicatorStyle={{
          backgroundColor: isDark ? "#706B63" : "#C4BFB8",
        }}
      >
        <BottomSheetView className="flex-1 px-6 pt-2 pb-4">
          <Text className="text-xl font-serif font-semibold text-foreground dark:text-foreground-dark mb-1">
            Save to Lookbook
          </Text>
          <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground mb-6">
            Organize your favorite looks into collections
          </Text>

          {/* Existing lookbooks */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            className="flex-1 mb-4"
          >
            {userLookbooks === undefined ? (
              <View className="py-8 items-center">
                <ActivityIndicator
                  size="small"
                  color={isDark ? "#C9A07A" : "#A67C52"}
                />
              </View>
            ) : userLookbooks.length === 0 ? (
              <View className="py-6 items-center">
                <Sparkles size={24} color={isDark ? "#9C948A" : "#706B63"} />
                <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground mt-3">
                  No lookbooks yet. Create one below!
                </Text>
              </View>
            ) : (
              userLookbooks.map((lookbook) => {
                const isSaved =
                  savedStatus?.lookbookIds.includes(lookbook._id) ?? false;
                return (
                  <TouchableOpacity
                    key={lookbook._id}
                    onPress={() => handleSaveToLookbook(lookbook._id)}
                    disabled={isSaving}
                    className={`flex-row items-center gap-3 p-3 rounded-xl mb-2 border ${
                      isSaved
                        ? "bg-primary/10 dark:bg-primary-dark/10 border-primary/30 dark:border-primary-dark/30"
                        : "bg-surface dark:bg-surface-dark border-border/30 dark:border-border-dark/30"
                    }`}
                  >
                    {/* Cover */}
                    <View className="w-12 h-12 rounded-lg bg-surface-alt dark:bg-surface-alt-dark overflow-hidden items-center justify-center">
                      <Sparkles
                        size={16}
                        color={isDark ? "#C9A07A" : "#A67C52"}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="font-medium text-foreground dark:text-foreground-dark">
                        {lookbook.name}
                      </Text>
                      <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground">
                        {lookbook.itemCount} items
                      </Text>
                    </View>
                    {isSaved && (
                      <Check size={20} color={isDark ? "#C9A07A" : "#A67C52"} />
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* Create new lookbook */}
          <View className="border-t border-border/50 dark:border-border-dark/50 pt-4">
            <Text className="text-sm font-medium text-foreground dark:text-foreground-dark mb-3">
              Create new Lookbook
            </Text>
            <View className="flex-row gap-2">
              <TextInput
                value={newLookbookName}
                onChangeText={setNewLookbookName}
                placeholder="e.g., Summer Vacation"
                placeholderTextColor={isDark ? "#706B63" : "#9C948A"}
                editable={!isCreating}
                className="flex-1 h-12 px-4 rounded-xl bg-surface dark:bg-surface-dark border border-border/50 dark:border-border-dark/50 text-foreground dark:text-foreground-dark"
                style={{ fontFamily: "DMSans" }}
              />
              <TouchableOpacity
                onPress={handleCreateLookbook}
                disabled={!newLookbookName.trim() || isCreating}
                className="h-12 px-4 bg-primary dark:bg-primary-dark rounded-xl items-center justify-center flex-row gap-2 disabled:opacity-50"
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Plus size={18} color="#FFF" />
                )}
                <Text className="text-primary-foreground dark:text-primary-dark-foreground font-medium">
                  {isCreating ? "..." : "Create"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </BottomSheetView>
      </BottomSheetModal>

      {/* Share Options Modal */}
      <ShareOptionsModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={shareUrl}
        title={shareTitle}
        lookId={lookInternalId}
      />
    </View>
  );
}
