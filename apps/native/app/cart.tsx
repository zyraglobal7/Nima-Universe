import { useCallback, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/lib/contexts/ThemeContext";
import {
  ArrowLeft,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Sparkles,
  Clock,
  X,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CartScreen() {
  const router = useRouter();
  const { isDark } = useTheme();

  // ──── Queries ────
  const cartItems = useQuery(api.cart.queries.getCart);
  const cartTotal = useQuery(api.cart.queries.getCartTotal);

  // ──── Mutations ────
  const removeFromCart = useMutation(api.cart.mutations.removeFromCart);
  const updateQuantity = useMutation(api.cart.mutations.updateQuantity);
  const clearCart = useMutation(api.cart.mutations.clearCart);

  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);

  const isLoading = cartItems === undefined;

  // ──── Handlers ────
  const handleRemoveItem = useCallback(
    async (cartItemId: Id<"cart_items">) => {
      try {
        await removeFromCart({ cartItemId });
      } catch (error) {
        console.error("Failed to remove item:", error);
      }
    },
    [removeFromCart],
  );

  const handleUpdateQuantity = useCallback(
    async (cartItemId: Id<"cart_items">, newQuantity: number) => {
      try {
        await updateQuantity({ cartItemId, quantity: newQuantity });
      } catch (error) {
        console.error("Failed to update quantity:", error);
      }
    },
    [updateQuantity],
  );

  const handleClearCart = useCallback(() => {
    Alert.alert(
      "Clear Cart",
      "Are you sure you want to remove all items from your cart?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              await clearCart({});
            } catch (error) {
              console.error("Failed to clear cart:", error);
            }
          },
        },
      ],
    );
  }, [clearCart]);

  const handleCheckout = useCallback(() => {
    setCheckoutModalVisible(true);
  }, []);

  const handleBrowse = useCallback(() => {
    router.push("/(tabs)/discover" as any);
  }, [router]);

  // ──── Colors ────
  const iconColor = isDark ? "#C9A07A" : "#5C2A33";
  const mutedColor = isDark ? "#8C8078" : "#9C948A";
  const accentColor = isDark ? "#C9A07A" : "#A67C52";

  // ──── Loading State ────
  if (isLoading) {
    return (
      <SafeAreaView
        className="flex-1 bg-background dark:bg-background-dark"
        edges={["top"]}
      >
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={accentColor} />
          <Text className="text-muted-foreground dark:text-muted-dark-foreground mt-4">
            Loading your cart...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ──── Empty State ────
  if (!cartItems || cartItems.length === 0) {
    return (
      <SafeAreaView
        className="flex-1 bg-background dark:bg-background-dark"
        edges={["top"]}
      >
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-border/30 dark:border-border-dark/30">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center rounded-full"
          >
            <ArrowLeft size={22} color={iconColor} />
          </TouchableOpacity>
          <Text className="flex-1 text-lg font-serif font-medium text-foreground dark:text-foreground-dark text-center mr-10">
            Your Cart
          </Text>
        </View>

        {/* Empty content */}
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-20 h-20 rounded-full bg-surface-alt dark:bg-surface-alt-dark items-center justify-center mb-6">
            <ShoppingBag size={36} color={mutedColor} />
          </View>
          <Text className="text-xl font-serif font-medium text-foreground dark:text-foreground-dark mb-2 text-center">
            Your cart is empty
          </Text>
          <Text className="text-muted-foreground dark:text-muted-dark-foreground text-center max-w-xs mb-8 leading-relaxed">
            Discover beautiful pieces and add them to your cart to get started.
          </Text>
          <TouchableOpacity
            onPress={handleBrowse}
            className="bg-primary dark:bg-primary-dark px-8 py-3.5 rounded-2xl flex-row items-center gap-2"
          >
            <Sparkles size={18} color={isDark ? "#1A1614" : "#FAF8F5"} />
            <Text className="text-base font-medium text-primary-foreground dark:text-primary-dark-foreground">
              Browse Collection
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ──── Cart with Items ────
  return (
    <SafeAreaView
      className="flex-1 bg-background dark:bg-background-dark"
      edges={["top"]}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border/30 dark:border-border-dark/30">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center rounded-full"
        >
          <ArrowLeft size={22} color={iconColor} />
        </TouchableOpacity>
        <View className="items-center">
          <Text className="text-lg font-serif font-medium text-foreground dark:text-foreground-dark">
            Your Cart
          </Text>
          <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground">
            {cartTotal?.itemCount ?? 0}{" "}
            {(cartTotal?.itemCount ?? 0) === 1 ? "item" : "items"}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleClearCart}
          className="w-10 h-10 items-center justify-center rounded-full"
        >
          <Trash2 size={20} color={mutedColor} />
        </TouchableOpacity>
      </View>

      {/* Cart Items */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 180 }}
      >
        <View className="px-4 pt-4">
          {cartItems.map((cartItem) => (
            <View
              key={cartItem._id}
              className="flex-row bg-surface dark:bg-surface-dark rounded-2xl border border-border/30 dark:border-border-dark/30 overflow-hidden mb-4"
            >
              {/* Item Image */}
              <View className="w-28 bg-surface-alt dark:bg-surface-alt-dark">
                {cartItem.imageUrl ? (
                  <Image
                    source={{ uri: cartItem.imageUrl }}
                    style={{ width: "100%", height: 140 }}
                    contentFit="cover"
                    transition={300}
                  />
                ) : (
                  <View
                    className="items-center justify-center"
                    style={{ width: "100%", height: 140 }}
                  >
                    <ShoppingBag size={24} color={mutedColor} />
                  </View>
                )}
              </View>

              {/* Item Details */}
              <View className="flex-1 p-3 justify-between">
                <View>
                  {/* Brand */}
                  {cartItem.item.brand && (
                    <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground mb-0.5">
                      {cartItem.item.brand}
                    </Text>
                  )}

                  {/* Name */}
                  <Text
                    className="text-sm font-medium text-foreground dark:text-foreground-dark mb-1"
                    numberOfLines={2}
                  >
                    {cartItem.item.name}
                  </Text>

                  {/* Size / Color */}
                  <View className="flex-row gap-2 mb-2">
                    {cartItem.selectedSize && (
                      <View className="bg-surface-alt dark:bg-surface-alt-dark px-2 py-0.5 rounded-full">
                        <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground">
                          Size: {cartItem.selectedSize}
                        </Text>
                      </View>
                    )}
                    {cartItem.selectedColor && (
                      <View className="bg-surface-alt dark:bg-surface-alt-dark px-2 py-0.5 rounded-full">
                        <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground">
                          {cartItem.selectedColor}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Out of stock warning */}
                  {!cartItem.item.inStock && (
                    <View className="bg-destructive/10 dark:bg-destructive-dark/10 px-2 py-1 rounded-lg mb-2 self-start">
                      <Text className="text-xs text-destructive dark:text-destructive-dark font-medium">
                        Out of stock
                      </Text>
                    </View>
                  )}
                </View>

                {/* Price + Quantity */}
                <View className="flex-row items-center justify-between">
                  {/* Price */}
                  <View>
                    <Text className="text-base font-semibold text-foreground dark:text-foreground-dark">
                      {cartItem.item.currency}{" "}
                      {(
                        cartItem.item.price * cartItem.quantity
                      ).toLocaleString()}
                    </Text>
                    {cartItem.quantity > 1 && (
                      <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground">
                        {cartItem.item.currency}{" "}
                        {cartItem.item.price.toLocaleString()} each
                      </Text>
                    )}
                  </View>

                  {/* Quantity Stepper */}
                  <View className="flex-row items-center gap-0 bg-surface-alt dark:bg-surface-alt-dark rounded-xl overflow-hidden border border-border/30 dark:border-border-dark/30">
                    <TouchableOpacity
                      onPress={() =>
                        cartItem.quantity <= 1
                          ? handleRemoveItem(cartItem._id)
                          : handleUpdateQuantity(
                              cartItem._id,
                              cartItem.quantity - 1,
                            )
                      }
                      className="w-9 h-9 items-center justify-center"
                    >
                      {cartItem.quantity <= 1 ? (
                        <Trash2 size={14} color="#B85C5C" />
                      ) : (
                        <Minus size={14} color={iconColor} />
                      )}
                    </TouchableOpacity>

                    <View className="w-9 h-9 items-center justify-center bg-background dark:bg-background-dark">
                      <Text className="text-sm font-semibold text-foreground dark:text-foreground-dark">
                        {cartItem.quantity}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() =>
                        handleUpdateQuantity(
                          cartItem._id,
                          cartItem.quantity + 1,
                        )
                      }
                      className="w-9 h-9 items-center justify-center"
                    >
                      <Plus size={14} color={iconColor} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Summary Footer */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-background dark:bg-background-dark border-t border-border/30 dark:border-border-dark/30 px-4 pb-8 pt-4"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        {/* Subtotal */}
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-base text-muted-foreground dark:text-muted-dark-foreground">
            Subtotal ({cartTotal?.itemCount ?? 0}{" "}
            {(cartTotal?.itemCount ?? 0) === 1 ? "item" : "items"})
          </Text>
          <Text className="text-xl font-serif font-semibold text-foreground dark:text-foreground-dark">
            {cartTotal?.currency ?? "KES"}{" "}
            {(cartTotal?.subtotal ?? 0).toLocaleString()}
          </Text>
        </View>

        {/* Checkout Button */}
        <TouchableOpacity
          onPress={handleCheckout}
          className="bg-primary dark:bg-primary-dark py-4 rounded-2xl flex-row items-center justify-center gap-2"
          style={{
            shadowColor: isDark ? "#C9A07A" : "#5C2A33",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <ShoppingBag size={20} color={isDark ? "#1A1614" : "#FAF8F5"} />
          <Text className="text-base font-semibold text-primary-foreground dark:text-primary-dark-foreground">
            Proceed to Checkout
          </Text>
        </TouchableOpacity>

        {/* Continue shopping */}
        <TouchableOpacity onPress={handleBrowse} className="mt-3 py-2">
          <Text className="text-center text-sm text-secondary dark:text-secondary-dark font-medium">
            Continue Shopping
          </Text>
        </TouchableOpacity>
      </View>

      {/* Checkout Coming Soon Modal */}
      <Modal
        visible={checkoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCheckoutModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setCheckoutModalVisible(false)}
          className="flex-1 bg-black/50 items-center justify-center px-6"
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {}}
            className="bg-surface dark:bg-surface-dark rounded-3xl p-6 w-full max-w-sm items-center border border-border/30 dark:border-border-dark/30"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.15,
              shadowRadius: 24,
              elevation: 12,
            }}
          >
            {/* Icon */}
            <View className="w-16 h-16 rounded-full bg-surface-alt dark:bg-surface-alt-dark items-center justify-center mb-4">
              <Clock size={32} color={accentColor} />
            </View>

            {/* Title */}
            <Text className="text-xl font-serif font-semibold text-foreground dark:text-foreground-dark mb-2 text-center">
              Coming Soon
            </Text>

            {/* Message */}
            <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground text-center mb-6 leading-relaxed">
              Checkout will be available soon. We're working hard to bring you a
              seamless shopping experience!
            </Text>

            {/* Dismiss Button */}
            <TouchableOpacity
              onPress={() => setCheckoutModalVisible(false)}
              className="bg-primary dark:bg-primary-dark py-3.5 px-8 rounded-2xl w-full items-center"
            >
              <Text className="text-base font-medium text-primary-foreground dark:text-primary-dark-foreground">
                Got it
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
